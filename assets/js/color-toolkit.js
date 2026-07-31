"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const toolSelector = document.getElementById("toolSelector");
  const toolSections = document.querySelectorAll(".tool-section");

  const colorFormat = document.getElementById("colorFormat");
  const colorInput = document.getElementById("colorInput");
  const convertBtn = document.getElementById("convertBtn");
  const copyHexBtn = document.getElementById("copyHexBtn");
  const copyRgbBtn = document.getElementById("copyRgbBtn");
  const copyHslBtn = document.getElementById("copyHslBtn");
  const clearConverterBtn = document.getElementById("clearConverterBtn");
  const converterMessage = document.getElementById("converterMessage");
  const converterResult = document.getElementById("converterResult");
  const converterPreview = document.getElementById("converterPreview");

  const generateBtn = document.getElementById("generateBtn");
  const similarBtn = document.getElementById("similarBtn");
  const complementaryBtn = document.getElementById("complementaryBtn");
  const clearGeneratorBtn = document.getElementById("clearGeneratorBtn");
  const generatorMessage = document.getElementById("generatorMessage");
  const generatorResult = document.getElementById("generatorResult");
  const generatorPreview = document.getElementById("generatorPreview");

  const foregroundColor = document.getElementById("foregroundColor");
  const backgroundColor = document.getElementById("backgroundColor");
  const contrastBtn = document.getElementById("contrastBtn");
  const swapBtn = document.getElementById("swapBtn");
  const clearContrastBtn = document.getElementById("clearContrastBtn");
  const contrastMessage = document.getElementById("contrastMessage");
  const contrastResult = document.getElementById("contrastResult");
  const contrastPreview = document.getElementById("contrastPreview");

  const paletteColor = document.getElementById("paletteColor");
  const paletteType = document.getElementById("paletteType");
  const generatePaletteBtn = document.getElementById("generatePaletteBtn");
  const savePaletteBtn = document.getElementById("savePaletteBtn");
  const downloadPaletteBtn = document.getElementById("downloadPaletteBtn");
  const clearPaletteBtn = document.getElementById("clearPaletteBtn");
  const paletteMessage = document.getElementById("paletteMessage");
  const paletteResult = document.getElementById("paletteResult");
  const savedPalettes = document.getElementById("savedPalettes");

  const toast = document.getElementById("toast");

  const storageKey = "xavert-color-toolkit-palettes";
  const maximumSavedPalettes = 10;

  let currentConverterColor = null;
  let currentGeneratorColor = null;
  let currentPalette = [];
  let storedPalettes = [];
  let toastTimer = null;

  function clamp(value, minimum, maximum) {
    return Math.min(
      maximum,
      Math.max(minimum, Number(value))
    );
  }

  function normalizeHue(value) {
    const normalized = Number(value) % 360;

    return normalized < 0
      ? normalized + 360
      : normalized;
  }

  function showToast(text, type = "info") {
    if (!toast || !text) {
      return;
    }

    const allowedTypes = ["success", "error", "info"];
    const safeType = allowedTypes.includes(type)
      ? type
      : "info";

    window.clearTimeout(toastTimer);

    toast.textContent = text;

    toast.classList.remove(
      "xavert-toast-success",
      "xavert-toast-error",
      "xavert-toast-info"
    );

    toast.classList.add(
      "xavert-toast",
      `xavert-toast-${safeType}`
    );

    toast.style.display = "block";
    toast.setAttribute("aria-hidden", "false");

    toastTimer = window.setTimeout(function () {
      toast.style.display = "none";
      toast.textContent = "";

      toast.classList.remove(
        "xavert-toast-success",
        "xavert-toast-error",
        "xavert-toast-info"
      );

      toast.setAttribute("aria-hidden", "true");
    }, 2200);
  }

  function setMessage(
    element,
    text = "",
    type = "info",
    useToast = false
  ) {
    if (element) {
      const allowedTypes = ["success", "error", "info"];
      const safeType = allowedTypes.includes(type)
        ? type
        : "info";

      element.textContent = text;

      element.classList.remove(
        "message-success",
        "message-error",
        "message-info",
        "success",
        "error"
      );

      if (text) {
        element.classList.add(`message-${safeType}`);
      }
    }

    if (text && useToast) {
      showToast(text, type);
    }
  }

  async function copyText(value, successMessage) {
    if (!value) {
      showToast("Nothing to copy.", "error");
      return false;
    }

    try {
      if (typeof window.xavertCopyText === "function") {
        const result = window.xavertCopyText(
          value,
          successMessage
        );

        if (result instanceof Promise) {
          await result;
        }

        return true;
      }

      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(value);
        showToast(successMessage, "success");
        return true;
      }

      const textarea = document.createElement("textarea");

      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.select();

      const copied = document.execCommand("copy");

      textarea.remove();

      if (!copied) {
        throw new Error("Clipboard command failed.");
      }

      showToast(successMessage, "success");

      return true;
    } catch (error) {
      console.error("Copy failed:", error);
      showToast("Copy failed.", "error");
      return false;
    }
  }

  function componentToHex(value) {
    return clamp(
      Math.round(value),
      0,
      255
    )
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
    if (typeof value !== "string") {
      return "";
    }

    let hex = value.trim();

    if (!hex.startsWith("#")) {
      hex = `#${hex}`;
    }

    if (!/^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex)) {
      return "";
    }

    if (hex.length === 4) {
      hex =
        `#${hex[1]}${hex[1]}` +
        `${hex[2]}${hex[2]}` +
        `${hex[3]}${hex[3]}`;
    }

    return hex.toUpperCase();
  }

  function hexToRgb(value) {
    const hex = normalizeHex(value);

    if (!hex) {
      return null;
    }

    const raw = hex.slice(1);

    return {
      red: parseInt(raw.slice(0, 2), 16),
      green: parseInt(raw.slice(2, 4), 16),
      blue: parseInt(raw.slice(4, 6), 16)
    };
  }

  function rgbToHsl(red, green, blue) {
    const normalizedRed = red / 255;
    const normalizedGreen = green / 255;
    const normalizedBlue = blue / 255;

    const maximum = Math.max(
      normalizedRed,
      normalizedGreen,
      normalizedBlue
    );

    const minimum = Math.min(
      normalizedRed,
      normalizedGreen,
      normalizedBlue
    );

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
          (normalizedGreen - normalizedBlue) /
            difference +
          (normalizedGreen < normalizedBlue ? 6 : 0);
      } else if (maximum === normalizedGreen) {
        hue =
          (normalizedBlue - normalizedRed) /
            difference +
          2;
      } else {
        hue =
          (normalizedRed - normalizedGreen) /
            difference +
          4;
      }

      hue /= 6;
    }

    return {
      hue: Math.round(hue * 360),
      saturation: Math.round(saturation * 100),
      lightness: Math.round(lightness * 100)
    };
  }

  function hslToRgb(hue, saturation, lightness) {
    const normalizedHue = normalizeHue(hue) / 360;
    const normalizedSaturation =
      clamp(saturation, 0, 100) / 100;

    const normalizedLightness =
      clamp(lightness, 0, 100) / 100;

    if (normalizedSaturation === 0) {
      const gray = Math.round(
        normalizedLightness * 255
      );

      return {
        red: gray,
        green: gray,
        blue: gray
      };
    }

    function hueToChannel(
      firstValue,
      secondValue,
      channelHue
    ) {
      let adjustedHue = channelHue;

      if (adjustedHue < 0) {
        adjustedHue += 1;
      }

      if (adjustedHue > 1) {
        adjustedHue -= 1;
      }

      if (adjustedHue < 1 / 6) {
        return (
          firstValue +
          (secondValue - firstValue) *
            6 *
            adjustedHue
        );
      }

      if (adjustedHue < 1 / 2) {
        return secondValue;
      }

      if (adjustedHue < 2 / 3) {
        return (
          firstValue +
          (secondValue - firstValue) *
            (2 / 3 - adjustedHue) *
            6
        );
      }

      return firstValue;
    }

    const secondValue =
      normalizedLightness < 0.5
        ? normalizedLightness *
          (1 + normalizedSaturation)
        : normalizedLightness +
          normalizedSaturation -
          normalizedLightness *
            normalizedSaturation;

    const firstValue =
      2 * normalizedLightness -
      secondValue;

    return {
      red: Math.round(
        hueToChannel(
          firstValue,
          secondValue,
          normalizedHue + 1 / 3
        ) * 255
      ),

      green: Math.round(
        hueToChannel(
          firstValue,
          secondValue,
          normalizedHue
        ) * 255
      ),

      blue: Math.round(
        hueToChannel(
          firstValue,
          secondValue,
          normalizedHue - 1 / 3
        ) * 255
      )
    };
  }

  function createColor(red, green, blue) {
    const safeRed = clamp(Math.round(red), 0, 255);
    const safeGreen = clamp(Math.round(green), 0, 255);
    const safeBlue = clamp(Math.round(blue), 0, 255);

    const hsl = rgbToHsl(
      safeRed,
      safeGreen,
      safeBlue
    );

    return {
      red: safeRed,
      green: safeGreen,
      blue: safeBlue,

      hue: hsl.hue,
      saturation: hsl.saturation,
      lightness: hsl.lightness,

      hex: rgbToHex(
        safeRed,
        safeGreen,
        safeBlue
      ),

      rgb:
        `rgb(${safeRed}, ${safeGreen}, ${safeBlue})`,

      hsl:
        `hsl(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%)`
    };
  }

  function createColorFromHsl(
    hue,
    saturation,
    lightness
  ) {
    const rgb = hslToRgb(
      hue,
      saturation,
      lightness
    );

    return createColor(
      rgb.red,
      rgb.green,
      rgb.blue
    );
  }
  function parseRgbInput(value) {
    if (typeof value !== "string") {
      return null;
    }

    const match = value.trim().match(
      /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
    );

    if (!match) {
      return null;
    }

    const red = Number(match[1]);
    const green = Number(match[2]);
    const blue = Number(match[3]);

    if (
      red > 255 ||
      green > 255 ||
      blue > 255
    ) {
      return null;
    }

    return createColor(
      red,
      green,
      blue
    );
  }

  function parseHslInput(value) {
    if (typeof value !== "string") {
      return null;
    }

    const match = value.trim().match(
      /^hsl\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i
    );

    if (!match) {
      return null;
    }

    const hue = Number(match[1]);
    const saturation = Number(match[2]);
    const lightness = Number(match[3]);

    if (
      saturation < 0 ||
      saturation > 100 ||
      lightness < 0 ||
      lightness > 100
    ) {
      return null;
    }

    return createColorFromHsl(
      hue,
      saturation,
      lightness
    );
  }

  function parseColorValue(
    value,
    format
  ) {
    if (format === "hex") {
      const rgb = hexToRgb(value);

      if (!rgb) {
        return null;
      }

      return createColor(
        rgb.red,
        rgb.green,
        rgb.blue
      );
    }

    if (format === "rgb") {
      return parseRgbInput(value);
    }

    if (format === "hsl") {
      return parseHslInput(value);
    }

    return null;
  }

  function clearElement(element) {
    if (element) {
      element.replaceChildren();
    }
  }

  function setPreview(
    element,
    color
  ) {
    if (!element) {
      return;
    }

    if (!color) {
      element.style.backgroundColor = "";
      element.classList.remove("has-color");
      element.removeAttribute("data-color");
      return;
    }

    element.style.backgroundColor = color.hex;
    element.classList.add("has-color");
    element.setAttribute("data-color", color.hex);
  }

  function createValueItem(
    label,
    value
  ) {
    const item = document.createElement("div");
    const labelElement = document.createElement("span");
    const valueElement = document.createElement("code");

    item.className = "color-value";
    labelElement.className = "color-value-label";
    valueElement.className = "color-value-code";

    labelElement.textContent = label;
    valueElement.textContent = value;

    item.append(
      labelElement,
      valueElement
    );

    return item;
  }

  function createGeneratedValueItem(
    label,
    value
  ) {
    const item = document.createElement("div");
    const labelElement = document.createElement("strong");
    const valueElement = document.createElement("span");

    item.className = "generated-color-item";

    labelElement.textContent = label;
    valueElement.textContent = value;

    item.append(
      labelElement,
      valueElement
    );

    return item;
  }

  function renderConverterResult(color) {
    clearElement(converterResult);

    const values = document.createElement("div");

    values.className = "color-values";

    values.append(
      createValueItem("HEX", color.hex),
      createValueItem("RGB", color.rgb),
      createValueItem("HSL", color.hsl)
    );

    converterResult.appendChild(values);
    converterResult.style.display = "block";

    setPreview(
      converterPreview,
      color
    );
  }

  function renderGeneratorResult(color) {
    clearElement(generatorResult);

    const values = document.createElement("div");

    values.className = "generated-color-details";

    values.append(
      createGeneratedValueItem(
        "HEX",
        color.hex
      ),
      createGeneratedValueItem(
        "RGB",
        color.rgb
      ),
      createGeneratedValueItem(
        "HSL",
        color.hsl
      )
    );

    generatorResult.appendChild(values);
    generatorResult.style.display = "block";

    setPreview(
      generatorPreview,
      color
    );
  }

  function updateColorFormatInterface() {
    const settings = {
      hex: {
        placeholder: "#FF5733"
      },

      rgb: {
        placeholder: "rgb(255, 87, 51)"
      },

      hsl: {
        placeholder: "hsl(11, 100%, 60%)"
      }
    };

    const selectedSettings =
      settings[colorFormat.value] ||
      settings.hex;

    colorInput.placeholder =
      selectedSettings.placeholder;

    colorInput.value = "";

    currentConverterColor = null;

    clearElement(converterResult);
    converterResult.style.display = "none";

    setPreview(
      converterPreview,
      null
    );

    setMessage(converterMessage);

    colorInput.focus();
  }

  function convertColor() {
    const value = colorInput.value.trim();
    const format = colorFormat.value;

    if (!value) {
      currentConverterColor = null;

      clearElement(converterResult);
      converterResult.style.display = "none";

      setPreview(
        converterPreview,
        null
      );

      setMessage(
        converterMessage,
        "Enter a color value first.",
        "error",
        true
      );

      colorInput.focus();

      return false;
    }

    const color = parseColorValue(
      value,
      format
    );

    if (!color) {
      currentConverterColor = null;

      clearElement(converterResult);
      converterResult.style.display = "none";

      setPreview(
        converterPreview,
        null
      );

      const errors = {
        hex:
          "Enter a valid HEX color such as #FF5733.",

        rgb:
          "Enter a valid RGB color such as rgb(255, 87, 51).",

        hsl:
          "Enter a valid HSL color such as hsl(11, 100%, 60%)."
      };

      setMessage(
        converterMessage,
        errors[format] ||
          "Enter a valid color.",
        "error",
        true
      );

      colorInput.focus();

      return false;
    }

    currentConverterColor = color;

    colorInput.value =
      format === "hex"
        ? color.hex
        : format === "rgb"
          ? color.rgb
          : color.hsl;

    renderConverterResult(color);

    setMessage(
      converterMessage,
      "Color converted successfully.",
      "success",
      true
    );

    return true;
  }

  function copyConverterValue(
    property,
    successMessage
  ) {
    if (!currentConverterColor) {
      setMessage(
        converterMessage,
        "Convert a color first.",
        "error",
        true
      );

      return;
    }

    copyText(
      currentConverterColor[property],
      successMessage
    );
  }

  function clearConverter() {
    colorFormat.value = "hex";
    colorInput.value = "";
    colorInput.placeholder = "#FF5733";

    currentConverterColor = null;

    clearElement(converterResult);
    converterResult.style.display = "none";

    setPreview(
      converterPreview,
      null
    );

    setMessage(
      converterMessage,
      "Converter cleared.",
      "success",
      true
    );

    colorInput.focus();
  }

  function getRandomChannel() {
    if (
      window.crypto &&
      typeof window.crypto.getRandomValues ===
        "function"
    ) {
      const values = new Uint8Array(1);

      window.crypto.getRandomValues(values);

      return values[0];
    }

    return Math.floor(
      Math.random() * 256
    );
  }

  function generateRandomColor() {
    const color = createColor(
      getRandomChannel(),
      getRandomChannel(),
      getRandomChannel()
    );

    currentGeneratorColor = color;

    renderGeneratorResult(color);

    setMessage(
      generatorMessage,
      "Random color generated.",
      "success",
      true
    );

    return color;
  }

  function generateSimilarColor() {
    if (!currentGeneratorColor) {
      generateRandomColor();
      return;
    }

    const hueVariation =
      Math.floor(Math.random() * 41) - 20;

    const saturationVariation =
      Math.floor(Math.random() * 21) - 10;

    const lightnessVariation =
      Math.floor(Math.random() * 21) - 10;

    const color = createColorFromHsl(
      currentGeneratorColor.hue +
        hueVariation,

      clamp(
        currentGeneratorColor.saturation +
          saturationVariation,
        15,
        100
      ),

      clamp(
        currentGeneratorColor.lightness +
          lightnessVariation,
        10,
        90
      )
    );

    currentGeneratorColor = color;

    renderGeneratorResult(color);

    setMessage(
      generatorMessage,
      "Similar color generated.",
      "success",
      true
    );
  }

  function generateComplementaryColor() {
    if (!currentGeneratorColor) {
      generateRandomColor();
      return;
    }

    const color = createColorFromHsl(
      currentGeneratorColor.hue + 180,
      currentGeneratorColor.saturation,
      currentGeneratorColor.lightness
    );

    currentGeneratorColor = color;

    renderGeneratorResult(color);

    setMessage(
      generatorMessage,
      "Complementary color generated.",
      "success",
      true
    );
  }

  function clearGenerator() {
    currentGeneratorColor = null;

    clearElement(generatorResult);
    generatorResult.style.display = "none";

    setPreview(
      generatorPreview,
      null
    );

    setMessage(
      generatorMessage,
      "Generator cleared.",
      "success",
      true
    );
  }
function calculateRelativeLuminance(color) {
    const channels = [
      color.red,
      color.green,
      color.blue
    ].map(function (channel) {
      const normalized = channel / 255;

      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow(
            (normalized + 0.055) / 1.055,
            2.4
          );
    });

    return (
      0.2126 * channels[0] +
      0.7152 * channels[1] +
      0.0722 * channels[2]
    );
  }

  function calculateContrastRatio(
    foreground,
    background
  ) {
    const foregroundLuminance =
      calculateRelativeLuminance(foreground);

    const backgroundLuminance =
      calculateRelativeLuminance(background);

    return (
      Math.max(
        foregroundLuminance,
        backgroundLuminance
      ) +
      0.05
    ) /
    (
      Math.min(
        foregroundLuminance,
        backgroundLuminance
      ) +
      0.05
    );
  }

  function createContrastStatus(
    label,
    passed
  ) {
    const item = document.createElement("div");
    const labelElement = document.createElement("strong");
    const statusElement = document.createElement("span");

    item.className = "contrast-test";
    labelElement.textContent = label;

    statusElement.className =
      `contrast-test-status ${
        passed ? "pass" : "fail"
      }`;

    statusElement.textContent =
      passed ? "Pass ✓" : "Fail ✕";

    item.append(
      labelElement,
      statusElement
    );

    return item;
  }

  function renderContrastResult(
    ratio,
    foreground,
    background
  ) {
    clearElement(contrastResult);

    const summary =
      document.createElement("div");

    const summaryText =
      document.createElement("div");

    const ratioElement =
      document.createElement("p");

    const ratingElement =
      document.createElement("span");

    const tests =
      document.createElement("div");

    const normalAA = ratio >= 4.5;
    const normalAAA = ratio >= 7;
    const largeAA = ratio >= 3;
    const largeAAA = ratio >= 4.5;

    summary.className = "contrast-summary";
    ratioElement.className = "contrast-ratio";
    ratingElement.className =
      `contrast-rating ${
        normalAA ? "pass" : "fail"
      }`;

    ratioElement.textContent =
      `${ratio.toFixed(2)}:1`;

    ratingElement.textContent =
      normalAA
        ? "WCAG AA Passed"
        : "WCAG AA Failed";

    summaryText.appendChild(ratioElement);

    summary.append(
      summaryText,
      ratingElement
    );

    tests.className = "contrast-tests";

    tests.append(
      createContrastStatus(
        "Normal Text — AA",
        normalAA
      ),

      createContrastStatus(
        "Normal Text — AAA",
        normalAAA
      ),

      createContrastStatus(
        "Large Text — AA",
        largeAA
      ),

      createContrastStatus(
        "Large Text — AAA",
        largeAAA
      )
    );

    contrastResult.append(
      summary,
      tests
    );

    contrastResult.style.display = "block";

    contrastPreview.style.display = "flex";
    contrastPreview.style.color = foreground.hex;
    contrastPreview.style.backgroundColor =
      background.hex;
  }

  function checkContrast() {
    const foregroundRgb =
      hexToRgb(foregroundColor.value);

    const backgroundRgb =
      hexToRgb(backgroundColor.value);

    if (!foregroundRgb || !backgroundRgb) {
      setMessage(
        contrastMessage,
        "Select two valid colors.",
        "error",
        true
      );

      return false;
    }

    const foreground = createColor(
      foregroundRgb.red,
      foregroundRgb.green,
      foregroundRgb.blue
    );

    const background = createColor(
      backgroundRgb.red,
      backgroundRgb.green,
      backgroundRgb.blue
    );

    const ratio = calculateContrastRatio(
      foreground,
      background
    );

    renderContrastResult(
      ratio,
      foreground,
      background
    );

    setMessage(
      contrastMessage,
      ratio >= 4.5
        ? "The selected colors meet WCAG AA for normal text."
        : "The selected colors do not meet WCAG AA for normal text.",
      ratio >= 4.5 ? "success" : "error",
      true
    );

    return true;
  }

  function swapContrastColors() {
    const previousForeground =
      foregroundColor.value;

    foregroundColor.value =
      backgroundColor.value;

    backgroundColor.value =
      previousForeground;

    checkContrast();
  }

  function clearContrast() {
    foregroundColor.value = "#000000";
    backgroundColor.value = "#ffffff";

    clearElement(contrastResult);
    contrastResult.style.display = "none";

    contrastPreview.style.display = "flex";
    contrastPreview.style.color = "#000000";
    contrastPreview.style.backgroundColor =
      "#ffffff";

    setMessage(
      contrastMessage,
      "Contrast checker reset.",
      "success",
      true
    );
  }

  function getPaletteHueOffsets(type) {
    const offsets = {
      analogous: [-60, -30, 0, 30, 60],
      complementary: [0, 30, 180, 210, 330],
      triadic: [0, 60, 120, 240, 300],
      split: [0, 30, 150, 210, 330],
      tetradic: [0, 90, 180, 270, 315],
      monochromatic: [0, 0, 0, 0, 0]
    };

    return offsets[type] || offsets.analogous;
  }

  function createPaletteColors(
    baseColor,
    type
  ) {
    const offsets =
      getPaletteHueOffsets(type);

    if (type === "monochromatic") {
      const lightnessValues = [
        20,
        35,
        50,
        65,
        80
      ];

      return lightnessValues.map(
        function (lightness) {
          return createColorFromHsl(
            baseColor.hue,
            baseColor.saturation,
            lightness
          );
        }
      );
    }

    return offsets.map(
      function (offset, index) {
        const saturationAdjustment =
          index % 2 === 0 ? 0 : -8;

        const lightnessAdjustment =
          index === 0
            ? 0
            : index % 2 === 0
              ? 6
              : -6;

        return createColorFromHsl(
          baseColor.hue + offset,

          clamp(
            baseColor.saturation +
              saturationAdjustment,
            20,
            100
          ),

          clamp(
            baseColor.lightness +
              lightnessAdjustment,
            15,
            85
          )
        );
      }
    );
  }

  function getReadableTextColor(color) {
    return calculateRelativeLuminance(color) >
      0.45
      ? "#111827"
      : "#ffffff";
  }

  function createPaletteCard(
    color,
    index
  ) {
    const card = document.createElement("article");
    const swatch = document.createElement("button");
    const copyLabel = document.createElement("span");
    const information = document.createElement("div");
    const value = document.createElement("strong");
    const name = document.createElement("span");

    card.className = "palette-color";

    swatch.type = "button";
    swatch.className = "palette-color-swatch";
    swatch.style.backgroundColor = color.hex;
    swatch.style.color =
      getReadableTextColor(color);

    swatch.setAttribute(
      "aria-label",
      `Copy color ${color.hex}`
    );

    copyLabel.className = "palette-color-copy";
    copyLabel.textContent = "Copy";

    information.className =
      "palette-color-info";

    value.className =
      "palette-color-value";

    name.className =
      "palette-color-name";

    value.textContent = color.hex;
    name.textContent = `Color ${index + 1}`;

    swatch.appendChild(copyLabel);

    swatch.addEventListener(
      "click",
      function () {
        copyText(
          color.hex,
          `${color.hex} copied.`
        );
      }
    );

    information.append(
      value,
      name
    );

    card.append(
      swatch,
      information
    );

    return card;
  }

  function renderPalette() {
    clearElement(paletteResult);

    currentPalette.forEach(
      function (color, index) {
        paletteResult.appendChild(
          createPaletteCard(
            color,
            index
          )
        );
      }
    );

    paletteResult.style.display = "grid";
  }

  function generatePalette() {
    const baseRgb =
      hexToRgb(paletteColor.value);

    if (!baseRgb) {
      currentPalette = [];

      clearElement(paletteResult);
      paletteResult.style.display = "none";

      setMessage(
        paletteMessage,
        "Select a valid base color.",
        "error",
        true
      );

      return false;
    }

    const baseColor = createColor(
      baseRgb.red,
      baseRgb.green,
      baseRgb.blue
    );

    currentPalette =
      createPaletteColors(
        baseColor,
        paletteType.value
      );

    renderPalette();

    setMessage(
      paletteMessage,
      "Palette generated successfully.",
      "success",
      true
    );

    return true;
  }

  function normalizeStoredPalette(
    palette
  ) {
    if (!Array.isArray(palette)) {
      return null;
    }

    const normalized = palette
      .map(function (color) {
        return normalizeHex(color);
      })
      .filter(Boolean);

    return normalized.length === 5
      ? normalized
      : null;
  }

  function loadStoredPalettes() {
    try {
      const storedValue =
        window.localStorage.getItem(
          storageKey
        );

      if (!storedValue) {
        storedPalettes = [];
        return;
      }

      const parsed =
        JSON.parse(storedValue);

      if (!Array.isArray(parsed)) {
        throw new Error(
          "Invalid palette storage."
        );
      }

      storedPalettes = parsed
        .map(normalizeStoredPalette)
        .filter(Boolean)
        .slice(
          0,
          maximumSavedPalettes
        );
    } catch (error) {
      console.warn(
        "Saved palettes could not be loaded:",
        error
      );

      storedPalettes = [];

      try {
        window.localStorage.removeItem(
          storageKey
        );
      } catch {
        // Storage may be unavailable.
      }
    }
  }

  function saveStoredPalettes() {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(storedPalettes)
      );

      return true;
    } catch (error) {
      console.warn(
        "Saved palettes could not be stored:",
        error
      );

      setMessage(
        paletteMessage,
        "The palette could not be stored in this browser.",
        "error",
        true
      );

      return false;
    }
  }

  function palettesAreEqual(
    firstPalette,
    secondPalette
  ) {
    return (
      firstPalette.length ===
        secondPalette.length &&
      firstPalette.every(
        function (color, index) {
          return (
            color ===
            secondPalette[index]
          );
        }
      )
    );
  }

  function saveCurrentPalette() {
    if (currentPalette.length === 0) {
      setMessage(
        paletteMessage,
        "Generate a palette first.",
        "error",
        true
      );

      return;
    }

    const paletteToSave =
      currentPalette.map(
        function (color) {
          return color.hex;
        }
      );

    const alreadySaved =
      storedPalettes.some(
        function (savedPalette) {
          return palettesAreEqual(
            savedPalette,
            paletteToSave
          );
        }
      );

    if (alreadySaved) {
      setMessage(
        paletteMessage,
        "This palette is already saved.",
        "info",
        true
      );

      return;
    }

    storedPalettes.unshift(
      paletteToSave
    );

    storedPalettes =
      storedPalettes.slice(
        0,
        maximumSavedPalettes
      );

    if (!saveStoredPalettes()) {
      return;
    }

    renderSavedPalettes();

    setMessage(
      paletteMessage,
      "Palette saved successfully.",
      "success",
      true
    );
  }

  function deleteStoredPalette(index) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= storedPalettes.length
    ) {
      return;
    }

    storedPalettes.splice(index, 1);

    saveStoredPalettes();
    renderSavedPalettes();

    setMessage(
      paletteMessage,
      "Saved palette deleted.",
      "success",
      true
    );
  }

  function createSavedPalette(
    palette,
    index
  ) {
    const wrapper =
      document.createElement("section");

    const header =
      document.createElement("div");

    const title =
      document.createElement("h3");

    const removeButton =
      document.createElement("button");

    const colors =
      document.createElement("div");

    wrapper.className = "saved-palette";
    header.className =
      "saved-palette-header";

    title.className =
      "saved-palette-title";

    title.textContent =
      `Palette ${index + 1}`;

    removeButton.type = "button";

    removeButton.className =
      "saved-palette-remove";

    removeButton.textContent = "Delete";

    removeButton.addEventListener(
      "click",
      function () {
        deleteStoredPalette(index);
      }
    );

    colors.className =
      "saved-palette-colors";

    palette.forEach(
      function (hex) {
        const button =
          document.createElement("button");

        button.type = "button";

        button.className =
          "saved-palette-color";

        button.style.backgroundColor = hex;

        button.setAttribute(
          "aria-label",
          `Copy color ${hex}`
        );

        button.title = `Copy ${hex}`;

        button.addEventListener(
          "click",
          function () {
            copyText(
              hex,
              `${hex} copied.`
            );
          }
        );

        colors.appendChild(button);
      }
    );

    header.append(
      title,
      removeButton
    );

    wrapper.append(
      header,
      colors
    );

    return wrapper;
  }

  function renderSavedPalettes() {
    clearElement(savedPalettes);

    if (storedPalettes.length === 0) {
      return;
    }

    const title =
      document.createElement("h3");

    title.className =
      "saved-palettes-title";

    title.textContent =
      "Saved Palettes";

    savedPalettes.appendChild(title);

    storedPalettes.forEach(
      function (palette, index) {
        savedPalettes.appendChild(
          createSavedPalette(
            palette,
            index
          )
        );
      }
    );
  }
function downloadCurrentPalette() {
    if (currentPalette.length === 0) {
      setMessage(
        paletteMessage,
        "Generate a palette first.",
        "error",
        true
      );

      return;
    }

    const content = currentPalette
      .map(function (color, index) {
        return [
          `Color ${index + 1}`,
          `HEX: ${color.hex}`,
          `RGB: ${color.rgb}`,
          `HSL: ${color.hsl}`
        ].join("\n");
      })
      .join("\n\n");

    const blob = new Blob(
      [content],
      {
        type: "text/plain;charset=utf-8"
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "xavert-color-palette.txt";
    link.hidden = true;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);

    setMessage(
      paletteMessage,
      "Palette download started.",
      "success",
      true
    );
  }

  function clearPalette() {
    paletteColor.value = "#ff5733";
    paletteType.value = "analogous";

    currentPalette = [];

    clearElement(paletteResult);
    paletteResult.style.display = "none";

    setMessage(
      paletteMessage,
      "Palette generator cleared.",
      "success",
      true
    );
  }

  function switchTool() {
    const selectedTool = toolSelector.value;

    toolSections.forEach(function (section) {
      section.classList.remove("active");
    });

    const selectedSection = document.getElementById(
      `${selectedTool}Tool`
    );

    if (selectedSection) {
      selectedSection.classList.add("active");
    }
  }

  function runCurrentTool() {
    const actions = {
      converter: convertColor,
      generator: generateRandomColor,
      contrast: checkContrast,
      palette: generatePalette
    };

    const action = actions[toolSelector.value];

    if (typeof action === "function") {
      action();
    }
  }

  toolSelector.addEventListener(
    "change",
    switchTool
  );

  colorFormat.addEventListener(
    "change",
    updateColorFormatInterface
  );

  colorInput.addEventListener(
    "keydown",
    function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        convertColor();
      }
    }
  );

  convertBtn.addEventListener(
    "click",
    convertColor
  );

  copyHexBtn.addEventListener(
    "click",
    function () {
      copyConverterValue(
        "hex",
        "HEX color copied."
      );
    }
  );

  copyRgbBtn.addEventListener(
    "click",
    function () {
      copyConverterValue(
        "rgb",
        "RGB color copied."
      );
    }
  );

  copyHslBtn.addEventListener(
    "click",
    function () {
      copyConverterValue(
        "hsl",
        "HSL color copied."
      );
    }
  );

  clearConverterBtn.addEventListener(
    "click",
    clearConverter
  );

  generateBtn.addEventListener(
    "click",
    generateRandomColor
  );

  similarBtn.addEventListener(
    "click",
    generateSimilarColor
  );

  complementaryBtn.addEventListener(
    "click",
    generateComplementaryColor
  );

  clearGeneratorBtn.addEventListener(
    "click",
    clearGenerator
  );

  foregroundColor.addEventListener(
    "input",
    checkContrast
  );

  backgroundColor.addEventListener(
    "input",
    checkContrast
  );

  contrastBtn.addEventListener(
    "click",
    checkContrast
  );

  swapBtn.addEventListener(
    "click",
    swapContrastColors
  );

  clearContrastBtn.addEventListener(
    "click",
    clearContrast
  );

  paletteColor.addEventListener(
    "input",
    function () {
      if (currentPalette.length > 0) {
        generatePalette();
      }
    }
  );

  paletteType.addEventListener(
    "change",
    function () {
      if (currentPalette.length > 0) {
        generatePalette();
      }
    }
  );

  generatePaletteBtn.addEventListener(
    "click",
    generatePalette
  );

  savePaletteBtn.addEventListener(
    "click",
    saveCurrentPalette
  );

  downloadPaletteBtn.addEventListener(
    "click",
    downloadCurrentPalette
  );

  clearPaletteBtn.addEventListener(
    "click",
    clearPalette
  );

  document.addEventListener(
    "keydown",
    function (event) {
      if (
        event.ctrlKey &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        runCurrentTool();
      }
    }
  );

  updateColorFormatInterface();

  clearElement(converterResult);
  converterResult.style.display = "none";

  clearElement(generatorResult);
  generatorResult.style.display = "none";

  clearElement(contrastResult);
  contrastResult.style.display = "none";

  clearElement(paletteResult);
  paletteResult.style.display = "none";

  setPreview(
    converterPreview,
    null
  );

  setPreview(
    generatorPreview,
    null
  );

  contrastPreview.style.display = "flex";
  contrastPreview.style.color = "#000000";
  contrastPreview.style.backgroundColor =
    "#ffffff";

  loadStoredPalettes();
  renderSavedPalettes();
  switchTool();
});  
