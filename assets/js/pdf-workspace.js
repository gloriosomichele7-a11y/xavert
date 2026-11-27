"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const elements = {
    file: $("xw-file"), drop: $("xw-drop"), append: $("xw-append-file"),
    workspace: $("xw-workspace"),
    name: $("xw-name"), count: $("xw-count"), size: $("xw-size"),
    preview: $("xw-preview"), previewNote: $("xw-preview-note"),
    operation: $("xw-operation"), options: $("xw-operation-options"),
    apply: $("xw-apply"), download: $("xw-download"), undo: $("xw-undo"),
    reset: $("xw-reset"), status: $("xw-status"), history: $("xw-history"),
  };
  if (!elements.file || !elements.workspace) return;

  const MAX_FILE_BYTES = 50 * 1024 * 1024;
  const MAX_UNDO_STEPS = 4;
  let workingBytes = null;
  let currentName = "document.pdf";
  let pageCount = 0;
  let busy = false;
  let previewUrl = null;
  let undoStack = [];
  let log = [];

  const fmtSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  const pdfReady = () => Boolean(window.PDFLib?.PDFDocument);
  const integer = (raw) => {
    if (!/^\d+$/.test(String(raw).trim())) return NaN;
    return Number(raw);
  };

  function setStatus(message, type = "info") {
    elements.status.textContent = message;
    elements.status.dataset.type = type;
  }

  function guardFile(file) {
    if (!file) throw new Error("Choose a PDF file first.");
    if (file.size === 0) throw new Error("This file is empty.");
    if (file.size > MAX_FILE_BYTES) throw new Error("This file exceeds the 50 MB limit for the browser workspace.");
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      throw new Error("Please choose a PDF file.");
    }
  }

  // Preflight protects complex PDFs that pdf-lib cannot safely round-trip.
  // In particular, copying pages can drop interactive form fields, and saving
  // a cryptographically signed PDF invalidates its existing signature.
  function rejectUnsupportedFeatures(pdf) {
    const { PDFName, PDFDict, PDFArray } = window.PDFLib || {};
    if (!PDFName || !PDFDict || !PDFArray || !pdf.catalog || !pdf.context) return;

    const name = (value) => PDFName.of(value);
    const catalog = pdf.catalog;
    const context = pdf.context;
    const hasCatalogEntry = (key) => Boolean(catalog.get(name(key)));

    if (hasCatalogEntry("Perms")) {
      throw new Error("This PDF contains document-level permissions or a digital certification. It cannot be safely edited here. Keep the original file.");
    }
    if (hasCatalogEntry("OpenAction") || hasCatalogEntry("AA") ||
        hasCatalogEntry("Collection") || hasCatalogEntry("AF") ||
        hasCatalogEntry("Dests")) {
      throw new Error("This PDF contains automatic actions, portfolios, associated files or internal destinations. These advanced features cannot be safely preserved in this Beta workspace.");
    }

    // Signatures may exist outside AcroForm, or live in an indirect dictionary.
    for (const [, object] of context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFDict)) continue;
      if (object.has(name("ByteRange")) || String(object.get(name("FT")) || "") === "/Sig") {
        throw new Error("This PDF contains a digital signature. Editing would invalidate it. Use a PDF editor with signature-aware support.");
      }
    }

    const acroRef = catalog.get(name("AcroForm"));
    if (acroRef) {
      const acro = context.lookup(acroRef, PDFDict);
      if (acro) {
        const fieldsRef = acro.get(name("Fields"));
        const fields = fieldsRef ? context.lookup(fieldsRef, PDFArray) : null;
        if (acro.has(name("XFA")) || (fields && fields.size() > 0)) {
          throw new Error("This PDF has fillable form fields or XFA content. Editing could remove form data, so it is blocked in this Beta workspace.");
        }
      }
    }

    if (hasCatalogEntry("Outlines") || hasCatalogEntry("StructTreeRoot") ||
        hasCatalogEntry("OCProperties") || hasCatalogEntry("PageLabels")) {
      throw new Error("This PDF includes bookmarks, accessibility structure, layers or custom page labels. These features may be lost by this Beta workspace, so editing is blocked.");
    }

    const namesRef = catalog.get(name("Names"));
    if (namesRef) {
      const names = context.lookup(namesRef, PDFDict);
      if (names && (names.has(name("EmbeddedFiles")) || names.has(name("JavaScript")) ||
          names.has(name("Dests")))) {
        throw new Error("This PDF contains embedded files, document scripts or named destinations. Editing is not supported in this Beta workspace.");
      }
    }

    // Annotation attachments, widgets, multimedia, and embedded actions are
    // not equivalent to ordinary PDF comments. Page copying can sever their
    // references even when the file still opens without a visible error.
    const unsupportedAnnotations = new Set([
      "/FileAttachment", "/RichMedia", "/3D", "/Movie", "/Sound",
      "/Screen", "/Widget",
    ]);
    const unsafeActions = new Set([
      "/JavaScript", "/Launch", "/Rendition", "/GoTo", "/GoToR", "/GoToE",
    ]);
    for (const page of pdf.getPages()) {
      if (page.node.has(name("AA")) || page.node.has(name("AF"))) {
        throw new Error("This PDF contains page-level actions or attachments that cannot be safely preserved in this Beta workspace.");
      }
      const annotationsRef = page.node.get(name("Annots"));
      if (!annotationsRef) continue;
      const annotations = context.lookup(annotationsRef, PDFArray);
      if (!annotations) continue;
      for (let index = 0; index < annotations.size(); index += 1) {
        const annotation = context.lookup(annotations.get(index), PDFDict);
        if (!annotation) continue;
        const subtype = String(annotation.get(name("Subtype")) || "");
        if (unsupportedAnnotations.has(subtype) || annotation.has(name("AA")) ||
            annotation.has(name("FS")) || annotation.has(name("Dest"))) {
          throw new Error("This PDF contains advanced annotations, file attachments or internal links that cannot be safely edited here.");
        }
        const actionRef = annotation.get(name("A"));
        const action = actionRef ? context.lookup(actionRef, PDFDict) : null;
        if (action && unsafeActions.has(String(action.get(name("S")) || ""))) {
          throw new Error("This PDF contains advanced annotation actions or internal links that cannot be safely edited here.");
        }
      }
    }
  }

  async function loadPdf(bytes) {
    if (!pdfReady()) throw new Error("The PDF engine did not load. Check your connection and refresh.");
    try {
      const document = await window.PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
      rejectUnsupportedFeatures(document);
      return document;
    } catch (error) {
      if (error?.message && (/^This PDF (contains|has|includes)/.test(error.message))) {
        throw error;
      }
      throw new Error("This PDF could not be opened. It may be damaged, encrypted, or use unsupported features.");
    }
  }

  function parsePageSelection(value, count, { allowRepetition = false } = {}) {
    const source = String(value).trim();
    if (!source) throw new Error("Enter page numbers such as 1,3-5.");
    const result = [];
    for (const fragment of source.split(",")) {
      const token = fragment.trim();
      const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
      if (!match) throw new Error(`Invalid page selection: ${token || "empty entry"}.`);
      const first = integer(match[1]);
      const last = match[2] ? integer(match[2]) : first;
      if (first < 1 || last > count || last < first || !Number.isSafeInteger(last)) {
        throw new Error(`Pages must be between 1 and ${count}, with ranges in ascending order.`);
      }
      if (result.length + last - first + 1 > count + (allowRepetition ? 100 : 0)) {
        throw new Error("The page list contains too many entries.");
      }
      for (let page = first; page <= last; page += 1) result.push(page - 1);
    }
    if (!allowRepetition && new Set(result).size !== result.length) {
      throw new Error("A page cannot appear more than once in this selection.");
    }
    return result;
  }

  function historyItem(text) {
    log.push(text);
    const item = document.createElement("li");
    item.textContent = text;
    elements.history.appendChild(item);
  }

  function restoreHistory() {
    elements.history.replaceChildren();
    for (const text of log) {
      const item = document.createElement("li");
      item.textContent = text;
      elements.history.appendChild(item);
    }
  }

  function revokePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  function displayPreview() {
    revokePreview();
    if (!workingBytes) {
      elements.preview.removeAttribute("src");
      elements.preview.hidden = true;
      elements.previewNote.hidden = false;
      return;
    }
    const blob = new Blob([workingBytes], { type: "application/pdf" });
    previewUrl = URL.createObjectURL(blob);
    elements.preview.src = `${previewUrl}#toolbar=0&navpanes=0`;
    elements.preview.hidden = false;
    elements.previewNote.hidden = true;
  }

  function refreshUi() {
    const loaded = Boolean(workingBytes);
    elements.workspace.hidden = !loaded;
    elements.name.textContent = currentName;
    elements.count.textContent = `${pageCount} ${pageCount === 1 ? "page" : "pages"}`;
    elements.size.textContent = workingBytes ? fmtSize(workingBytes.byteLength) : "0 MB";
    elements.undo.disabled = busy || !undoStack.length;
    elements.apply.disabled = busy || !loaded;
    elements.download.disabled = busy || !loaded;
    elements.reset.disabled = busy;
    elements.operation.disabled = busy || !loaded;
    elements.file.disabled = busy;
    elements.append.disabled = busy;
    elements.drop.setAttribute("aria-disabled", String(busy));
  }

  function setBusy(flag) {
    busy = flag;
    refreshUi();
    applyAvailableOptions();
  }

  async function openFile(file) {
    try {
      guardFile(file);
      setBusy(true);
      setStatus("Opening PDF...");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const document = await loadPdf(bytes);
      const count = document.getPageCount();
      if (!count) throw new Error("The PDF has no pages.");
      workingBytes = bytes;
      currentName = file.name.replace(/\.pdf$/i, "") + ".pdf";
      pageCount = count;
      undoStack = [];
      log = [];
      restoreHistory();
      displayPreview();
      setStatus("PDF loaded. Choose an operation below.", "success");
    } catch (error) {
      setStatus(error.message || "Unable to read the selected file.", "error");
    } finally {
      setBusy(false);
      elements.file.value = "";
    }
  }

  function applyAvailableOptions() {
    const selected = elements.operation.value;
    for (const section of elements.options.querySelectorAll("[data-operation]")) {
      section.hidden = section.dataset.operation !== selected;
      for (const input of section.querySelectorAll("input,select")) {
        input.disabled = section.hidden || busy;
      }
    }
  }

  async function copyChosenPages(source, indices) {
    const next = await window.PDFLib.PDFDocument.create();
    const copied = await next.copyPages(source, indices);
    for (const page of copied) next.addPage(page);
    // Keep standard document metadata instead of silently dropping Subject,
    // Keywords, Creator or CreationDate when pages are copied into a new PDF.
    // Copy primitive values only: cross-document indirect references are unsafe.
    const { PDFName, PDFDict, PDFString, PDFHexString } = window.PDFLib;
    const sourceInfo = source.context.trailerInfo.Info;
    const destinationInfo = next.context.trailerInfo.Info;
    if (sourceInfo && destinationInfo) {
      const from = source.context.lookup(sourceInfo, PDFDict);
      const to = next.context.lookup(destinationInfo, PDFDict);
      if (from && to) {
        for (const key of [
          "Title", "Author", "Subject", "Creator", "Producer",
          "Keywords", "CreationDate", "Trapped",
        ]) {
          const pdfName = PDFName.of(key);
          const value = from.get(pdfName);
          if (value && (value instanceof PDFString || value instanceof PDFHexString ||
                        value instanceof PDFName)) {
            to.set(pdfName, value);
          }
        }
      }
    }
    return next;
  }

  function selectedNumber(id, min, max) {
    const value = integer($(id).value);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new Error(`Enter a number between ${min} and ${max}.`);
    }
    return value;
  }

  // Convert coordinates in the visually rotated CropBox back to PDF page
  // coordinates. The stamp text is rotated with the page to remain upright
  // in standard PDF viewers, including 90/180/270-degree pages.
  function visualStampLayout(page) {
    const crop = page.getCropBox();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    if (![0, 90, 180, 270].includes(rotation)) {
      throw new Error("This page has an unsupported rotation.");
    }
    const visualWidth = rotation % 180 ? crop.height : crop.width;
    const visualHeight = rotation % 180 ? crop.width : crop.height;
    function toPdf(x, y) {
      switch (rotation) {
        case 90: return { x: crop.x + crop.width - y, y: crop.y + x };
        case 180: return { x: crop.x + crop.width - x, y: crop.y + crop.height - y };
        case 270: return { x: crop.x + y, y: crop.y + crop.height - x };
        default: return { x: crop.x + x, y: crop.y + y };
      }
    }
    return { visualWidth, visualHeight, rotation, toPdf };
  }

  async function performOperation(document, selected) {
    const { PDFDocument, degrees, StandardFonts, rgb } = window.PDFLib;
    const count = document.getPageCount();
    switch (selected) {
      case "rotate": {
        const angle = selectedNumber("xw-rotation", 90, 270);
        if (![90, 180, 270].includes(angle)) throw new Error("Choose a supported rotation.");
        for (const page of document.getPages()) {
          page.setRotation(degrees((page.getRotation().angle + angle) % 360));
        }
        return { document, label: `Rotate all pages ${angle}°` };
      }
      case "delete": {
        const indices = parsePageSelection($("xw-page-list").value, count);
        if (indices.length >= count) throw new Error("At least one page must remain.");
        for (const i of indices.sort((a, b) => b - a)) document.removePage(i);
        return { document, label: `Delete ${indices.length} ${indices.length === 1 ? "page" : "pages"}` };
      }
      case "keep": {
        const indices = parsePageSelection($("xw-page-list-keep").value, count);
        const result = await copyChosenPages(document, indices);
        return { document: result, label: `Keep ${indices.length} ${indices.length === 1 ? "page" : "pages"}` };
      }
      case "reorder": {
        const indices = parsePageSelection($("xw-page-order").value, count);
        if (indices.length !== count) throw new Error(`List every page exactly once (1 to ${count}).`);
        const result = await copyChosenPages(document, indices);
        return { document: result, label: "Reorder pages" };
      }
      case "append": {
        const extraFile = elements.append.files?.[0];
        guardFile(extraFile);
        const other = await loadPdf(new Uint8Array(await extraFile.arrayBuffer()));
        if (!other.getPageCount()) throw new Error("The second PDF contains no pages.");
        const copies = await document.copyPages(other, other.getPageIndices());
        copies.forEach((page) => document.addPage(page));
        return { document, label: `Append ${copies.length} ${copies.length === 1 ? "page" : "pages"}` };
      }
      case "numbers": {
        const start = selectedNumber("xw-start-number", 1, 100000);
        const font = await document.embedFont(StandardFonts.Helvetica);
        const position = $("xw-number-position").value;
        for (let i = 0; i < count; i += 1) {
          const page = document.getPage(i);
          const text = String(i + start);
          const size = 10;
          const width = font.widthOfTextAtSize(text, size);
          const layout = visualStampLayout(page);
          if (width > layout.visualWidth - 24 || layout.visualHeight < 28) {
            throw new Error("This page is too small to place page numbers safely.");
          }
          const x = position === "right" ? layout.visualWidth - width - 18
            : position === "left" ? 18 : (layout.visualWidth - width) / 2;
          const point = layout.toPdf(x, 16);
          page.drawText(text, {
            x: point.x, y: point.y, size, font,
            rotate: degrees(layout.rotation), color: rgb(0.25, 0.3, 0.38),
          });
        }
        return { document, label: "Add page numbers" };
      }
      case "watermark": {
        const text = $("xw-watermark-text").value.trim();
        if (!text || text.length > 70) throw new Error("Enter watermark text (up to 70 characters).");
        const opacity = selectedNumber("xw-opacity", 10, 70) / 100;
        const font = await document.embedFont(StandardFonts.HelveticaBold);
        for (const page of document.getPages()) {
          const layout = visualStampLayout(page);
          const availableWidth = layout.visualWidth - 24;
          if (availableWidth <= 0) throw new Error("This page is too narrow for a watermark.");
          let fontSize = Math.min(42, Math.max(14, layout.visualWidth / 13));
          // WinAnsi is intentionally used for the built-in font; unsupported glyphs show a clear error.
          let textWidth = font.widthOfTextAtSize(text, fontSize);
          if (textWidth > availableWidth) {
            fontSize *= availableWidth / textWidth;
            if (fontSize < 8) {
              throw new Error("Watermark text is too long for this page. Use a shorter label.");
            }
            textWidth = font.widthOfTextAtSize(text, fontSize);
          }
          const point = layout.toPdf((layout.visualWidth - textWidth) / 2, layout.visualHeight / 2);
          page.drawText(text, {
            x: point.x, y: point.y, size: fontSize, font,
            rotate: degrees(layout.rotation),
            color: rgb(0.72, 0.14, 0.19), opacity,
          });
        }
        return { document, label: "Apply text watermark" };
      }
      default:
        throw new Error("Choose a supported operation.");
    }
  }

  async function applyOperation() {
    if (!workingBytes || busy) return;
    const selected = elements.operation.value;
    setBusy(true);
    setStatus("Applying operation...");
    try {
      const source = new Uint8Array(workingBytes);
      const document = await loadPdf(source);
      const result = await performOperation(document, selected);
      if (result.document.getPageCount() < 1) throw new Error("A PDF must contain at least one page.");
      const output = new Uint8Array(await result.document.save({ useObjectStreams: true }));
      // Browsers need room for the previous file and the edited file at the same time.
      if (output.byteLength > MAX_FILE_BYTES) {
        throw new Error("Result exceeds the workspace's 50 MB memory-safety limit.");
      }
      undoStack.push({ bytes: workingBytes, pageCount, log: [...log] });
      if (undoStack.length > (workingBytes.byteLength > 20 * 1024 * 1024 ? 1 : MAX_UNDO_STEPS)) {
        undoStack.shift();
      }
      workingBytes = output;
      pageCount = result.document.getPageCount();
      historyItem(result.label);
      displayPreview();
      elements.append.value = "";
      setStatus(`${result.label} completed. You can apply another operation or download.`, "success");
    } catch (error) {
      setStatus(error.message || "The operation failed. Your previous PDF is unchanged.", "error");
    } finally {
      setBusy(false);
      applyAvailableOptions();
    }
  }

  function undo() {
    if (busy || !undoStack.length) return;
    const previous = undoStack.pop();
    workingBytes = previous.bytes;
    pageCount = previous.pageCount;
    log = previous.log;
    restoreHistory();
    displayPreview();
    refreshUi();
    setStatus("Last operation undone.", "success");
  }

  function download() {
    if (!workingBytes || busy) return;
    const base = currentName.replace(/\.pdf$/i, "");
    const blob = new Blob([workingBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${base}-xavert-edited.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    setStatus("Download started. The edited PDF stays in this browser session.", "success");
  }

  function reset() {
    if (busy) return;
    workingBytes = null;
    pageCount = 0;
    undoStack = [];
    log = [];
    elements.append.value = "";
    restoreHistory();
    displayPreview();
    refreshUi();
    setStatus("Workspace cleared. Files were not uploaded or saved to XAVERT servers.");
  }

  elements.file.addEventListener("change", () => openFile(elements.file.files?.[0]));
  for (const eventName of ["dragenter", "dragover"]) {
    elements.drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (!busy) elements.drop.classList.add("is-dragover");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    elements.drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.drop.classList.remove("is-dragover");
    });
  }
  elements.drop.addEventListener("drop", (event) => {
    if (busy) return;
    const files = event.dataTransfer?.files;
    if (files?.length) openFile(files[0]);
  });
  elements.operation.addEventListener("change", applyAvailableOptions);
  elements.apply.addEventListener("click", applyOperation);
  elements.undo.addEventListener("click", undo);
  elements.download.addEventListener("click", download);
  elements.reset.addEventListener("click", reset);
  window.addEventListener("pagehide", revokePreview);
  applyAvailableOptions();
  refreshUi();
  if (!pdfReady()) {
    setStatus("The PDF processing library is unavailable. Reload the page before opening a file.", "error");
  } else {
    setStatus("Ready. PDFs are processed locally in your browser.");
  }
})();
