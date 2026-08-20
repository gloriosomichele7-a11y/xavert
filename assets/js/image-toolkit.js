"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "image-toolkit") {
    return;
  }

  const toolSelector = document.getElementById("toolSelector");
  const downloadFormat = document.getElementById("downloadFormat");
  const dropZone = document.getElementById("dropZone");
  const imageFile = document.getElementById("imageFile");
  const fileInfo = document.getElementById("fileInfo");

  const resizeWidth = document.getElementById("resizeWidth");
  const resizeHeight = document.getElementById("resizeHeight");
  const cropWidth = document.getElementById("cropWidth");
  const cropHeight = document.getElementById("cropHeight");
  const compressQuality = document.getElementById("compressQuality");
  const outputFormat = document.getElementById("outputFormat");
  const rotateAngle = document.getElementById("rotateAngle");
  const flipDirection = document.getElementById("flipDirection");
  const watermarkText = document.getElementById("watermarkText");
  const watermarkSize = document.getElementById("watermarkSize");

  const processBtn = document.getElementById("processBtn");
  const clearBtn = document.getElementById("clearBtn");

  const resultBox = document.getElementById("resultBox");
  const preview = document.getElementById("preview");
  const imageStats = document.getElementById("imageStats");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyImageBtn = document.getElementById("copyImageBtn");
  const message = document.getElementById("message");

  const optionSections = {
    resize: document.getElementById("resizeOptions"),
    crop: document.getElementById("cropOptions"),
    compress: document.getElementById("compressOptions"),
    convert: document.getElementById("convertOptions"),
    rotate: document.getElementById("rotateOptions"),
    flip: document.getElementById("flipOptions"),
    watermark: document.getElementById("watermarkOptions"),
  };

  const requiredElements = {
    toolSelector,
    downloadFormat,
    dropZone,
    imageFile,
    fileInfo,
    resizeWidth,
    resizeHeight,
    cropWidth,
    cropHeight,
    compressQuality,
    outputFormat,
    rotateAngle,
    flipDirection,
    watermarkText,
    watermarkSize,
    processBtn,
    clearBtn,
    resultBox,
    preview,
    imageStats,
    downloadBtn,
    copyImageBtn,
    message,
    ...optionSections,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error("Image Toolkit initialization failed.", missingElements);
    return;
  }

  const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

  const MAX_IMAGE_FILE_SIZE = 25 * 1024 * 1024;
  const MAX_CANVAS_DIMENSION = 16384;
  const MAX_CANVAS_PIXELS = 100_000_000;

  let selectedFile = null;
  let selectedImage = null;
  let processedBlob = null;
  let processedFileName = "";
  let processedMimeType = "";
  let previewUrl = "";
  let generationToken = 0;

  function setInlineMessage(text = "", type = "info") {
    const allowedTypes = ["success", "error", "info"];
    const safeType = allowedTypes.includes(type) ? type : "info";

    message.textContent = text;
    message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      message.classList.add(`message-${safeType}`);
    }
  }

  function notify(text = "", type = "info", useToast = true) {
    setInlineMessage(text, type);

    if (text && useToast && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );

    const value = bytes / 1024 ** index;
    const digits = index === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;

    return `${value.toFixed(digits)} ${units[index]}`;
  }

  function getExtension(mimeType) {
    if (mimeType === "image/png") {
      return "png";
    }

    if (mimeType === "image/webp") {
      return "webp";
    }

    return "jpg";
  }

  function getCleanName(fileName) {
    return (
      fileName
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "image"
    );
  }

  function revokePreviewUrl() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }
  }

  function resetResult() {
    processedBlob = null;
    processedFileName = "";
    processedMimeType = "";

    revokePreviewUrl();

    preview.replaceChildren();
    imageStats.textContent = "";
    resultBox.hidden = true;

    downloadBtn.disabled = true;
    copyImageBtn.disabled = true;
  }

  function invalidateProcessing() {
    generationToken += 1;
    resetResult();
    setInlineMessage("");
  }

  function updateToolOptions() {
    Object.values(optionSections).forEach((section) => {
      section.hidden = true;
    });

    const active = optionSections[toolSelector.value];

    if (active) {
      active.hidden = false;
    }
  }

  function validateFile(file) {
    if (!file) {
      return "Select one image first.";
    }

    if (!SUPPORTED_TYPES.has(file.type)) {
      return "Only PNG, JPEG and WebP images are supported.";
    }

    if (file.size === 0) {
      return "The selected image is empty.";
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return "The image must be smaller than 25 MB.";
    }

    return "";
  }

  function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Unable to decode image."));
      };

      image.src = url;
    });
  }

  function validateCanvasSize(width, height) {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 1 ||
      height < 1
    ) {
      throw new Error("Invalid output dimensions.");
    }

    if (
      width > MAX_CANVAS_DIMENSION ||
      height > MAX_CANVAS_DIMENSION ||
      width * height > MAX_CANVAS_PIXELS
    ) {
      throw new Error(
        "The requested output is too large for safe browser processing.",
      );
    }
  }

  function createCanvas(width, height) {
    validateCanvasSize(width, height);

    const canvas = document.createElement("canvas");

    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is unavailable in this browser.");
    }

    return {
      canvas,
      context,
    };
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to create output image."));
            return;
          }

          if (!blob.type.startsWith("image/")) {
            reject(
              new Error(
                "The browser could not create the requested image format.",
              ),
            );
            return;
          }

          resolve(blob);
        },
        mimeType,
        quality,
      );
    });
  }

  async function setSelectedFile(file) {
    generationToken += 1;

    const error = validateFile(file);

    if (error) {
      selectedFile = null;
      selectedImage = null;
      imageFile.value = "";
      fileInfo.textContent = "No image selected";
      resetResult();
      notify(error, "error");
      return;
    }

    const token = generationToken;

    try {
      const image = await loadImageFromBlob(file);

      if (token !== generationToken) {
        return;
      }

      selectedFile = file;
      selectedImage = image;

      fileInfo.textContent =
        `${file.name} • ${formatFileSize(file.size)} • ` +
        `${image.naturalWidth}×${image.naturalHeight} px`;

      resetResult();
      setInlineMessage("");
    } catch (loadError) {
      console.error(loadError);

      selectedFile = null;
      selectedImage = null;
      imageFile.value = "";
      fileInfo.textContent = "No image selected";
      resetResult();

      notify("Unable to read the selected image.", "error");
    }
  }

  function getOriginalOutputType() {
    return selectedFile?.type === "image/png"
      ? "image/png"
      : selectedFile?.type === "image/webp"
        ? "image/webp"
        : "image/jpeg";
  }

  function buildOutputName(prefix, mimeType) {
    const baseName = getCleanName(selectedFile?.name ?? "image");

    return `XAVERT-${prefix}-${baseName}.${getExtension(mimeType)}`;
  }

  function drawImageOnCanvas(image, width, height) {
    const { canvas, context } = createCanvas(width, height);

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      canvas,
      context,
    };
  }

  async function processResize() {
    let width = Number(resizeWidth.value);
    let height = Number(resizeHeight.value);

    if (!width && !height) {
      throw new Error("Enter at least width or height.");
    }

    if (width && (!Number.isInteger(width) || width < 1)) {
      throw new Error("Width must be a positive whole number.");
    }

    if (height && (!Number.isInteger(height) || height < 1)) {
      throw new Error("Height must be a positive whole number.");
    }

    if (!width) {
      width = Math.round(
        (selectedImage.naturalWidth * height) / selectedImage.naturalHeight,
      );
    }

    if (!height) {
      height = Math.round(
        (selectedImage.naturalHeight * width) / selectedImage.naturalWidth,
      );
    }

    const { canvas } = drawImageOnCanvas(selectedImage, width, height);

    const mimeType = getOriginalOutputType();

    return {
      blob: await canvasToBlob(canvas, mimeType, 0.92),
      mimeType,
      fileName: buildOutputName("Resized", mimeType),
      width: canvas.width,
      height: canvas.height,
    };
  }

  async function processCrop() {
    const width = Number(cropWidth.value);
    const height = Number(cropHeight.value);

    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1
    ) {
      throw new Error("Enter valid crop width and height.");
    }

    if (
      width > selectedImage.naturalWidth ||
      height > selectedImage.naturalHeight
    ) {
      throw new Error("Crop dimensions cannot exceed the original image.");
    }

    const { canvas, context } = createCanvas(width, height);

    const startX = Math.floor((selectedImage.naturalWidth - width) / 2);

    const startY = Math.floor((selectedImage.naturalHeight - height) / 2);

    context.drawImage(
      selectedImage,
      startX,
      startY,
      width,
      height,
      0,
      0,
      width,
      height,
    );

    const mimeType = getOriginalOutputType();

    return {
      blob: await canvasToBlob(canvas, mimeType, 0.92),
      mimeType,
      fileName: buildOutputName("Cropped", mimeType),
      width,
      height,
    };
  }

  async function processCompress() {
    const qualityValue = Number(compressQuality.value);

    if (
      !Number.isInteger(qualityValue) ||
      qualityValue < 10 ||
      qualityValue > 100
    ) {
      throw new Error("Quality must be between 10 and 100.");
    }

    const { canvas, context } = createCanvas(
      selectedImage.naturalWidth,
      selectedImage.naturalHeight,
    );

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(selectedImage, 0, 0);

    const mimeType = "image/jpeg";

    return {
      blob: await canvasToBlob(canvas, mimeType, qualityValue / 100),
      mimeType,
      fileName: buildOutputName("Compressed", mimeType),
      width: canvas.width,
      height: canvas.height,
    };
  }

  async function processConvert() {
    const mimeType = outputFormat.value;

    if (!SUPPORTED_TYPES.has(mimeType)) {
      throw new Error("Unsupported output format.");
    }

    const { canvas, context } = createCanvas(
      selectedImage.naturalWidth,
      selectedImage.naturalHeight,
    );

    if (mimeType === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(selectedImage, 0, 0);

    return {
      blob: await canvasToBlob(canvas, mimeType, 0.92),
      mimeType,
      fileName: buildOutputName("Converted", mimeType),
      width: canvas.width,
      height: canvas.height,
    };
  }

  async function processRotate() {
    const angle = Number(rotateAngle.value);

    if (![90, 180, 270].includes(angle)) {
      throw new Error("Unsupported rotation angle.");
    }

    const swapped = angle === 90 || angle === 270;

    const width = swapped
      ? selectedImage.naturalHeight
      : selectedImage.naturalWidth;

    const height = swapped
      ? selectedImage.naturalWidth
      : selectedImage.naturalHeight;

    const { canvas, context } = createCanvas(width, height);

    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((angle * Math.PI) / 180);
    context.drawImage(
      selectedImage,
      -selectedImage.naturalWidth / 2,
      -selectedImage.naturalHeight / 2,
    );

    const mimeType = getOriginalOutputType();

    return {
      blob: await canvasToBlob(canvas, mimeType, 0.92),
      mimeType,
      fileName: buildOutputName("Rotated", mimeType),
      width,
      height,
    };
  }

  async function processFlip() {
    const direction = flipDirection.value;

    if (!["horizontal", "vertical"].includes(direction)) {
      throw new Error("Unsupported flip direction.");
    }

    const { canvas, context } = createCanvas(
      selectedImage.naturalWidth,
      selectedImage.naturalHeight,
    );

    if (direction === "horizontal") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    } else {
      context.translate(0, canvas.height);
      context.scale(1, -1);
    }

    context.drawImage(selectedImage, 0, 0);

    const mimeType = getOriginalOutputType();

    return {
      blob: await canvasToBlob(canvas, mimeType, 0.92),
      mimeType,
      fileName: buildOutputName("Flipped", mimeType),
      width: canvas.width,
      height: canvas.height,
    };
  }

  async function processWatermark() {
    const text = watermarkText.value.trim();
    const size = Number(watermarkSize.value);

    if (!text) {
      throw new Error("Enter watermark text.");
    }

    if (!Number.isFinite(size) || size < 10 || size > 120) {
      throw new Error("Watermark size must be between 10 and 120.");
    }

    const { canvas, context } = drawImageOnCanvas(
      selectedImage,
      selectedImage.naturalWidth,
      selectedImage.naturalHeight,
    );

    context.font = `${size}px Arial`;
    context.textBaseline = "bottom";
    context.fillStyle = "rgba(255,255,255,.72)";
    context.strokeStyle = "rgba(0,0,0,.45)";
    context.lineWidth = Math.max(1, size / 20);

    const metrics = context.measureText(text);
    const margin = Math.max(20, size * 0.75);

    const x = Math.max(margin, canvas.width - metrics.width - margin);

    const y = Math.max(margin + size, canvas.height - margin);

    context.strokeText(text, x, y);
    context.fillText(text, x, y);

    const mimeType = getOriginalOutputType();

    return {
      blob: await canvasToBlob(canvas, mimeType, 0.92),
      mimeType,
      fileName: buildOutputName("Watermarked", mimeType),
      width: canvas.width,
      height: canvas.height,
    };
  }

  async function processGrayscale() {
    const { canvas, context } = drawImageOnCanvas(
      selectedImage,
      selectedImage.naturalWidth,
      selectedImage.naturalHeight,
    );

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const data = imageData.data;

    for (let index = 0; index < data.length; index += 4) {
      const gray = Math.round(
        data[index] * 0.2126 +
          data[index + 1] * 0.7152 +
          data[index + 2] * 0.0722,
      );

      data[index] = gray;
      data[index + 1] = gray;
      data[index + 2] = gray;
    }

    context.putImageData(imageData, 0, 0);

    const mimeType = getOriginalOutputType();

    return {
      blob: await canvasToBlob(canvas, mimeType, 0.92),
      mimeType,
      fileName: buildOutputName("Grayscale", mimeType),
      width: canvas.width,
      height: canvas.height,
    };
  }

  async function processMetadata() {
    const { canvas } = drawImageOnCanvas(
      selectedImage,
      selectedImage.naturalWidth,
      selectedImage.naturalHeight,
    );

    const mimeType = getOriginalOutputType();

    return {
      blob: await canvasToBlob(canvas, mimeType, 0.92),
      mimeType,
      fileName: buildOutputName("Cleaned", mimeType),
      width: canvas.width,
      height: canvas.height,
    };
  }

  async function processPdf() {
    const jsPdfConstructor = window.jspdf?.jsPDF;

    if (typeof jsPdfConstructor !== "function") {
      throw new Error("PDF support is unavailable.");
    }

    const { canvas, context } = createCanvas(
      selectedImage.naturalWidth,
      selectedImage.naturalHeight,
    );

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(selectedImage, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const landscape = selectedImage.naturalWidth > selectedImage.naturalHeight;

    const pdf = new jsPdfConstructor({
      orientation: landscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const scale = Math.min(
      pageWidth / selectedImage.naturalWidth,
      pageHeight / selectedImage.naturalHeight,
    );

    const width = selectedImage.naturalWidth * scale;
    const height = selectedImage.naturalHeight * scale;

    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    pdf.addImage(dataUrl, "JPEG", x, y, width, height);

    const blob = pdf.output("blob");

    return {
      blob,
      mimeType: "application/pdf",
      fileName: `XAVERT-Image-to-PDF-${getCleanName(selectedFile.name)}.pdf`,
      width: selectedImage.naturalWidth,
      height: selectedImage.naturalHeight,
      isPdf: true,
    };
  }

  async function processImage() {
    if (!selectedFile || !selectedImage) {
      notify("Select one image first.", "error");
      dropZone.focus();
      return;
    }

    const token = ++generationToken;

    processBtn.disabled = true;
    processBtn.setAttribute("aria-busy", "true");

    notify("Processing image...", "info", false);

    try {
      const processors = {
        resize: processResize,
        crop: processCrop,
        compress: processCompress,
        convert: processConvert,
        rotate: processRotate,
        flip: processFlip,
        watermark: processWatermark,
        grayscale: processGrayscale,
        metadata: processMetadata,
        pdf: processPdf,
      };

      const processor = processors[toolSelector.value];

      if (!processor) {
        throw new Error("Unsupported image operation.");
      }

      const result = await processor();

      if (token !== generationToken) {
        return;
      }

      processedBlob = result.blob;
      processedMimeType = result.isPdf
        ? "application/pdf"
        : result.blob.type || result.mimeType;

      processedFileName = result.isPdf
        ? result.fileName
        : result.fileName.replace(
            /\.[^/.]+$/,
            `.${getExtension(processedMimeType)}`,
          );

      revokePreviewUrl();
      preview.replaceChildren();

      if (!result.isPdf) {
        previewUrl = URL.createObjectURL(processedBlob);

        const image = document.createElement("img");

        image.src = previewUrl;
        image.alt = "Processed image preview";

        preview.append(image);
      } else {
        const note = document.createElement("p");
        note.textContent = "PDF result ready for download.";
        preview.append(note);
      }

      const originalSize = formatFileSize(selectedFile.size);
      const outputSize = formatFileSize(processedBlob.size);

      let details =
        `${processedFileName} • ${result.width}×${result.height}px • ` +
        `Original: ${originalSize} • Output: ${outputSize}`;

      if (toolSelector.value === "compress" && selectedFile.size > 0) {
        const reduction = Math.round(
          (1 - processedBlob.size / selectedFile.size) * 100,
        );

        details += ` • Reduction: ${reduction}%`;
      }

      imageStats.textContent = details;

      resultBox.hidden = false;
      downloadBtn.disabled = false;
      copyImageBtn.disabled =
        result.isPdf || !window.ClipboardItem || !navigator.clipboard?.write;

      setInlineMessage("Action completed successfully.", "success");

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    } catch (error) {
      console.error("Image processing failed:", error);

      resetResult();

      notify(
        error instanceof Error ? error.message : "Unable to process image.",
        "error",
      );
    } finally {
      if (token === generationToken) {
        processBtn.disabled = false;
        processBtn.removeAttribute("aria-busy");
      }
    }
  }

  async function convertProcessedBlob(mimeType) {
    if (!processedBlob) {
      throw new Error("Process an image first.");
    }

    if (mimeType === "original") {
      return {
        blob: processedBlob,
        mimeType: processedMimeType,
        fileName: processedFileName,
      };
    }

    if (!SUPPORTED_TYPES.has(mimeType)) {
      throw new Error("Unsupported download format.");
    }

    if (!processedMimeType.startsWith("image/")) {
      throw new Error(
        "PDF results cannot be converted to an image format here.",
      );
    }

    const image = await loadImageFromBlob(processedBlob);
    const { canvas, context } = createCanvas(
      image.naturalWidth,
      image.naturalHeight,
    );

    if (mimeType === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(image, 0, 0);

    const blob = await canvasToBlob(canvas, mimeType, 0.92);
    const extension = getExtension(mimeType);

    const fileName =
      processedFileName.replace(/\.[^/.]+$/, "") + `.${extension}`;

    return {
      blob,
      mimeType,
      fileName,
    };
  }

  async function downloadProcessed() {
    if (!processedBlob) {
      notify("Process an image first.", "error");
      return;
    }

    try {
      const converted = await convertProcessedBlob(downloadFormat.value);

      if (typeof window.downloadFile !== "function") {
        throw new Error("Download utility is unavailable.");
      }

      window.downloadFile(
        converted.fileName,
        converted.blob,
        converted.mimeType,
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to download result.",
        "error",
      );
    }
  }

  async function copyProcessedImage() {
    if (!processedBlob || !processedMimeType.startsWith("image/")) {
      notify("Process an image first.", "error");
      return;
    }

    if (!window.ClipboardItem || !navigator.clipboard?.write) {
      notify("Copy image is not supported in this browser.", "error");
      return;
    }

    try {
      let clipboardBlob = processedBlob;

      if (processedMimeType !== "image/png") {
        const image = await loadImageFromBlob(processedBlob);
        const { canvas } = drawImageOnCanvas(
          image,
          image.naturalWidth,
          image.naturalHeight,
        );

        clipboardBlob = await canvasToBlob(canvas, "image/png");
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": clipboardBlob,
        }),
      ]);

      setInlineMessage("Image copied to clipboard.", "success");

      if (typeof window.showMessage === "function") {
        window.showMessage("Image copied to clipboard.", "success");
      }
    } catch (error) {
      console.error("Image clipboard copy failed:", error);

      notify("Copy image is not supported for this result.", "error");
    }
  }

  function clearTool() {
    generationToken += 1;

    selectedFile = null;
    selectedImage = null;

    imageFile.value = "";
    fileInfo.textContent = "No image selected";

    toolSelector.value = "resize";
    downloadFormat.value = "original";

    resizeWidth.value = "";
    resizeHeight.value = "";
    cropWidth.value = "";
    cropHeight.value = "";
    compressQuality.value = "70";
    outputFormat.value = "image/jpeg";
    rotateAngle.value = "90";
    flipDirection.value = "horizontal";
    watermarkText.value = "";
    watermarkSize.value = "40";

    updateToolOptions();
    resetResult();
    setInlineMessage("");
    dropZone.focus();
  }

  toolSelector.addEventListener("change", () => {
    updateToolOptions();
    invalidateProcessing();
  });

  downloadFormat.addEventListener("change", () => {
    setInlineMessage("");
  });

  [
    resizeWidth,
    resizeHeight,
    cropWidth,
    cropHeight,
    compressQuality,
    outputFormat,
    rotateAngle,
    flipDirection,
    watermarkText,
    watermarkSize,
  ].forEach((element) => {
    element.addEventListener("input", invalidateProcessing);
    element.addEventListener("change", invalidateProcessing);
  });

  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      imageFile.click();
    }
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    const files = event.dataTransfer?.files;

    if (!files?.length) {
      return;
    }

    if (files.length !== 1) {
      notify("Drop exactly one image.", "error");
      return;
    }

    void setSelectedFile(files[0]);
  });

  imageFile.addEventListener("change", () => {
    void setSelectedFile(imageFile.files?.[0] ?? null);
  });

  processBtn.addEventListener("click", () => {
    void processImage();
  });

  clearBtn.addEventListener("click", clearTool);

  downloadBtn.addEventListener("click", () => {
    void downloadProcessed();
  });

  copyImageBtn.addEventListener("click", () => {
    void copyProcessedImage();
  });

  updateToolOptions();
  resetResult();
});
