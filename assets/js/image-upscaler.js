"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const elements = {
    dropZone: $("dropZone"),
    imageInput: $("imageInput"),
    fileInfo: $("fileInfo"),
    sampleBtn: $("sampleBtn"),
    replaceBtn: $("replaceBtn"),
    sourceSection: $("sourceSection"),
    sourceImage: $("sourceImage"),
    patchProfile: $("patchProfile"),
    alphaRow: $("alphaRow"),
    preserveAlphaCheck: $("preserveAlphaCheck"),
    sourceDimensions: $("sourceDimensions"),
    targetDimensions: $("targetDimensions"),
    targetMegapixels: $("targetMegapixels"),
    runtimeEstimate: $("runtimeEstimate"),
    upscaleBtn: $("upscaleBtn"),
    cancelBtn: $("cancelBtn"),
    clearBtn: $("clearBtn"),
    progressWrap: $("progressWrap"),
    progressText: $("progressText"),
    progressValue: $("progressValue"),
    progressBar: $("progressBar"),
    message: $("message"),
    resultSection: $("resultSection"),
    inputStat: $("inputStat"),
    outputStat: $("outputStat"),
    scaleStat: $("scaleStat"),
    modelStat: $("modelStat"),
    backendStat: $("backendStat"),
    timeStat: $("timeStat"),
    compareStage: $("compareStage"),
    compareBefore: $("compareBefore"),
    compareAfterWrap: $("compareAfterWrap"),
    compareAfter: $("compareAfter"),
    compareDivider: $("compareDivider"),
    compareRange: $("compareRange"),
    formatSelect: $("formatSelect"),
    qualityWrap: $("qualityWrap"),
    qualityRange: $("qualityRange"),
    qualityValue: $("qualityValue"),
    backgroundWrap: $("backgroundWrap"),
    backgroundSelect: $("backgroundSelect"),
    customBgWrap: $("customBgWrap"),
    customBg: $("customBg"),
    downloadBtn: $("downloadBtn"),
    copyPngBtn: $("copyPngBtn"),
    exportNote: $("exportNote"),
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error("Image Upscaler initialization failed:", missing);
    return;
  }

  const CDN = {
    tf: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js",
    upscaler:
      "https://cdn.jsdelivr.net/npm/upscaler@1.0.0/dist/browser/umd/upscaler.min.js",
    slim: (scale) =>
      `https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/dist/umd/${scale}x.min.js`,
    medium: (scale) =>
      `https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-medium@1.0.0/dist/umd/${scale}x.min.js`,
  };

  const MODEL_GLOBALS = {
    slim: {
      2: "ESRGANSlim2x",
      3: "ESRGANSlim3x",
      4: "ESRGANSlim4x",
    },
    medium: {
      2: "ESRGANMedium2x",
      3: "ESRGANMedium3x",
      4: "ESRGANMedium4x",
    },
  };

  const state = {
    file: null,
    sourceUrl: "",
    sourceElement: null,
    sourceWidth: 0,
    sourceHeight: 0,
    sourceHasAlpha: false,
    alphaCanvas: null,
    outputDataUrl: "",
    outputImage: null,
    outputWidth: 0,
    outputHeight: 0,
    outputCanvas: null,
    elapsedMs: 0,
    currentUpscaler: null,
    currentModelKey: "",
    abortController: null,
    processing: false,
    operationToken: 0,
    scriptPromises: new Map(),
    resizeObserver: null,
  };

  const settingsControls = [
    ...document.querySelectorAll('input[name="modelProfile"]'),
    ...document.querySelectorAll('input[name="scaleFactor"]'),
    elements.patchProfile,
    elements.preserveAlphaCheck,
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
    } else {
      notify(text, "success");
    }
  }

  function showCopySuccess(text) {
    if (typeof window.showCopySuccess === "function") {
      window.showCopySuccess(text);
    } else {
      notify(text, "success");
    }
  }

  function showDownloadSuccess(text) {
    if (typeof window.showDownloadSuccess === "function") {
      window.showDownloadSuccess(text);
    } else {
      notify(text, "success");
    }
  }

  function showSampleSuccess(text) {
    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess(text);
    } else {
      notify(text, "success");
    }
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

  function getSelectedProfile() {
    return (
      document.querySelector('input[name="modelProfile"]:checked')?.value ||
      "slim"
    );
  }

  function getSelectedScale() {
    return Number(
      document.querySelector('input[name="scaleFactor"]:checked')?.value || 2,
    );
  }

  function getDeviceClass() {
    const memory = Number(navigator.deviceMemory || 0);
    const mobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      Math.min(window.innerWidth, window.innerHeight) < 700;

    if (memory > 0 && memory <= 2) {
      return "low";
    }

    if (mobile || (memory > 0 && memory <= 4)) {
      return "mobile";
    }

    return "desktop";
  }

  function getOutputPixelLimit(profile) {
    const deviceClass = getDeviceClass();

    const limits = {
      slim: {
        low: 8_000_000,
        mobile: 14_000_000,
        desktop: 32_000_000,
      },
      medium: {
        low: 5_000_000,
        mobile: 9_000_000,
        desktop: 18_000_000,
      },
    };

    return limits[profile]?.[deviceClass] || 8_000_000;
  }

  function getMaxFileSize() {
    const deviceClass = getDeviceClass();

    if (deviceClass === "low") return 12 * 1024 * 1024;
    if (deviceClass === "mobile") return 25 * 1024 * 1024;
    return 50 * 1024 * 1024;
  }

  function getPatchSettings(profile) {
    const deviceClass = getDeviceClass();
    const userProfile = elements.patchProfile.value;

    let patchSize;

    if (userProfile === "responsive") {
      patchSize = deviceClass === "low" ? 24 : 32;
    } else if (userProfile === "fast") {
      patchSize =
        deviceClass === "desktop" ? (profile === "slim" ? 96 : 64) : 48;
    } else if (profile === "medium") {
      patchSize =
        deviceClass === "desktop" ? 48 : deviceClass === "mobile" ? 32 : 24;
    } else {
      patchSize =
        deviceClass === "desktop" ? 64 : deviceClass === "mobile" ? 48 : 32;
    }

    return {
      patchSize,
      padding: 4,
    };
  }

  function updateEstimate() {
    if (!state.sourceWidth || !state.sourceHeight) {
      elements.sourceDimensions.textContent = "—";
      elements.targetDimensions.textContent = "—";
      elements.targetMegapixels.textContent = "—";
      return;
    }

    const scale = getSelectedScale();
    const targetWidth = state.sourceWidth * scale;
    const targetHeight = state.sourceHeight * scale;
    const targetPixels = targetWidth * targetHeight;
    const limit = getOutputPixelLimit(getSelectedProfile());

    elements.sourceDimensions.textContent =
      `${state.sourceWidth}×${state.sourceHeight}`;
    elements.targetDimensions.textContent =
      `${targetWidth}×${targetHeight}`;
    elements.targetMegapixels.textContent =
      `${(targetPixels / 1_000_000).toFixed(targetPixels < 10_000_000 ? 2 : 1)} MP`;

    elements.targetMegapixels.title =
      targetPixels > limit
        ? `This exceeds the recommended ${(limit / 1_000_000).toFixed(1)} MP limit for the selected model on this device.`
        : `Within the ${(limit / 1_000_000).toFixed(1)} MP safety limit for the selected model on this device.`;
  }

  function showProgress(text, percent = null) {
    elements.progressWrap.hidden = false;
    elements.progressText.textContent = text;

    if (Number.isFinite(percent)) {
      const safe = Math.max(0, Math.min(100, percent));
      elements.progressBar.value = safe;
      elements.progressValue.textContent = `${Math.round(safe)}%`;
    } else {
      elements.progressBar.removeAttribute("value");
      elements.progressValue.textContent = "…";
    }
  }

  function hideProgress() {
    elements.progressWrap.hidden = true;
    elements.progressBar.removeAttribute("value");
    elements.progressValue.textContent = "0%";
  }

  function setProcessing(processing) {
    state.processing = processing;
    elements.upscaleBtn.disabled = processing || !state.file;
    elements.cancelBtn.hidden = !processing;
    elements.replaceBtn.disabled = processing;
    elements.sampleBtn.disabled = processing;
    elements.imageInput.disabled = processing;

    settingsControls.forEach((control) => {
      control.disabled = processing;
    });
  }

  function loadScript(url, test) {
    if (typeof test === "function" && test()) {
      return Promise.resolve();
    }

    if (state.scriptPromises.has(url)) {
      return state.scriptPromises.get(url);
    }

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous";

      script.onload = () => {
        if (typeof test === "function" && !test()) {
          reject(new Error(`Loaded script did not expose the expected API: ${url}`));
          return;
        }

        resolve();
      };

      script.onerror = () => {
        reject(new Error(`Could not load required AI resource: ${url}`));
      };

      document.head.appendChild(script);
    }).catch((error) => {
      state.scriptPromises.delete(url);
      throw error;
    });

    state.scriptPromises.set(url, promise);
    return promise;
  }

  async function prepareTensorflow() {
    showProgress("Loading TensorFlow.js runtime…");

    await loadScript(CDN.tf, () => Boolean(window.tf?.ready));

    if (!window.tf) {
      throw new Error("TensorFlow.js did not initialize.");
    }

    await window.tf.ready();

    try {
      if (window.tf.getBackend() !== "webgl") {
        const switched = await window.tf.setBackend("webgl");

        if (switched) {
          await window.tf.ready();
        }
      }
    } catch (error) {
      console.warn("WebGL backend unavailable, using TensorFlow fallback:", error);
    }

    elements.runtimeEstimate.textContent =
      String(window.tf.getBackend?.() || "TensorFlow").toUpperCase();
  }

  async function disposeUpscaler() {
    const upscaler = state.currentUpscaler;
    state.currentUpscaler = null;
    state.currentModelKey = "";

    if (upscaler?.dispose) {
      try {
        await upscaler.dispose();
      } catch (error) {
        console.warn("Upscaler disposal warning:", error);
      }
    }
  }

  async function getUpscaler(profile, scale) {
    const modelKey = `${profile}-${scale}`;

    if (state.currentUpscaler && state.currentModelKey === modelKey) {
      return state.currentUpscaler;
    }

    await disposeUpscaler();
    await prepareTensorflow();

    const globalName = MODEL_GLOBALS[profile]?.[scale];

    if (!globalName) {
      throw new Error("The selected AI model configuration is unavailable.");
    }

    showProgress(`Loading ${profile === "medium" ? "Quality" : "Fast"} ${scale}× ESRGAN model…`);

    await loadScript(CDN[profile](scale), () => Boolean(window[globalName]));
    await loadScript(
      CDN.upscaler,
      () => typeof window.Upscaler === "function",
    );

    if (typeof window.Upscaler !== "function" || !window[globalName]) {
      throw new Error("UpscalerJS or the selected ESRGAN model did not initialize.");
    }

    state.currentUpscaler = new window.Upscaler({
      model: window[globalName],
    });
    state.currentModelKey = modelKey;

    return state.currentUpscaler;
  }

  function revokeSourceUrl() {
    if (state.sourceUrl) {
      URL.revokeObjectURL(state.sourceUrl);
      state.sourceUrl = "";
    }
  }

  function decodeImageFile(file) {
    const url = URL.createObjectURL(file);

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";

      image.onload = () => resolve({ image, url });
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("The selected image could not be decoded."));
      };

      image.src = url;
    });
  }

  function inspectAlpha(image, fileType) {
    if (!/image\/(?:png|webp)/i.test(fileType || "")) {
      return { hasAlpha: false, alphaCanvas: null };
    }

    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!context) {
      return { hasAlpha: false, alphaCanvas: null };
    }

    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;

    let hasAlpha = false;

    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) {
        hasAlpha = true;
        break;
      }
    }

    if (!hasAlpha) {
      return { hasAlpha: false, alphaCanvas: null };
    }

    const alphaCanvas = document.createElement("canvas");
    alphaCanvas.width = width;
    alphaCanvas.height = height;
    const alphaContext = alphaCanvas.getContext("2d");

    if (!alphaContext) {
      return { hasAlpha: true, alphaCanvas: null };
    }

    const alphaData = alphaContext.createImageData(width, height);

    for (let source = 0; source < data.length; source += 4) {
      alphaData.data[source] = 255;
      alphaData.data[source + 1] = 255;
      alphaData.data[source + 2] = 255;
      alphaData.data[source + 3] = data[source + 3];
    }

    alphaContext.putImageData(alphaData, 0, 0);

    return { hasAlpha: true, alphaCanvas };
  }

  function invalidateResult() {
    state.outputDataUrl = "";
    state.outputImage = null;
    state.outputWidth = 0;
    state.outputHeight = 0;
    state.outputCanvas = null;
    state.elapsedMs = 0;
    elements.resultSection.hidden = true;
    clearSuccessFeedback();
  }

  async function selectFile(file, { sample = false } = {}) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notify("Select a JPG, PNG or WebP image.", "error");
      elements.imageInput.value = "";
      return;
    }

    if (file.size <= 0) {
      notify("The selected image is empty.", "error");
      return;
    }

    const maxFileSize = getMaxFileSize();

    if (file.size > maxFileSize) {
      notify(
        `This device is limited to source files up to ${formatBytes(maxFileSize)} for safer AI processing.`,
        "error",
      );
      return;
    }

    const token = ++state.operationToken;

    try {
      const decoded = await decodeImageFile(file);

      if (token !== state.operationToken) {
        URL.revokeObjectURL(decoded.url);
        return;
      }

      const width = decoded.image.naturalWidth;
      const height = decoded.image.naturalHeight;

      if (!width || !height) {
        URL.revokeObjectURL(decoded.url);
        throw new Error("The selected image has invalid dimensions.");
      }

      if (width * height > 12_000_000) {
        URL.revokeObjectURL(decoded.url);
        notify(
          "The source image exceeds the 12 megapixel input ceiling. Use a smaller source to reduce browser memory risk.",
          "error",
        );
        return;
      }

      const alpha = inspectAlpha(decoded.image, file.type);

      revokeSourceUrl();
      state.file = file;
      state.sourceUrl = decoded.url;
      state.sourceElement = decoded.image;
      state.sourceWidth = width;
      state.sourceHeight = height;
      state.sourceHasAlpha = alpha.hasAlpha;
      state.alphaCanvas = alpha.alphaCanvas;

      elements.sourceImage.src = state.sourceUrl;
      elements.fileInfo.textContent =
        `${file.name} · ${formatBytes(file.size)} · ${width} × ${height}px` +
        (alpha.hasAlpha ? " · transparency detected" : "");
      elements.sourceSection.hidden = false;
      elements.upscaleBtn.disabled = false;

      elements.alphaRow.hidden = !alpha.hasAlpha;
      elements.preserveAlphaCheck.checked = true;

      invalidateResult();
      updateEstimate();

      if (sample) {
        showSampleSuccess("Sample image loaded.");
      } else {
        setInlineMessage("Image selected. Choose AI settings and upscale.", "info");
      }
    } catch (error) {
      console.error("Image selection failed:", error);
      notify(
        error instanceof Error ? error.message : "The image could not be opened.",
        "error",
      );
    }
  }

  async function createSample() {
    const canvas = document.createElement("canvas");
    canvas.width = 420;
    canvas.height = 280;
    const context = canvas.getContext("2d");

    if (!context) {
      notify("The sample image could not be created.", "error");
      return;
    }

    const gradient = context.createLinearGradient(0, 0, 420, 280);
    gradient.addColorStop(0, "#f8fafc");
    gradient.addColorStop(1, "#dbeafe");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 420, 280);

    context.fillStyle = "#dc2626";
    context.beginPath();
    context.arc(105, 140, 72, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ffffff";
    context.font = "700 58px Arial";
    context.textAlign = "center";
    context.fillText("X", 105, 160);

    context.textAlign = "left";
    context.fillStyle = "#111827";
    context.font = "700 26px Arial";
    context.fillText("AI UPSCALER", 205, 115);
    context.font = "18px Arial";
    context.fillStyle = "#475569";
    context.fillText("Browser super resolution", 205, 150);

    context.strokeStyle = "#0f172a";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(205, 178);
    context.lineTo(365, 178);
    context.stroke();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.92),
    );

    if (!blob) {
      notify("The sample image could not be created.", "error");
      return;
    }

    await selectFile(
      new File([blob], "xavert-upscaler-sample.png", {
        type: "image/png",
      }),
      { sample: true },
    );
  }

  function preflight(profile, scale) {
    const targetWidth = state.sourceWidth * scale;
    const targetHeight = state.sourceHeight * scale;
    const targetPixels = targetWidth * targetHeight;
    const limit = getOutputPixelLimit(profile);

    if (targetPixels > limit) {
      throw new Error(
        `The selected settings would create ${(targetPixels / 1_000_000).toFixed(1)} MP. ` +
          `The safer limit for this model on this device is ${(limit / 1_000_000).toFixed(1)} MP. ` +
          "Choose a lower scale or the Fast model.",
      );
    }

    return { targetWidth, targetHeight, targetPixels };
  }

  async function imageFromDataUrl(dataUrl) {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("The AI output could not be decoded."));
      image.src = dataUrl;
    });
  }

  function createFinalCanvas(aiImage) {
    const canvas = document.createElement("canvas");
    canvas.width = aiImage.naturalWidth;
    canvas.height = aiImage.naturalHeight;
    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      throw new Error("Canvas output is unavailable.");
    }

    context.drawImage(aiImage, 0, 0, canvas.width, canvas.height);

    if (
      state.sourceHasAlpha &&
      state.alphaCanvas &&
      elements.preserveAlphaCheck.checked
    ) {
      context.save();
      context.globalCompositeOperation = "destination-in";
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        state.alphaCanvas,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      context.restore();
    }

    return canvas;
  }

  function canvasToDataUrl(canvas) {
    return canvas.toDataURL("image/png");
  }

  async function runUpscale() {
    if (!state.file || state.processing) return;

    const profile = getSelectedProfile();
    const scale = getSelectedScale();

    try {
      preflight(profile, scale);
    } catch (error) {
      notify(error.message, "error");
      return;
    }

    invalidateResult();

    const token = ++state.operationToken;
    const started = performance.now();
    state.abortController = new AbortController();

    setProcessing(true);
    clearSuccessFeedback();
    showProgress("Preparing AI runtime…");

    try {
      const upscaler = await getUpscaler(profile, scale);

      if (token !== state.operationToken || !state.processing) {
        return;
      }

      const patch = getPatchSettings(profile);

      showProgress("Running ESRGAN super resolution…", 0);

      const dataUrl = await upscaler.upscale(state.sourceElement, {
        output: "base64",
        patchSize: patch.patchSize,
        padding: patch.padding,
        awaitNextFrame: true,
        signal: state.abortController.signal,
        progress: (progress) => {
          if (token !== state.operationToken) return;

          const percent = Math.max(0, Math.min(100, Number(progress) * 100));
          showProgress("Running ESRGAN super resolution…", percent);
        },
      });

      if (token !== state.operationToken || !state.processing) {
        return;
      }

      showProgress("Preparing final image…", 100);

      const aiImage = await imageFromDataUrl(dataUrl);
      const finalCanvas = createFinalCanvas(aiImage);
      const finalDataUrl = canvasToDataUrl(finalCanvas);
      const finalImage = await imageFromDataUrl(finalDataUrl);

      state.outputDataUrl = finalDataUrl;
      state.outputImage = finalImage;
      state.outputCanvas = finalCanvas;
      state.outputWidth = finalCanvas.width;
      state.outputHeight = finalCanvas.height;
      state.elapsedMs = performance.now() - started;

      renderResult(profile, scale);

      state.abortController = null;
      setProcessing(false);
      hideProgress();

      showActionSuccess("Image upscaled successfully.");

      elements.resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      console.error("Image upscaling failed:", error);

      if (token !== state.operationToken) {
        return;
      }

      state.abortController = null;
      setProcessing(false);
      hideProgress();

      if (error?.name === "AbortError") {
        setInlineMessage("AI upscaling cancelled.", "info");
        return;
      }

      notify(
        error instanceof Error && error.message
          ? error.message
          : "AI upscaling failed.",
        "error",
      );
    }
  }

  function renderResult(profile, scale) {
    elements.inputStat.textContent =
      `${state.sourceWidth}×${state.sourceHeight}`;
    elements.outputStat.textContent =
      `${state.outputWidth}×${state.outputHeight}`;
    elements.scaleStat.textContent = `${scale}×`;
    elements.modelStat.textContent =
      profile === "medium" ? "ESRGAN Medium" : "ESRGAN Slim";
    elements.backendStat.textContent =
      String(window.tf?.getBackend?.() || "unknown").toUpperCase();
    elements.timeStat.textContent = formatDuration(state.elapsedMs);

    elements.compareBefore.src = state.sourceUrl;
    elements.compareAfter.src = state.outputDataUrl;
    elements.compareRange.value = "50";
    updateComparison();

    elements.resultSection.hidden = false;
    updateExportUi();

    window.requestAnimationFrame(syncComparisonImageWidth);
  }

  function syncComparisonImageWidth() {
    if (elements.resultSection.hidden) return;

    const width = elements.compareStage.clientWidth;

    if (width > 0) {
      elements.compareAfter.style.width = `${width}px`;
    }
  }

  function updateComparison() {
    const value = Number(elements.compareRange.value) || 0;
    elements.compareAfterWrap.style.width = `${value}%`;
    elements.compareDivider.style.left = `${value}%`;
  }

  async function cancelUpscale() {
    if (!state.processing) return;

    state.operationToken += 1;

    try {
      state.abortController?.abort();
      state.currentUpscaler?.abort?.();
    } catch (error) {
      console.warn("Upscaler cancel warning:", error);
    }

    state.abortController = null;
    setProcessing(false);
    hideProgress();
    setInlineMessage("AI upscaling cancelled.", "info");
  }

  function updateExportUi() {
    const format = elements.formatSelect.value;
    const lossy = format === "jpeg" || format === "webp";
    const jpeg = format === "jpeg";

    elements.qualityWrap.hidden = !lossy;
    elements.backgroundWrap.hidden = false;

    if (jpeg && elements.backgroundSelect.value === "transparent") {
      elements.backgroundSelect.value = "white";
    }

    const custom = elements.backgroundSelect.value === "custom";
    elements.customBgWrap.hidden = !custom;

    elements.exportNote.textContent = jpeg
      ? "JPEG cannot store transparency and will use an opaque background."
      : state.sourceHasAlpha && elements.preserveAlphaCheck.checked
        ? "Source transparency is preserved unless you choose an opaque export background."
        : "Choose Transparent / Original to keep the generated alpha channel.";
  }

  function buildExportCanvas() {
    if (!state.outputCanvas) {
      throw new Error("Upscale an image first.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = state.outputCanvas.width;
    canvas.height = state.outputCanvas.height;
    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      throw new Error("Canvas export is unavailable.");
    }

    const format = elements.formatSelect.value;
    let background = null;

    if (format === "jpeg" && elements.backgroundSelect.value === "transparent") {
      background = "#ffffff";
    } else if (elements.backgroundSelect.value === "white") {
      background = "#ffffff";
    } else if (elements.backgroundSelect.value === "custom") {
      background = elements.customBg.value || "#ffffff";
    }

    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(state.outputCanvas, 0, 0);
    return canvas;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Image encoding failed."));
        },
        type,
        quality,
      );
    });
  }

  function safeBaseName() {
    return (
      (state.file?.name || "image")
        .replace(/\.[^.]+$/, "")
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "image"
    );
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadResult() {
    if (!state.outputCanvas) {
      notify("Upscale an image first.", "error");
      return;
    }

    try {
      const canvas = buildExportCanvas();
      const format = elements.formatSelect.value;
      const mime =
        format === "jpeg"
          ? "image/jpeg"
          : format === "webp"
            ? "image/webp"
            : "image/png";
      const quality =
        format === "png"
          ? undefined
          : (Number(elements.qualityRange.value) || 92) / 100;
      const blob = await canvasToBlob(canvas, mime, quality);
      const extension = format === "jpeg" ? "jpg" : format;

      downloadBlob(
        blob,
        `${safeBaseName()}-upscaled-${state.outputWidth}x${state.outputHeight}.${extension}`,
      );
      showDownloadSuccess("Upscaled image download started.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Image download failed.",
        "error",
      );
    }
  }

  async function copyPng() {
    if (!state.outputCanvas) {
      notify("Upscale an image first.", "error");
      return;
    }

    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      notify("PNG clipboard writing is unavailable in this browser.", "error");
      return;
    }

    try {
      const canvas = buildExportCanvas();
      const blob = await canvasToBlob(canvas, "image/png");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      showCopySuccess("Upscaled PNG copied.");
    } catch (error) {
      console.warn("Image clipboard write failed:", error);
      notify("PNG clipboard writing failed.", "error");
    }
  }

  function clearTool() {
    state.operationToken += 1;

    if (state.processing) {
      try {
        state.abortController?.abort();
        state.currentUpscaler?.abort?.();
      } catch {
        // Ignore cancellation during reset.
      }
    }

    state.abortController = null;
    state.processing = false;
    state.file = null;
    state.sourceElement = null;
    state.sourceWidth = 0;
    state.sourceHeight = 0;
    state.sourceHasAlpha = false;
    state.alphaCanvas = null;
    state.outputDataUrl = "";
    state.outputImage = null;
    state.outputWidth = 0;
    state.outputHeight = 0;
    state.outputCanvas = null;
    state.elapsedMs = 0;

    revokeSourceUrl();

    elements.imageInput.value = "";
    elements.fileInfo.textContent = "No image selected.";
    elements.sourceImage.removeAttribute("src");
    elements.sourceSection.hidden = true;
    elements.upscaleBtn.disabled = true;
    elements.resultSection.hidden = true;
    elements.compareBefore.removeAttribute("src");
    elements.compareAfter.removeAttribute("src");
    elements.runtimeEstimate.textContent =
      window.tf?.getBackend
        ? String(window.tf.getBackend()).toUpperCase()
        : "Not loaded";
    hideProgress();
    setProcessing(false);
    setInlineMessage("", "info");
    updateEstimate();
    elements.dropZone.focus();
  }

  elements.imageInput.addEventListener("change", () => {
    const file = elements.imageInput.files?.[0];

    if (file) {
      void selectFile(file);
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

    if (state.processing) return;

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      void selectFile(file);
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

  elements.sampleBtn.addEventListener("click", () => {
    void createSample();
  });

  elements.replaceBtn.addEventListener("click", () => {
    if (!state.processing) {
      elements.imageInput.click();
    }
  });

  elements.upscaleBtn.addEventListener("click", () => {
    void runUpscale();
  });

  elements.cancelBtn.addEventListener("click", () => {
    void cancelUpscale();
  });

  elements.clearBtn.addEventListener("click", clearTool);

  settingsControls.forEach((control) => {
    control.addEventListener("change", () => {
      invalidateResult();
      updateEstimate();

      if (
        control.matches('input[name="modelProfile"], input[name="scaleFactor"]')
      ) {
        const nextKey = `${getSelectedProfile()}-${getSelectedScale()}`;

        if (state.currentModelKey && state.currentModelKey !== nextKey) {
          void disposeUpscaler();
        }
      }
    });
  });

  elements.compareRange.addEventListener("input", updateComparison);

  elements.formatSelect.addEventListener("change", updateExportUi);
  elements.backgroundSelect.addEventListener("change", updateExportUi);

  elements.qualityRange.addEventListener("input", () => {
    elements.qualityValue.textContent =
      `${elements.qualityRange.value}%`;
  });

  elements.downloadBtn.addEventListener("click", () => {
    void downloadResult();
  });

  elements.copyPngBtn.addEventListener("click", () => {
    void copyPng();
  });

  if ("ResizeObserver" in window) {
    state.resizeObserver = new ResizeObserver(syncComparisonImageWidth);
    state.resizeObserver.observe(elements.compareStage);
  } else {
    window.addEventListener("resize", syncComparisonImageWidth);
  }

  window.addEventListener(
    "pagehide",
    () => {
      revokeSourceUrl();
      state.resizeObserver?.disconnect();
      void disposeUpscaler();
    },
    { once: true },
  );

  elements.alphaRow.hidden = true;
  updateEstimate();
  updateExportUi();
  setProcessing(false);
});
