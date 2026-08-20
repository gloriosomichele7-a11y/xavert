"use strict";

document.addEventListener("DOMContentLoaded", function () {
  if (document.body.dataset.tool !== "barcode-generator") {
    return;
  }

  const barcodeValue = document.getElementById("barcodeValue");
  const barcodeFormat = document.getElementById("barcodeFormat");
  const barcodeWidth = document.getElementById("barcodeWidth");
  const barcodeHeight = document.getElementById("barcodeHeight");
  const displayValue = document.getElementById("displayValue");

  const generateBtn = document.getElementById("generateBtn");
  const checkDigitBtn = document.getElementById("checkDigitBtn");
  const downloadSvgBtn = document.getElementById("downloadSvgBtn");
  const downloadPngBtn = document.getElementById("downloadPngBtn");
  const copySvgBtn = document.getElementById("copySvgBtn");
  const clearBtn = document.getElementById("clearBtn");
  const sampleBtn = document.getElementById("sampleBtn");

  const previewBox = document.getElementById("previewBox");
  const barcodeSvg = document.getElementById("barcodeSvg");
  const message = document.getElementById("message");

  const formatStat = document.getElementById("formatStat");
  const lengthStat = document.getElementById("lengthStat");
  const widthStat = document.getElementById("widthStat");
  const heightStat = document.getElementById("heightStat");

  const requiredElements = {
    barcodeValue,
    barcodeFormat,
    barcodeWidth,
    barcodeHeight,
    displayValue,
    generateBtn,
    checkDigitBtn,
    downloadSvgBtn,
    downloadPngBtn,
    copySvgBtn,
    clearBtn,
    sampleBtn,
    previewBox,
    barcodeSvg,
    message,
    formatStat,
    lengthStat,
    widthStat,
    heightStat,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length > 0) {
    console.error(
      "Barcode Generator initialization failed. Missing elements:",
      missingElements,
    );
    return;
  }

  let barcodeGenerated = false;

  const checkDigitBodyLengths = {
    EAN13: 12,
    EAN8: 7,
    UPC: 11,
    ITF14: 13,
  };

  const formatConfiguration = {
    CODE128: {
      label: "Code 128",
      placeholder: "Example: XAVERT-123456",
      sample: "XAVERT-123456",
      filename: "code-128",
      libraryFormat: "CODE128",
    },
    CODE39: {
      label: "Code 39",
      placeholder: "Example: XAVERT-123",
      sample: "XAVERT-123",
      filename: "code-39",
      libraryFormat: "CODE39",
    },
    CODE93: {
      label: "Code 93",
      placeholder: "Example: XAVERT-93",
      sample: "XAVERT-93",
      filename: "code-93",
      libraryFormat: "CODE93",
    },
    CODE93FullASCII: {
      label: "Code 93 Full ASCII",
      placeholder: "Example: Xavert_93!",
      sample: "Xavert_93!",
      filename: "code-93-full-ascii",
      libraryFormat: "CODE93FullASCII",
    },
    EAN13: {
      label: "EAN-13",
      placeholder: "12 digits or 13 with check digit",
      sample: "5901234123457",
      filename: "ean-13",
      libraryFormat: "EAN13",
    },
    EAN8: {
      label: "EAN-8",
      placeholder: "7 digits or 8 with check digit",
      sample: "96385074",
      filename: "ean-8",
      libraryFormat: "EAN8",
    },
    EAN5: {
      label: "EAN-5 Supplement",
      placeholder: "Exactly 5 digits",
      sample: "51299",
      filename: "ean-5",
      libraryFormat: "EAN5",
    },
    EAN2: {
      label: "EAN-2 Supplement",
      placeholder: "Exactly 2 digits",
      sample: "05",
      filename: "ean-2",
      libraryFormat: "EAN2",
    },
    UPC: {
      label: "UPC-A",
      placeholder: "11 digits or 12 with check digit",
      sample: "036000291452",
      filename: "upc-a",
      libraryFormat: "UPC",
    },
    UPCE: {
      label: "UPC-E",
      placeholder:
        "6 digits or 8 digits including number system and check digit",
      sample: "123456",
      filename: "upc-e",
      libraryFormat: "UPCE",
    },
    ITF14: {
      label: "ITF-14",
      placeholder: "13 digits or 14 with check digit",
      sample: "12345678901231",
      filename: "itf-14",
      libraryFormat: "ITF14",
    },
    ITF: {
      label: "ITF",
      placeholder: "Even number of digits, for example 12345678",
      sample: "12345678",
      filename: "itf",
      libraryFormat: "ITF",
    },
    MSI: {
      label: "MSI",
      placeholder: "Numeric value, for example 1234567",
      sample: "1234567",
      filename: "msi",
      libraryFormat: "MSI",
    },
    MSI10: {
      label: "MSI Mod 10",
      placeholder: "Numeric value; Mod 10 is added automatically",
      sample: "1234567",
      filename: "msi-mod-10",
      libraryFormat: "MSI10",
    },
    MSI11: {
      label: "MSI Mod 11",
      placeholder: "Numeric value; Mod 11 is added automatically",
      sample: "1234567",
      filename: "msi-mod-11",
      libraryFormat: "MSI11",
    },
    MSI1010: {
      label: "MSI Mod 10/10",
      placeholder: "Numeric value; checks are added automatically",
      sample: "1234567",
      filename: "msi-mod-10-10",
      libraryFormat: "MSI1010",
    },
    MSI1110: {
      label: "MSI Mod 11/10",
      placeholder: "Numeric value; checks are added automatically",
      sample: "1234567",
      filename: "msi-mod-11-10",
      libraryFormat: "MSI1110",
    },
    pharmacode: {
      label: "Pharmacode",
      placeholder: "Number from 3 to 131070",
      sample: "1234",
      filename: "pharmacode",
      libraryFormat: "pharmacode",
    },
    codabar: {
      label: "Codabar",
      placeholder: "Example: A123456A or 123456",
      sample: "A123456A",
      filename: "codabar",
      libraryFormat: "codabar",
    },
  };

  function getCurrentConfiguration() {
    return (
      formatConfiguration[barcodeFormat.value] || formatConfiguration.CODE128
    );
  }

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

  function calculateCheckDigit(valueWithoutCheckDigit) {
    let sum = 0;
    let weight = 3;

    for (
      let index = valueWithoutCheckDigit.length - 1;
      index >= 0;
      index -= 1
    ) {
      sum += Number(valueWithoutCheckDigit[index]) * weight;
      weight = weight === 3 ? 1 : 3;
    }

    return String((10 - (sum % 10)) % 10);
  }

  function isValidCheckDigit(value) {
    if (!/^\d+$/.test(value) || value.length < 2) {
      return false;
    }

    return calculateCheckDigit(value.slice(0, -1)) === value.slice(-1);
  }

  function formatSupportsCheckDigit(format) {
    return Object.prototype.hasOwnProperty.call(checkDigitBodyLengths, format);
  }

  function completeCheckDigitIfNeeded(format, value) {
    if (!formatSupportsCheckDigit(format) || !/^\d+$/.test(value)) {
      return value;
    }

    if (value.length !== checkDigitBodyLengths[format]) {
      return value;
    }

    return `${value}${calculateCheckDigit(value)}`;
  }

  function expandUpceToUpca(middleDigits, numberSystem) {
    const expansions = [
      "XX00000XXX",
      "XX10000XXX",
      "XX20000XXX",
      "XXX00000XX",
      "XXXX00000X",
      "XXXXX00005",
      "XXXXX00006",
      "XXXXX00007",
      "XXXXX00008",
      "XXXXX00009",
    ];

    const expansion = expansions[Number(middleDigits[middleDigits.length - 1])];
    let result = "";
    let digitIndex = 0;

    for (const character of expansion) {
      if (character === "X") {
        result += middleDigits[digitIndex];
        digitIndex += 1;
      } else {
        result += character;
      }
    }

    return `${numberSystem}${result}`;
  }

  function isValidUpce(value) {
    if (/^\d{6}$/.test(value)) {
      return true;
    }

    if (!/^[01]\d{7}$/.test(value)) {
      return false;
    }

    const numberSystem = value[0];
    const middleDigits = value.slice(1, 7);
    const suppliedCheckDigit = value[7];
    const upcaBody = expandUpceToUpca(middleDigits, numberSystem);

    return calculateCheckDigit(upcaBody) === suppliedCheckDigit;
  }

  function normalizeBarcodeValue(format, rawValue) {
    let value = rawValue.trim();

    if (
      [
        "EAN13",
        "EAN8",
        "EAN5",
        "EAN2",
        "UPC",
        "UPCE",
        "ITF14",
        "ITF",
        "MSI",
        "MSI10",
        "MSI11",
        "MSI1010",
        "MSI1110",
        "pharmacode",
      ].includes(format)
    ) {
      value = value.replace(/\s+/g, "");
    }

    if (["CODE39", "CODE93"].includes(format)) {
      value = value.toUpperCase();
    }

    if (format === "codabar") {
      value = value.toUpperCase().replace(/\s+/g, "");

      if (/^[0-9\-$:/.+]+$/.test(value)) {
        value = `A${value}A`;
      }
    }

    return completeCheckDigitIfNeeded(format, value);
  }

  function validateBarcodeValue(format, value) {
    if (!value) {
      return `Enter a ${getCurrentConfiguration().label} value first.`;
    }

    switch (format) {
      case "CODE128":
        if (value.length > 120) {
          return "Code 128 supports a maximum of 120 characters in this tool.";
        }
        if (/[^\x20-\x7E]/.test(value)) {
          return "Code 128 accepts printable ASCII characters in this tool.";
        }
        return "";

      case "CODE39":
        if (!/^[0-9A-Z\-. $/+%]+$/.test(value)) {
          return "Code 39 supports uppercase letters, numbers, spaces and - . $ / + %.";
        }
        if (value.length > 80) {
          return "Code 39 supports a maximum of 80 characters in this tool.";
        }
        return "";

      case "CODE93":
        if (!/^[0-9A-Z\-. $/+%]+$/.test(value)) {
          return "Code 93 supports uppercase letters, numbers, spaces and - . $ / + %.";
        }
        if (value.length > 80) {
          return "Code 93 supports a maximum of 80 characters in this tool.";
        }
        return "";

      case "CODE93FullASCII":
        if (!/^[\x20-\x7E]+$/.test(value)) {
          return "Code 93 Full ASCII accepts printable ASCII characters in this tool.";
        }
        if (value.length > 80) {
          return "Code 93 Full ASCII supports a maximum of 80 characters in this tool.";
        }
        return "";

      case "EAN13":
        if (!/^\d{13}$/.test(value)) {
          return "EAN-13 requires 12 digits, or 13 digits including the check digit.";
        }
        return isValidCheckDigit(value)
          ? ""
          : "The EAN-13 check digit is invalid.";

      case "EAN8":
        if (!/^\d{8}$/.test(value)) {
          return "EAN-8 requires 7 digits, or 8 digits including the check digit.";
        }
        return isValidCheckDigit(value)
          ? ""
          : "The EAN-8 check digit is invalid.";

      case "EAN5":
        return /^\d{5}$/.test(value) ? "" : "EAN-5 requires exactly 5 digits.";

      case "EAN2":
        return /^\d{2}$/.test(value) ? "" : "EAN-2 requires exactly 2 digits.";

      case "UPC":
        if (!/^\d{12}$/.test(value)) {
          return "UPC-A requires 11 digits, or 12 digits including the check digit.";
        }
        return isValidCheckDigit(value)
          ? ""
          : "The UPC-A check digit is invalid.";

      case "UPCE":
        return isValidUpce(value)
          ? ""
          : "UPC-E requires 6 digits, or 8 digits with number system 0/1 and a valid check digit.";

      case "ITF14":
        if (!/^\d{14}$/.test(value)) {
          return "ITF-14 requires 13 digits, or 14 digits including the check digit.";
        }
        return isValidCheckDigit(value)
          ? ""
          : "The ITF-14 check digit is invalid.";

      case "ITF":
        if (!/^\d+$/.test(value)) {
          return "ITF accepts numbers only.";
        }
        if (value.length % 2 !== 0) {
          return "ITF requires an even number of digits.";
        }
        if (value.length > 100) {
          return "ITF supports a maximum of 100 digits in this tool.";
        }
        return "";

      case "MSI":
      case "MSI10":
      case "MSI11":
      case "MSI1010":
      case "MSI1110":
        if (!/^\d+$/.test(value)) {
          return `${getCurrentConfiguration().label} accepts numbers only.`;
        }
        if (value.length > 100) {
          return `${getCurrentConfiguration().label} supports a maximum of 100 digits in this tool.`;
        }
        return "";

      case "pharmacode": {
        if (!/^\d+$/.test(value)) {
          return "Pharmacode accepts a whole number only.";
        }
        const number = Number(value);
        return number >= 3 && number <= 131070
          ? ""
          : "Pharmacode requires a number from 3 to 131070.";
      }

      case "codabar":
        if (!/^[A-D][0-9\-$:/.+]+[A-D]$/.test(value)) {
          return "Codabar must contain valid characters and start/end with A, B, C or D. Plain Codabar data is automatically wrapped with A.";
        }
        if (value.length > 80) {
          return "Codabar supports a maximum of 80 characters in this tool.";
        }
        return "";

      default:
        return "The selected barcode format is not supported.";
    }
  }

  function resetStatistics() {
    formatStat.textContent = "-";
    lengthStat.textContent = "0";
    widthStat.textContent = "0 px";
    heightStat.textContent = "0 px";
  }

  function updateStatistics(value) {
    formatStat.textContent = getCurrentConfiguration().label;
    lengthStat.textContent = String(value.length);
    widthStat.textContent = `${barcodeWidth.value} px`;
    heightStat.textContent = `${barcodeHeight.value} px`;
  }

  function hidePreview() {
    barcodeGenerated = false;
    previewBox.hidden = true;
    resetStatistics();
    barcodeSvg.replaceChildren();
  }

  function updateFormatInterface() {
    const configuration = getCurrentConfiguration();

    barcodeValue.placeholder = configuration.placeholder;
    checkDigitBtn.hidden = !formatSupportsCheckDigit(barcodeFormat.value);
  }

  function validateCurrentInput() {
    const value = normalizeBarcodeValue(
      barcodeFormat.value,
      barcodeValue.value,
    );

    if (!value) {
      notify("", "info", false);
      return;
    }

    const validationError = validateBarcodeValue(barcodeFormat.value, value);

    if (validationError) {
      notify(validationError, "error", false);
      return;
    }

    notify("Value looks valid.", "success", false);
  }

  function generateCheckDigit() {
    const format = barcodeFormat.value;
    const value = barcodeValue.value.trim().replace(/\s+/g, "");

    if (!formatSupportsCheckDigit(format)) {
      notify(
        "Check digit generation is not available for this format.",
        "error",
      );
      return;
    }

    const requiredLength = checkDigitBodyLengths[format];

    if (!/^\d+$/.test(value)) {
      notify("Enter numbers only.", "error");
      barcodeValue.focus();
      return;
    }

    if (value.length !== requiredLength) {
      notify(
        `${getCurrentConfiguration().label} requires exactly ${requiredLength} digits before generating the check digit.`,
        "error",
      );
      barcodeValue.focus();
      return;
    }

    const checkDigit = calculateCheckDigit(value);
    barcodeValue.value = `${value}${checkDigit}`;

    if (generateBarcode({ announce: false })) {
      setInlineMessage("Action completed successfully.", "success");

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    }

    barcodeValue.focus();
    barcodeValue.select();
  }

  function generateBarcode(options = {}) {
    const announce = options.announce !== false;
    const format = barcodeFormat.value;
    const configuration = getCurrentConfiguration();
    const value = normalizeBarcodeValue(format, barcodeValue.value);
    const width = Number(barcodeWidth.value);
    const height = Number(barcodeHeight.value);
    const showText = displayValue.value === "true";

    barcodeValue.value = value;

    const validationError = validateBarcodeValue(format, value);

    if (validationError) {
      hidePreview();
      notify(validationError, "error", announce);
      return false;
    }

    if (typeof window.JsBarcode !== "function") {
      hidePreview();
      notify(
        "The barcode library could not be loaded. Refresh the page and try again.",
        "error",
        announce,
      );
      return false;
    }

    generateBtn.disabled = true;
    generateBtn.setAttribute("aria-busy", "true");

    try {
      barcodeSvg.replaceChildren();

      window.JsBarcode(barcodeSvg, value, {
        format: configuration.libraryFormat,
        width,
        height,
        displayValue: showText,
        lineColor: "#111827",
        background: "#ffffff",
        margin: 12,
        font: "Arial",
        fontSize: 16,
        fontOptions: "",
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 4,
      });

      barcodeGenerated = true;
      previewBox.hidden = false;
      updateStatistics(value);

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
      console.error("Barcode generation failed:", error);
      hidePreview();
      notify(
        "Could not generate the barcode. Check the value and selected format.",
        "error",
        announce,
      );
      return false;
    } finally {
      generateBtn.disabled = false;
      generateBtn.removeAttribute("aria-busy");
    }
  }

  function ensureGeneratedBarcode() {
    if (barcodeGenerated && barcodeSvg.children.length > 0) {
      return true;
    }

    return generateBarcode({ announce: false });
  }

  function getSvgDimensions(svgElement) {
    const width =
      Number(svgElement.getAttribute("width")) ||
      Math.ceil(svgElement.getBoundingClientRect().width) ||
      600;
    const height =
      Number(svgElement.getAttribute("height")) ||
      Math.ceil(svgElement.getBoundingClientRect().height) ||
      200;

    return {
      width: Math.max(width, 1),
      height: Math.max(height, 1),
    };
  }

  function getSvgContent() {
    if (!ensureGeneratedBarcode()) {
      notify("Generate a valid barcode first.", "error");
      return "";
    }

    const clone = barcodeSvg.cloneNode(true);
    const dimensions = getSvgDimensions(barcodeSvg);

    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(dimensions.width));
    clone.setAttribute("height", String(dimensions.height));

    if (!clone.hasAttribute("viewBox")) {
      clone.setAttribute(
        "viewBox",
        `0 0 ${dimensions.width} ${dimensions.height}`,
      );
    }

    clone.setAttribute("role", "img");
    clone.setAttribute(
      "aria-label",
      `${getCurrentConfiguration().label} barcode`,
    );

    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  }

  function createSafeFilename(extension) {
    const configuration = getCurrentConfiguration();
    const cleanValue = normalizeBarcodeValue(
      barcodeFormat.value,
      barcodeValue.value,
    )
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const suffix = cleanValue ? `-${cleanValue}` : "";

    return `xavert-${configuration.filename}${suffix}.${extension}`;
  }

  function downloadSvg() {
    const svgContent = getSvgContent();

    if (!svgContent) {
      return;
    }

    downloadFile(
      createSafeFilename("svg"),
      new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" }),
      "image/svg+xml;charset=utf-8",
    );
  }

  function downloadPng() {
    const svgContent = getSvgContent();

    if (!svgContent) {
      return;
    }

    const svgBlob = new Blob([svgContent], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = function () {
      const scale = 3;
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const canvas = document.createElement("canvas");

      canvas.width = Math.max(Math.round(sourceWidth * scale), 1);
      canvas.height = Math.max(Math.round(sourceHeight * scale), 1);

      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(svgUrl);
        notify("PNG export failed.", "error");
        return;
      }

      context.imageSmoothingEnabled = false;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        function (blob) {
          URL.revokeObjectURL(svgUrl);

          if (!blob) {
            notify("PNG export failed.", "error");
            return;
          }

          downloadFile(createSafeFilename("png"), blob, "image/png");
        },
        "image/png",
        1,
      );
    };

    image.onerror = function () {
      URL.revokeObjectURL(svgUrl);
      notify("PNG export failed.", "error");
    };

    image.src = svgUrl;
  }

  async function copySvg() {
    const svgContent = getSvgContent();

    if (!svgContent) {
      return;
    }

    await xavertCopyText(svgContent);
  }

  function clearTool() {
    barcodeValue.value = "";
    barcodeFormat.value = "CODE128";
    barcodeWidth.value = "2";
    barcodeHeight.value = "90";
    displayValue.value = "true";

    hidePreview();
    updateFormatInterface();

    if (typeof window.clearMessage === "function") {
      window.clearMessage();
    } else {
      setInlineMessage("");
    }

    barcodeValue.focus();
  }

  function loadSample() {
    barcodeValue.value = getCurrentConfiguration().sample;

    if (generateBarcode({ announce: false })) {
      if (typeof window.showSampleSuccess === "function") {
        window.showSampleSuccess();
      } else {
        notify("Sample loaded successfully.", "success");
      }
    }

    barcodeValue.focus();
    barcodeValue.select();
  }

  function invalidateGeneratedBarcode() {
    if (!barcodeGenerated) {
      return;
    }

    hidePreview();
    notify("Input changed. Generate the barcode again.", "info", false);
  }

  function regenerateWhenAvailable() {
    if (barcodeGenerated) {
      generateBarcode({ announce: false });
    }
  }

  generateBtn.addEventListener("click", function () {
    generateBarcode();
  });
  checkDigitBtn.addEventListener("click", generateCheckDigit);
  downloadSvgBtn.addEventListener("click", downloadSvg);
  downloadPngBtn.addEventListener("click", downloadPng);
  copySvgBtn.addEventListener("click", copySvg);
  clearBtn.addEventListener("click", clearTool);
  sampleBtn.addEventListener("click", loadSample);

  barcodeValue.addEventListener("input", function () {
    invalidateGeneratedBarcode();
    validateCurrentInput();
  });

  barcodeFormat.addEventListener("change", function () {
    barcodeValue.value = "";
    updateFormatInterface();
    hidePreview();
    notify("", "info", false);
    barcodeValue.focus();
  });

  barcodeWidth.addEventListener("change", regenerateWhenAvailable);
  barcodeHeight.addEventListener("change", regenerateWhenAvailable);
  displayValue.addEventListener("change", regenerateWhenAvailable);

  updateFormatInterface();
  resetStatistics();
});
