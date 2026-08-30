"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const TRANSFORMERS_URL =
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";
  const MODEL_ID = "onnx-community/ormbg-ONNX";
  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  const $ = (id) => document.getElementById(id);

  const elements = {
    dropZone: $("dropZone"),
    imageInput: $("imageInput"),
    fileInfo: $("fileInfo"),
    backgroundMode: $("backgroundMode"),
    outputFormat: $("outputFormat"),
    customColorGroup: $("customColorGroup"),
    backgroundColor: $("backgroundColor"),
    backgroundColorText: $("backgroundColorText"),
    edgeCleanup: $("edgeCleanup"),
    edgeCleanupValue: $("edgeCleanupValue"),
    autoCrop: $("autoCrop"),
    paddingGroup: $("paddingGroup"),
    cropPadding: $("cropPadding"),
    cropPaddingValue: $("cropPaddingValue"),
    qualityGroup: $("qualityGroup"),
    outputQuality: $("outputQuality"),
    outputQualityValue: $("outputQualityValue"),
    removeBtn: $("removeBtn"),
    replaceBtn: $("replaceBtn"),
    clearBtn: $("clearBtn"),
    progressWrap: $("progressWrap"),
    progressLabel: $("progressLabel"),
    modelProgress: $("modelProgress"),
    message: $("message"),
    resultSection: $("resultSection"),
    originalPreview: $("originalPreview"),
    resultCanvas: $("resultCanvas"),
    dimensionsStat: $("dimensionsStat"),
    fileSizeStat: $("fileSizeStat"),
    processingStat: $("processingStat"),
    modelStat: $("modelStat"),
    downloadBtn: $("downloadBtn"),
    copyImageBtn: $("copyImageBtn"),
    newImageBtn: $("newImageBtn"),
  };

  const requiredElements = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (requiredElements.length > 0) {
    console.error(
      "Background Remover initialization failed. Missing elements:",
      requiredElements,
    );
    return;
  }

  const state = {
    file: null,
    sourceUrl: "",
    sourceWidth: 0,
    sourceHeight: 0,
    sourceFileSize: 0,
    outputWidth: 0,
    outputHeight: 0,
    baseRgba: null,
    transformModule: null,
    segmenter: null,
    modelPromise: null,
    isProcessing: false,
    operationToken: 0,
    lastProcessingMs: 0,
    subjectBoundsCache: null,
    renderFrame: 0,
  };

  function setInlineMessage(text = "", type = "info") {
    const safeType = ["success", "error", "info"].includes(type)
      ? type
      : "info";

    elements.message.textContent = text;
    elements.message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      elements.message.classList.add(`message-${safeType}`);
    }
  }

  function notify(text, type = "info") {
    setInlineMessage(text, type);

    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** exponent;

    return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
  }

  function formatDuration(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
      return "—";
    }

    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)} ms`;
    }

    return `${(milliseconds / 1000).toFixed(milliseconds < 10000 ? 1 : 0)} s`;
  }

  function getPixelLimit() {
    const memory = Number(navigator.deviceMemory || 0);
    const isMobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      Math.min(window.innerWidth, window.innerHeight) < 700;

    if (memory > 0 && memory <= 2) {
      return 8_000_000;
    }

    if (isMobile || (memory > 0 && memory <= 4)) {
      return 12_000_000;
    }

    return 24_000_000;
  }

  function getPixelLimitLabel() {
    return `${Math.round(getPixelLimit() / 1_000_000)} MP`;
  }

  function revokeSourceUrl() {
    if (state.sourceUrl) {
      URL.revokeObjectURL(state.sourceUrl);
      state.sourceUrl = "";
    }
  }

  function resetResult() {
    state.baseRgba = null;
    state.outputWidth = 0;
    state.outputHeight = 0;
    state.lastProcessingMs = 0;
    state.subjectBoundsCache = null;
    elements.resultSection.hidden = true;
    elements.resultCanvas.width = 0;
    elements.resultCanvas.height = 0;
    elements.dimensionsStat.textContent = "—";
    elements.fileSizeStat.textContent = "—";
    elements.processingStat.textContent = "—";
    elements.modelStat.textContent = "ORMBG q8";
  }

  function setProcessing(isProcessing) {
    state.isProcessing = isProcessing;
    elements.removeBtn.disabled = isProcessing || !state.file;
    elements.replaceBtn.disabled = isProcessing;
    elements.clearBtn.disabled = false;
    elements.backgroundMode.disabled = isProcessing;
    elements.outputFormat.disabled = isProcessing;
    elements.backgroundColor.disabled = isProcessing;
    elements.backgroundColorText.disabled = isProcessing;
    elements.edgeCleanup.disabled = isProcessing;
    elements.autoCrop.disabled = isProcessing;
    elements.cropPadding.disabled = isProcessing;
    elements.outputQuality.disabled = isProcessing;
    elements.downloadBtn.disabled = isProcessing || !state.baseRgba;
    elements.copyImageBtn.disabled = isProcessing || !state.baseRgba;
    elements.newImageBtn.disabled = isProcessing;
  }

  function showProgress(label, percent = null) {
    elements.progressWrap.hidden = false;
    elements.progressLabel.textContent = label;

    if (Number.isFinite(percent)) {
      elements.modelProgress.value = Math.max(0, Math.min(100, percent));
    } else {
      elements.modelProgress.removeAttribute("value");
    }
  }

  function hideProgress() {
    elements.progressWrap.hidden = true;
    elements.modelProgress.removeAttribute("value");
  }

  function updateOptionVisibility() {
    elements.customColorGroup.hidden =
      elements.backgroundMode.value !== "custom";
    elements.qualityGroup.hidden = elements.outputFormat.value === "png";
    elements.paddingGroup.hidden = !elements.autoCrop.checked;
    elements.edgeCleanupValue.textContent = `${elements.edgeCleanup.value}%`;
    elements.cropPaddingValue.textContent = `${elements.cropPadding.value}%`;
    elements.outputQualityValue.textContent = `${elements.outputQuality.value}%`;
  }

  function isValidHexColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value.trim());
  }

  function normalizeHexColor(value) {
    const normalized = value.trim();
    return isValidHexColor(normalized) ? normalized.toLowerCase() : null;
  }

  function syncColorFromPicker() {
    elements.backgroundColorText.value = elements.backgroundColor.value;
  }

  function syncColorFromText() {
    const color = normalizeHexColor(elements.backgroundColorText.value);

    if (color) {
      elements.backgroundColor.value = color;
      return true;
    }

    return false;
  }

  async function readImageDimensions(file) {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close?.();
      return dimensions;
    }

    const url = URL.createObjectURL(file);

    try {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function validateFileType(file) {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    return (
      ["image/jpeg", "image/png", "image/webp"].includes(type) ||
      /\.(jpe?g|png|webp)$/.test(name)
    );
  }

  async function selectFile(file) {
    if (!file) {
      return;
    }

    if (!validateFileType(file)) {
      notify("Select a JPG, PNG or WebP image.", "error");
      elements.imageInput.value = "";
      return;
    }

    if (file.size === 0) {
      notify("The selected image is empty.", "error");
      elements.imageInput.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      notify("The selected image must be 25 MB or smaller.", "error");
      elements.imageInput.value = "";
      return;
    }

    let dimensions;

    try {
      dimensions = await readImageDimensions(file);
    } catch (error) {
      console.error("Background Remover image decode failed:", error);
      notify("This image could not be decoded by your browser.", "error");
      elements.imageInput.value = "";
      return;
    }

    const pixels = dimensions.width * dimensions.height;
    const pixelLimit = getPixelLimit();

    if (!dimensions.width || !dimensions.height || pixels <= 0) {
      notify("The selected image has invalid dimensions.", "error");
      elements.imageInput.value = "";
      return;
    }

    if (pixels > pixelLimit) {
      notify(
        `This image is ${Math.round(pixels / 1_000_000)} MP. The safe limit for this device is ${getPixelLimitLabel()}. Resize the image first and try again.`,
        "error",
      );
      elements.imageInput.value = "";
      return;
    }

    state.operationToken += 1;
    state.file = file;
    state.sourceWidth = dimensions.width;
    state.sourceHeight = dimensions.height;
    state.sourceFileSize = file.size;

    revokeSourceUrl();
    state.sourceUrl = URL.createObjectURL(file);
    elements.originalPreview.src = state.sourceUrl;

    resetResult();
    elements.fileInfo.textContent =
      `${file.name} · ${dimensions.width} × ${dimensions.height} · ${formatBytes(file.size)}`;
    elements.removeBtn.disabled = false;
    setInlineMessage("Image ready. Remove the background when you are ready.", "info");
  }

  function handleModelProgress(info) {
    if (!info || typeof info !== "object") {
      return;
    }

    const percent = Number(info.progress);

    if (Number.isFinite(percent)) {
      showProgress(`Downloading AI model… ${Math.round(percent)}%`, percent);
      return;
    }

    if (info.status === "ready" || info.status === "done") {
      showProgress("AI model ready. Starting background removal…");
      return;
    }

    if (info.status === "initiate" || info.status === "download") {
      showProgress("Downloading AI model…");
    }
  }

  async function loadSegmenter() {
    if (state.segmenter) {
      return state.segmenter;
    }

    if (state.modelPromise) {
      return state.modelPromise;
    }

    state.modelPromise = (async () => {
      showProgress("Loading browser AI runtime…");

      const module = await import(TRANSFORMERS_URL);
      state.transformModule = module;

      const { env, pipeline } = module;
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
      env.useBrowserCache = true;

      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = true;

        if (Number.isFinite(navigator.hardwareConcurrency)) {
          env.backends.onnx.wasm.numThreads = Math.max(
            1,
            Math.min(4, Math.floor(navigator.hardwareConcurrency / 2) || 1),
          );
        }
      }

      const segmenter = await pipeline("background-removal", MODEL_ID, {
        device: "wasm",
        dtype: "q8",
        progress_callback: handleModelProgress,
      });

      state.segmenter = segmenter;
      return segmenter;
    })();

    try {
      return await state.modelPromise;
    } finally {
      state.modelPromise = null;
    }
  }

  function extractMaskRawImage(output, RawImage) {
    if (!output || !output.data || !output.width || !output.height) {
      throw new Error("The AI model returned an invalid image mask.");
    }

    if (output.channels === 1) {
      return output.clone ? output.clone() : output;
    }

    if (output.channels !== 2 && output.channels !== 4) {
      throw new Error("The AI model did not return an alpha mask.");
    }

    const alphaOffset = output.channels === 4 ? 3 : 1;
    const alpha = new Uint8ClampedArray(output.width * output.height);

    for (let index = 0; index < alpha.length; index += 1) {
      alpha[index] = output.data[index * output.channels + alphaOffset];
    }

    return new RawImage(alpha, output.width, output.height, 1);
  }

  function cloneRgbaData(rawImage) {
    const expectedLength = rawImage.width * rawImage.height * 4;

    if (rawImage.channels !== 4 || rawImage.data.length !== expectedLength) {
      throw new Error("Unable to create a full-resolution RGBA cutout.");
    }

    return new Uint8ClampedArray(rawImage.data);
  }

  function applyEdgeCleanup(data, amount) {
    if (!amount) {
      return data;
    }

    const result = new Uint8ClampedArray(data);
    const edge = Math.min(0.3, Math.max(0, amount / 100));
    const low = edge;
    const high = 1 - edge;
    const range = Math.max(0.0001, high - low);

    for (let index = 3; index < result.length; index += 4) {
      const alpha = result[index] / 255;

      if (alpha <= low) {
        result[index] = 0;
        continue;
      }

      if (alpha >= high) {
        result[index] = 255;
        continue;
      }

      const normalized = (alpha - low) / range;
      const smoothed = normalized * normalized * (3 - 2 * normalized);
      result[index] = Math.round(smoothed * 255);
    }

    return result;
  }

  function getBackgroundColor() {
    const mode = elements.backgroundMode.value;

    if (mode === "transparent") {
      return null;
    }

    if (mode === "white") {
      return "#ffffff";
    }

    return normalizeHexColor(elements.backgroundColorText.value) || "#ffffff";
  }

  function findSubjectBounds(data, width, height) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    const alphaThreshold = 8;

    for (let y = 0; y < height; y += 1) {
      const rowOffset = y * width * 4;

      for (let x = 0; x < width; x += 1) {
        const alpha = data[rowOffset + x * 4 + 3];

        if (alpha <= alphaThreshold) {
          continue;
        }

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  function getCachedSubjectBounds(cleaned) {
    const cleanup = Number(elements.edgeCleanup.value);

    if (state.subjectBoundsCache?.cleanup === cleanup) {
      return state.subjectBoundsCache.bounds;
    }

    const bounds = findSubjectBounds(cleaned, state.sourceWidth, state.sourceHeight);
    state.subjectBoundsCache = { cleanup, bounds };
    return bounds;
  }

  function getOutputGeometry(cleaned) {
    if (!elements.autoCrop.checked) {
      return {
        x: 0,
        y: 0,
        width: state.sourceWidth,
        height: state.sourceHeight,
      };
    }

    const bounds = getCachedSubjectBounds(cleaned);

    if (!bounds) {
      return {
        x: 0,
        y: 0,
        width: state.sourceWidth,
        height: state.sourceHeight,
      };
    }

    const paddingRatio = Number(elements.cropPadding.value) / 100;
    const padding = Math.round(
      Math.max(bounds.width, bounds.height) * paddingRatio,
    );

    const left = Math.max(0, bounds.x - padding);
    const top = Math.max(0, bounds.y - padding);
    const right = Math.min(
      state.sourceWidth,
      bounds.x + bounds.width + padding,
    );
    const bottom = Math.min(
      state.sourceHeight,
      bounds.y + bounds.height + padding,
    );

    return {
      x: left,
      y: top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    };
  }

  function renderResult() {
    if (!state.baseRgba || !state.sourceWidth || !state.sourceHeight) {
      return;
    }

    const cleaned = applyEdgeCleanup(
      state.baseRgba,
      Number(elements.edgeCleanup.value),
    );
    const geometry = getOutputGeometry(cleaned);
    const canvas = elements.resultCanvas;
    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      throw new Error("Canvas rendering is not supported in this browser.");
    }

    canvas.width = geometry.width;
    canvas.height = geometry.height;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const imageData = new ImageData(
      cleaned,
      state.sourceWidth,
      state.sourceHeight,
    );

    // putImageData clips automatically when auto-crop creates a smaller canvas.
    // This avoids allocating a second full-resolution foreground canvas.
    context.putImageData(imageData, -geometry.x, -geometry.y);

    const backgroundColor = getBackgroundColor();

    if (backgroundColor) {
      context.save();
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();
    }

    state.outputWidth = canvas.width;
    state.outputHeight = canvas.height;
    elements.dimensionsStat.textContent = `${canvas.width} × ${canvas.height}`;
  }

  async function removeBackground() {
    if (!state.file) {
      notify("Choose an image first.", "error");
      return;
    }

    if (state.isProcessing) {
      return;
    }

    const token = ++state.operationToken;
    setProcessing(true);
    resetResult();
    showProgress("Preparing AI model…");
    setInlineMessage("", "info");

    const start = performance.now();

    try {
      const segmenter = await loadSegmenter();

      if (token !== state.operationToken || !state.file) {
        return;
      }

      const { RawImage } = state.transformModule;
      showProgress("Decoding image…");
      const original = await RawImage.fromBlob(state.file);

      if (token !== state.operationToken) {
        return;
      }

      showProgress("Removing background with AI…");
      const output = await segmenter(original);

      if (token !== state.operationToken) {
        return;
      }

      const firstOutput = Array.isArray(output) ? output[0] : output;
      let mask = extractMaskRawImage(firstOutput, RawImage);

      if (mask.width !== original.width || mask.height !== original.height) {
        mask = await mask.resize(original.width, original.height, { resample: 2 });
      }

      const cutout = original.clone().rgba();
      cutout.putAlpha(mask);
      state.baseRgba = cloneRgbaData(cutout);
      state.subjectBoundsCache = null;
      state.sourceWidth = original.width;
      state.sourceHeight = original.height;
      state.lastProcessingMs = performance.now() - start;

      renderResult();
      elements.fileSizeStat.textContent = formatBytes(state.sourceFileSize);
      elements.processingStat.textContent = formatDuration(state.lastProcessingMs);
      elements.modelStat.textContent = "ORMBG q8 · WASM";
      elements.resultSection.hidden = false;
      elements.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

      if (typeof window.showMessage === "function") {
        window.showMessage("Background removed successfully.", "success");
      } else {
        setInlineMessage("Background removed successfully.", "success");
      }
    } catch (error) {
      console.error("Background removal failed:", error);
      resetResult();

      const offline = navigator.onLine === false;
      const message = offline
        ? "The AI model could not load while you are offline. Connect to the internet for the first model download and try again."
        : "Background removal failed. Check your connection, available memory and browser support, then try again.";

      notify(message, "error");
    } finally {
      if (token === state.operationToken) {
        hideProgress();
        setProcessing(false);
      }
    }
  }

  function getExportMimeType() {
    const format = elements.outputFormat.value;

    if (format === "webp") {
      return "image/webp";
    }

    if (format === "jpeg") {
      return "image/jpeg";
    }

    return "image/png";
  }

  function getExportExtension() {
    const format = elements.outputFormat.value;
    return format === "jpeg" ? "jpg" : format;
  }

  function getBaseFilename() {
    const original = state.file?.name || "image";
    const withoutExtension = original.replace(/\.[^.]+$/, "").trim();
    return withoutExtension || "image";
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("The browser could not encode the output image."));
          }
        },
        mimeType,
        quality,
      );
    });
  }

  function createExportCanvas() {
    if (!state.baseRgba) {
      throw new Error("No processed image is available.");
    }

    renderResult();

    if (elements.outputFormat.value !== "jpeg") {
      return elements.resultCanvas;
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = elements.resultCanvas.width;
    exportCanvas.height = elements.resultCanvas.height;
    const context = exportCanvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Canvas export is not supported in this browser.");
    }

    const requestedBackground = getBackgroundColor();
    context.fillStyle = requestedBackground || "#ffffff";
    context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    context.drawImage(elements.resultCanvas, 0, 0);
    return exportCanvas;
  }

  async function downloadImage() {
    if (!state.baseRgba) {
      notify("Remove the background before downloading.", "error");
      return;
    }

    try {
      const mimeType = getExportMimeType();
      const quality = Number(elements.outputQuality.value) / 100;
      const canvas = createExportCanvas();
      const blob = await canvasToBlob(canvas, mimeType, quality);
      const filename =
        `${getBaseFilename()}-background-removed.${getExportExtension()}`;

      if (typeof window.downloadFile === "function") {
        window.downloadFile(filename, blob, mimeType);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      console.error("Background Remover download failed:", error);
      notify("The processed image could not be exported.", "error");
    }
  }

  async function copyPng() {
    if (!state.baseRgba) {
      notify("Remove the background before copying.", "error");
      return;
    }

    if (!navigator.clipboard?.write || typeof ClipboardItem !== "function") {
      notify("Image copy is not supported in this browser.", "error");
      return;
    }

    try {
      renderResult();
      const blob = await canvasToBlob(elements.resultCanvas, "image/png", 1);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      if (typeof window.showMessage === "function") {
        window.showMessage("PNG copied successfully.", "success");
      } else {
        setInlineMessage("PNG copied successfully.", "success");
      }
    } catch (error) {
      console.error("Background Remover copy failed:", error);
      notify("The PNG could not be copied in this browser.", "error");
    }
  }

  function openFilePicker() {
    if (!state.isProcessing) {
      elements.imageInput.click();
    }
  }

  function clearTool() {
    state.operationToken += 1;
    state.file = null;
    state.sourceWidth = 0;
    state.sourceHeight = 0;
    state.sourceFileSize = 0;
    state.outputWidth = 0;
    state.outputHeight = 0;
    state.baseRgba = null;
    state.lastProcessingMs = 0;
    state.subjectBoundsCache = null;
    elements.imageInput.value = "";
    elements.originalPreview.removeAttribute("src");
    elements.fileInfo.textContent = "No image selected.";
    elements.backgroundMode.value = "transparent";
    elements.outputFormat.value = "png";
    elements.backgroundColor.value = "#ffffff";
    elements.backgroundColorText.value = "#ffffff";
    elements.edgeCleanup.value = "0";
    elements.autoCrop.checked = false;
    elements.cropPadding.value = "5";
    elements.outputQuality.value = "92";
    revokeSourceUrl();
    resetResult();
    hideProgress();
    setProcessing(false);
    updateOptionVisibility();
    setInlineMessage("", "info");
  }

  function rerenderIfReady() {
    updateOptionVisibility();

    if (state.baseRgba) {
      try {
        renderResult();
      } catch (error) {
        console.error("Background Remover preview update failed:", error);
        notify("The preview could not be updated.", "error");
      }
    }
  }

  function scheduleRerenderIfReady() {
    updateOptionVisibility();

    if (state.renderFrame) {
      cancelAnimationFrame(state.renderFrame);
    }

    state.renderFrame = requestAnimationFrame(() => {
      state.renderFrame = 0;
      rerenderIfReady();
    });
  }

  elements.dropZone.addEventListener("click", openFilePicker);
  elements.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  });

  elements.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragover");
  });

  elements.dropZone.addEventListener("dragleave", () => {
    elements.dropZone.classList.remove("dragover");
  });

  elements.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragover");
    const file = event.dataTransfer?.files?.[0];

    if (file) {
      void selectFile(file);
    }
  });

  elements.imageInput.addEventListener("change", () => {
    void selectFile(elements.imageInput.files?.[0]);
  });

  elements.replaceBtn.addEventListener("click", openFilePicker);
  elements.newImageBtn.addEventListener("click", openFilePicker);
  elements.removeBtn.addEventListener("click", () => void removeBackground());
  elements.downloadBtn.addEventListener("click", () => void downloadImage());
  elements.copyImageBtn.addEventListener("click", () => void copyPng());
  elements.clearBtn.addEventListener("click", clearTool);

  elements.backgroundMode.addEventListener("change", rerenderIfReady);
  elements.outputFormat.addEventListener("change", updateOptionVisibility);
  elements.edgeCleanup.addEventListener("input", () => {
    state.subjectBoundsCache = null;
    scheduleRerenderIfReady();
  });
  elements.autoCrop.addEventListener("change", rerenderIfReady);
  elements.cropPadding.addEventListener("input", scheduleRerenderIfReady);
  elements.outputQuality.addEventListener("input", updateOptionVisibility);

  elements.backgroundColor.addEventListener("input", () => {
    syncColorFromPicker();
    scheduleRerenderIfReady();
  });

  elements.backgroundColorText.addEventListener("change", () => {
    if (!syncColorFromText()) {
      elements.backgroundColorText.value = elements.backgroundColor.value;
      notify("Enter a six-digit hex color such as #ffffff.", "error");
      return;
    }

    rerenderIfReady();
  });

  window.addEventListener("beforeunload", () => {
    if (state.renderFrame) {
      cancelAnimationFrame(state.renderFrame);
    }

    revokeSourceUrl();

    if (state.segmenter && typeof state.segmenter.dispose === "function") {
      void state.segmenter.dispose();
    }
  });

  updateOptionVisibility();
  setProcessing(false);
  elements.fileInfo.textContent =
    `No image selected. Current safe image limit: ${getPixelLimitLabel()}.`;
});
