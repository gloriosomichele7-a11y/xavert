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

  async function loadPdf(bytes) {
    if (!pdfReady()) throw new Error("The PDF engine did not load. Check your connection and refresh.");
    try {
      return await window.PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
    } catch (error) {
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
    if (source.getTitle()) next.setTitle(source.getTitle());
    if (source.getAuthor()) next.setAuthor(source.getAuthor());
    return next;
  }

  function selectedNumber(id, min, max) {
    const value = integer($(id).value);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new Error(`Enter a number between ${min} and ${max}.`);
    }
    return value;
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
          const { width: pageWidth } = page.getSize();
          const x = position === "right" ? Math.max(12, pageWidth - width - 18)
            : position === "left" ? 18 : (pageWidth - width) / 2;
          page.drawText(text, { x, y: 16, size, font, color: rgb(0.25, 0.3, 0.38) });
        }
        return { document, label: "Add page numbers" };
      }
      case "watermark": {
        const text = $("xw-watermark-text").value.trim();
        if (!text || text.length > 70) throw new Error("Enter watermark text (up to 70 characters).");
        const opacity = selectedNumber("xw-opacity", 10, 70) / 100;
        const font = await document.embedFont(StandardFonts.HelveticaBold);
        for (const page of document.getPages()) {
          const { width, height } = page.getSize();
          const fontSize = Math.min(42, Math.max(14, width / 13));
          // WinAnsi is intentionally used for the built-in font; unsupported glyphs show a clear error.
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          page.drawText(text, {
            x: Math.max(10, (width - textWidth) / 2), y: height / 2,
            size: fontSize, font, color: rgb(0.72, 0.14, 0.19), opacity,
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
