"use strict";

function initPdfToolkit() {
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
    pdfjsLib: window.pdfjsLib,
  };

  if (!toolSelector || Object.values(panels).some((panel) => !panel)) {
    console.error("PDF Toolkit: HTML and JS do not match.");
    return;
  }

  if (
    !requiredLibraries.PDFLib ||
    !requiredLibraries.jsPDF ||
    !requiredLibraries.JSZip ||
    !requiredLibraries.pdfjsLib
  ) {
    console.error("PDF Toolkit: one or more PDF libraries failed to load.");
    return;
  }

  const { PDFDocument, degrees, rgb } = requiredLibraries.PDFLib;

  const { jsPDF } = window.jspdf;
  const JSZip = window.JSZip;
  const pdfjsLib = window.pdfjsLib;

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "../assets/js/vendor/pdf.worker.min.js";

  const config = {
    mergeFiles: {
      countId: "mergeCount",
      emptyText: "No files selected",
      mode: "multi-pdf",
    },
    splitFile: {
      countId: "splitCount",
      emptyText: "No file selected",
      mode: "pdf",
    },
    imageFiles: {
      countId: "imageCount",
      emptyText: "No files selected",
      mode: "multi-image",
    },
    pdfJpgFile: {
      countId: "pdfJpgCount",
      emptyText: "No file selected",
      mode: "pdf-pages",
    },
    rotateFile: {
      countId: "rotateCount",
      emptyText: "No file selected",
      mode: "pdf-pages",
    },
    extractFile: {
      countId: "extractCount",
      emptyText: "No file selected",
      mode: "pdf-pages",
    },
    deleteFile: {
      countId: "deleteCount",
      emptyText: "No file selected",
      mode: "pdf-pages",
    },
    pngFile: {
      countId: "pngCount",
      emptyText: "No file selected",
      mode: "pdf-pages",
    },
    watermarkFile: {
      countId: "watermarkCount",
      emptyText: "No file selected",
      mode: "pdf-pages",
    },
    compressFile: {
      countId: "compressCount",
      emptyText: "No file selected",
      mode: "pdf-pages",
    },
    reorderFile: {
      countId: "reorderCount",
      emptyText: "No file selected",
      mode: "pdf-pages",
    },
    numbersFile: {
      countId: "numbersCount",
      emptyText: "No file selected",
      mode: "pdf-pages",
    },
    signPdfFile: {
      countId: "signPdfCount",
      emptyText: "No PDF selected",
      mode: "pdf-pages",
    },
    signatureImageFile: {
      countId: "signatureImageCount",
      emptyText: "No signature image selected",
      mode: "image",
    },
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function setMessage(id, text = "", type = "info") {
    const element = byId(id);

    if (!element) {
      return;
    }

    element.textContent = text;
    element.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      element.classList.add(`message-${type}`);
    }
  }

  function notify(id, text, type = "info") {
    setMessage(id, text, type);

    if (text && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "0 KB";
    }

    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  async function getPdfPageCount(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buffer);
    return pdf.getPageCount();
  }

  async function updateFileCount(inputId) {
    const input = byId(inputId);
    const item = config[inputId];

    if (!input || !item) {
      return;
    }

    const count = byId(item.countId);
    const files = Array.from(input.files ?? []);

    if (!count) {
      return;
    }

    if (!files.length) {
      count.textContent = item.emptyText;
      return;
    }

    if (item.mode === "multi-pdf") {
      const total = files.reduce((sum, file) => sum + file.size, 0);
      count.textContent = `${files.length} PDF files selected • ${formatFileSize(total)}`;
      return;
    }

    if (item.mode === "multi-image") {
      const total = files.reduce((sum, file) => sum + file.size, 0);
      count.textContent = `${files.length} image files selected • ${formatFileSize(total)}`;
      return;
    }

    if (item.mode === "image") {
      count.textContent = `${files[0].name} • ${formatFileSize(files[0].size)}`;
      return;
    }

    if (item.mode === "pdf") {
      count.textContent = `${files[0].name} • ${formatFileSize(files[0].size)}`;
      return;
    }

    if (item.mode === "pdf-pages") {
      count.textContent = `${files[0].name} • ${formatFileSize(files[0].size)} • reading pages...`;

      try {
        const pageCount = await getPdfPageCount(files[0]);
        count.textContent = `${files[0].name} • ${formatFileSize(files[0].size)} • ${pageCount} pages`;
      } catch {
        count.textContent = `${files[0].name} • ${formatFileSize(files[0].size)} • unable to read pages`;
      }
    }
  }

  function setInputFiles(input, files) {
    const transfer = new DataTransfer();

    Array.from(files).forEach((file) => {
      transfer.items.add(file);
    });

    input.files = transfer.files;
  }

  function setupDropZones() {
    document.querySelectorAll("[data-drop-target]").forEach((zone) => {
      const inputId = zone.dataset.dropTarget;
      const input = byId(inputId);

      if (!input) {
        return;
      }

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

      zone.addEventListener("dragleave", () => {
        zone.classList.remove("dragover");
      });

      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("dragover");

        if (event.dataTransfer?.files?.length) {
          setInputFiles(input, event.dataTransfer.files);
          void updateFileCount(inputId);
        }
      });

      input.addEventListener("change", () => {
        void updateFileCount(inputId);
      });
    });
  }

  function switchTool() {
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== toolSelector.value;
    });
  }

  function clearFileInput(inputId) {
    const input = byId(inputId);
    const item = config[inputId];

    if (input) {
      input.value = "";
    }

    if (item) {
      const count = byId(item.countId);

      if (count) {
        count.textContent = item.emptyText;
      }
    }
  }

  function downloadBlob(blob, fileName) {
    if (typeof window.downloadFile === "function") {
      window.downloadFile(
        fileName,
        blob,
        blob.type || "application/octet-stream",
      );
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.hidden = true;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function parsePageSelection(value, pageCount, allowRange = true) {
    const text = value.trim();

    if (!text) {
      return [];
    }

    const pages = [];

    text.split(",").forEach((token) => {
      const item = token.trim();

      if (!item) {
        return;
      }

      if (allowRange && item.includes("-")) {
        const match = item.match(/^(\d+)\s*-\s*(\d+)$/);

        if (!match) {
          throw new Error("Invalid page range.");
        }

        const start = Number(match[1]);
        const end = Number(match[2]);

        if (
          !Number.isInteger(start) ||
          !Number.isInteger(end) ||
          start < 1 ||
          end > pageCount ||
          start > end
        ) {
          throw new Error("Invalid page range.");
        }

        for (let page = start; page <= end; page += 1) {
          pages.push(page - 1);
        }
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

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Unable to create image."));
          }
        },
        type,
        quality,
      );
    });
  }

  async function renderPdfPage(page, scale) {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is unavailable.");
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    return {
      canvas,
      viewport,
    };
  }

  async function mergePdf() {
    const files = Array.from(byId("mergeFiles").files ?? []);

    if (files.length < 2) {
      notify("mergeMessage", "Please select at least two PDF files.", "error");
      return;
    }

    try {
      setMessage("mergeMessage", "Merging PDF files...", "info");

      const merged = await PDFDocument.create();

      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const pages = await merged.copyPages(source, source.getPageIndices());

        pages.forEach((page) => merged.addPage(page));
      }

      const bytes = await merged.save();

      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        "merged-document.pdf",
      );

      notify("mergeMessage", "PDF files merged successfully.", "success");
    } catch (error) {
      console.error(error);
      notify("mergeMessage", "Unable to merge PDF files.", "error");
    }
  }

  async function splitPdf() {
    const file = byId("splitFile").files?.[0];

    if (!file) {
      notify("splitMessage", "Please select one PDF file.", "error");
      return;
    }

    try {
      setMessage("splitMessage", "Processing PDF pages...", "info");

      const source = await PDFDocument.load(await file.arrayBuffer());
      const pageCount = source.getPageCount();
      const mode = byId("splitMode").value;
      const input = byId("splitPages").value;

      let pages = [];

      if (mode === "all") {
        pages = Array.from({ length: pageCount }, (_, index) => index);
      } else if (mode === "range") {
        pages = parsePageSelection(input, pageCount, true);

        if (pages.length === 0 || !input.includes("-")) {
          throw new Error("Please enter a valid range, for example 1-3.");
        }
      } else {
        pages = parsePageSelection(input, pageCount, false);

        if (!pages.length) {
          throw new Error("Please enter valid pages, for example 1,3,5.");
        }
      }

      const zip = new JSZip();

      for (const index of pages) {
        const result = await PDFDocument.create();
        const [page] = await result.copyPages(source, [index]);

        result.addPage(page);

        zip.file(`page-${index + 1}.pdf`, await result.save());
      }

      downloadBlob(
        await zip.generateAsync({ type: "blob" }),
        "split-pages.zip",
      );

      notify("splitMessage", "PDF pages extracted successfully.", "success");
    } catch (error) {
      console.error(error);
      notify(
        "splitMessage",
        error instanceof Error ? error.message : "Unable to split PDF file.",
        "error",
      );
    }
  }

  async function imagesToPdf() {
    const files = Array.from(byId("imageFiles").files ?? []);

    if (!files.length) {
      notify("imageMessage", "Please select at least one image file.", "error");
      return;
    }

    try {
      setMessage("imageMessage", "Converting images to PDF...", "info");

      const pdf = new jsPDF();

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const dataUrl = await fileToDataUrl(file);
        const image = await loadImage(dataUrl);

        const pageWidth = 210;
        const pageHeight = 297;

        let width = pageWidth;
        let height = (image.height * width) / image.width;

        if (height > pageHeight) {
          height = pageHeight;
          width = (image.width * height) / image.height;
        }

        if (index > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          dataUrl,
          file.type === "image/png" ? "PNG" : "JPEG",
          (pageWidth - width) / 2,
          (pageHeight - height) / 2,
          width,
          height,
        );
      }

      pdf.save("images-to-pdf.pdf");

      notify(
        "imageMessage",
        "Images converted to PDF successfully.",
        "success",
      );
    } catch (error) {
      console.error(error);
      notify("imageMessage", "Unable to convert images to PDF.", "error");
    }
  }

  async function pdfToImages(format) {
    const inputId = format === "jpg" ? "pdfJpgFile" : "pngFile";
    const messageId = format === "jpg" ? "pdfJpgMessage" : "pngMessage";
    const file = byId(inputId).files?.[0];

    if (!file) {
      notify(messageId, "Please select one PDF file.", "error");
      return;
    }

    try {
      setMessage(
        messageId,
        `Converting PDF pages to ${format.toUpperCase()}...`,
        "info",
      );

      const pdf = await pdfjsLib.getDocument({
        data: await file.arrayBuffer(),
      }).promise;

      const zip = new JSZip();

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const { canvas } = await renderPdfPage(page, 2);

        const blob =
          format === "jpg"
            ? await canvasToBlob(canvas, "image/jpeg", 0.95)
            : await canvasToBlob(canvas, "image/png");

        zip.file(`page-${pageNumber}.${format}`, blob);
      }

      downloadBlob(
        await zip.generateAsync({ type: "blob" }),
        `pdf-to-${format}.zip`,
      );

      notify(
        messageId,
        `PDF converted to ${format.toUpperCase()} successfully.`,
        "success",
      );
    } catch (error) {
      console.error(error);
      notify(
        messageId,
        `Unable to convert PDF to ${format.toUpperCase()}.`,
        "error",
      );
    }
  }

  async function rotatePdf() {
    const file = byId("rotateFile").files?.[0];

    if (!file) {
      notify("rotateMessage", "Please select one PDF file.", "error");
      return;
    }

    try {
      setMessage("rotateMessage", "Rotating PDF...", "info");

      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const angle = Number(byId("rotateAngle").value);

      pdf.getPages().forEach((page) => {
        page.setRotation(degrees((page.getRotation().angle + angle) % 360));
      });

      const bytes = await pdf.save();

      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        "rotated-document.pdf",
      );

      notify("rotateMessage", "PDF rotated successfully.", "success");
    } catch (error) {
      console.error(error);
      notify("rotateMessage", "Unable to rotate PDF.", "error");
    }
  }

  async function extractPages() {
    const file = byId("extractFile").files?.[0];

    if (!file) {
      notify("extractMessage", "Please select one PDF file.", "error");
      return;
    }

    try {
      setMessage("extractMessage", "Extracting pages...", "info");

      const source = await PDFDocument.load(await file.arrayBuffer());
      const pages = parsePageSelection(
        byId("extractPages").value,
        source.getPageCount(),
        true,
      );

      if (!pages.length) {
        throw new Error("Please enter valid page numbers.");
      }

      const result = await PDFDocument.create();
      const copied = await result.copyPages(source, pages);

      copied.forEach((page) => result.addPage(page));

      downloadBlob(
        new Blob([await result.save()], { type: "application/pdf" }),
        "extracted-pages.pdf",
      );

      notify("extractMessage", "Pages extracted successfully.", "success");
    } catch (error) {
      console.error(error);
      notify(
        "extractMessage",
        error instanceof Error ? error.message : "Unable to extract pages.",
        "error",
      );
    }
  }

  async function deletePages() {
    const file = byId("deleteFile").files?.[0];

    if (!file) {
      notify("deleteMessage", "Please select one PDF file.", "error");
      return;
    }

    try {
      setMessage("deleteMessage", "Deleting pages...", "info");

      const source = await PDFDocument.load(await file.arrayBuffer());
      const pageCount = source.getPageCount();
      const pagesToDelete = parsePageSelection(
        byId("deletePages").value,
        pageCount,
        true,
      );

      if (!pagesToDelete.length) {
        throw new Error("Please enter valid pages to delete.");
      }

      const deleteSet = new Set(pagesToDelete);
      const keep = Array.from(
        { length: pageCount },
        (_, index) => index,
      ).filter((index) => !deleteSet.has(index));

      if (!keep.length) {
        throw new Error("You cannot delete all pages.");
      }

      const result = await PDFDocument.create();
      const copied = await result.copyPages(source, keep);

      copied.forEach((page) => result.addPage(page));

      downloadBlob(
        new Blob([await result.save()], { type: "application/pdf" }),
        "cleaned-document.pdf",
      );

      notify("deleteMessage", "Pages deleted successfully.", "success");
    } catch (error) {
      console.error(error);
      notify(
        "deleteMessage",
        error instanceof Error ? error.message : "Unable to delete pages.",
        "error",
      );
    }
  }

  async function watermarkPdf() {
    const file = byId("watermarkFile").files?.[0];
    const text = byId("watermarkText").value.trim();
    const size = Number(byId("watermarkSize").value);

    if (!file) {
      notify("watermarkMessage", "Please select one PDF file.", "error");
      return;
    }

    if (!text) {
      notify("watermarkMessage", "Please enter watermark text.", "error");
      return;
    }

    if (!Number.isFinite(size) || size < 10 || size > 120) {
      notify(
        "watermarkMessage",
        "Watermark size must be between 10 and 120.",
        "error",
      );
      return;
    }

    try {
      setMessage("watermarkMessage", "Applying watermark...", "info");

      const pdf = await PDFDocument.load(await file.arrayBuffer());

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

      downloadBlob(
        new Blob([await pdf.save()], { type: "application/pdf" }),
        "watermarked-document.pdf",
      );

      notify("watermarkMessage", "Watermark added successfully.", "success");
    } catch (error) {
      console.error(error);
      notify("watermarkMessage", "Unable to add watermark.", "error");
    }
  }

  async function compressPdf() {
    const file = byId("compressFile").files?.[0];

    if (!file) {
      notify("compressMessage", "Please select one PDF file.", "error");
      return;
    }

    try {
      setMessage("compressMessage", "Compressing PDF...", "info");

      const level = byId("compressLevel").value;

      const settings = {
        low: { scale: 1.5, quality: 0.8 },
        medium: { scale: 1.2, quality: 0.65 },
        high: { scale: 0.9, quality: 0.45 },
      }[level];

      const source = await pdfjsLib.getDocument({
        data: await file.arrayBuffer(),
      }).promise;

      let result = null;

      for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
        const page = await source.getPage(pageNumber);
        const { canvas, viewport } = await renderPdfPage(page, settings.scale);

        const dataUrl = canvas.toDataURL("image/jpeg", settings.quality);

        const orientation =
          viewport.width > viewport.height ? "landscape" : "portrait";

        if (!result) {
          result = new jsPDF({
            orientation,
            unit: "pt",
            format: [viewport.width, viewport.height],
          });
        } else {
          result.addPage([viewport.width, viewport.height], orientation);
        }

        result.addImage(dataUrl, "JPEG", 0, 0, viewport.width, viewport.height);
      }

      if (!result) {
        throw new Error("Unable to rebuild PDF.");
      }

      const blob = result.output("blob");
      const reduction = Math.round((1 - blob.size / file.size) * 100);

      downloadBlob(blob, "compressed-document.pdf");

      notify(
        "compressMessage",
        `Compression complete. Original: ${formatFileSize(file.size)} • Output: ${formatFileSize(blob.size)} • ${
          reduction > 0 ? `Reduction: ${reduction}%` : "No size reduction"
        }`,
        "success",
      );
    } catch (error) {
      console.error(error);
      notify("compressMessage", "Unable to compress PDF.", "error");
    }
  }

  async function reorderPages() {
    const file = byId("reorderFile").files?.[0];

    if (!file) {
      notify("reorderMessage", "Please select one PDF file.", "error");
      return;
    }

    try {
      setMessage("reorderMessage", "Reordering pages...", "info");

      const source = await PDFDocument.load(await file.arrayBuffer());
      const pageCount = source.getPageCount();

      const values = byId("reorderPages")
        .value.split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item));

      if (!values.length) {
        throw new Error("Please enter a valid page order.");
      }

      if (new Set(values).size !== values.length) {
        throw new Error("Duplicate page numbers are not allowed.");
      }

      if (values.some((page) => page < 1 || page > pageCount)) {
        throw new Error("One or more page numbers are invalid.");
      }

      const result = await PDFDocument.create();
      const copied = await result.copyPages(
        source,
        values.map((page) => page - 1),
      );

      copied.forEach((page) => result.addPage(page));

      downloadBlob(
        new Blob([await result.save()], { type: "application/pdf" }),
        "reordered-document.pdf",
      );

      notify("reorderMessage", "Pages reordered successfully.", "success");
    } catch (error) {
      console.error(error);
      notify(
        "reorderMessage",
        error instanceof Error ? error.message : "Unable to reorder pages.",
        "error",
      );
    }
  }

  async function addPageNumbers() {
    const file = byId("numbersFile").files?.[0];

    if (!file) {
      notify("numbersMessage", "Please select one PDF file.", "error");
      return;
    }

    const startNumber = Number(byId("numbersStart").value);

    if (!Number.isInteger(startNumber) || startNumber < 1) {
      notify("numbersMessage", "Start number must be at least 1.", "error");
      return;
    }

    try {
      setMessage("numbersMessage", "Adding page numbers...", "info");

      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const position = byId("numbersPosition").value;

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

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      });

      downloadBlob(
        new Blob([await pdf.save()], { type: "application/pdf" }),
        "numbered-document.pdf",
      );

      notify("numbersMessage", "Page numbers added successfully.", "success");
    } catch (error) {
      console.error(error);
      notify("numbersMessage", "Unable to add page numbers.", "error");
    }
  }

  const signatureCanvas = byId("signatureCanvas");
  const signatureContext = signatureCanvas?.getContext("2d");
  let signatureDrawing = false;

  function clearSignature() {
    if (!signatureCanvas || !signatureContext) {
      return;
    }

    signatureContext.clearRect(
      0,
      0,
      signatureCanvas.width,
      signatureCanvas.height,
    );
  }

  function signaturePositionFromEvent(event) {
    const rect = signatureCanvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (signatureCanvas.width / rect.width),
      y: (event.clientY - rect.top) * (signatureCanvas.height / rect.height),
    };
  }

  function setupSignatureCanvas() {
    if (!signatureCanvas || !signatureContext) {
      return;
    }

    signatureCanvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      signatureDrawing = true;
      signatureCanvas.setPointerCapture(event.pointerId);

      const position = signaturePositionFromEvent(event);

      signatureContext.beginPath();
      signatureContext.moveTo(position.x, position.y);
    });

    signatureCanvas.addEventListener("pointermove", (event) => {
      if (!signatureDrawing) {
        return;
      }

      event.preventDefault();

      const position = signaturePositionFromEvent(event);

      signatureContext.lineWidth = 3;
      signatureContext.lineCap = "round";
      signatureContext.strokeStyle = "#111827";
      signatureContext.lineTo(position.x, position.y);
      signatureContext.stroke();
    });

    const stop = (event) => {
      if (signatureDrawing) {
        signatureDrawing = false;

        if (signatureCanvas.hasPointerCapture(event.pointerId)) {
          signatureCanvas.releasePointerCapture(event.pointerId);
        }
      }
    };

    signatureCanvas.addEventListener("pointerup", stop);
    signatureCanvas.addEventListener("pointercancel", stop);
  }

  function signatureCanvasHasInk() {
    if (!signatureContext || !signatureCanvas) {
      return false;
    }

    const pixels = signatureContext.getImageData(
      0,
      0,
      signatureCanvas.width,
      signatureCanvas.height,
    ).data;

    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] !== 0) {
        return true;
      }
    }

    return false;
  }

  function updateSignatureMethod() {
    const upload = byId("signMethod").value === "upload";

    byId("drawSignatureArea").hidden = upload;
    byId("uploadSignatureArea").hidden = !upload;
  }

  async function signPdf() {
    const file = byId("signPdfFile").files?.[0];

    if (!file) {
      notify("signMessage", "Please select one PDF file.", "error");
      return;
    }

    const pageNumber = Number(byId("signaturePage").value);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      notify("signMessage", "Please enter a valid page number.", "error");
      return;
    }

    try {
      setMessage("signMessage", "Signing PDF...", "info");

      const pdf = await PDFDocument.load(await file.arrayBuffer());

      if (pageNumber > pdf.getPageCount()) {
        throw new Error("Page number is higher than the PDF page count.");
      }

      let signatureImage;

      if (byId("signMethod").value === "draw") {
        if (!signatureCanvasHasInk()) {
          throw new Error("Please draw a signature first.");
        }

        const blob = await canvasToBlob(signatureCanvas, "image/png");
        signatureImage = await pdf.embedPng(await blob.arrayBuffer());
      } else {
        const imageFile = byId("signatureImageFile").files?.[0];

        if (!imageFile) {
          throw new Error("Please select a signature image.");
        }

        const bytes = await imageFile.arrayBuffer();

        signatureImage =
          imageFile.type === "image/png"
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);
      }

      const page = pdf.getPages()[pageNumber - 1];
      const { width, height } = page.getSize();
      const signatureWidth = 180;
      const signatureHeight = 70;

      const positions = {
        "bottom-right": [width - signatureWidth - 30, 30],
        "bottom-left": [30, 30],
        "top-right": [
          width - signatureWidth - 30,
          height - signatureHeight - 30,
        ],
        "top-left": [30, height - signatureHeight - 30],
      };

      const [x, y] = positions[byId("signaturePosition").value];

      page.drawImage(signatureImage, {
        x,
        y,
        width: signatureWidth,
        height: signatureHeight,
      });

      downloadBlob(
        new Blob([await pdf.save()], { type: "application/pdf" }),
        "signed-document.pdf",
      );

      notify("signMessage", "PDF signed successfully.", "success");
    } catch (error) {
      console.error(error);
      notify(
        "signMessage",
        error instanceof Error ? error.message : "Unable to sign PDF.",
        "error",
      );
    }
  }

  function notifyCleared() {
    /* Shared Core handles the standard Clear toast. */
  }

  function clearMerge() {
    clearFileInput("mergeFiles");
    setMessage("mergeMessage");
    notifyCleared();
  }

  function clearSplit() {
    clearFileInput("splitFile");
    byId("splitMode").value = "all";
    byId("splitPages").value = "";
    setMessage("splitMessage");
    notifyCleared();
  }

  function clearImages() {
    clearFileInput("imageFiles");
    setMessage("imageMessage");
    notifyCleared();
  }

  function clearPdfJpg() {
    clearFileInput("pdfJpgFile");
    setMessage("pdfJpgMessage");
    notifyCleared();
  }

  function clearRotate() {
    clearFileInput("rotateFile");
    byId("rotateAngle").value = "90";
    setMessage("rotateMessage");
    notifyCleared();
  }

  function clearExtract() {
    clearFileInput("extractFile");
    byId("extractPages").value = "";
    setMessage("extractMessage");
    notifyCleared();
  }

  function clearDelete() {
    clearFileInput("deleteFile");
    byId("deletePages").value = "";
    setMessage("deleteMessage");
    notifyCleared();
  }

  function clearPng() {
    clearFileInput("pngFile");
    setMessage("pngMessage");
    notifyCleared();
  }

  function clearWatermark() {
    clearFileInput("watermarkFile");
    byId("watermarkText").value = "";
    byId("watermarkSize").value = "40";
    setMessage("watermarkMessage");
    notifyCleared();
  }

  function clearCompress() {
    clearFileInput("compressFile");
    byId("compressLevel").value = "low";
    setMessage("compressMessage");
    notifyCleared();
  }

  function clearReorder() {
    clearFileInput("reorderFile");
    byId("reorderPages").value = "";
    setMessage("reorderMessage");
    notifyCleared();
  }

  function clearNumbers() {
    clearFileInput("numbersFile");
    byId("numbersPosition").value = "bottom-center";
    byId("numbersStart").value = "1";
    setMessage("numbersMessage");
    notifyCleared();
  }

  function clearSign() {
    clearFileInput("signPdfFile");
    clearFileInput("signatureImageFile");

    byId("signaturePage").value = "1";
    byId("signaturePosition").value = "bottom-right";
    byId("signMethod").value = "draw";

    clearSignature();
    updateSignatureMethod();
    setMessage("signMessage");
    notifyCleared();
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
    byId(id).addEventListener("click", () => {
      void handler();
    });
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
  ].forEach(([id, handler]) => {
    byId(id).addEventListener("click", handler);
  });

  function clearPanelMessageFromElement(element) {
    const panel = element.closest(".pdf-tool-panel");

    if (!panel) {
      return;
    }

    const message = panel.querySelector(".message");

    if (message) {
      message.textContent = "";
      message.classList.remove(
        "message-success",
        "message-error",
        "message-info",
      );
    }
  }

  document
    .querySelectorAll(".pdf-tool-panel input, .pdf-tool-panel select")
    .forEach((element) => {
      const eventName =
        element.type === "file" || element.tagName === "SELECT"
          ? "change"
          : "input";

      element.addEventListener(eventName, () => {
        clearPanelMessageFromElement(element);
      });
    });

  updateSignatureMethod();
  switchTool();
}

initPdfToolkit();
