"use strict";

document.addEventListener("DOMContentLoaded", function () {
  if (document.body.dataset.tool !== "color-palette-extractor") {
    return;
  }

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const paletteSize = document.getElementById("paletteSize");
  const customPaletteSizeGroup = document.getElementById(
    "customPaletteSizeGroup",
  );
  const customPaletteSize = document.getElementById("customPaletteSize");

  const extractBtn = document.getElementById("extractBtn");
  const clearBtn = document.getElementById("clearBtn");

  const copyPaletteBtn = document.getElementById("copyPaletteBtn");
  const downloadTxtBtn = document.getElementById("downloadTxtBtn");
  const downloadJsonBtn = document.getElementById("downloadJsonBtn");
  const downloadCssBtn = document.getElementById("downloadCssBtn");
  const downloadSvgBtn = document.getElementById("downloadSvgBtn");

  const previewBox = document.getElementById("previewBox");
  const previewImage = document.getElementById("previewImage");
  const imageInfo = document.getElementById("imageInfo");

  const paletteBox = document.getElementById("paletteBox");
  const palette = document.getElementById("palette");

  const colorCountStat = document.getElementById("colorCountStat");
  const imageWidthStat = document.getElementById("imageWidthStat");
  const imageHeightStat = document.getElementById("imageHeightStat");
  const fileSizeStat = document.getElementById("fileSizeStat");

  const message = document.getElementById("message");
  const canvas = document.getElementById("canvas");

  const requiredElements = {
    dropzone,
    fileInput,
    paletteSize,
    customPaletteSizeGroup,
    customPaletteSize,
    extractBtn,
    clearBtn,
    copyPaletteBtn,
    downloadTxtBtn,
    downloadJsonBtn,
    downloadCssBtn,
    downloadSvgBtn,
    previewBox,
    previewImage,
    imageInfo,
    paletteBox,
    palette,
    colorCountStat,
    imageWidthStat,
    imageHeightStat,
    fileSizeStat,
    message,
    canvas,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error(
      "Color Palette Extractor initialization failed.",
      missingElements,
    );

    return;
  }

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  const supportedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/avif",
  ];

  const maximumFileSize = 25 * 1024 * 1024;
  const maximumAnalysisDimension = 1200;

  let currentFile = null;
  let currentObjectUrl = "";
  let extractedColors = [];
  let imageLoaded = false;
  let paletteGenerated = false;

  function setInlineMessage(text = "", type = "info") {
    if (!message) return;

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

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value);
  }

  function getRequestedPaletteSize() {
    if (paletteSize.value !== "custom") return Number(paletteSize.value);
    const value = Number.parseInt(customPaletteSize.value, 10);
    if (!Number.isFinite(value)) return 6;
    return Math.max(2, Math.min(20, value));
  }

  function syncCustomPaletteSize() {
    const isCustom = paletteSize.value === "custom";
    customPaletteSizeGroup.hidden = !isCustom;
    customPaletteSize.disabled = !isCustom;
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 KB";
    }

    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );

    const value = bytes / 1024 ** unitIndex;
    const decimals = unitIndex === 0 || value >= 10 ? 0 : 2;

    return `${value.toFixed(decimals)} ${units[unitIndex]}`;
  }

  function revokeCurrentObjectUrl() {
    if (!currentObjectUrl) {
      return;
    }

    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = "";
  }

  function resetStatistics() {
    colorCountStat.textContent = "0";
    imageWidthStat.textContent = "0";
    imageHeightStat.textContent = "0";
    fileSizeStat.textContent = "0 KB";
  }

  function updateImageStatistics(file) {
    colorCountStat.textContent = "0";
    imageWidthStat.textContent = formatNumber(previewImage.naturalWidth);
    imageHeightStat.textContent = formatNumber(previewImage.naturalHeight);
    fileSizeStat.textContent = formatFileSize(file.size);
  }

  function hidePalette() {
    paletteGenerated = false;
    extractedColors = [];

    palette.replaceChildren();
    paletteBox.hidden = true;
    colorCountStat.textContent = "0";
  }

  function hidePreview() {
    imageLoaded = false;
    currentFile = null;

    previewImage.onload = null;
    previewImage.onerror = null;
    previewImage.removeAttribute("src");

    previewBox.hidden = true;
    imageInfo.textContent = "";

    canvas.width = 1;
    canvas.height = 1;

    revokeCurrentObjectUrl();
    resetStatistics();
  }

  function resetToolState() {
    fileInput.value = "";
    paletteSize.value = "5";
    customPaletteSize.value = "6";
    syncCustomPaletteSize();
    dropzone.classList.remove("drag");

    hidePalette();
    hidePreview();
  }

  function validateImageFile(file) {
    if (!file) {
      return "Select an image first.";
    }

    if (file.size === 0) {
      return "The selected image is empty.";
    }

    if (file.size > maximumFileSize) {
      return "The image must be smaller than 25 MB.";
    }

    if (file.type && !supportedMimeTypes.includes(file.type)) {
      return "Select a JPG, PNG, WebP, GIF, BMP or AVIF image.";
    }

    return "";
  }

  function loadImage(file) {
    const validationError = validateImageFile(file);

    if (validationError) {
      fileInput.value = "";
      notify(validationError, "error");
      return;
    }

    hidePalette();
    hidePreview();

    currentFile = file;
    currentObjectUrl = URL.createObjectURL(file);

    previewImage.onload = function () {
      imageLoaded = true;

      previewBox.hidden = false;

      imageInfo.textContent =
        `${file.name} • ${formatFileSize(file.size)} • ` +
        `${formatNumber(previewImage.naturalWidth)} × ` +
        `${formatNumber(previewImage.naturalHeight)} px`;

      updateImageStatistics(file);

      notify("Image loaded. Extract the palette when ready.", "success");
    };

    previewImage.onerror = function () {
      hidePreview();
      fileInput.value = "";

      notify("The selected image could not be loaded.", "error");
    };

    previewImage.src = currentObjectUrl;
  }

  function clampChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function rgbToHex(red, green, blue) {
    return `#${[red, green, blue]
      .map(function (value) {
        return clampChannel(value).toString(16).padStart(2, "0");
      })
      .join("")
      .toUpperCase()}`;
  }

  function rgbToHsl(red, green, blue) {
    const normalizedRed = red / 255;
    const normalizedGreen = green / 255;
    const normalizedBlue = blue / 255;

    const maximum = Math.max(normalizedRed, normalizedGreen, normalizedBlue);

    const minimum = Math.min(normalizedRed, normalizedGreen, normalizedBlue);

    const lightness = (maximum + minimum) / 2;

    let hue = 0;
    let saturation = 0;

    if (maximum !== minimum) {
      const difference = maximum - minimum;

      saturation =
        lightness > 0.5
          ? difference / (2 - maximum - minimum)
          : difference / (maximum + minimum);

      if (maximum === normalizedRed) {
        hue =
          (normalizedGreen - normalizedBlue) / difference +
          (normalizedGreen < normalizedBlue ? 6 : 0);
      } else if (maximum === normalizedGreen) {
        hue = (normalizedBlue - normalizedRed) / difference + 2;
      } else {
        hue = (normalizedRed - normalizedGreen) / difference + 4;
      }

      hue /= 6;
    }

    return {
      h: Math.round(hue * 360),
      s: Math.round(saturation * 100),
      l: Math.round(lightness * 100),
    };
  }

  function getRelativeLuminance(red, green, blue) {
    const channels = [red, green, blue].map(function (value) {
      const normalized = value / 255;

      return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function getReadableTextColor(red, green, blue) {
    return getRelativeLuminance(red, green, blue) > 0.45
      ? "#111827"
      : "#FFFFFF";
  }

  function getColorDistance(firstColor, secondColor) {
    const redDifference = firstColor.red - secondColor.red;
    const greenDifference = firstColor.green - secondColor.green;
    const blueDifference = firstColor.blue - secondColor.blue;

    return Math.sqrt(
      redDifference ** 2 + greenDifference ** 2 + blueDifference ** 2,
    );
  }

  function prepareCanvas() {
    if (
      !context ||
      !imageLoaded ||
      !previewImage.complete ||
      previewImage.naturalWidth === 0 ||
      previewImage.naturalHeight === 0
    ) {
      return false;
    }

    const scale = Math.min(
      1,
      maximumAnalysisDimension / previewImage.naturalWidth,
      maximumAnalysisDimension / previewImage.naturalHeight,
    );

    canvas.width = Math.max(1, Math.round(previewImage.naturalWidth * scale));

    canvas.height = Math.max(1, Math.round(previewImage.naturalHeight * scale));

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.drawImage(previewImage, 0, 0, canvas.width, canvas.height);

    return true;
  }

  function collectColorBuckets(imageData) {
    const buckets = new Map();
    const pixelCount = imageData.length / 4;
    const targetSamples = 70000;

    const pixelStep = Math.max(1, Math.floor(pixelCount / targetSamples));

    const channelStep = 24;
    let analyzedPixels = 0;

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += pixelStep) {
      const index = pixelIndex * 4;
      const alpha = imageData[index + 3];

      if (alpha < 80) {
        continue;
      }

      const red = imageData[index];
      const green = imageData[index + 1];
      const blue = imageData[index + 2];

      const quantizedRed = Math.min(
        255,
        Math.round(red / channelStep) * channelStep,
      );

      const quantizedGreen = Math.min(
        255,
        Math.round(green / channelStep) * channelStep,
      );

      const quantizedBlue = Math.min(
        255,
        Math.round(blue / channelStep) * channelStep,
      );

      const key =
        `${quantizedRed},` + `${quantizedGreen},` + `${quantizedBlue}`;

      const existingBucket = buckets.get(key);

      if (existingBucket) {
        existingBucket.count += 1;
        existingBucket.redTotal += red;
        existingBucket.greenTotal += green;
        existingBucket.blueTotal += blue;
      } else {
        buckets.set(key, {
          count: 1,
          redTotal: red,
          greenTotal: green,
          blueTotal: blue,
        });
      }

      analyzedPixels += 1;
    }

    return {
      buckets,
      analyzedPixels,
    };
  }

  function rankColors(buckets, analyzedPixels, requestedSize) {
    const rankedColors = Array.from(buckets.values())
      .map(function (bucket) {
        return {
          red: bucket.redTotal / bucket.count,
          green: bucket.greenTotal / bucket.count,
          blue: bucket.blueTotal / bucket.count,
          count: bucket.count,
        };
      })
      .sort(function (firstColor, secondColor) {
        return secondColor.count - firstColor.count;
      });

    if (rankedColors.length === 0) {
      return [];
    }

    const centroids = [];
    const minimumSeedDistance = 42;

    for (const color of rankedColors) {
      const isDistinct = centroids.every(function (centroid) {
        return getColorDistance(color, centroid) >= minimumSeedDistance;
      });

      if (isDistinct) {
        centroids.push({
          red: color.red,
          green: color.green,
          blue: color.blue,
        });
      }

      if (centroids.length >= requestedSize) {
        break;
      }
    }

    for (const color of rankedColors) {
      if (centroids.length >= requestedSize) {
        break;
      }

      const alreadyRepresented = centroids.some(function (centroid) {
        return getColorDistance(color, centroid) < 1;
      });

      if (!alreadyRepresented) {
        centroids.push({
          red: color.red,
          green: color.green,
          blue: color.blue,
        });
      }
    }

    const iterations = 7;
    let clusters = [];

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      clusters = centroids.map(function () {
        return {
          count: 0,
          redTotal: 0,
          greenTotal: 0,
          blueTotal: 0,
        };
      });

      rankedColors.forEach(function (color) {
        let closestIndex = 0;
        let closestDistance = Infinity;

        centroids.forEach(function (centroid, index) {
          const distance = getColorDistance(color, centroid);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        const cluster = clusters[closestIndex];
        cluster.count += color.count;
        cluster.redTotal += color.red * color.count;
        cluster.greenTotal += color.green * color.count;
        cluster.blueTotal += color.blue * color.count;
      });

      clusters.forEach(function (cluster, index) {
        if (cluster.count === 0) {
          return;
        }

        centroids[index] = {
          red: cluster.redTotal / cluster.count,
          green: cluster.greenTotal / cluster.count,
          blue: cluster.blueTotal / cluster.count,
        };
      });
    }

    return clusters
      .filter(function (cluster) {
        return cluster.count > 0;
      })
      .map(function (cluster, index) {
        const centroid = centroids[index];
        const red = clampChannel(centroid.red);
        const green = clampChannel(centroid.green);
        const blue = clampChannel(centroid.blue);
        const hex = rgbToHex(red, green, blue);
        const hsl = rgbToHsl(red, green, blue);

        return {
          hex,
          rgb: `rgb(${red}, ${green}, ${blue})`,
          hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
          percentage:
            analyzedPixels > 0 ? (cluster.count / analyzedPixels) * 100 : 0,
          red,
          green,
          blue,
          textColor: getReadableTextColor(red, green, blue),
        };
      })
      .sort(function (firstColor, secondColor) {
        return secondColor.percentage - firstColor.percentage;
      });
  }

  async function copyText(value) {
    try {
      await xavertCopyText(value);
    } catch (error) {
      console.error("Color copy failed:", error);
      notify("Could not copy the color.", "error");
    }
  }

  function createColorDetail(label, value) {
    const row = document.createElement("div");
    row.className = "color-value-row";

    const labelElement = document.createElement("span");
    labelElement.className = "color-value-label";
    labelElement.textContent = label;

    const valueElement = document.createElement("code");
    valueElement.textContent = value;

    row.append(labelElement, valueElement);

    return row;
  }

  function createCopyButton(label, value) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "btn btn-secondary color-copy-btn";
    button.textContent = label;

    button.addEventListener("click", function () {
      copyText(value);
    });

    return button;
  }

  function renderPalette() {
    palette.replaceChildren();

    extractedColors.forEach(function (color, index) {
      const card = document.createElement("article");
      card.className = "color-card";

      const swatch = document.createElement("div");
      swatch.className = "color-preview";
      swatch.style.backgroundColor = color.hex;
      swatch.style.color = color.textColor;

      const position = document.createElement("span");
      position.className = "color-position";
      position.textContent = String(index + 1);

      const percentage = document.createElement("strong");
      percentage.className = "color-percentage";
      percentage.textContent = `${color.percentage.toFixed(1)}%`;

      swatch.append(position, percentage);

      const information = document.createElement("div");
      information.className = "color-info";

      const colorTitle = document.createElement("h3");
      colorTitle.textContent = color.hex;

      const details = document.createElement("div");
      details.className = "color-values";

      details.append(
        createColorDetail("HEX", color.hex),
        createColorDetail("RGB", color.rgb),
        createColorDetail("HSL", color.hsl),
      );

      const actions = document.createElement("div");
      actions.className = "color-card-actions";

      actions.append(
        createCopyButton("Copy HEX", color.hex),
        createCopyButton("Copy RGB", color.rgb),
        createCopyButton("Copy HSL", color.hsl),
      );

      information.append(colorTitle, details, actions);
      card.append(swatch, information);
      palette.appendChild(card);
    });

    paletteBox.hidden = false;
    colorCountStat.textContent = String(extractedColors.length);
  }

  function extractColors(options = {}) {
    const announce = options.announce !== false;

    if (!imageLoaded || !currentFile) {
      notify("Upload an image first.", "error", announce);

      return false;
    }

    if (!prepareCanvas()) {
      notify("The image is not ready for processing.", "error", announce);

      return false;
    }

    extractBtn.disabled = true;
    extractBtn.setAttribute("aria-busy", "true");

    try {
      const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;

      const result = collectColorBuckets(imageData);

      if (result.analyzedPixels === 0 || result.buckets.size === 0) {
        hidePalette();

        notify("No visible colors could be extracted.", "error", announce);

        return false;
      }

      const requestedSize = getRequestedPaletteSize();

      extractedColors = rankColors(
        result.buckets,
        result.analyzedPixels,
        requestedSize,
      );

      if (extractedColors.length === 0) {
        hidePalette();

        notify("No colors could be extracted.", "error", announce);

        return false;
      }

      paletteGenerated = true;
      renderPalette();

      if (announce) {
        setInlineMessage("Action completed successfully.", "success");

        if (typeof window.showActionSuccess === "function") {
          window.showActionSuccess();
        } else if (typeof window.showMessage === "function") {
          window.showMessage("Action completed successfully.", "success");
        }
      }

      return true;
    } catch (error) {
      console.error("Palette extraction failed:", error);

      hidePalette();

      notify("The image could not be processed.", "error", announce);

      return false;
    } finally {
      extractBtn.disabled = false;
      extractBtn.removeAttribute("aria-busy");
    }
  }

  function ensurePalette() {
    if (paletteGenerated && extractedColors.length > 0) {
      return true;
    }

    return extractColors({
      announce: false,
    });
  }

  function getTextPaletteContent() {
    return extractedColors
      .map(function (color, index) {
        return [
          `Color ${index + 1}`,
          `HEX: ${color.hex}`,
          `RGB: ${color.rgb}`,
          `HSL: ${color.hsl}`,
          `Coverage: ${color.percentage.toFixed(1)}%`,
        ].join("\n");
      })
      .join("\n\n");
  }

  function getCssPaletteContent() {
    const variables = extractedColors
      .map(function (color, index) {
        return `  --palette-color-${index + 1}: ${color.hex};`;
      })
      .join("\n");

    return `:root {\n${variables}\n}\n`;
  }

  function getSvgPaletteContent() {
    const swatchWidth = 180;
    const swatchHeight = 180;
    const labelHeight = 74;

    const width = swatchWidth * extractedColors.length;

    const height = swatchHeight + labelHeight;

    const swatches = extractedColors
      .map(function (color, index) {
        const x = index * swatchWidth;
        const center = x + swatchWidth / 2;

        return [
          `<rect x="${x}" y="0" width="${swatchWidth}" height="${swatchHeight}" fill="${color.hex}"/>`,
          `<text x="${center}" y="${swatchHeight + 30}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#111827">${color.hex}</text>`,
          `<text x="${center}" y="${swatchHeight + 54}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#6B7280">${color.percentage.toFixed(1)}%</text>`,
        ].join("");
      })
      .join("");

    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Extracted color palette">`,
      `<rect width="100%" height="100%" fill="#FFFFFF"/>`,
      swatches,
      `</svg>`,
    ].join("");
  }

  function downloadContent(filename, content, mimeType) {
    if (!ensurePalette()) {
      notify("Extract a valid palette first.", "error");

      return;
    }

    downloadFile(filename, content(), mimeType);
  }

  function copyPalette() {
    if (!ensurePalette()) {
      notify("Extract a valid palette first.", "error");

      return;
    }

    copyText(getTextPaletteContent());
  }

  function downloadTxt() {
    downloadContent(
      "xavert-color-palette.txt",
      getTextPaletteContent,
      "text/plain;charset=utf-8",
    );
  }

  function downloadJson() {
    downloadContent(
      "xavert-color-palette.json",
      function () {
        return JSON.stringify(
          {
            source: currentFile ? currentFile.name : null,
            colors: extractedColors.map(function (color) {
              return {
                hex: color.hex,
                rgb: color.rgb,
                hsl: color.hsl,
                percentage: Number(color.percentage.toFixed(1)),
              };
            }),
          },
          null,
          2,
        );
      },
      "application/json;charset=utf-8",
    );
  }

  function downloadCss() {
    downloadContent(
      "xavert-color-palette.css",
      getCssPaletteContent,
      "text/css;charset=utf-8",
    );
  }

  function downloadSvg() {
    downloadContent(
      "xavert-color-palette.svg",
      getSvgPaletteContent,
      "image/svg+xml;charset=utf-8",
    );
  }

  function clearTool() {
    resetToolState();
    setInlineMessage("");
    dropzone.focus();
  }

  function handleDroppedFiles(fileList) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    if (fileList.length > 1) {
      notify("Only the first image will be used.", "info");
    }

    loadImage(fileList[0]);
  }

  dropzone.addEventListener("click", function () {
    fileInput.click();
  });

  dropzone.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  dropzone.addEventListener("dragenter", function (event) {
    event.preventDefault();
    dropzone.classList.add("drag");
  });

  dropzone.addEventListener("dragover", function (event) {
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }

    dropzone.classList.add("drag");
  });

  dropzone.addEventListener("dragleave", function (event) {
    if (!dropzone.contains(event.relatedTarget)) {
      dropzone.classList.remove("drag");
    }
  });

  dropzone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropzone.classList.remove("drag");

    handleDroppedFiles(event.dataTransfer.files);
  });

  fileInput.addEventListener("change", function () {
    handleDroppedFiles(fileInput.files);
  });

  extractBtn.addEventListener("click", function () {
    extractColors();
  });

  clearBtn.addEventListener("click", clearTool);

  copyPaletteBtn.addEventListener("click", copyPalette);

  downloadTxtBtn.addEventListener("click", downloadTxt);

  downloadJsonBtn.addEventListener("click", downloadJson);

  downloadCssBtn.addEventListener("click", downloadCss);

  downloadSvgBtn.addEventListener("click", downloadSvg);

  paletteSize.addEventListener("change", function () {
    syncCustomPaletteSize();

    if (paletteGenerated) {
      extractColors({ announce: false });
      setInlineMessage("Palette size updated.", "success");
    }
  });

  customPaletteSize.addEventListener("change", function () {
    const normalized = getRequestedPaletteSize();
    customPaletteSize.value = String(normalized);

    if (paletteGenerated) {
      extractColors({ announce: false });
      setInlineMessage("Palette size updated.", "success");
    }
  });

  window.addEventListener("beforeunload", function () {
    revokeCurrentObjectUrl();
  });

  previewBox.hidden = true;
  paletteBox.hidden = true;
  syncCustomPaletteSize();
  resetStatistics();
});
