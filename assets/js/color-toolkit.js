"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "color-toolkit") {
    return;
  }

  const $ = (id) => document.getElementById(id);

  const el = {
    toolSelector: $("toolSelector"),
    formatGroup: $("formatGroup"),
    valueGroup: $("valueGroup"),
    foregroundGroup: $("foregroundGroup"),
    backgroundGroup: $("backgroundGroup"),
    paletteColorGroup: $("paletteColorGroup"),
    paletteTypeGroup: $("paletteTypeGroup"),
    colorFormat: $("colorFormat"),
    colorInput: $("colorInput"),
    foregroundColor: $("foregroundColor"),
    foregroundHex: $("foregroundHex"),
    backgroundColor: $("backgroundColor"),
    backgroundHex: $("backgroundHex"),
    paletteColor: $("paletteColor"),
    paletteType: $("paletteType"),
    primaryBtn: $("primaryBtn"),
    secondaryBtn1: $("secondaryBtn1"),
    secondaryBtn2: $("secondaryBtn2"),
    secondaryBtn3: $("secondaryBtn3"),
    clearBtn: $("clearBtn"),
    sampleBtn: $("sampleBtn"),
    previewBox: $("previewBox"),
    previewTitle: $("previewTitle"),
    previewContent: $("previewContent"),
    message: $("message"),
  };

  const missingElements = Object.entries(el)
    .filter(([, node]) => !node)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error("Color Toolkit initialization failed.", missingElements);
    return;
  }

  const STORAGE_KEY = "xavert-color-toolkit-palettes";
  const MAX_SAVED = 10;

  // --------------------------------------------------
  // State
  // --------------------------------------------------
  let currentColor = null;
  let currentContrast = null;
  let currentPalette = [];
  let savedPalettes = loadSavedPalettes();

  const modes = {
    converter: ["Convert", "Copy HEX", "Copy RGB", "Copy HSL", "Load Sample"],
    generator: ["Generate", "Similar", "Complementary", "Copy HEX", ""],
    contrast: [
      "Check Contrast",
      "Swap Colors",
      "Copy Ratio",
      "Copy Colors",
      "Load Sample",
    ],
    palette: [
      "Generate Palette",
      "Save Palette",
      "Download TXT",
      "Copy Palette",
      "Load Sample",
    ],
  };

  // --------------------------------------------------
  // UI Helpers
  // --------------------------------------------------
  function setInlineMessage(text = "", type = "info") {
    const allowed = ["success", "error", "info"];
    const safe = allowed.includes(type) ? type : "info";

    el.message.textContent = text;
    el.message.className = "message";

    if (text) {
      el.message.classList.add(`message-${safe}`);
    }
  }

  function notify(text = "", type = "info", useToast = true) {
    setInlineMessage(text, type);

    if (text && useToast && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function showPreview(title, ...nodes) {
    el.previewTitle.textContent = title;
    el.previewContent.replaceChildren(...nodes);
    el.previewBox.hidden = false;
  }

  function hidePreview() {
    el.previewContent.replaceChildren();
    el.previewBox.hidden = true;
  }

  function syncContrastFields(source) {
    if (source === "foreground-color") {
      el.foregroundHex.value = el.foregroundColor.value.toUpperCase();
      return;
    }

    if (source === "background-color") {
      el.backgroundHex.value = el.backgroundColor.value.toUpperCase();
      return;
    }

    if (source === "foreground-hex") {
      const normalized = normalizeHex(el.foregroundHex.value);
      if (normalized) {
        el.foregroundHex.value = normalized;
        el.foregroundColor.value = normalized.toLowerCase();
      }
      return;
    }

    if (source === "background-hex") {
      const normalized = normalizeHex(el.backgroundHex.value);
      if (normalized) {
        el.backgroundHex.value = normalized;
        el.backgroundColor.value = normalized.toLowerCase();
      }
    }
  }

  // --------------------------------------------------
  // Color Conversion
  // --------------------------------------------------
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
  }

  function normalizeHue(value) {
    return ((Number(value) % 360) + 360) % 360;
  }

  function componentToHex(value) {
    return clamp(Math.round(value), 0, 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  }

  function rgbToHex(red, green, blue) {
    return (
      `#${componentToHex(red)}` +
      `${componentToHex(green)}` +
      `${componentToHex(blue)}`
    );
  }

  function normalizeHex(value) {
    let hex = String(value).trim();

    if (!hex.startsWith("#")) {
      hex = `#${hex}`;
    }

    if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) {
      return "";
    }

    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}` + `${hex[2]}${hex[2]}` + `${hex[3]}${hex[3]}`;
    }

    return hex.toUpperCase();
  }

  function hexToRgb(value) {
    const hex = normalizeHex(value);

    if (!hex) {
      return null;
    }

    return {
      red: parseInt(hex.slice(1, 3), 16),
      green: parseInt(hex.slice(3, 5), 16),
      blue: parseInt(hex.slice(5, 7), 16),
    };
  }

  function rgbToHsl(red, green, blue) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;

    let hue = 0;
    let saturation = 0;

    if (max !== min) {
      const difference = max - min;

      saturation =
        lightness > 0.5
          ? difference / (2 - max - min)
          : difference / (max + min);

      if (max === r) {
        hue = (g - b) / difference + (g < b ? 6 : 0);
      } else if (max === g) {
        hue = (b - r) / difference + 2;
      } else {
        hue = (r - g) / difference + 4;
      }

      hue /= 6;
    }

    return {
      hue: Math.round(hue * 360),
      saturation: Math.round(saturation * 100),
      lightness: Math.round(lightness * 100),
    };
  }

  function hslToRgb(hue, saturation, lightness) {
    const h = normalizeHue(hue) / 360;
    const s = clamp(saturation, 0, 100) / 100;
    const l = clamp(lightness, 0, 100) / 100;

    if (s === 0) {
      const gray = Math.round(l * 255);

      return {
        red: gray,
        green: gray,
        blue: gray,
      };
    }

    function channel(p, q, input) {
      let t = input;

      if (t < 0) {
        t += 1;
      }

      if (t > 1) {
        t -= 1;
      }

      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }

      if (t < 1 / 2) {
        return q;
      }

      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }

      return p;
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;

    const p = 2 * l - q;

    return {
      red: Math.round(channel(p, q, h + 1 / 3) * 255),
      green: Math.round(channel(p, q, h) * 255),
      blue: Math.round(channel(p, q, h - 1 / 3) * 255),
    };
  }

  function createColor(red, green, blue) {
    const r = clamp(Math.round(red), 0, 255);

    const g = clamp(Math.round(green), 0, 255);

    const b = clamp(Math.round(blue), 0, 255);

    const hsl = rgbToHsl(r, g, b);

    return {
      red: r,
      green: g,
      blue: b,
      hue: hsl.hue,
      saturation: hsl.saturation,
      lightness: hsl.lightness,
      hex: rgbToHex(r, g, b),
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: `hsl(${hsl.hue}, ` + `${hsl.saturation}%, ` + `${hsl.lightness}%)`,
    };
  }

  function createColorFromHsl(hue, saturation, lightness) {
    const rgb = hslToRgb(hue, saturation, lightness);

    return createColor(rgb.red, rgb.green, rgb.blue);
  }

  function parseColor(value, format) {
    if (format === "hex") {
      const rgb = hexToRgb(value);

      return rgb ? createColor(rgb.red, rgb.green, rgb.blue) : null;
    }

    if (format === "rgb") {
      const match = String(value)
        .trim()
        .match(
          /^rgb\s*\(\s*(\d{1,3})\s*(?:,|\s)\s*(\d{1,3})\s*(?:,|\s)\s*(\d{1,3})\s*\)$/i,
        );

      if (!match) {
        return null;
      }

      const channels = match.slice(1).map(Number);

      if (channels.some((channel) => channel > 255)) {
        return null;
      }

      return createColor(...channels);
    }

    if (format === "hsl") {
      const match = String(value)
        .trim()
        .match(
          /^hsl\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i,
        );

      if (!match) {
        return null;
      }

      const hue = Number(match[1]);
      const saturation = Number(match[2]);
      const lightness = Number(match[3]);

      if (saturation > 100 || lightness > 100) {
        return null;
      }

      return createColorFromHsl(hue, saturation, lightness);
    }

    return null;
  }

  function colorValues(color) {
    const wrapper = document.createElement("div");

    wrapper.className = "color-values";

    [
      ["HEX", color.hex],
      ["RGB", color.rgb],
      ["HSL", color.hsl],
    ].forEach(([label, value]) => {
      const item = document.createElement("div");

      const title = document.createElement("strong");

      const code = document.createElement("code");

      item.className = "color-value";
      title.textContent = label;
      code.textContent = value;

      item.append(title, code);
      wrapper.append(item);
    });

    return wrapper;
  }

  function renderColor(color, title) {
    const swatch = document.createElement("div");

    swatch.className = "color-preview";

    swatch.style.backgroundColor = color.hex;

    swatch.textContent = color.hex;

    showPreview(title, swatch, colorValues(color));
  }

  function convertColor() {
    const color = parseColor(el.colorInput.value, el.colorFormat.value);

    if (!color) {
      hidePreview();

      notify("Enter a valid color value.", "error");

      el.colorInput.focus();
      return;
    }

    currentColor = color;

    el.colorInput.value = color[el.colorFormat.value];

    renderColor(color, "Converted Color");

    setInlineMessage("Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
    }
  }

  function randomChannel() {
    if (window.crypto?.getRandomValues) {
      const value = new Uint8Array(1);

      window.crypto.getRandomValues(value);

      return value[0];
    }

    return Math.floor(Math.random() * 256);
  }

  function randomInteger(minimum, maximum) {
    const min = Math.ceil(minimum);
    const max = Math.floor(maximum);
    const range = max - min + 1;

    if (range <= 0) {
      return min;
    }

    if (window.crypto?.getRandomValues) {
      const maximumUint32 = 0x100000000;
      const limit = maximumUint32 - (maximumUint32 % range);
      const values = new Uint32Array(1);

      do {
        window.crypto.getRandomValues(values);
      } while (values[0] >= limit);

      return min + (values[0] % range);
    }

    return min + Math.floor(Math.random() * range);
  }

  function generateRandomColor() {
    currentColor = createColor(
      randomChannel(),
      randomChannel(),
      randomChannel(),
    );

    renderColor(currentColor, "Generated Color");

    setInlineMessage("Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
    }
  }

  function generateSimilarColor() {
    if (!currentColor) {
      generateRandomColor();
      return;
    }

    currentColor = createColorFromHsl(
      currentColor.hue + randomInteger(-20, 20),

      clamp(currentColor.saturation + randomInteger(-10, 10), 15, 100),

      clamp(currentColor.lightness + randomInteger(-10, 10), 10, 90),
    );

    renderColor(currentColor, "Similar Color");

    notify("Action completed successfully.", "success");
  }

  function generateComplementaryColor() {
    if (!currentColor) {
      generateRandomColor();
      return;
    }

    currentColor = createColorFromHsl(
      currentColor.hue + 180,
      currentColor.saturation,
      currentColor.lightness,
    );

    renderColor(currentColor, "Complementary Color");

    notify("Action completed successfully.", "success");
  }

  function luminance(color) {
    const channels = [color.red, color.green, color.blue].map((channel) => {
      const value = channel / 255;

      return value <= 0.03928
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function checkContrast() {
    const foregroundHex = normalizeHex(el.foregroundHex.value);
    const backgroundHex = normalizeHex(el.backgroundHex.value);

    if (!foregroundHex || !backgroundHex) {
      hidePreview();
      notify("Enter valid foreground and background HEX colors.", "error");
      return;
    }

    el.foregroundHex.value = foregroundHex;
    el.backgroundHex.value = backgroundHex;
    el.foregroundColor.value = foregroundHex.toLowerCase();
    el.backgroundColor.value = backgroundHex.toLowerCase();

    const foregroundRgb = hexToRgb(foregroundHex);
    const backgroundRgb = hexToRgb(backgroundHex);

    const foreground = createColor(
      foregroundRgb.red,
      foregroundRgb.green,
      foregroundRgb.blue,
    );

    const background = createColor(
      backgroundRgb.red,
      backgroundRgb.green,
      backgroundRgb.blue,
    );

    const light = Math.max(luminance(foreground), luminance(background));

    const dark = Math.min(luminance(foreground), luminance(background));

    const ratio = (light + 0.05) / (dark + 0.05);

    currentContrast = {
      ratio,
      foreground: foreground.hex,
      background: background.hex,
    };

    const preview = document.createElement("div");

    const tests = document.createElement("div");

    preview.className = "color-preview";

    preview.style.color = foreground.hex;

    preview.style.backgroundColor = background.hex;

    preview.textContent = `Sample Text — ` + `${ratio.toFixed(2)}:1`;

    tests.className = "contrast-tests";

    [
      ["Normal Text — AA", ratio >= 4.5],
      ["Normal Text — AAA", ratio >= 7],
      ["Large Text — AA", ratio >= 3],
      ["Large Text — AAA", ratio >= 4.5],
    ].forEach(([label, passed]) => {
      const item = document.createElement("div");

      const title = document.createElement("strong");

      const result = document.createElement("span");

      item.className = "contrast-test";

      title.textContent = label;

      result.className = passed ? "contrast-pass" : "contrast-fail";

      result.textContent = passed ? "Pass ✓" : "Fail ✕";

      item.append(title, result);
      tests.append(item);
    });

    showPreview("Contrast Result", preview, tests);

    notify(
      ratio >= 4.5
        ? "WCAG AA passed for normal text."
        : "WCAG AA not passed for normal text.",
      ratio >= 4.5 ? "success" : "error",
    );
  }

  function paletteOffsets(type) {
    return {
      analogous: [-60, -30, 0, 30, 60],

      complementary: [0, 30, 180, 210, 330],

      triadic: [0, 60, 120, 240, 300],

      split: [0, 30, 150, 210, 330],

      tetradic: [0, 90, 180, 270, 315],

      monochromatic: [0, 0, 0, 0, 0],
    }[type];
  }

  function buildPalette(base, type) {
    if (type === "monochromatic") {
      return [20, 35, 50, 65, 80].map((lightness) =>
        createColorFromHsl(base.hue, base.saturation, lightness),
      );
    }

    return paletteOffsets(type).map((offset, index) =>
      createColorFromHsl(
        base.hue + offset,

        clamp(base.saturation + (index % 2 ? -8 : 0), 20, 100),

        clamp(base.lightness + (index === 0 ? 0 : index % 2 ? -6 : 6), 15, 85),
      ),
    );
  }

  function paletteCard(color) {
    const card = document.createElement("article");

    const swatch = document.createElement("button");

    const label = document.createElement("span");

    const meta = document.createElement("div");

    card.className = "palette-color";

    swatch.type = "button";

    swatch.className = "palette-swatch";

    swatch.style.backgroundColor = color.hex;

    swatch.setAttribute("aria-label", `Copy ${color.hex}`);

    label.textContent = "Copy";

    meta.className = "palette-meta";

    meta.textContent = color.hex;

    swatch.append(label);

    swatch.addEventListener("click", () => xavertCopyText(color.hex));

    card.append(swatch, meta);

    return card;
  }

  // --------------------------------------------------
  // Palette Management
  // --------------------------------------------------
  function loadSavedPalettes() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .filter(
          (palette) =>
            Array.isArray(palette) &&
            palette.length === 5 &&
            palette.every((hex) => normalizeHex(hex)),
        )
        .slice(0, MAX_SAVED);
    } catch {
      return [];
    }
  }

  function saveStoredPalettes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPalettes));
      return true;
    } catch (error) {
      console.error("Could not save palettes locally:", error);
      notify("Saved palettes are unavailable in this browser.", "error");
      return false;
    }
  }

  function renderSavedPalettes(container) {
    container.replaceChildren();

    savedPalettes.forEach((palette, index) => {
      const section = document.createElement("section");

      const header = document.createElement("div");

      const title = document.createElement("strong");

      const remove = document.createElement("button");

      const colors = document.createElement("div");

      section.className = "saved-palette";

      header.className = "saved-palette-header";

      title.textContent = `Saved Palette ${index + 1}`;

      remove.type = "button";

      remove.className = "btn btn-secondary";

      remove.textContent = "Delete";

      colors.className = "saved-palette-colors";

      remove.addEventListener("click", () => {
        savedPalettes.splice(index, 1);

        saveStoredPalettes();

        renderSavedPalettes(container);

        notify("Saved palette deleted.", "success");
      });

      palette.forEach((hex) => {
        const button = document.createElement("button");

        button.type = "button";

        button.className = "saved-palette-color";

        button.style.backgroundColor = hex;

        button.title = `Copy ${hex}`;

        button.setAttribute("aria-label", `Copy ${hex}`);

        button.addEventListener("click", () => xavertCopyText(hex));

        colors.append(button);
      });

      header.append(title, remove);

      section.append(header, colors);

      container.append(section);
    });
  }

  function renderPalette() {
    const grid = document.createElement("div");

    const saved = document.createElement("div");

    grid.className = "palette-grid";

    saved.className = "saved-palettes";

    currentPalette.forEach((color) => grid.append(paletteCard(color)));

    renderSavedPalettes(saved);

    showPreview("Generated Palette", grid, saved);
  }

  function generatePalette() {
    const rgb = hexToRgb(el.paletteColor.value);

    const base = createColor(rgb.red, rgb.green, rgb.blue);

    currentPalette = buildPalette(base, el.paletteType.value);

    renderPalette();

    setInlineMessage("Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
    }
  }

  function savePalette() {
    if (!currentPalette.length) {
      notify("Generate a palette first.", "error");

      return;
    }

    const palette = currentPalette.map((color) => color.hex);

    const duplicate = savedPalettes.some(
      (saved) => saved.join("|") === palette.join("|"),
    );

    if (duplicate) {
      notify("This palette is already saved.", "info");

      return;
    }

    savedPalettes.unshift(palette);

    savedPalettes = savedPalettes.slice(0, MAX_SAVED);

    if (!saveStoredPalettes()) {
      savedPalettes.shift();
      return;
    }

    renderPalette();

    notify("Palette saved successfully.", "success");
  }

  function downloadPalette() {
    if (!currentPalette.length) {
      notify("Generate a palette first.", "error");

      return;
    }

    const content = currentPalette
      .map(
        (color, index) =>
          `Color ${index + 1}\n` +
          `HEX: ${color.hex}\n` +
          `RGB: ${color.rgb}\n` +
          `HSL: ${color.hsl}`,
      )
      .join("\n\n");

    downloadFile(
      "xavert-color-palette.txt",
      content,
      "text/plain;charset=utf-8",
    );
  }

  function resetState() {
    currentColor = null;
    currentContrast = null;
    currentPalette = [];

    hidePreview();

    notify("", "info", false);
  }

  function updateMode() {
    const mode = el.toolSelector.value;

    const labels = modes[mode];

    el.formatGroup.hidden = mode !== "converter";

    el.valueGroup.hidden = mode !== "converter";

    el.foregroundGroup.hidden = mode !== "contrast";

    el.backgroundGroup.hidden = mode !== "contrast";

    el.paletteColorGroup.hidden = mode !== "palette";

    el.paletteTypeGroup.hidden = mode !== "palette";

    [
      el.primaryBtn,
      el.secondaryBtn1,
      el.secondaryBtn2,
      el.secondaryBtn3,
      el.sampleBtn,
    ].forEach((button, index) => {
      button.textContent = labels[index];
    });

    el.sampleBtn.hidden = mode === "generator";

    resetState();
  }

  function clearMode() {
    const mode = el.toolSelector.value;

    if (mode === "converter") {
      el.colorFormat.value = "hex";
      el.colorInput.value = "";
      el.colorInput.placeholder = "#FF5733";
      el.colorInput.focus();
    } else if (mode === "contrast") {
      el.foregroundColor.value = "#000000";
      el.foregroundHex.value = "#000000";
      el.backgroundColor.value = "#ffffff";
      el.backgroundHex.value = "#FFFFFF";
    } else if (mode === "palette") {
      el.paletteColor.value = "#ff5733";

      el.paletteType.value = "analogous";
    }

    resetState();
  }

  function loadSample() {
    const mode = el.toolSelector.value;

    if (mode === "converter") {
      const samples = {
        hex: "#FF5733",
        rgb: "rgb(255, 87, 51)",
        hsl: "hsl(11, 100%, 60%)",
      };

      el.colorInput.value = samples[el.colorFormat.value];
      convertColor();
    } else if (mode === "generator") {
      generateRandomColor();
    } else if (mode === "contrast") {
      el.foregroundColor.value = "#111827";
      el.foregroundHex.value = "#111827";
      el.backgroundColor.value = "#ffffff";
      el.backgroundHex.value = "#FFFFFF";
      checkContrast();
    } else {
      el.paletteColor.value = "#FF5733";
      el.paletteType.value = "analogous";
      generatePalette();
    }

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    } else {
      setInlineMessage("Sample loaded successfully.", "success");
    }
  }

  // --------------------------------------------------
  // Event Listeners
  // --------------------------------------------------
  const primaryActions = {
    converter: convertColor,
    generator: generateRandomColor,
    contrast: checkContrast,
    palette: generatePalette,
  };

  const secondaryActions = {
    converter: [
      () => xavertCopyText(currentColor?.hex || ""),

      () => xavertCopyText(currentColor?.rgb || ""),

      () => xavertCopyText(currentColor?.hsl || ""),
    ],

    generator: [
      generateSimilarColor,
      generateComplementaryColor,

      () => xavertCopyText(currentColor?.hex || ""),
    ],

    contrast: [
      () => {
        [el.foregroundColor.value, el.backgroundColor.value] = [
          el.backgroundColor.value,
          el.foregroundColor.value,
        ];

        el.foregroundHex.value = el.foregroundColor.value.toUpperCase();
        el.backgroundHex.value = el.backgroundColor.value.toUpperCase();

        checkContrast();
      },

      () =>
        xavertCopyText(
          currentContrast ? `${currentContrast.ratio.toFixed(2)}:1` : "",
        ),

      () =>
        xavertCopyText(
          currentContrast
            ? `Foreground: ${currentContrast.foreground}\n` +
                `Background: ${currentContrast.background}`
            : "",
        ),
    ],

    palette: [
      savePalette,
      downloadPalette,

      () => xavertCopyText(currentPalette.map((color) => color.hex).join("\n")),
    ],
  };

  el.toolSelector.addEventListener("change", updateMode);

  el.colorFormat.addEventListener("change", () => {
    const placeholders = {
      hex: "#FF5733",
      rgb: "rgb(255, 87, 51)",
      hsl: "hsl(11, 100%, 60%)",
    };

    el.colorInput.value = "";

    el.colorInput.placeholder = placeholders[el.colorFormat.value];

    resetState();
    el.colorInput.focus();
  });

  el.foregroundColor.addEventListener("input", () => {
    syncContrastFields("foreground-color");
    if (currentContrast) checkContrast();
  });

  el.backgroundColor.addEventListener("input", () => {
    syncContrastFields("background-color");
    if (currentContrast) checkContrast();
  });

  el.foregroundHex.addEventListener("input", () => {
    syncContrastFields("foreground-hex");
    if (currentContrast && normalizeHex(el.foregroundHex.value)) {
      checkContrast();
    }
  });

  el.backgroundHex.addEventListener("input", () => {
    syncContrastFields("background-hex");
    if (currentContrast && normalizeHex(el.backgroundHex.value)) {
      checkContrast();
    }
  });

  el.paletteColor.addEventListener("input", () => {
    if (currentPalette.length) {
      generatePalette();
    }
  });

  el.paletteType.addEventListener("change", () => {
    if (currentPalette.length) {
      generatePalette();
    }
  });

  el.primaryBtn.addEventListener("click", () =>
    primaryActions[el.toolSelector.value](),
  );

  [el.secondaryBtn1, el.secondaryBtn2, el.secondaryBtn3].forEach(
    (button, index) => {
      button.addEventListener("click", () =>
        secondaryActions[el.toolSelector.value][index](),
      );
    },
  );

  el.clearBtn.addEventListener("click", clearMode);

  el.sampleBtn.addEventListener("click", loadSample);

  updateMode();
});
