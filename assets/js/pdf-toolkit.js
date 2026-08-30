"use strict";

async function initPdfToolkit() {
  const pdfjsLib = await (
    window.__xavertPdfJsReady || Promise.resolve(window.pdfjsLib)
  );
  const toolSelector = document.getElementById("toolSelector");

  const panels = {
    merge: document.getElementById("mergeTool"),
    split: document.getElementById("splitTool"),
    images: document.getElementById("imagesTool"),
    pdfjpg: document.getElementById("pdfjpgTool"),
    rotate: document.getElementById("rotateTool"),
    extract: document.getElementById("extractTool"),
    delete: document.getElementById("deleteTool"),
    png: document.getElementById("pngTool"),
    watermark: document.getElementById("watermarkTool"),
    compress: document.getElementById("compressTool"),
    reorder: document.getElementById("reorderTool"),
    numbers: document.getElementById("numbersTool"),
    sign: document.getElementById("signTool"),
  };

  const requiredLibraries = {
    PDFLib: window.PDFLib,
    jsPDF: window.jspdf?.jsPDF,
    JSZip: window.JSZip,
    pdfjsLib,
  };

  if (!toolSelector || Object.values(panels).some((panel) => !panel)) {
    console.error("PDF Toolkit: HTML and JS do not match.");
    return;
  }

  if (Object.values(requiredLibraries).some((library) => !library)) {
    console.error("PDF Toolkit: one or more PDF libraries failed to load.");
    return;
  }

  const { PDFDocument, degrees, rgb } = requiredLibraries.PDFLib;
  const { jsPDF } = window.jspdf;
  const JSZip = window.JSZip;
  const pdfjsConfig = window.__xavertPdfJsConfig || {};

  if (pdfjsConfig.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsConfig.workerSrc;
  }

  const MB = 1024 * 1024;
  const deviceMemory = Number(navigator.deviceMemory) || 4;
  const softInputLimit = Math.max(80 * MB, Math.min(250 * MB, deviceMemory * 50 * MB));
  const hardInputLimit = Math.max(300 * MB, Math.min(800 * MB, deviceMemory * 130 * MB));
  const pageCountPreviewLimit = Math.min(100 * MB, softInputLimit);
  const maxCanvasPixels =
    deviceMemory <= 2 ? 12_000_000 : deviceMemory <= 4 ? 20_000_000 : 32_000_000;
  const renderWarnPages = deviceMemory <= 2 ? 60 : deviceMemory <= 4 ? 120 : 200;
  const renderHardPages = deviceMemory <= 2 ? 200 : deviceMemory <= 4 ? 350 : 600;
  const splitWarnPages = 300;
  const splitHardPages = 2000;

  const operationVersions = Object.fromEntries(
    Object.keys(panels).map((key) => [key, 0]),
  );

  const inputConfig = {
    mergeFiles: { countId: "mergeCount", emptyText: "No files selected", mode: "multi-pdf", operation: "merge" },
    splitFile: { countId: "splitCount", emptyText: "No file selected", mode: "pdf", operation: "split" },
    imageFiles: { countId: "imageCount", emptyText: "No files selected", mode: "multi-image", operation: "images" },
    pdfJpgFile: { countId: "pdfJpgCount", emptyText: "No file selected", mode: "pdf-pages", operation: "pdfjpg" },
    rotateFile: { countId: "rotateCount", emptyText: "No file selected", mode: "pdf-pages", operation: "rotate" },
    extractFile: { countId: "extractCount", emptyText: "No file selected", mode: "pdf-pages", operation: "extract" },
    deleteFile: { countId: "deleteCount", emptyText: "No file selected", mode: "pdf-pages", operation: "delete" },
    pngFile: { countId: "pngCount", emptyText: "No file selected", mode: "pdf-pages", operation: "png" },
    watermarkFile: { countId: "watermarkCount", emptyText: "No file selected", mode: "pdf-pages", operation: "watermark" },
    compressFile: { countId: "compressCount", emptyText: "No file selected", mode: "pdf-pages", operation: "compress" },
    reorderFile: { countId: "reorderCount", emptyText: "No file selected", mode: "pdf-pages", operation: "reorder" },
    numbersFile: { countId: "numbersCount", emptyText: "No file selected", mode: "pdf-pages", operation: "numbers" },
    signPdfFile: { countId: "signPdfCount", emptyText: "No PDF selected", mode: "pdf-pages", operation: "sign" },
    signatureImageFile: { countId: "signatureImageCount", emptyText: "No signature image selected", mode: "image", operation: "sign" },
  };

  class OperationCancelledError extends Error {
    constructor() {
      super("Operation cancelled.");
      this.name = "OperationCancelledError";
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setMessage(id, text = "", type = "info") {
    const element = byId(id);
    if (!element) return;

    const safeType = ["success", "error", "info"].includes(type) ? type : "info";
    element.textContent = text;
    element.classList.remove("message-success", "message-error", "message-info");
    if (text) element.classList.add(`message-${safeType}`);
  }

  function notify(id, text, type = "info") {
    setMessage(id, text, type);
    if (text && type !== "info" && typeof window.showToast === "function") {
      window.showToast(text, type);
    }
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "0 KB";
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  function startOperation(key) {
    operationVersions[key] += 1;
    return operationVersions[key];
  }

  const operationButtons = {
    merge: "mergeBtn",
    split: "splitBtn",
    images: "imagesToPdfBtn",
    pdfjpg: "pdfToJpgBtn",
    rotate: "rotateBtn",
    extract: "extractBtn",
    delete: "deleteBtn",
    png: "pdfToPngBtn",
    watermark: "watermarkBtn",
    compress: "compressBtn",
    reorder: "reorderBtn",
    numbers: "numbersBtn",
    sign: "signBtn",
  };

  function cancelOperation(key) {
    if (!(key in operationVersions)) return;
    operationVersions[key] += 1;
    const button = byId(operationButtons[key]);
    if (button) button.disabled = false;
    const panel = panels[key];
    if (panel) panel.setAttribute("aria-busy", "false");
  }

  function cancelAllOperations() {
    Object.keys(operationVersions).forEach(cancelOperation);
  }

  function ensureActive(key, version) {
    if (operationVersions[key] !== version) throw new OperationCancelledError();
  }

  function setBusy(buttonId, panelKey, busy) {
    const button = byId(buttonId);
    const panel = panels[panelKey];
    if (button) button.disabled = busy;
    if (panel) panel.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function isPdfFile(file) {
    return Boolean(file) && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
  }

  function isSupportedImage(file) {
    return Boolean(file) && ["image/jpeg", "image/png"].includes(file.type);
  }

  function validatePdfFile(file, messageId) {
    if (!file) {
      notify(messageId, "Please select one PDF file.", "error");
      return false;
    }
    if (!isPdfFile(file)) {
      notify(messageId, "Please select a valid PDF file.", "error");
      return false;
    }
    return true;
  }

  function totalFileSize(files) {
    return files.reduce((sum, file) => sum + (file?.size || 0), 0);
  }

  function confirmInputSize(files, label, messageId) {
    const total = totalFileSize(files);

    if (total > hardInputLimit) {
      notify(
        messageId,
        `${label} is too large for safe in-browser processing on this device (${formatFileSize(total)}).`,
        "error",
      );
      return false;
    }

    if (total > softInputLimit) {
      return window.confirm(
        `${label} is ${formatFileSize(total)}. Processing may use significant memory and can be slow. Continue?`,
      );
    }

    return true;
  }

  function confirmPageCount(pageCount, label, hardLimit = renderHardPages, warnLimit = renderWarnPages) {
    if (pageCount > hardLimit) {
      throw new Error(
        `${label} has ${pageCount} pages, which exceeds the safe browser limit for this operation (${hardLimit} pages on this device).`,
      );
    }

    if (pageCount > warnLimit) {
      return window.confirm(
        `${label} has ${pageCount} pages. This operation may use significant memory and take a long time. Continue?`,
      );
    }

    return true;
  }

  function setInputFiles(input, files) {
    const transfer = new DataTransfer();
    Array.from(files).forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
  }

  async function loadPdfJs(file) {
    let data = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data,
      isEvalSupported: false,
      enableScripting: false,
      enableXfa: false,
      ...(pdfjsConfig.cMapUrl
        ? { cMapUrl: pdfjsConfig.cMapUrl, cMapPacked: true }
        : {}),
      ...(pdfjsConfig.iccUrl ? { iccUrl: pdfjsConfig.iccUrl } : {}),
      ...(pdfjsConfig.standardFontDataUrl
        ? { standardFontDataUrl: pdfjsConfig.standardFontDataUrl }
        : {}),
      ...(pdfjsConfig.wasmUrl ? { wasmUrl: pdfjsConfig.wasmUrl } : {}),
    });

    try {
      const pdf = await loadingTask.promise;
      data = null;
      return {
        get numPages() {
          return pdf.numPages;
        },
        getPage(pageNumber) {
          return pdf.getPage(pageNumber);
        },
        destroy() {
          return loadingTask.destroy();
        },
      };
    } catch (error) {
      try {
        await loadingTask.destroy();
      } catch {}
      throw error;
    }
  }

  async function getPdfPageCount(file) {
    let pdf = null;
    try {
      pdf = await loadPdfJs(file);
      return pdf.numPages;
    } finally {
      if (pdf) await pdf.destroy();
    }
  }

  async function updateFileCount(inputId) {
    const input = byId(inputId);
    const item = inputConfig[inputId];
    if (!input || !item) return;

    const count = byId(item.countId);
    const files = Array.from(input.files ?? []);
    if (!count) return;

    if (!files.length) {
      count.textContent = item.emptyText;
      return;
    }

    if (item.mode === "multi-pdf" || item.mode === "multi-image") {
      const label = item.mode === "multi-pdf" ? "PDF files" : "image files";
      count.textContent = `${files.length} ${label} selected • ${formatFileSize(totalFileSize(files))}`;
      return;
    }

    const file = files[0];

    if (item.mode === "image" || item.mode === "pdf") {
      count.textContent = `${file.name} • ${formatFileSize(file.size)}`;
      return;
    }

    if (item.mode === "pdf-pages") {
      if (file.size > pageCountPreviewLimit) {
        count.textContent = `${file.name} • ${formatFileSize(file.size)} • large file (page count checked when processing)`;
        return;
      }

      count.textContent = `${file.name} • ${formatFileSize(file.size)} • reading pages...`;
      try {
        const pageCount = await getPdfPageCount(file);
        if (input.files?.[0] !== file) return;
        count.textContent = `${file.name} • ${formatFileSize(file.size)} • ${pageCount} pages`;
      } catch {
        if (input.files?.[0] !== file) return;
        count.textContent = `${file.name} • ${formatFileSize(file.size)} • unable to read pages`;
      }
    }
  }

  function setupDropZones() {
    document.querySelectorAll("[data-drop-target]").forEach((zone) => {
      const inputId = zone.dataset.dropTarget;
      const input = byId(inputId);
      if (!input) return;

      zone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          input.click();
        }
      });

      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("dragover");
      });

      zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));

      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("dragover");
        if (!event.dataTransfer?.files?.length) return;

        try {
          setInputFiles(input, event.dataTransfer.files);
          cancelOperation(inputConfig[inputId]?.operation);
          void updateFileCount(inputId);
        } catch (error) {
          console.error(error);
        }
      });

      input.addEventListener("change", () => {
        cancelOperation(inputConfig[inputId]?.operation);
        void updateFileCount(inputId);
      });
    });
  }

  function switchTool() {
    cancelAllOperations();
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== toolSelector.value;
    });
  }

  function clearFileInput(inputId) {
    const input = byId(inputId);
    const item = inputConfig[inputId];
    if (input) input.value = "";
    if (item) {
      cancelOperation(item.operation);
      const count = byId(item.countId);
      if (count) count.textContent = item.emptyText;
    }
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function parsePageSelection(value, pageCount, allowRange = true) {
    const text = value.trim();
    if (!text) return [];

    const pages = [];
    text.split(",").forEach((token) => {
      const item = token.trim();
      if (!item) return;

      if (allowRange && item.includes("-")) {
        const match = item.match(/^(\d+)\s*-\s*(\d+)$/);
        if (!match) throw new Error("Invalid page range.");
        const start = Number(match[1]);
        const end = Number(match[2]);
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > pageCount || start > end) {
          throw new Error("Invalid page range.");
        }
        for (let page = start; page <= end; page += 1) pages.push(page - 1);
      } else {
        const page = Number(item);
        if (!Number.isInteger(page) || page < 1 || page > pageCount) {
          throw new Error("One or more page numbers are invalid.");
        }
        pages.push(page - 1);
      }
    });
    return [...new Set(pages)];
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Unable to read image."));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Unable to create image."))),
        type,
        quality,
      );
    });
  }

  function releaseCanvas(canvas) {
    if (!canvas) return;
    canvas.width = 1;
    canvas.height = 1;
  }

  async function renderPdfPage(page, requestedScale) {
    const baseViewport = page.getViewport({ scale: 1 });
    const basePixels = Math.max(1, baseViewport.width * baseViewport.height);
    const safeScale = Math.min(requestedScale, Math.sqrt(maxCanvasPixels / basePixels));
    const scale = Math.max(0.35, safeScale);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) throw new Error("Canvas is unavailable.");

    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    await page.render({
      canvasContext: context,
      viewport,
      background: "#ffffff",
    }).promise;

    return { canvas, viewport, baseViewport, scale };
  }

  async function mergePdf() {
    const key = "merge";
    const files = Array.from(byId("mergeFiles").files ?? []);

    if (files.length < 2) {
      notify("mergeMessage", "Please select at least two PDF files.", "error");
      return;
    }
    if (files.some((file) => !isPdfFile(file))) {
      notify("mergeMessage", "All selected files must be PDFs.", "error");
      return;
    }
    if (!confirmInputSize(files, "The selected PDF files", "mergeMessage")) return;

    const version = startOperation(key);
    setBusy("mergeBtn", key, true);

    try {
      const merged = await PDFDocument.create();
      for (let index = 0; index < files.length; index += 1) {
        ensureActive(key, version);
        setMessage("mergeMessage", `Merging file ${index + 1} of ${files.length}...`, "info");
        const source = await PDFDocument.load(await files[index].arrayBuffer());
        ensureActive(key, version);
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }

      ensureActive(key, version);
      setMessage("mergeMessage", "Finalizing merged PDF...", "info");
      const bytes = await merged.save();
      ensureActive(key, version);
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "merged-document.pdf");
      notify("mergeMessage", "PDF files merged successfully.", "success");
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify("mergeMessage", "Unable to merge PDF files.", "error");
      }
    } finally {
      if (operationVersions[key] === version) setBusy("mergeBtn", key, false);
    }
  }

  async function splitPdf() {
    const key = "split";
    const file = byId("splitFile").files?.[0];
    if (!validatePdfFile(file, "splitMessage")) return;
    if (!confirmInputSize([file], "This PDF", "splitMessage")) return;

    const version = startOperation(key);
    setBusy("splitBtn", key, true);

    try {
      setMessage("splitMessage", "Reading PDF...", "info");
      const source = await PDFDocument.load(await file.arrayBuffer());
      ensureActive(key, version);
      const pageCount = source.getPageCount();
      const mode = byId("splitMode").value;
      const input = byId("splitPages").value;
      let pages = [];

      if (mode === "all") {
        pages = Array.from({ length: pageCount }, (_, index) => index);
      } else if (mode === "range") {
        pages = parsePageSelection(input, pageCount, true);
        if (!pages.length || !input.includes("-")) throw new Error("Please enter a valid range, for example 1-3.");
      } else {
        pages = parsePageSelection(input, pageCount, false);
        if (!pages.length) throw new Error("Please enter valid pages, for example 1,3,5.");
      }

      if (pages.length > splitHardPages) {
        throw new Error(`Splitting more than ${splitHardPages} pages at once is not supported safely in the browser.`);
      }
      if (pages.length > splitWarnPages && !window.confirm(`This will create ${pages.length} separate PDFs in one ZIP file and may use significant memory. Continue?`)) {
        throw new OperationCancelledError();
      }

      const zip = new JSZip();
      for (let position = 0; position < pages.length; position += 1) {
        ensureActive(key, version);
        setMessage("splitMessage", `Creating page ${position + 1} of ${pages.length}...`, "info");
        const pageIndex = pages[position];
        const result = await PDFDocument.create();
        const [page] = await result.copyPages(source, [pageIndex]);
        result.addPage(page);
        zip.file(`page-${pageIndex + 1}.pdf`, await result.save());
      }

      ensureActive(key, version);
      setMessage("splitMessage", "Building ZIP file...", "info");
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      ensureActive(key, version);
      downloadBlob(zipBlob, "split-pages.zip");
      notify("splitMessage", "PDF pages extracted successfully.", "success");
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify("splitMessage", error instanceof Error ? error.message : "Unable to split PDF file.", "error");
      }
    } finally {
      if (operationVersions[key] === version) setBusy("splitBtn", key, false);
    }
  }

  async function imagesToPdf() {
    const key = "images";
    const files = Array.from(byId("imageFiles").files ?? []);
    if (!files.length) {
      notify("imageMessage", "Please select at least one image file.", "error");
      return;
    }
    if (files.some((file) => !isSupportedImage(file))) {
      notify("imageMessage", "Only JPG and PNG images are supported.", "error");
      return;
    }
    if (!confirmInputSize(files, "The selected images", "imageMessage")) return;

    const version = startOperation(key);
    setBusy("imagesToPdfBtn", key, true);

    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
      const pageWidth = 210;
      const pageHeight = 297;

      for (let index = 0; index < files.length; index += 1) {
        ensureActive(key, version);
        setMessage("imageMessage", `Adding image ${index + 1} of ${files.length}...`, "info");
        const file = files[index];
        const image = await loadImageFromFile(file);
        const bytes = new Uint8Array(await file.arrayBuffer());
        ensureActive(key, version);

        let width = pageWidth;
        let height = (image.naturalHeight * width) / image.naturalWidth;
        if (height > pageHeight) {
          height = pageHeight;
          width = (image.naturalWidth * height) / image.naturalHeight;
        }

        if (index > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(
          bytes,
          file.type === "image/png" ? "PNG" : "JPEG",
          (pageWidth - width) / 2,
          (pageHeight - height) / 2,
          width,
          height,
          undefined,
          "FAST",
        );
      }

      ensureActive(key, version);
      downloadBlob(pdf.output("blob"), "images-to-pdf.pdf");
      notify("imageMessage", "Images converted to PDF successfully.", "success");
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify("imageMessage", "Unable to convert images to PDF.", "error");
      }
    } finally {
      if (operationVersions[key] === version) setBusy("imagesToPdfBtn", key, false);
    }
  }

  async function pdfToImages(format) {
    const key = format === "jpg" ? "pdfjpg" : "png";
    const inputId = format === "jpg" ? "pdfJpgFile" : "pngFile";
    const messageId = format === "jpg" ? "pdfJpgMessage" : "pngMessage";
    const buttonId = format === "jpg" ? "pdfToJpgBtn" : "pdfToPngBtn";
    const file = byId(inputId).files?.[0];

    if (!validatePdfFile(file, messageId)) return;
    if (!confirmInputSize([file], "This PDF", messageId)) return;

    const version = startOperation(key);
    setBusy(buttonId, key, true);
    let pdf = null;

    try {
      setMessage(messageId, "Reading PDF...", "info");
      pdf = await loadPdfJs(file);
      ensureActive(key, version);
      if (!confirmPageCount(pdf.numPages, "This PDF")) throw new OperationCancelledError();

      const zip = new JSZip();
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        ensureActive(key, version);
        setMessage(messageId, `Converting page ${pageNumber} of ${pdf.numPages}...`, "info");
        const page = await pdf.getPage(pageNumber);
        let canvas = null;

        try {
          ({ canvas } = await renderPdfPage(page, 2));
          ensureActive(key, version);
          const blob = format === "jpg"
            ? await canvasToBlob(canvas, "image/jpeg", 0.92)
            : await canvasToBlob(canvas, "image/png");
          ensureActive(key, version);
          zip.file(`page-${pageNumber}.${format}`, blob);
        } finally {
          try { page.cleanup(); } catch {}
          releaseCanvas(canvas);
        }
      }

      ensureActive(key, version);
      setMessage(messageId, "Building ZIP file...", "info");
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      ensureActive(key, version);
      downloadBlob(zipBlob, `pdf-to-${format}.zip`);
      notify(messageId, `PDF converted to ${format.toUpperCase()} successfully.`, "success");
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify(messageId, error instanceof Error ? error.message : `Unable to convert PDF to ${format.toUpperCase()}.`, "error");
      }
    } finally {
      if (pdf) {
        try { await pdf.destroy(); } catch {}
      }
      if (operationVersions[key] === version) setBusy(buttonId, key, false);
    }
  }

  async function runPdfLibEdit({ key, file, messageId, buttonId, busyText, outputName, edit, successText }) {
    if (!validatePdfFile(file, messageId)) return;
    if (!confirmInputSize([file], "This PDF", messageId)) return;

    const version = startOperation(key);
    setBusy(buttonId, key, true);

    try {
      setMessage(messageId, busyText, "info");
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      ensureActive(key, version);
      await edit(pdf, version);
      ensureActive(key, version);
      const bytes = await pdf.save();
      ensureActive(key, version);
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), outputName);
      notify(messageId, successText, "success");
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify(messageId, error instanceof Error ? error.message : "Unable to process PDF.", "error");
      }
    } finally {
      if (operationVersions[key] === version) setBusy(buttonId, key, false);
    }
  }

  async function rotatePdf() {
    const angle = Number(byId("rotateAngle").value);
    await runPdfLibEdit({
      key: "rotate",
      file: byId("rotateFile").files?.[0],
      messageId: "rotateMessage",
      buttonId: "rotateBtn",
      busyText: "Rotating PDF...",
      outputName: "rotated-document.pdf",
      successText: "PDF rotated successfully.",
      edit: async (pdf) => {
        pdf.getPages().forEach((page) => page.setRotation(degrees((page.getRotation().angle + angle) % 360)));
      },
    });
  }

  async function extractPages() {
    const key = "extract";
    const file = byId("extractFile").files?.[0];
    if (!validatePdfFile(file, "extractMessage")) return;
    if (!confirmInputSize([file], "This PDF", "extractMessage")) return;

    const version = startOperation(key);
    setBusy("extractBtn", key, true);

    try {
      setMessage("extractMessage", "Extracting pages...", "info");
      const source = await PDFDocument.load(await file.arrayBuffer());
      ensureActive(key, version);
      const pages = parsePageSelection(
        byId("extractPages").value,
        source.getPageCount(),
        true,
      );
      if (!pages.length) throw new Error("Please enter valid page numbers.");

      const result = await PDFDocument.create();
      const copied = await result.copyPages(source, pages);
      copied.forEach((page) => result.addPage(page));
      ensureActive(key, version);
      const bytes = await result.save();
      ensureActive(key, version);
      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        "extracted-pages.pdf",
      );
      notify("extractMessage", "Pages extracted successfully.", "success");
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify(
          "extractMessage",
          error instanceof Error ? error.message : "Unable to extract pages.",
          "error",
        );
      }
    } finally {
      if (operationVersions[key] === version) setBusy("extractBtn", key, false);
    }
  }

  async function deletePages() {
    const file = byId("deleteFile").files?.[0];
    if (!validatePdfFile(file, "deleteMessage")) return;
    if (!confirmInputSize([file], "This PDF", "deleteMessage")) return;

    const key = "delete";
    const version = startOperation(key);
    setBusy("deleteBtn", key, true);

    try {
      setMessage("deleteMessage", "Deleting pages...", "info");
      const source = await PDFDocument.load(await file.arrayBuffer());
      ensureActive(key, version);
      const pageCount = source.getPageCount();
      const pagesToDelete = parsePageSelection(byId("deletePages").value, pageCount, true);
      if (!pagesToDelete.length) throw new Error("Please enter valid pages to delete.");
      const deleteSet = new Set(pagesToDelete);
      const keep = Array.from({ length: pageCount }, (_, index) => index).filter((index) => !deleteSet.has(index));
      if (!keep.length) throw new Error("You cannot delete all pages.");
      const result = await PDFDocument.create();
      const copied = await result.copyPages(source, keep);
      copied.forEach((page) => result.addPage(page));
      ensureActive(key, version);
      downloadBlob(new Blob([await result.save()], { type: "application/pdf" }), "cleaned-document.pdf");
      notify("deleteMessage", "Pages deleted successfully.", "success");
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify("deleteMessage", error instanceof Error ? error.message : "Unable to delete pages.", "error");
      }
    } finally {
      if (operationVersions[key] === version) setBusy("deleteBtn", key, false);
    }
  }

  async function watermarkPdf() {
    const text = byId("watermarkText").value.trim();
    const size = Number(byId("watermarkSize").value);
    if (!text) {
      notify("watermarkMessage", "Please enter watermark text.", "error");
      return;
    }
    if (!Number.isFinite(size) || size < 10 || size > 120) {
      notify("watermarkMessage", "Watermark size must be between 10 and 120.", "error");
      return;
    }

    await runPdfLibEdit({
      key: "watermark",
      file: byId("watermarkFile").files?.[0],
      messageId: "watermarkMessage",
      buttonId: "watermarkBtn",
      busyText: "Applying watermark...",
      outputName: "watermarked-document.pdf",
      successText: "Watermark added successfully.",
      edit: async (pdf) => {
        pdf.getPages().forEach((page) => {
          const { width, height } = page.getSize();
          page.drawText(text, {
            x: Math.max(20, width * 0.2),
            y: height * 0.5,
            size,
            opacity: 0.3,
            rotate: degrees(45),
          });
        });
      },
    });
  }

  async function compressPdf() {
    const key = "compress";
    const file = byId("compressFile").files?.[0];
    if (!validatePdfFile(file, "compressMessage")) return;
    if (!confirmInputSize([file], "This PDF", "compressMessage")) return;

    const version = startOperation(key);
    setBusy("compressBtn", key, true);
    let source = null;

    try {
      const settings = {
        low: { scale: 1.5, quality: 0.82 },
        medium: { scale: 1.2, quality: 0.66 },
        high: { scale: 0.9, quality: 0.48 },
      }[byId("compressLevel").value];

      setMessage("compressMessage", "Reading PDF...", "info");
      source = await loadPdfJs(file);
      ensureActive(key, version);
      if (!confirmPageCount(source.numPages, "This PDF")) throw new OperationCancelledError();

      let result = null;
      for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
        ensureActive(key, version);
        setMessage("compressMessage", `Compressing page ${pageNumber} of ${source.numPages}...`, "info");
        const page = await source.getPage(pageNumber);
        let canvas = null;

        try {
          const rendered = await renderPdfPage(page, settings.scale);
          canvas = rendered.canvas;
          const { baseViewport } = rendered;
          const jpegBlob = await canvasToBlob(canvas, "image/jpeg", settings.quality);
          const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
          ensureActive(key, version);

          const pageWidth = baseViewport.width;
          const pageHeight = baseViewport.height;
          const orientation = pageWidth > pageHeight ? "landscape" : "portrait";

          if (!result) {
            result = new jsPDF({ orientation, unit: "pt", format: [pageWidth, pageHeight], compress: true });
          } else {
            result.addPage([pageWidth, pageHeight], orientation);
          }

          result.addImage(jpegBytes, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
        } finally {
          try { page.cleanup(); } catch {}
          releaseCanvas(canvas);
        }
      }

      if (!result) throw new Error("Unable to rebuild PDF.");
      ensureActive(key, version);
      setMessage("compressMessage", "Finalizing compressed PDF...", "info");
      const blob = result.output("blob");
      const reduction = Math.round((1 - blob.size / file.size) * 100);
      ensureActive(key, version);
      downloadBlob(blob, "compressed-document.pdf");

      const sizeResult = reduction > 0 ? `Reduction: ${reduction}%` : "No size reduction";
      notify(
        "compressMessage",
        `Compression complete. Original: ${formatFileSize(file.size)} • Output: ${formatFileSize(blob.size)} • ${sizeResult}. Pages were rasterized.`,
        "success",
      );
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify("compressMessage", error instanceof Error ? error.message : "Unable to compress PDF.", "error");
      }
    } finally {
      if (source) {
        try { await source.destroy(); } catch {}
      }
      if (operationVersions[key] === version) setBusy("compressBtn", key, false);
    }
  }

  async function reorderPages() {
    const file = byId("reorderFile").files?.[0];
    if (!validatePdfFile(file, "reorderMessage")) return;
    if (!confirmInputSize([file], "This PDF", "reorderMessage")) return;

    const key = "reorder";
    const version = startOperation(key);
    setBusy("reorderBtn", key, true);

    try {
      setMessage("reorderMessage", "Reordering pages...", "info");
      const source = await PDFDocument.load(await file.arrayBuffer());
      ensureActive(key, version);
      const pageCount = source.getPageCount();
      const rawItems = byId("reorderPages").value.split(",").map((item) => item.trim());
      if (!rawItems.length || rawItems.some((item) => !/^\d+$/.test(item))) throw new Error("Please enter a valid page order.");
      const values = rawItems.map(Number);
      if (new Set(values).size !== values.length) throw new Error("Duplicate page numbers are not allowed.");
      if (values.some((page) => page < 1 || page > pageCount)) throw new Error("One or more page numbers are invalid.");

      const result = await PDFDocument.create();
      const copied = await result.copyPages(source, values.map((page) => page - 1));
      copied.forEach((page) => result.addPage(page));
      ensureActive(key, version);
      downloadBlob(new Blob([await result.save()], { type: "application/pdf" }), "reordered-document.pdf");
      notify("reorderMessage", "Pages reordered successfully.", "success");
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify("reorderMessage", error instanceof Error ? error.message : "Unable to reorder pages.", "error");
      }
    } finally {
      if (operationVersions[key] === version) setBusy("reorderBtn", key, false);
    }
  }

  async function addPageNumbers() {
    const startNumber = Number(byId("numbersStart").value);
    if (!Number.isInteger(startNumber) || startNumber < 1) {
      notify("numbersMessage", "Start number must be at least 1.", "error");
      return;
    }

    const position = byId("numbersPosition").value;
    await runPdfLibEdit({
      key: "numbers",
      file: byId("numbersFile").files?.[0],
      messageId: "numbersMessage",
      buttonId: "numbersBtn",
      busyText: "Adding page numbers...",
      outputName: "numbered-document.pdf",
      successText: "Page numbers added successfully.",
      edit: async (pdf) => {
        pdf.getPages().forEach((page, index) => {
          const { width, height } = page.getSize();
          const text = String(startNumber + index);
          const fontSize = 12;
          const approxWidth = text.length * fontSize * 0.55;
          const positions = {
            "bottom-left": [36, 24],
            "bottom-center": [(width - approxWidth) / 2, 24],
            "bottom-right": [width - approxWidth - 36, 24],
            "top-left": [36, height - 36],
            "top-center": [(width - approxWidth) / 2, height - 36],
            "top-right": [width - approxWidth - 36, height - 36],
          };
          const [x, y] = positions[position];
          page.drawText(text, { x, y, size: fontSize, color: rgb(0, 0, 0) });
        });
      },
    });
  }

  const signatureCanvas = byId("signatureCanvas");
  const signatureContext = signatureCanvas?.getContext("2d");
  let signatureDrawing = false;

  function clearSignature() {
    if (!signatureCanvas || !signatureContext) return;
    signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  }

  function signaturePositionFromEvent(event) {
    const rect = signatureCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (signatureCanvas.width / rect.width),
      y: (event.clientY - rect.top) * (signatureCanvas.height / rect.height),
    };
  }

  function setupSignatureCanvas() {
    if (!signatureCanvas || !signatureContext) return;

    signatureCanvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      signatureDrawing = true;
      signatureCanvas.setPointerCapture(event.pointerId);
      const position = signaturePositionFromEvent(event);
      signatureContext.beginPath();
      signatureContext.moveTo(position.x, position.y);
    });

    signatureCanvas.addEventListener("pointermove", (event) => {
      if (!signatureDrawing) return;
      event.preventDefault();
      const position = signaturePositionFromEvent(event);
      signatureContext.lineWidth = 3;
      signatureContext.lineCap = "round";
      signatureContext.strokeStyle = "#111827";
      signatureContext.lineTo(position.x, position.y);
      signatureContext.stroke();
    });

    const stop = (event) => {
      if (!signatureDrawing) return;
      signatureDrawing = false;
      if (signatureCanvas.hasPointerCapture(event.pointerId)) {
        signatureCanvas.releasePointerCapture(event.pointerId);
      }
    };

    signatureCanvas.addEventListener("pointerup", stop);
    signatureCanvas.addEventListener("pointercancel", stop);
  }

  function signatureCanvasHasInk() {
    if (!signatureContext || !signatureCanvas) return false;
    const pixels = signatureContext.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height).data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] !== 0) return true;
    }
    return false;
  }

  function updateSignatureMethod() {
    const upload = byId("signMethod").value === "upload";
    byId("drawSignatureArea").hidden = upload;
    byId("uploadSignatureArea").hidden = !upload;
  }

  async function signPdf() {
    const key = "sign";
    const file = byId("signPdfFile").files?.[0];
    if (!validatePdfFile(file, "signMessage")) return;
    if (!confirmInputSize([file], "This PDF", "signMessage")) return;

    const pageNumber = Number(byId("signaturePage").value);
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      notify("signMessage", "Please enter a valid page number.", "error");
      return;
    }

    const version = startOperation(key);
    setBusy("signBtn", key, true);

    try {
      setMessage("signMessage", "Signing PDF...", "info");
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      ensureActive(key, version);
      if (pageNumber > pdf.getPageCount()) throw new Error("Page number is higher than the PDF page count.");

      let signatureImage;
      if (byId("signMethod").value === "draw") {
        if (!signatureCanvasHasInk()) throw new Error("Please draw a signature first.");
        const blob = await canvasToBlob(signatureCanvas, "image/png");
        signatureImage = await pdf.embedPng(await blob.arrayBuffer());
      } else {
        const imageFile = byId("signatureImageFile").files?.[0];
        if (!imageFile || !isSupportedImage(imageFile)) throw new Error("Please select a JPG or PNG signature image.");
        const bytes = await imageFile.arrayBuffer();
        signatureImage = imageFile.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      }

      ensureActive(key, version);
      const page = pdf.getPages()[pageNumber - 1];
      const { width, height } = page.getSize();
      const signatureWidth = Math.min(180, Math.max(60, width * 0.32));
      const signatureHeight = signatureWidth * (70 / 180);
      const positions = {
        "bottom-right": [Math.max(20, width - signatureWidth - 30), 30],
        "bottom-left": [30, 30],
        "top-right": [Math.max(20, width - signatureWidth - 30), Math.max(20, height - signatureHeight - 30)],
        "top-left": [30, Math.max(20, height - signatureHeight - 30)],
      };
      const [x, y] = positions[byId("signaturePosition").value];
      page.drawImage(signatureImage, { x, y, width: signatureWidth, height: signatureHeight });
      ensureActive(key, version);
      downloadBlob(new Blob([await pdf.save()], { type: "application/pdf" }), "signed-document.pdf");
      notify("signMessage", "PDF signed successfully.", "success");
    } catch (error) {
      if (!(error instanceof OperationCancelledError)) {
        console.error(error);
        notify("signMessage", error instanceof Error ? error.message : "Unable to sign PDF.", "error");
      }
    } finally {
      if (operationVersions[key] === version) setBusy("signBtn", key, false);
    }
  }

  function clearMerge() { clearFileInput("mergeFiles"); setMessage("mergeMessage"); }
  function clearSplit() { clearFileInput("splitFile"); byId("splitMode").value = "all"; byId("splitPages").value = ""; setMessage("splitMessage"); }
  function clearImages() { clearFileInput("imageFiles"); setMessage("imageMessage"); }
  function clearPdfJpg() { clearFileInput("pdfJpgFile"); setMessage("pdfJpgMessage"); }
  function clearRotate() { clearFileInput("rotateFile"); byId("rotateAngle").value = "90"; setMessage("rotateMessage"); }
  function clearExtract() { clearFileInput("extractFile"); byId("extractPages").value = ""; setMessage("extractMessage"); }
  function clearDelete() { clearFileInput("deleteFile"); byId("deletePages").value = ""; setMessage("deleteMessage"); }
  function clearPng() { clearFileInput("pngFile"); setMessage("pngMessage"); }
  function clearWatermark() { clearFileInput("watermarkFile"); byId("watermarkText").value = ""; byId("watermarkSize").value = "40"; setMessage("watermarkMessage"); }
  function clearCompress() { clearFileInput("compressFile"); byId("compressLevel").value = "low"; setMessage("compressMessage"); }
  function clearReorder() { clearFileInput("reorderFile"); byId("reorderPages").value = ""; setMessage("reorderMessage"); }
  function clearNumbers() { clearFileInput("numbersFile"); byId("numbersPosition").value = "bottom-center"; byId("numbersStart").value = "1"; setMessage("numbersMessage"); }
  function clearSign() {
    clearFileInput("signPdfFile");
    clearFileInput("signatureImageFile");
    byId("signaturePage").value = "1";
    byId("signaturePosition").value = "bottom-right";
    byId("signMethod").value = "draw";
    clearSignature();
    updateSignatureMethod();
    setMessage("signMessage");
  }

  toolSelector.addEventListener("change", switchTool);
  setupDropZones();
  setupSignatureCanvas();
  byId("signMethod").addEventListener("change", updateSignatureMethod);
  byId("clearSignatureBtn").addEventListener("click", clearSignature);

  [
    ["mergeBtn", mergePdf],
    ["splitBtn", splitPdf],
    ["imagesToPdfBtn", imagesToPdf],
    ["pdfToJpgBtn", () => pdfToImages("jpg")],
    ["rotateBtn", rotatePdf],
    ["extractBtn", extractPages],
    ["deleteBtn", deletePages],
    ["pdfToPngBtn", () => pdfToImages("png")],
    ["watermarkBtn", watermarkPdf],
    ["compressBtn", compressPdf],
    ["reorderBtn", reorderPages],
    ["numbersBtn", addPageNumbers],
    ["signBtn", signPdf],
  ].forEach(([id, handler]) => {
    byId(id).addEventListener("click", () => void handler());
  });

  [
    ["clearMergeBtn", clearMerge],
    ["clearSplitBtn", clearSplit],
    ["clearImagesBtn", clearImages],
    ["clearPdfJpgBtn", clearPdfJpg],
    ["clearRotateBtn", clearRotate],
    ["clearExtractBtn", clearExtract],
    ["clearDeleteBtn", clearDelete],
    ["clearPngBtn", clearPng],
    ["clearWatermarkBtn", clearWatermark],
    ["clearCompressBtn", clearCompress],
    ["clearReorderBtn", clearReorder],
    ["clearNumbersBtn", clearNumbers],
    ["clearSignBtn", clearSign],
  ].forEach(([id, handler]) => byId(id).addEventListener("click", handler));

  updateSignatureMethod();
  switchTool();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPdfToolkit, { once: true });
} else {
  initPdfToolkit();
}
