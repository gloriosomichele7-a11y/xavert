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
    sourceDimensions: $("sourceDimensions"),
    sourceTransparency: $("sourceTransparency"),
    fitMode: $("fitMode"),
    paddingRange: $("paddingRange"),
    paddingValue: $("paddingValue"),
    backgroundMode: $("backgroundMode"),
    customBackgroundWrap: $("customBackgroundWrap"),
    customBackground: $("customBackground"),
    platformBackground: $("platformBackground"),
    maskableCheck: $("maskableCheck"),
    appName: $("appName"),
    shortName: $("shortName"),
    startUrl: $("startUrl"),
    displayMode: $("displayMode"),
    themeColor: $("themeColor"),
    manifestBackground: $("manifestBackground"),
    generateBtn: $("generateBtn"),
    clearBtn: $("clearBtn"),
    message: $("message"),
    resultSection: $("resultSection"),
    fileCountStat: $("fileCountStat"),
    icoStat: $("icoStat"),
    appleStat: $("appleStat"),
    pwaStat: $("pwaStat"),
    fitStat: $("fitStat"),
    packageSizeStat: $("packageSizeStat"),
    previewGrid: $("previewGrid"),
    snippetOutput: $("snippetOutput"),
    manifestOutput: $("manifestOutput"),
    downloadZipBtn: $("downloadZipBtn"),
    downloadIcoBtn: $("downloadIcoBtn"),
    copySnippetBtn: $("copySnippetBtn"),
    copyManifestBtn: $("copyManifestBtn"),
    downloadManifestBtn: $("downloadManifestBtn"),
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error("Favicon Generator initialization failed:", missing);
    return;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";

  const state = {
    file: null,
    fileName: "favicon-source.png",
    sourceUrl: "",
    sourceImage: null,
    sourceWidth: 0,
    sourceHeight: 0,
    sourceHasTransparency: false,
    generatedFiles: new Map(),
    previewUrls: [],
    operationToken: 0,
    generating: false,
  };

  const settingsControls = [
    elements.fitMode,
    elements.paddingRange,
    elements.backgroundMode,
    elements.customBackground,
    elements.platformBackground,
    elements.maskableCheck,
    elements.appName,
    elements.shortName,
    elements.startUrl,
    elements.displayMode,
    elements.themeColor,
    elements.manifestBackground,
  ];

  const prohibitedSvgTags = new Set([
    "script",
    "foreignobject",
    "iframe",
    "object",
    "embed",
    "audio",
    "video",
  ]);

  function notify(text, type = "info") {
    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
      return;
    }

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

  function clearInlineMessage() {
    elements.message.textContent = "";
    elements.message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB"];
    const power = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** power;

    return `${value >= 10 || power === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[power]}`;
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

  function getMaxFileBytes() {
    const deviceClass = getDeviceClass();

    if (deviceClass === "low") return 12 * 1024 * 1024;
    if (deviceClass === "mobile") return 25 * 1024 * 1024;
    return 50 * 1024 * 1024;
  }

  function getMaxPixels() {
    const deviceClass = getDeviceClass();

    if (deviceClass === "low") return 12_000_000;
    if (deviceClass === "mobile") return 24_000_000;
    return 40_000_000;
  }

  function revokeSourceUrl() {
    if (state.sourceUrl) {
      URL.revokeObjectURL(state.sourceUrl);
      state.sourceUrl = "";
    }
  }

  function revokePreviewUrls() {
    state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    state.previewUrls = [];
  }

  function isExternalSvgReference(value) {
    const text = String(value || "").trim();

    if (!text || text.startsWith("#")) {
      return false;
    }

    if (/^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(text)) {
      return false;
    }

    return true;
  }

  function sanitizeCssUrls(cssText) {
    let text = String(cssText || "");

    text = text.replace(/@import[^;]+;?/gi, "");
    text = text.replace(
      /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
      (full, quote, target) => {
        const value = String(target || "").trim();

        if (
          value.startsWith("#") ||
          /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(value)
        ) {
          return `url(${quote || ""}${value}${quote || ""})`;
        }

        return "none";
      },
    );

    if (
      /(?:javascript\s*:|vbscript\s*:|expression\s*\(|-moz-binding)/i.test(
        text,
      )
    ) {
      return "";
    }

    return text;
  }

  function sanitizeSvg(svgText) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(svgText, "image/svg+xml");
    const parserError = documentNode.querySelector("parsererror");
    const root = documentNode.documentElement;

    if (
      parserError ||
      !root ||
      root.localName.toLowerCase() !== "svg" ||
      root.namespaceURI !== SVG_NS
    ) {
      throw new Error("The SVG contains invalid XML markup.");
    }

    root.setAttribute("xmlns", SVG_NS);

    Array.from(root.querySelectorAll("*")).forEach((node) => {
      const tag = node.localName.toLowerCase();

      if (prohibitedSvgTags.has(tag)) {
        node.remove();
        return;
      }

      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();

        if (name.startsWith("on")) {
          node.removeAttribute(attribute.name);
          return;
        }

        if (
          name === "href" ||
          name === "xlink:href" ||
          name === "src"
        ) {
          if (isExternalSvgReference(attribute.value)) {
            node.removeAttribute(attribute.name);
          }
          return;
        }

        if (name === "style") {
          const cleaned = sanitizeCssUrls(attribute.value);

          if (cleaned.trim()) {
            node.setAttribute(attribute.name, cleaned);
          } else {
            node.removeAttribute(attribute.name);
          }
        }
      });

      if (tag === "style") {
        node.textContent = sanitizeCssUrls(node.textContent || "");
      }
    });

    if (root.querySelector("[xlink\\:href]")) {
      root.setAttribute("xmlns:xlink", XLINK_NS);
    }

    return new XMLSerializer().serializeToString(root);
  }

  function decodeUrl(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";

      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("The selected image could not be decoded."));
      image.src = url;
    });
  }

  async function loadSourceImage(file) {
    if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name || "")) {
      const text = await file.text();

      if (text.length > 2_000_000) {
        throw new Error("SVG source is limited to 2 million characters.");
      }

      const safeSvg = sanitizeSvg(text);
      const blob = new Blob([safeSvg], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      try {
        const image = await decodeUrl(url);
        return { image, url };
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
    }

    const url = URL.createObjectURL(file);

    try {
      const image = await decodeUrl(url);
      return { image, url };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  function detectTransparency(image, file) {
    if (
      file.type === "image/jpeg" ||
      /\.jpe?g$/i.test(file.name || "")
    ) {
      return false;
    }

    const maxSample = 256;
    const scale = Math.min(
      1,
      maxSample / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!context) {
      return false;
    }

    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    try {
      const data = context.getImageData(0, 0, width, height).data;

      for (let index = 3; index < data.length; index += 4) {
        if (data[index] < 255) {
          return true;
        }
      }
    } catch {
      return false;
    }

    return false;
  }

  function titleFromFilename(filename) {
    const base = String(filename || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();

    if (!base) {
      return "My Web App";
    }

    return base
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .slice(0, 120);
  }

  function shortTitle(title) {
    return String(title || "My App").slice(0, 40);
  }

  function invalidateResult() {
    state.operationToken += 1;
    state.generatedFiles.clear();
    revokePreviewUrls();
    elements.previewGrid.replaceChildren();
    elements.resultSection.hidden = true;
    elements.snippetOutput.value = "";
    elements.manifestOutput.value = "";
    elements.packageSizeStat.textContent = "—";
  }

  function setGenerating(active) {
    state.generating = active;
    elements.generateBtn.disabled = active || !state.sourceImage;
    elements.sampleBtn.disabled = active;
    elements.replaceBtn.disabled = active;
    elements.imageInput.disabled = active;

    settingsControls.forEach((control) => {
      control.disabled = active;
    });
  }

  async function selectFile(file, { sample = false } = {}) {
    if (!file) {
      return;
    }

    const supported =
      ["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(
        file.type,
      ) ||
      /\.(png|jpe?g|webp|svg)$/i.test(file.name || "");

    if (!supported) {
      notify("Select a PNG, JPG, WebP or SVG image.", "error");
      elements.imageInput.value = "";
      return;
    }

    if (file.size <= 0) {
      notify("The selected image is empty.", "error");
      return;
    }

    const maxBytes = getMaxFileBytes();

    if (file.size > maxBytes) {
      notify(
        `This device is limited to source files up to ${formatBytes(maxBytes)}.`,
        "error",
      );
      return;
    }

    const token = ++state.operationToken;

    try {
      const loaded = await loadSourceImage(file);

      if (token !== state.operationToken) {
        URL.revokeObjectURL(loaded.url);
        return;
      }

      const width = loaded.image.naturalWidth;
      const height = loaded.image.naturalHeight;

      if (!width || !height) {
        URL.revokeObjectURL(loaded.url);
        throw new Error("The selected image has invalid dimensions.");
      }

      if (width * height > getMaxPixels()) {
        URL.revokeObjectURL(loaded.url);
        notify(
          "The decoded source image is too large for safe browser processing on this device.",
          "error",
        );
        return;
      }

      const transparency = detectTransparency(loaded.image, file);

      revokeSourceUrl();

      state.file = file;
      state.fileName = file.name || "favicon-source.png";
      state.sourceUrl = loaded.url;
      state.sourceImage = loaded.image;
      state.sourceWidth = width;
      state.sourceHeight = height;
      state.sourceHasTransparency = transparency;

      elements.sourceImage.src = state.sourceUrl;
      elements.sourceDimensions.textContent = `${width} × ${height}`;
      elements.sourceTransparency.textContent =
        transparency ? "Detected" : "Not detected";
      elements.fileInfo.textContent =
        `${state.fileName} · ${formatBytes(file.size)} · ${width} × ${height}px`;
      elements.sourceSection.hidden = false;
      elements.generateBtn.disabled = false;

      const appTitle = titleFromFilename(state.fileName);

      if (
        elements.appName.value === "My Web App" ||
        !elements.appName.value.trim()
      ) {
        elements.appName.value = appTitle;
      }

      if (
        elements.shortName.value === "My App" ||
        !elements.shortName.value.trim()
      ) {
        elements.shortName.value = shortTitle(appTitle);
      }

      invalidateResult();
      clearInlineMessage();

      if (sample) {
        showSampleSuccess("Sample image loaded.");
      } else {
        notify("Image selected. Configure the package and generate favicons.", "info");
      }
    } catch (error) {
      console.error("Favicon source loading failed:", error);
      notify(
        error instanceof Error
          ? error.message
          : "The selected image could not be opened.",
        "error",
      );
    }
  }

  async function createSample() {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 640;
    const context = canvas.getContext("2d");

    if (!context) {
      notify("The sample image could not be created.", "error");
      return;
    }

    context.clearRect(0, 0, 640, 640);

    const gradient = context.createLinearGradient(80, 80, 560, 560);
    gradient.addColorStop(0, "#ef4444");
    gradient.addColorStop(1, "#991b1b");

    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(80, 80, 480, 480, 120);
    context.fill();

    context.fillStyle = "#ffffff";
    context.font = "800 300px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("X", 320, 335);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );

    if (!blob) {
      notify("The sample image could not be created.", "error");
      return;
    }

    await selectFile(
      new File([blob], "xavert-favicon-sample.png", {
        type: "image/png",
      }),
      { sample: true },
    );
  }

  function getStandardBackground() {
    if (elements.backgroundMode.value === "white") {
      return "#ffffff";
    }

    if (elements.backgroundMode.value === "custom") {
      return elements.customBackground.value || "#ffffff";
    }

    return null;
  }

  function getPaddingFraction(maskable = false) {
    const userPadding =
      Math.max(0, Math.min(25, Number(elements.paddingRange.value) || 0)) /
      100;

    // The standardized maskable safe zone is a centered circle with radius
    // 40% of the icon width. A square artwork fits fully inside that circle
    // when each edge is inset by about 21.72%, so 22% is used conservatively.
    return maskable ? Math.max(0.22, userPadding) : userPadding;
  }

  function renderCanvas(size, { platform = false, maskable = false } = {}) {
    if (!state.sourceImage) {
      throw new Error("Load an image first.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d", {
      alpha: true,
    });

    if (!context) {
      throw new Error("Canvas rendering is unavailable.");
    }

    const background = platform
      ? elements.platformBackground.value || "#ffffff"
      : getStandardBackground();

    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, size, size);
    } else {
      context.clearRect(0, 0, size, size);
    }

    const padding = getPaddingFraction(maskable);
    const boxSize = size * (1 - padding * 2);
    const sourceWidth = state.sourceWidth;
    const sourceHeight = state.sourceHeight;
    const sourceRatio = sourceWidth / sourceHeight;
    const boxRatio = 1;

    let drawWidth;
    let drawHeight;

    if (elements.fitMode.value === "cover") {
      if (sourceRatio > boxRatio) {
        drawHeight = boxSize;
        drawWidth = boxSize * sourceRatio;
      } else {
        drawWidth = boxSize;
        drawHeight = boxSize / sourceRatio;
      }
    } else if (sourceRatio > boxRatio) {
      drawWidth = boxSize;
      drawHeight = boxSize / sourceRatio;
    } else {
      drawHeight = boxSize;
      drawWidth = boxSize * sourceRatio;
    }

    const x = (size - drawWidth) / 2;
    const y = (size - drawHeight) / 2;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      state.sourceImage,
      0,
      0,
      sourceWidth,
      sourceHeight,
      x,
      y,
      drawWidth,
      drawHeight,
    );

    return canvas;
  }

  function canvasToBlob(canvas, type = "image/png", quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Image encoding failed."));
          }
        },
        type,
        quality,
      );
    });
  }

  function writeUint16LE(view, offset, value) {
    view.setUint16(offset, value, true);
  }

  function writeUint32LE(view, offset, value) {
    view.setUint32(offset, value, true);
  }

  function canvasToIcoDib(canvas) {
    const size = canvas.width;
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!context) {
      throw new Error("ICO pixel extraction failed.");
    }

    const rgba = context.getImageData(0, 0, size, size).data;
    const xorBytes = size * size * 4;
    const maskRowBytes = Math.ceil(size / 32) * 4;
    const maskBytes = maskRowBytes * size;
    const buffer = new ArrayBuffer(40 + xorBytes + maskBytes);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    writeUint32LE(view, 0, 40);
    view.setInt32(4, size, true);
    view.setInt32(8, size * 2, true);
    writeUint16LE(view, 12, 1);
    writeUint16LE(view, 14, 32);
    writeUint32LE(view, 16, 0);
    writeUint32LE(view, 20, xorBytes + maskBytes);
    view.setInt32(24, 0, true);
    view.setInt32(28, 0, true);
    writeUint32LE(view, 32, 0);
    writeUint32LE(view, 36, 0);

    let outputOffset = 40;

    for (let y = size - 1; y >= 0; y -= 1) {
      for (let x = 0; x < size; x += 1) {
        const source = (y * size + x) * 4;
        bytes[outputOffset++] = rgba[source + 2];
        bytes[outputOffset++] = rgba[source + 1];
        bytes[outputOffset++] = rgba[source];
        bytes[outputOffset++] = rgba[source + 3];
      }
    }

    const maskOffset = 40 + xorBytes;

    for (let y = 0; y < size; y += 1) {
      const sourceY = size - 1 - y;

      for (let x = 0; x < size; x += 1) {
        const alpha = rgba[(sourceY * size + x) * 4 + 3];

        if (alpha === 0) {
          const byteIndex = maskOffset + y * maskRowBytes + (x >> 3);
          bytes[byteIndex] |= 0x80 >> (x & 7);
        }
      }
    }

    return new Uint8Array(buffer);
  }

  function createIco(canvases) {
    const entries = canvases.map((canvas) => ({
      size: canvas.width,
      data: canvasToIcoDib(canvas),
    }));

    const headerSize = 6;
    const directorySize = entries.length * 16;
    const totalDataSize = entries.reduce(
      (sum, entry) => sum + entry.data.byteLength,
      0,
    );
    const buffer = new ArrayBuffer(
      headerSize + directorySize + totalDataSize,
    );
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    writeUint16LE(view, 0, 0);
    writeUint16LE(view, 2, 1);
    writeUint16LE(view, 4, entries.length);

    let dataOffset = headerSize + directorySize;

    entries.forEach((entry, index) => {
      const offset = headerSize + index * 16;
      const sizeByte = entry.size >= 256 ? 0 : entry.size;

      bytes[offset] = sizeByte;
      bytes[offset + 1] = sizeByte;
      bytes[offset + 2] = 0;
      bytes[offset + 3] = 0;
      writeUint16LE(view, offset + 4, 1);
      writeUint16LE(view, offset + 6, 32);
      writeUint32LE(view, offset + 8, entry.data.byteLength);
      writeUint32LE(view, offset + 12, dataOffset);

      bytes.set(entry.data, dataOffset);
      dataOffset += entry.data.byteLength;
    });

    return new Blob([buffer], {
      type: "image/vnd.microsoft.icon",
    });
  }

  function normalizeStartUrl(value) {
    const text = String(value || "").trim();

    if (!text) {
      return "/";
    }

    if (
      text.startsWith("/") ||
      text.startsWith("./") ||
      text.startsWith("../") ||
      /^https?:\/\//i.test(text)
    ) {
      return text;
    }

    return `/${text}`;
  }

  function createManifest() {
    const icons = [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ];

    if (elements.maskableCheck.checked) {
      icons.push(
        {
          src: "/maskable-icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/maskable-icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      );
    }

    return {
      name: elements.appName.value.trim() || "My Web App",
      short_name:
        elements.shortName.value.trim() ||
        shortTitle(elements.appName.value.trim() || "My Web App"),
      start_url: normalizeStartUrl(elements.startUrl.value),
      display: elements.displayMode.value,
      background_color: elements.manifestBackground.value || "#ffffff",
      theme_color: elements.themeColor.value || "#ffffff",
      icons,
    };
  }

  function createHtmlSnippet() {
    const lines = [
      '<link rel="icon" href="/favicon.ico" sizes="any">',
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
      '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
      '<link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png">',
      '<link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png">',
      '<link rel="manifest" href="/site.webmanifest">',
      `<meta name="theme-color" content="${elements.themeColor.value || "#ffffff"}">`,
    ];

    return lines.join("\n");
  }

  async function addPngFile(filename, size, options = {}) {
    const canvas = renderCanvas(size, options);
    const blob = await canvasToBlob(canvas);
    state.generatedFiles.set(filename, blob);

    return { filename, size, blob };
  }

  async function generateFavicons() {
    if (!state.sourceImage || state.generating) {
      return;
    }

    invalidateResult();

    const token = ++state.operationToken;
    setGenerating(true);

    const isCurrent = () => token === state.operationToken;

    try {
      const standardCanvases = [16, 32, 48].map((size) =>
        renderCanvas(size),
      );

      for (let index = 0; index < standardCanvases.length; index += 1) {
        const size = [16, 32, 48][index];
        const blob = await canvasToBlob(standardCanvases[index]);

        if (!isCurrent()) {
          return;
        }

        state.generatedFiles.set(`favicon-${size}x${size}.png`, blob);
      }

      const icoBlob = createIco(standardCanvases);

      if (!isCurrent()) {
        return;
      }

      state.generatedFiles.set("favicon.ico", icoBlob);

      await addPngFile("apple-touch-icon-152x152.png", 152, {
        platform: true,
      });
      if (!isCurrent()) return;

      await addPngFile("apple-touch-icon-167x167.png", 167, {
        platform: true,
      });
      if (!isCurrent()) return;

      await addPngFile("apple-touch-icon-180x180.png", 180, {
        platform: true,
      });
      if (!isCurrent()) return;

      const apple180 = state.generatedFiles.get(
        "apple-touch-icon-180x180.png",
      );
      state.generatedFiles.set("apple-touch-icon.png", apple180);

      await addPngFile("android-chrome-192x192.png", 192);
      if (!isCurrent()) return;

      await addPngFile("android-chrome-512x512.png", 512);
      if (!isCurrent()) return;

      if (elements.maskableCheck.checked) {
        await addPngFile("maskable-icon-192x192.png", 192, {
          platform: true,
          maskable: true,
        });
        if (!isCurrent()) return;

        await addPngFile("maskable-icon-512x512.png", 512, {
          platform: true,
          maskable: true,
        });
        if (!isCurrent()) return;
      }

      const manifestText = JSON.stringify(createManifest(), null, 2);
      const snippetText = createHtmlSnippet();

      state.generatedFiles.set(
        "site.webmanifest",
        new Blob([manifestText], {
          type: "application/manifest+json;charset=utf-8",
        }),
      );
      state.generatedFiles.set(
        "favicon-snippet.html",
        new Blob([snippetText], {
          type: "text/html;charset=utf-8",
        }),
      );

      if (!isCurrent()) {
        return;
      }

      const allBytes = [...state.generatedFiles.values()].reduce(
        (sum, blob) => sum + blob.size,
        0,
      );

      elements.fileCountStat.textContent = String(
        state.generatedFiles.size,
      );
      elements.icoStat.textContent = "16/32/48";
      elements.appleStat.textContent = "152/167/180";
      elements.pwaStat.textContent = elements.maskableCheck.checked
        ? "192/512 + maskable"
        : "192/512";
      elements.fitStat.textContent =
        elements.fitMode.value === "cover" ? "Cover" : "Contain";
      elements.packageSizeStat.textContent = formatBytes(allBytes);
      elements.manifestOutput.value = manifestText;
      elements.snippetOutput.value = snippetText;

      renderPreviews();
      elements.resultSection.hidden = false;

      showActionSuccess("Favicon package generated successfully.");

      elements.resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      if (!isCurrent()) {
        return;
      }

      console.error("Favicon generation failed:", error);
      notify(
        error instanceof Error
          ? error.message
          : "The favicon package could not be generated.",
        "error",
      );
    } finally {
      if (isCurrent()) {
        setGenerating(false);
      }
    }
  }

  function renderPreviews() {
    revokePreviewUrls();
    elements.previewGrid.replaceChildren();

    const previewFiles = [
      ["favicon-16x16.png", "16 × 16"],
      ["favicon-32x32.png", "32 × 32"],
      ["favicon-48x48.png", "48 × 48"],
      ["apple-touch-icon.png", "180 × 180"],
      ["android-chrome-192x192.png", "192 × 192"],
      ["android-chrome-512x512.png", "512 × 512"],
    ];

    if (elements.maskableCheck.checked) {
      previewFiles.push(
        ["maskable-icon-192x192.png", "192 × 192 · maskable"],
        ["maskable-icon-512x512.png", "512 × 512 · maskable"],
      );
    }

    previewFiles.forEach(([filename, label]) => {
      const blob = state.generatedFiles.get(filename);

      if (!blob) {
        return;
      }

      const url = URL.createObjectURL(blob);
      state.previewUrls.push(url);

      const card = document.createElement("div");
      card.className = "fav-preview-card";

      const stage = document.createElement("div");
      stage.className = "fav-preview-stage";

      const image = document.createElement("img");
      image.src = url;
      image.alt = `${filename} preview`;
      stage.appendChild(image);

      const name = document.createElement("span");
      name.className = "fav-preview-name";
      name.textContent = filename;

      const meta = document.createElement("span");
      meta.className = "fav-preview-meta";
      meta.textContent = `${label} · ${formatBytes(blob.size)}`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-secondary fav-preview-download";
      button.textContent = "Download";
      button.addEventListener("click", () => {
        downloadBlob(blob, filename);
        showDownloadSuccess(`${filename} download started.`);
      });

      card.append(stage, name, meta, button);
      elements.previewGrid.appendChild(card);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyText(text, successMessage) {
    if (!text) {
      notify("There is nothing to copy.", "error");
      return;
    }

    try {
      if (typeof window.xavertCopyText === "function") {
        await window.xavertCopyText(text);
        return;
      }

      await navigator.clipboard.writeText(text);
      showCopySuccess(successMessage);
    } catch {
      notify("Clipboard access failed.", "error");
    }
  }

  async function downloadZip() {
    if (!state.generatedFiles.size) {
      notify("Generate the favicon package first.", "error");
      return;
    }

    if (typeof window.JSZip !== "function") {
      notify(
        "The ZIP library is unavailable. Individual downloads still work.",
        "error",
      );
      return;
    }

    elements.downloadZipBtn.disabled = true;

    try {
      const zip = new window.JSZip();

      state.generatedFiles.forEach((blob, filename) => {
        zip.file(filename, blob);
      });

      const packageBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      downloadBlob(packageBlob, "xavert-favicon-package.zip");
      showDownloadSuccess("Complete favicon ZIP download started.");
    } catch (error) {
      console.error("Favicon ZIP generation failed:", error);
      notify("The ZIP package could not be created.", "error");
    } finally {
      elements.downloadZipBtn.disabled = false;
    }
  }

  function clearTool() {
    state.operationToken += 1;
    state.generating = false;
    state.file = null;
    state.fileName = "favicon-source.png";
    state.sourceImage = null;
    state.sourceWidth = 0;
    state.sourceHeight = 0;
    state.sourceHasTransparency = false;
    state.generatedFiles.clear();

    revokeSourceUrl();
    revokePreviewUrls();

    elements.imageInput.value = "";
    elements.fileInfo.textContent = "No image selected.";
    elements.sourceImage.removeAttribute("src");
    elements.sourceDimensions.textContent = "—";
    elements.sourceTransparency.textContent = "—";
    elements.sourceSection.hidden = true;
    elements.generateBtn.disabled = true;
    elements.resultSection.hidden = true;
    elements.previewGrid.replaceChildren();
    elements.snippetOutput.value = "";
    elements.manifestOutput.value = "";
    elements.packageSizeStat.textContent = "—";

    elements.fitMode.value = "contain";
    elements.paddingRange.value = "6";
    elements.paddingValue.textContent = "6%";
    elements.backgroundMode.value = "transparent";
    elements.customBackground.value = "#ffffff";
    elements.customBackgroundWrap.hidden = true;
    elements.platformBackground.value = "#ffffff";
    elements.maskableCheck.checked = true;
    elements.appName.value = "My Web App";
    elements.shortName.value = "My App";
    elements.startUrl.value = "/";
    elements.displayMode.value = "standalone";
    elements.themeColor.value = "#ffffff";
    elements.manifestBackground.value = "#ffffff";

    setGenerating(false);
    elements.generateBtn.disabled = true;
    clearInlineMessage();
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
      elements.dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, () => {
      elements.dropZone.classList.remove("dragover");
    });
  });

  elements.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];

    if (file) {
      void selectFile(file);
    }
  });

  elements.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.imageInput.click();
    }
  });

  elements.sampleBtn.addEventListener("click", () => {
    void createSample();
  });

  elements.replaceBtn.addEventListener("click", () => {
    elements.imageInput.click();
  });

  elements.paddingRange.addEventListener("input", () => {
    elements.paddingValue.textContent = `${elements.paddingRange.value}%`;
  });

  elements.backgroundMode.addEventListener("change", () => {
    elements.customBackgroundWrap.hidden =
      elements.backgroundMode.value !== "custom";
  });

  settingsControls.forEach((control) => {
    control.addEventListener(
      control === elements.paddingRange ? "input" : "change",
      () => {
        if (!elements.resultSection.hidden) {
          invalidateResult();
        }
      },
    );
  });

  [
    elements.appName,
    elements.shortName,
    elements.startUrl,
  ].forEach((control) => {
    control.addEventListener("input", () => {
      if (!elements.resultSection.hidden) {
        invalidateResult();
      }
    });
  });

  elements.generateBtn.addEventListener("click", () => {
    void generateFavicons();
  });

  elements.clearBtn.addEventListener("click", clearTool);

  elements.downloadZipBtn.addEventListener("click", () => {
    void downloadZip();
  });

  elements.downloadIcoBtn.addEventListener("click", () => {
    const blob = state.generatedFiles.get("favicon.ico");

    if (!blob) {
      notify("Generate the favicon package first.", "error");
      return;
    }

    downloadBlob(blob, "favicon.ico");
    showDownloadSuccess("favicon.ico download started.");
  });

  elements.copySnippetBtn.addEventListener("click", () => {
    void copyText(
      elements.snippetOutput.value,
      "HTML favicon snippet copied.",
    );
  });

  elements.copyManifestBtn.addEventListener("click", () => {
    void copyText(
      elements.manifestOutput.value,
      "Web app manifest copied.",
    );
  });

  elements.downloadManifestBtn.addEventListener("click", () => {
    const blob = state.generatedFiles.get("site.webmanifest");

    if (!blob) {
      notify("Generate the favicon package first.", "error");
      return;
    }

    downloadBlob(blob, "site.webmanifest");
    showDownloadSuccess("site.webmanifest download started.");
  });

  window.addEventListener(
    "pagehide",
    () => {
      revokeSourceUrl();
      revokePreviewUrls();
    },
    { once: true },
  );
});
