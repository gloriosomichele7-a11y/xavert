"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const elements = {
    dropZone: $("dropZone"),
    imageInput: $("imageInput"),
    fileInfo: $("fileInfo"),
    pasteBtn: $("pasteBtn"),
    sampleBtn: $("sampleBtn"),
    replaceBtn: $("replaceBtn"),
    preprocessSelect: $("preprocessSelect"),
    rotationSelect: $("rotationSelect"),
    scaleSelect: $("scaleSelect"),
    layoutSelect: $("layoutSelect"),
    contentSelect: $("contentSelect"),
    confidenceSelect: $("confidenceSelect"),
    autoRotateCheck: $("autoRotateCheck"),
    invertCheck: $("invertCheck"),
    preserveSpacesCheck: $("preserveSpacesCheck"),
    boxesCheck: $("boxesCheck"),
    previewCanvas: $("previewCanvas"),
    previewEmpty: $("previewEmpty"),
    previewInfo: $("previewInfo"),
    extractBtn: $("extractBtn"),
    cancelBtn: $("cancelBtn"),
    clearBtn: $("clearBtn"),
    progressWrap: $("progressWrap"),
    progressLabel: $("progressLabel"),
    progressBar: $("progressBar"),
    message: $("message"),
    resultSection: $("resultSection"),
    confidenceStat: $("confidenceStat"),
    wordsStat: $("wordsStat"),
    linesStat: $("linesStat"),
    charsStat: $("charsStat"),
    lowConfidenceStat: $("lowConfidenceStat"),
    elapsedStat: $("elapsedStat"),
    textOutput: $("textOutput"),
    lowConfidenceList: $("lowConfidenceList"),
    copyBtn: $("copyBtn"),
    downloadTxtBtn: $("downloadTxtBtn"),
    downloadJsonBtn: $("downloadJsonBtn"),
    languageGrid: $("languageGrid"),
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error("Image to Text OCR initialization failed:", missing);
    return;
  }

  const state = {
    file: null,
    source: null,
    sourceWidth: 0,
    sourceHeight: 0,
    worker: null,
    workerLanguageKey: "",
    processing: false,
    operationToken: 0,
    words: [],
    lines: [],
    resultText: "",
    resultConfidence: 0,
    elapsedMs: 0,
    ocrWidth: 0,
    ocrHeight: 0,
    previewFrame: null,
    lastResultImage: null,
    lastSettings: null,
    workerIdleTimer: 0,
  };

  const supportedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
  ]);

  const settingsControls = [
    elements.preprocessSelect,
    elements.rotationSelect,
    elements.scaleSelect,
    elements.layoutSelect,
    elements.contentSelect,
    elements.confidenceSelect,
    elements.autoRotateCheck,
    elements.invertCheck,
    elements.preserveSpacesCheck,
    elements.boxesCheck,
  ];

  const recognitionSettingsControls = [
    elements.preprocessSelect,
    elements.rotationSelect,
    elements.scaleSelect,
    elements.layoutSelect,
    elements.contentSelect,
    elements.autoRotateCheck,
    elements.invertCheck,
    elements.preserveSpacesCheck,
  ];

  function setInlineMessage(text = "", type = "info") {
    elements.message.textContent = text;
    elements.message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      elements.message.classList.add(`message-${type}`);
    }
  }

  function notify(text, type = "info") {
    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
      return;
    }

    setInlineMessage(text, type);

    if (typeof window.showToast === "function") {
      window.showToast(text, type);
    }
  }

  function showActionSuccess(text) {
    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess(text);
      return;
    }

    notify(text, "success");
  }

  function showCopySuccess(text) {
    if (typeof window.showCopySuccess === "function") {
      window.showCopySuccess(text);
      return;
    }

    notify(text, "success");
  }

  function showDownloadSuccess(text) {
    if (typeof window.showDownloadSuccess === "function") {
      window.showDownloadSuccess(text);
      return;
    }

    notify(text, "success");
  }

  function showSampleSuccess(text) {
    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess(text);
      return;
    }

    notify(text, "success");
  }

  function clearSuccessFeedback() {
    if (typeof window.clearPersistentSuccessMessages === "function") {
      window.clearPersistentSuccessMessages();
    }

    if (
      elements.message.classList.contains("message-success") ||
      elements.message.classList.contains("success")
    ) {
      setInlineMessage("", "info");
    }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** power;

    return `${value >= 10 || power === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[power]}`;
  }

  function formatDuration(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds < 1000) {
      return `${Math.max(0, Math.round(milliseconds || 0))}ms`;
    }

    const seconds = milliseconds / 1000;

    if (seconds < 60) {
      return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}m ${remainder}s`;
  }

  function getDeviceLimits() {
    const memory = Number(navigator.deviceMemory || 0);
    const mobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      Math.min(window.innerWidth, window.innerHeight) < 700;

    if (memory > 0 && memory <= 2) {
      return { fileBytes: 10 * 1024 * 1024, pixels: 7_000_000 };
    }

    if (mobile || (memory > 0 && memory <= 4)) {
      return { fileBytes: 18 * 1024 * 1024, pixels: 12_000_000 };
    }

    return { fileBytes: 35 * 1024 * 1024, pixels: 24_000_000 };
  }

  function getSelectedLanguages() {
    return Array.from(
      document.querySelectorAll('input[name="ocrLanguage"]:checked'),
      (input) => input.value,
    );
  }

  function updateLanguageConstraints(changedInput = null) {
    const checked = Array.from(
      document.querySelectorAll('input[name="ocrLanguage"]:checked'),
    );

    if (checked.length > 3 && changedInput) {
      changedInput.checked = false;
      notify("Select no more than 3 OCR languages at a time.", "error");
      return false;
    }

    if (checked.length === 0 && changedInput) {
      changedInput.checked = true;
      notify("At least one OCR language must remain selected.", "error");
      return false;
    }

    return true;
  }

  function getCurrentSettings() {
    return {
      languages: getSelectedLanguages(),
      preprocess: elements.preprocessSelect.value,
      rotation: Number(elements.rotationSelect.value) || 0,
      scale: elements.scaleSelect.value,
      layout: elements.layoutSelect.value,
      content: elements.contentSelect.value,
      reviewThreshold: Number(elements.confidenceSelect.value) || 70,
      autoRotate: elements.autoRotateCheck.checked,
      invert: elements.invertCheck.checked,
      preserveSpaces: elements.preserveSpacesCheck.checked,
      showBoxes: elements.boxesCheck.checked,
    };
  }

  function isSupportedImage(file) {
    if (!file) {
      return false;
    }

    const extensionValid = /\.(?:jpe?g|png|webp|bmp)$/i.test(file.name || "");
    return supportedMimeTypes.has(file.type) || (!file.type && extensionValid);
  }

  async function decodeImage(file) {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch {
        try {
          return await createImageBitmap(file);
        } catch {
          // Fall through to HTMLImageElement.
        }
      }
    }

    const url = URL.createObjectURL(file);

    try {
      const image = new Image();
      image.decoding = "async";

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("The image could not be decoded."));
        image.src = url;
      });

      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function releaseSource() {
    if (state.source && typeof state.source.close === "function") {
      state.source.close();
    }

    state.source = null;
    state.sourceWidth = 0;
    state.sourceHeight = 0;
  }

  function getSourceDimensions(source) {
    return {
      width: source.width || source.naturalWidth || 0,
      height: source.height || source.naturalHeight || 0,
    };
  }

  function computeScale(width, height, requestedScale, pixelLimit) {
    let scale;

    if (requestedScale === "auto") {
      const longest = Math.max(width, height);

      if (longest < 1000) {
        scale = 2;
      } else if (longest < 1600) {
        scale = 1.5;
      } else {
        scale = 1;
      }
    } else {
      scale = Math.max(1, Number(requestedScale) || 1);
    }

    const requestedPixels = width * height * scale * scale;

    if (requestedPixels > pixelLimit) {
      scale = Math.sqrt(pixelLimit / Math.max(1, width * height));
    }

    return Math.max(0.25, scale);
  }

  function applyImageEnhancement(context, width, height, mode, invert) {
    if (mode === "original" && !invert) {
      return;
    }

    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;

    let threshold = 160;

    if (mode === "binary") {
      let total = 0;
      let count = 0;
      const stride = Math.max(4, Math.floor(data.length / 300000 / 4) * 4);

      for (let index = 0; index < data.length; index += stride) {
        total +=
          data[index] * 0.299 +
          data[index + 1] * 0.587 +
          data[index + 2] * 0.114;
        count += 1;
      }

      threshold = Math.max(90, Math.min(210, total / Math.max(1, count)));
    }

    for (let index = 0; index < data.length; index += 4) {
      let red = data[index];
      let green = data[index + 1];
      let blue = data[index + 2];

      const grey = red * 0.299 + green * 0.587 + blue * 0.114;

      if (mode === "grayscale") {
        red = grey;
        green = grey;
        blue = grey;
      } else if (mode === "contrast") {
        const contrasted = Math.max(0, Math.min(255, (grey - 128) * 1.65 + 128));
        red = contrasted;
        green = contrasted;
        blue = contrasted;
      } else if (mode === "binary") {
        const binary = grey >= threshold ? 255 : 0;
        red = binary;
        green = binary;
        blue = binary;
      }

      if (invert) {
        red = 255 - red;
        green = 255 - green;
        blue = 255 - blue;
      }

      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
  }

  function createProcessingCanvas(settings) {
    if (!state.source) {
      return null;
    }

    const limits = getDeviceLimits();
    const scale = computeScale(
      state.sourceWidth,
      state.sourceHeight,
      settings.scale,
      limits.pixels,
    );

    const scaledWidth = Math.max(1, Math.round(state.sourceWidth * scale));
    const scaledHeight = Math.max(1, Math.round(state.sourceHeight * scale));
    const rotated = settings.rotation === 90 || settings.rotation === 270;

    const canvas = document.createElement("canvas");
    canvas.width = rotated ? scaledHeight : scaledWidth;
    canvas.height = rotated ? scaledWidth : scaledHeight;

    const context = canvas.getContext("2d", {
      alpha: false,
      willReadFrequently:
        settings.preprocess !== "original" || settings.invert,
    });

    if (!context) {
      throw new Error("Canvas processing is unavailable in this browser.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.save();

    if (settings.rotation === 90) {
      context.translate(canvas.width, 0);
      context.rotate(Math.PI / 2);
    } else if (settings.rotation === 180) {
      context.translate(canvas.width, canvas.height);
      context.rotate(Math.PI);
    } else if (settings.rotation === 270) {
      context.translate(0, canvas.height);
      context.rotate(-Math.PI / 2);
    }

    context.drawImage(state.source, 0, 0, scaledWidth, scaledHeight);
    context.restore();

    applyImageEnhancement(
      context,
      canvas.width,
      canvas.height,
      settings.preprocess,
      settings.invert,
    );

    return canvas;
  }

  function copyCanvas(sourceCanvas, targetCanvas) {
    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;

    const context = targetCanvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    context.drawImage(sourceCanvas, 0, 0);
  }

  function flattenBlocks(blocks) {
    const words = [];
    const lines = [];

    for (const block of blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          lines.push({
            text: (line.text || "").trimEnd(),
            confidence: Number(line.confidence || 0),
            bbox: line.bbox || null,
          });

          for (const word of line.words || []) {
            const text = (word.text || "").trim();

            if (!text) {
              continue;
            }

            words.push({
              text,
              confidence: Number(word.confidence || 0),
              bbox: word.bbox || null,
            });
          }
        }
      }
    }

    return { words, lines };
  }

  function drawWordBoxes(canvas, words, threshold) {
    if (!words.length) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const lineWidth = Math.max(1, Math.round(Math.max(canvas.width, canvas.height) / 900));
    context.lineWidth = lineWidth;

    words.forEach((word) => {
      const bbox = word.bbox;

      if (
        !bbox ||
        !Number.isFinite(bbox.x0) ||
        !Number.isFinite(bbox.y0) ||
        !Number.isFinite(bbox.x1) ||
        !Number.isFinite(bbox.y1)
      ) {
        return;
      }

      context.strokeStyle =
        word.confidence < threshold
          ? "rgba(220, 38, 38, 0.9)"
          : "rgba(22, 163, 74, 0.72)";

      context.strokeRect(
        bbox.x0,
        bbox.y0,
        Math.max(1, bbox.x1 - bbox.x0),
        Math.max(1, bbox.y1 - bbox.y0),
      );
    });
  }

  async function imageSourceFromDataUrl(dataUrl) {
    if (!dataUrl) {
      return null;
    }

    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Processed OCR image could not be decoded."));
      image.src = dataUrl;
    });
  }

  async function renderPreview(useResult = true) {
    if (!state.source) {
      elements.previewCanvas.hidden = true;
      elements.previewEmpty.hidden = false;
      elements.previewInfo.textContent = "";
      return;
    }

    try {
      const settings = getCurrentSettings();
      const processingCanvas = createProcessingCanvas(settings);

      if (!processingCanvas) {
        return;
      }

      let baseCanvas = processingCanvas;

      if (
        useResult &&
        state.lastResultImage &&
        state.lastSettings &&
        recognitionSettingsMatch(settings, state.lastSettings)
      ) {
        const resultCanvas = document.createElement("canvas");
        resultCanvas.width = state.ocrWidth || processingCanvas.width;
        resultCanvas.height = state.ocrHeight || processingCanvas.height;
        const resultContext = resultCanvas.getContext("2d");

        if (resultContext) {
          resultContext.drawImage(
            state.lastResultImage,
            0,
            0,
            resultCanvas.width,
            resultCanvas.height,
          );
          baseCanvas = resultCanvas;
        }
      }

      copyCanvas(baseCanvas, elements.previewCanvas);

      if (
        useResult &&
        settings.showBoxes &&
        state.words.length &&
        state.lastSettings &&
        recognitionSettingsMatch(settings, state.lastSettings)
      ) {
        drawWordBoxes(
          elements.previewCanvas,
          state.words,
          settings.reviewThreshold,
        );
      }

      elements.previewCanvas.hidden = false;
      elements.previewEmpty.hidden = true;

      const megapixels =
        (processingCanvas.width * processingCanvas.height) / 1_000_000;

      elements.previewInfo.textContent =
        `${processingCanvas.width} × ${processingCanvas.height}px · ` +
        `${megapixels.toFixed(megapixels < 10 ? 2 : 1)} MP OCR image`;
    } catch (error) {
      console.error("OCR preview failed:", error);
      elements.previewInfo.textContent = "Preview could not be updated.";
    }
  }

  function recognitionSettingsMatch(first, second) {
    if (!first || !second) {
      return false;
    }

    return (
      first.preprocess === second.preprocess &&
      first.rotation === second.rotation &&
      first.scale === second.scale &&
      first.layout === second.layout &&
      first.content === second.content &&
      first.autoRotate === second.autoRotate &&
      first.invert === second.invert &&
      first.preserveSpaces === second.preserveSpaces &&
      first.languages.join("+") === second.languages.join("+")
    );
  }

  function schedulePreview() {
    window.requestAnimationFrame(() => {
      void renderPreview(true);
    });
  }

  function invalidateResult() {
    state.words = [];
    state.lines = [];
    state.resultText = "";
    state.resultConfidence = 0;
    state.elapsedMs = 0;
    state.lastSettings = null;
    state.lastResultImage = null;
    elements.resultSection.hidden = true;
    clearSuccessFeedback();
  }

  async function selectFile(file, { sample = false } = {}) {
    if (!file) {
      return;
    }

    if (!isSupportedImage(file)) {
      notify("Select a JPG, PNG, WebP or BMP image.", "error");
      elements.imageInput.value = "";
      return;
    }

    const limits = getDeviceLimits();

    if (file.size === 0) {
      notify("The selected image is empty.", "error");
      elements.imageInput.value = "";
      return;
    }

    if (file.size > limits.fileBytes) {
      notify(
        `This device is limited to image files up to ${formatBytes(limits.fileBytes)} for safer OCR processing.`,
        "error",
      );
      elements.imageInput.value = "";
      return;
    }

    const token = ++state.operationToken;

    try {
      const decoded = await decodeImage(file);

      if (token !== state.operationToken) {
        if (decoded && typeof decoded.close === "function") {
          decoded.close();
        }
        return;
      }

      const dimensions = getSourceDimensions(decoded);

      if (!dimensions.width || !dimensions.height) {
        if (decoded && typeof decoded.close === "function") {
          decoded.close();
        }
        throw new Error("The image has invalid dimensions.");
      }

      releaseSource();
      state.file = file;
      state.source = decoded;
      state.sourceWidth = dimensions.width;
      state.sourceHeight = dimensions.height;

      invalidateResult();

      elements.fileInfo.textContent =
        `${file.name} · ${formatBytes(file.size)} · ` +
        `${dimensions.width} × ${dimensions.height}px`;

      elements.extractBtn.disabled = false;
      await renderPreview(false);

      if (sample) {
        showSampleSuccess("Sample image loaded.");
      } else {
        setInlineMessage("Image selected. Adjust OCR settings or extract text.", "info");
      }
    } catch (error) {
      console.error("Image selection failed:", error);
      notify(
        error instanceof Error ? error.message : "The image could not be opened.",
        "error",
      );
    }
  }

  function normalizeStatus(status) {
    const value = String(status || "Preparing OCR").replace(/_/g, " ");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function showProgress(status, progress = null) {
    elements.progressWrap.hidden = false;
    elements.progressLabel.textContent = status;

    if (Number.isFinite(progress)) {
      elements.progressBar.value = Math.max(0, Math.min(100, progress));
    } else {
      elements.progressBar.removeAttribute("value");
    }
  }

  function hideProgress() {
    elements.progressWrap.hidden = true;
    elements.progressBar.removeAttribute("value");
  }

  function setProcessing(processing) {
    state.processing = processing;
    elements.extractBtn.disabled = processing || !state.file;
    elements.cancelBtn.hidden = !processing;
    elements.replaceBtn.disabled = processing;
    elements.pasteBtn.disabled = processing;
    elements.sampleBtn.disabled = processing;
    elements.imageInput.disabled = processing;

    settingsControls.forEach((control) => {
      control.disabled = processing;
    });

    document.querySelectorAll('input[name="ocrLanguage"]').forEach((input) => {
      input.disabled = processing;
    });
  }

  function workerLogger(message) {
    if (!state.processing || !message) {
      return;
    }

    const progress = Number(message.progress);
    showProgress(
      normalizeStatus(message.status),
      Number.isFinite(progress) ? Math.round(progress * 100) : null,
    );
  }

  function clearWorkerIdleTimer() {
    if (state.workerIdleTimer) {
      window.clearTimeout(state.workerIdleTimer);
      state.workerIdleTimer = 0;
    }
  }

  function scheduleWorkerRelease() {
    clearWorkerIdleTimer();

    state.workerIdleTimer = window.setTimeout(() => {
      void terminateWorker();
    }, 120000);
  }

  async function terminateWorker() {
    clearWorkerIdleTimer();

    const worker = state.worker;
    state.worker = null;
    state.workerLanguageKey = "";

    if (worker && typeof worker.terminate === "function") {
      try {
        await worker.terminate();
      } catch (error) {
        console.warn("OCR worker termination warning:", error);
      }
    }
  }

  async function getWorker(languages) {
    if (!window.Tesseract || typeof window.Tesseract.createWorker !== "function") {
      throw new Error(
        "The OCR engine could not be loaded. Check your connection and reload the page.",
      );
    }

    clearWorkerIdleTimer();

    const languageKey = languages.join("+");

    if (!state.worker) {
      showProgress("Loading OCR engine and language data…");
      state.worker = await window.Tesseract.createWorker(
        languages,
        window.Tesseract.OEM?.LSTM_ONLY ?? 1,
        {
          logger: workerLogger,
          errorHandler(error) {
            console.error("Tesseract worker error:", error);
          },
        },
      );
      state.workerLanguageKey = languageKey;
    } else if (state.workerLanguageKey !== languageKey) {
      showProgress("Loading selected OCR languages…");
      await state.worker.reinitialize(
        languages,
        window.Tesseract.OEM?.LSTM_ONLY ?? 1,
      );
      state.workerLanguageKey = languageKey;
    }

    return state.worker;
  }

  const nonLatinLanguages = new Set([
    "ara",
    "chi_sim",
    "chi_tra",
    "ell",
    "heb",
    "hin",
    "jpn",
    "kor",
    "rus",
    "ukr",
  ]);

  function getCharacterWhitelist(profile, languages) {
    if (profile === "numbers") {
      return "0123456789.,:;+-/%()[]$€£¥ ";
    }

    if (
      profile === "alphanumeric" &&
      !languages.some((language) => nonLatinLanguages.has(language))
    ) {
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -_./:@";
    }

    return "";
  }

  async function processOcr() {
    if (!state.file || !state.source || state.processing) {
      return;
    }

    const settings = getCurrentSettings();

    if (!settings.languages.length) {
      notify("Select at least one OCR language.", "error");
      return;
    }

    if (settings.languages.length > 3) {
      notify("Select no more than 3 OCR languages.", "error");
      return;
    }

    const token = ++state.operationToken;
    const started = performance.now();

    invalidateResult();
    setProcessing(true);
    clearSuccessFeedback();
    showProgress("Preparing image…", 0);

    try {
      const processingCanvas = createProcessingCanvas(settings);

      if (!processingCanvas) {
        throw new Error("The OCR image could not be prepared.");
      }

      state.ocrWidth = processingCanvas.width;
      state.ocrHeight = processingCanvas.height;

      const worker = await getWorker(settings.languages);

      if (token !== state.operationToken || !state.processing) {
        return;
      }

      const parameters = {
        tessedit_pageseg_mode: settings.layout,
        preserve_interword_spaces: settings.preserveSpaces ? "1" : "0",
      };

      const whitelist = getCharacterWhitelist(
        settings.content,
        settings.languages,
      );

      if (whitelist) {
        parameters.tessedit_char_whitelist = whitelist;
      } else {
        parameters.tessedit_char_whitelist = "";
      }

      await worker.setParameters(parameters);

      if (token !== state.operationToken || !state.processing) {
        return;
      }

      showProgress("Recognizing text…", 0);

      const result = await worker.recognize(
        processingCanvas,
        { rotateAuto: settings.autoRotate },
        {
          text: true,
          blocks: true,
          imageColor: settings.showBoxes,
        },
      );

      if (token !== state.operationToken || !state.processing) {
        return;
      }

      const data = result?.data || {};
      const parsed = flattenBlocks(data.blocks);
      const text = String(data.text || "").replace(/\r\n?/g, "\n").trim();

      state.words = parsed.words;
      state.lines = parsed.lines;
      state.resultText = text;
      state.resultConfidence = Number(data.confidence || 0);
      state.elapsedMs = performance.now() - started;
      state.lastSettings = settings;

      if (data.imageColor && settings.showBoxes) {
        try {
          state.lastResultImage = await imageSourceFromDataUrl(data.imageColor);
          state.ocrWidth =
            state.lastResultImage.naturalWidth || state.ocrWidth;
          state.ocrHeight =
            state.lastResultImage.naturalHeight || state.ocrHeight;
        } catch (error) {
          console.warn("OCR rotated preview unavailable:", error);
          state.lastResultImage = null;
        }
      }

      renderResult(settings);
      await renderPreview(true);

      setProcessing(false);
      hideProgress();
      scheduleWorkerRelease();

      showActionSuccess(
        text
          ? "Text extracted successfully."
          : "OCR completed. No readable text was detected.",
      );

      elements.resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      console.error("OCR processing failed:", error);

      if (token === state.operationToken) {
        setProcessing(false);
        hideProgress();
        scheduleWorkerRelease();

        notify(
          error instanceof Error && error.message
            ? error.message
            : "OCR processing failed.",
          "error",
        );
      }
    }
  }

  function renderLowConfidenceWords(settings) {
    const threshold = settings.reviewThreshold;
    const lowWords = state.words
      .filter(
        (word) =>
          Number.isFinite(word.confidence) &&
          word.confidence < threshold &&
          word.text.trim(),
      )
      .sort((a, b) => a.confidence - b.confidence);

    elements.lowConfidenceList.replaceChildren();

    if (!lowWords.length) {
      const empty = document.createElement("p");
      empty.className = "ocr-note";
      empty.textContent = state.words.length
        ? "No words fall below the selected review threshold."
        : "Detailed word confidence is unavailable for this result.";
      elements.lowConfidenceList.appendChild(empty);
    } else {
      lowWords.slice(0, 100).forEach((word) => {
        const row = document.createElement("div");
        row.className = "ocr-low-item";

        const text = document.createElement("span");
        text.className = "ocr-low-word";
        text.textContent = word.text;
        text.title = word.text;

        const confidence = document.createElement("span");
        confidence.className = "ocr-low-confidence";
        confidence.textContent = `${Math.round(word.confidence)}%`;

        row.append(text, confidence);
        elements.lowConfidenceList.appendChild(row);
      });
    }

    return lowWords.length;
  }

  function renderResult(settings) {
    elements.textOutput.value = state.resultText;

    const lowCount = renderLowConfidenceWords(settings);
    const fallbackWords = state.resultText.match(/\S+/gu)?.length || 0;
    const fallbackLines = state.resultText
      ? state.resultText.split("\n").filter((line) => line.trim()).length
      : 0;

    elements.confidenceStat.textContent =
      `${Math.max(0, Math.min(100, Math.round(state.resultConfidence)))}%`;
    elements.wordsStat.textContent = new Intl.NumberFormat("en-US").format(
      state.words.length || fallbackWords,
    );
    elements.linesStat.textContent = new Intl.NumberFormat("en-US").format(
      state.lines.length || fallbackLines,
    );
    elements.charsStat.textContent = new Intl.NumberFormat("en-US").format(
      state.resultText.length,
    );
    elements.lowConfidenceStat.textContent =
      new Intl.NumberFormat("en-US").format(lowCount);
    elements.elapsedStat.textContent = formatDuration(state.elapsedMs);
    elements.resultSection.hidden = false;
  }

  function buildOcrJson() {
    const settings = state.lastSettings || getCurrentSettings();

    return {
      tool: "XAVERT Image to Text OCR",
      source: {
        fileName: state.file?.name || null,
        fileSize: state.file?.size || 0,
        originalWidth: state.sourceWidth,
        originalHeight: state.sourceHeight,
        ocrWidth: state.ocrWidth,
        ocrHeight: state.ocrHeight,
      },
      settings: {
        languages: settings.languages,
        preprocessing: settings.preprocess,
        manualRotationDegrees: settings.rotation,
        ocrResolution: settings.scale,
        pageSegmentationMode: settings.layout,
        characterProfile: settings.content,
        autoRotate: settings.autoRotate,
        invertColors: settings.invert,
        preserveInterwordSpaces: settings.preserveSpaces,
      },
      result: {
        confidence: state.resultConfidence,
        elapsedMilliseconds: Math.round(state.elapsedMs),
        text: elements.textOutput.value,
        words: state.words,
        lines: state.lines,
      },
    };
  }

  function safeBaseName() {
    return (
      (state.file?.name || "ocr-image")
        .replace(/\.[^.]+$/, "")
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "ocr-image"
    );
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyText() {
    const text = elements.textOutput.value;

    if (!text) {
      notify("There is no OCR text to copy.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showCopySuccess("OCR text copied.");
    } catch {
      elements.textOutput.focus();
      elements.textOutput.select();

      try {
        const copied = document.execCommand("copy");

        if (!copied) {
          throw new Error("Legacy clipboard copy failed.");
        }

        showCopySuccess("OCR text copied.");
      } catch {
        notify("Copy failed. Select and copy the text manually.", "error");
      }
    }
  }

  function downloadTxt() {
    const text = elements.textOutput.value;

    if (!text) {
      notify("There is no OCR text to download.", "error");
      return;
    }

    downloadBlob(
      `${safeBaseName()}-ocr.txt`,
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    showDownloadSuccess("TXT download started.");
  }

  function downloadJson() {
    if (!state.lastSettings) {
      notify("Run OCR before downloading structured data.", "error");
      return;
    }

    const json = JSON.stringify(buildOcrJson(), null, 2);

    downloadBlob(
      `${safeBaseName()}-ocr.json`,
      new Blob([json], { type: "application/json;charset=utf-8" }),
    );
    showDownloadSuccess("OCR JSON download started.");
  }

  async function cancelOcr() {
    if (!state.processing) {
      return;
    }

    state.operationToken += 1;
    setProcessing(false);
    hideProgress();
    await terminateWorker();
    notify("OCR processing cancelled.", "info");
  }

  async function pasteImageFromClipboard() {
    if (!navigator.clipboard || typeof navigator.clipboard.read !== "function") {
      notify(
        "Direct clipboard reading is unavailable. Copy an image and press Ctrl+V or Cmd+V on this page.",
        "info",
      );
      return;
    }

    try {
      const items = await navigator.clipboard.read();

      for (const item of items) {
        const type = item.types.find((candidate) =>
          supportedMimeTypes.has(candidate),
        );

        if (!type) {
          continue;
        }

        const blob = await item.getType(type);
        const extension =
          type === "image/jpeg"
            ? "jpg"
            : type === "image/png"
              ? "png"
              : type === "image/webp"
                ? "webp"
                : "bmp";

        const file = new File([blob], `clipboard-image.${extension}`, {
          type,
        });

        await selectFile(file);
        return;
      }

      notify("The clipboard does not contain a supported image.", "error");
    } catch (error) {
      console.warn("Clipboard image read failed:", error);
      notify(
        "Clipboard access was not granted. You can paste an image with Ctrl+V or Cmd+V.",
        "error",
      );
    }
  }

  async function handlePasteEvent(event) {
    if (state.processing) {
      return;
    }

    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find(
      (item) => item.kind === "file" && supportedMimeTypes.has(item.type),
    );

    if (!imageItem) {
      return;
    }

    const blob = imageItem.getAsFile();

    if (!blob) {
      return;
    }

    event.preventDefault();

    const extension =
      blob.type === "image/jpeg"
        ? "jpg"
        : blob.type === "image/png"
          ? "png"
          : blob.type === "image/webp"
            ? "webp"
            : "bmp";

    const file = new File([blob], `pasted-image.${extension}`, {
      type: blob.type,
    });

    await selectFile(file);
  }

  async function loadSample() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 700;
    const context = canvas.getContext("2d");

    if (!context) {
      notify("The sample image could not be created.", "error");
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#111827";
    context.font = "700 58px Arial";
    context.fillText("XAVERT OCR SAMPLE", 80, 110);

    context.font = "42px Arial";
    context.fillText("Invoice: 2026-0828", 80, 215);
    context.fillText("Customer: Browser Tools Lab", 80, 285);
    context.fillText("Total: EUR 123.45", 80, 355);

    context.font = "34px Arial";
    context.fillText("Fast image-to-text recognition.", 80, 470);
    context.fillText("Privacy-first browser processing.", 80, 525);

    context.fillStyle = "#475569";
    context.font = "28px Arial";
    context.fillText("Reference: OCR-XAVERT-1001", 80, 625);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.95),
    );

    if (!blob) {
      notify("The sample image could not be created.", "error");
      return;
    }

    const file = new File([blob], "xavert-ocr-sample.png", {
      type: "image/png",
    });

    await selectFile(file, { sample: true });
  }

  function clearTool() {
    state.operationToken += 1;
    state.file = null;
    elements.imageInput.value = "";
    elements.fileInfo.textContent = "No image selected.";
    elements.extractBtn.disabled = true;
    elements.resultSection.hidden = true;
    elements.previewCanvas.hidden = true;
    elements.previewCanvas.width = 1;
    elements.previewCanvas.height = 1;
    elements.previewEmpty.hidden = false;
    elements.previewInfo.textContent = "";
    elements.textOutput.value = "";
    elements.lowConfidenceList.replaceChildren();
    elements.confidenceStat.textContent = "0%";
    elements.wordsStat.textContent = "0";
    elements.linesStat.textContent = "0";
    elements.charsStat.textContent = "0";
    elements.lowConfidenceStat.textContent = "0";
    elements.elapsedStat.textContent = "0s";
    setInlineMessage("", "info");
    hideProgress();
    setProcessing(false);

    state.words = [];
    state.lines = [];
    state.resultText = "";
    state.resultConfidence = 0;
    state.elapsedMs = 0;
    state.lastResultImage = null;
    state.lastSettings = null;

    releaseSource();
    void terminateWorker();
    elements.dropZone.focus();
  }

  elements.dropZone.addEventListener("click", () => {
    if (!state.processing) {
      elements.imageInput.click();
    }
  });

  elements.dropZone.addEventListener("keydown", (event) => {
    if (
      (event.key === "Enter" || event.key === " ") &&
      !state.processing
    ) {
      event.preventDefault();
      elements.imageInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();

      if (!state.processing) {
        elements.dropZone.classList.add("dragover");
      }
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, () => {
      elements.dropZone.classList.remove("dragover");
    });
  });

  elements.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();

    if (state.processing) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      void selectFile(file);
    }
  });

  elements.imageInput.addEventListener("change", () => {
    const file = elements.imageInput.files?.[0];

    if (file) {
      void selectFile(file);
    }
  });

  elements.pasteBtn.addEventListener("click", pasteImageFromClipboard);
  elements.sampleBtn.addEventListener("click", loadSample);
  elements.replaceBtn.addEventListener("click", () => {
    if (!state.processing) {
      elements.imageInput.click();
    }
  });

  elements.extractBtn.addEventListener("click", processOcr);
  elements.cancelBtn.addEventListener("click", cancelOcr);
  elements.clearBtn.addEventListener("click", clearTool);
  elements.copyBtn.addEventListener("click", copyText);
  elements.downloadTxtBtn.addEventListener("click", downloadTxt);
  elements.downloadJsonBtn.addEventListener("click", downloadJson);

  recognitionSettingsControls.forEach((control) => {
    control.addEventListener("change", () => {
      invalidateResult();
      schedulePreview();
    });
  });

  elements.confidenceSelect.addEventListener("change", () => {
    clearSuccessFeedback();

    if (state.lastSettings) {
      const settings = getCurrentSettings();
      state.lastSettings.reviewThreshold = settings.reviewThreshold;
      renderResult(settings);
      void renderPreview(true);
    }
  });

  elements.boxesCheck.addEventListener("change", () => {
    clearSuccessFeedback();

    if (state.lastSettings) {
      state.lastSettings.showBoxes = elements.boxesCheck.checked;
    }

    void renderPreview(true);
  });

  document.querySelectorAll('input[name="ocrLanguage"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (updateLanguageConstraints(input)) {
        invalidateResult();
        schedulePreview();
      }
    });
  });

  document.addEventListener("paste", (event) => {
    if (
      event.target === elements.textOutput ||
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    void handlePasteEvent(event);
  });

  window.addEventListener(
    "pagehide",
    () => {
      releaseSource();
      void terminateWorker();
    },
    { once: true },
  );

  elements.previewCanvas.hidden = true;
  elements.previewEmpty.hidden = false;
  setProcessing(false);
});
