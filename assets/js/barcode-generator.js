"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const barcodeValue = document.getElementById("barcodeValue");
  const barcodeFormat = document.getElementById("barcodeFormat");
  const barcodeWidth = document.getElementById("barcodeWidth");
  const barcodeHeight = document.getElementById("barcodeHeight");
  const displayValue = document.getElementById("displayValue");

  const generateBtn = document.getElementById("generateBtn");
  const downloadSvgBtn = document.getElementById("downloadSvgBtn");
  const downloadPngBtn = document.getElementById("downloadPngBtn");
  const copySvgBtn = document.getElementById("copySvgBtn");
  const clearBtn = document.getElementById("clearBtn");
  const sampleBtn = document.getElementById("sampleBtn");

  const previewBox = document.getElementById("previewBox");
  const barcodeSvg = document.getElementById("barcodeSvg");
  const message = document.getElementById("message");
  const toast = document.getElementById("toast");

  const formatStat = document.getElementById("formatStat");
  const lengthStat = document.getElementById("lengthStat");
  const widthStat = document.getElementById("widthStat");
  const heightStat = document.getElementById("heightStat");

  let toastTimer = null;
  let barcodeGenerated = false;

  const formatConfiguration = {
    CODE128: {
      label: "Code 128",
      placeholder: "Example: XAVERT-123456",
      sample: "XAVERT-123456",
      filename: "code-128",
      normalize(value) {
        return value;
      },
      validate(value) {
        if (!value) {
          return "Enter a barcode value first.";
        }

        if (value.length > 120) {
          return "Code 128 supports a maximum of 120 characters in this tool.";
        }

        if (/[\u0000-\u001F\u007F]/.test(value)) {
          return "Code 128 cannot contain control characters.";
        }

        return "";
      }
    },

    CODE39: {
      label: "Code 39",
      placeholder: "Example: ABC-123",
      sample: "XAVERT-123",
      filename: "code-39",
      normalize(value) {
        return value.toUpperCase();
      },
      validate(value) {
        if (!value) {
          return "Enter a barcode value first.";
        }

        if (!/^[0-9A-Z\-. $/+%]+$/.test(value)) {
          return "Code 39 supports uppercase letters, numbers, spaces and - . $ / + %";
        }

        if (value.length > 80) {
          return "Code 39 supports a maximum of 80 characters in this tool.";
        }

        return "";
      }
    },

    EAN13: {
      label: "EAN-13",
      placeholder: "Example: 5901234123457",
      sample: "5901234123457",
      filename: "ean-13",
      normalize(value) {
        return value.replace(/\s+/g, "");
      },
      validate(value) {
        if (!value) {
          return "Enter an EAN-13 value first.";
        }

        if (!/^\d{12,13}$/.test(value)) {
          return "EAN-13 requires 12 digits, or 13 digits including the check digit.";
        }

        if (value.length === 13 && !isValidCheckDigit(value)) {
          return "The EAN-13 check digit is invalid.";
        }

        return "";
      }
    },

    EAN8: {
      label: "EAN-8",
      placeholder: "Example: 96385074",
      sample: "96385074",
      filename: "ean-8",
      normalize(value) {
        return value.replace(/\s+/g, "");
      },
      validate(value) {
        if (!value) {
          return "Enter an EAN-8 value first.";
        }

        if (!/^\d{7,8}$/.test(value)) {
          return "EAN-8 requires 7 digits, or 8 digits including the check digit.";
        }

        if (value.length === 8 && !isValidCheckDigit(value)) {
          return "The EAN-8 check digit is invalid.";
        }

        return "";
      }
    },

    UPC: {
      label: "UPC-A",
      placeholder: "Example: 036000291452",
      sample: "036000291452",
      filename: "upc-a",
      normalize(value) {
        return value.replace(/\s+/g, "");
      },
      validate(value) {
        if (!value) {
          return "Enter a UPC-A value first.";
        }

        if (!/^\d{11,12}$/.test(value)) {
          return "UPC-A requires 11 digits, or 12 digits including the check digit.";
        }

        if (value.length === 12 && !isValidCheckDigit(value)) {
          return "The UPC-A check digit is invalid.";
        }

        return "";
      }
    },

    ITF14: {
      label: "ITF-14",
      placeholder: "Example: 12345678901231",
      sample: "12345678901231",
      filename: "itf-14",
      normalize(value) {
        return value.replace(/\s+/g, "");
      },
      validate(value) {
        if (!value) {
          return "Enter an ITF-14 value first.";
        }

        if (!/^\d{13,14}$/.test(value)) {
          return "ITF-14 requires 13 digits, or 14 digits including the check digit.";
        }

        if (value.length === 14 && !isValidCheckDigit(value)) {
          return "The ITF-14 check digit is invalid.";
        }

        return "";
      }
    },

    codabar: {
      label: "Codabar",
      placeholder: "Example: A123456A",
      sample: "A123456A",
      filename: "codabar",
      normalize(value) {
        return value.toUpperCase().replace(/\s+/g, "");
      },
      validate(value) {
        if (!value) {
          return "Enter a Codabar value first.";
        }

        if (!/^[A-D][0-9\-$:/.+]+[A-D]$/.test(value)) {
          return "Codabar must start and end with A, B, C or D and contain only valid Codabar characters.";
        }

        if (value.length > 80) {
          return "Codabar supports a maximum of 80 characters in this tool.";
        }

        return "";
      }
    }
  };

  function getCurrentConfiguration() {
    return formatConfiguration[barcodeFormat.value] || formatConfiguration.CODE128;
  }

  function normalizeValue(value, format) {
    const configuration =
      formatConfiguration[format] || formatConfiguration.CODE128;

    return configuration.normalize(value.trim());
  }

  function calculateCheckDigit(valueWithoutCheckDigit) {
    let sum = 0;
    let weight = 3;

    for (let index = valueWithoutCheckDigit.length - 1; index >= 0; index -= 1) {
      sum += Number(valueWithoutCheckDigit[index]) * weight;
      weight = weight === 3 ? 1 : 3;
    }

    return String((10 - (sum % 10)) % 10);
  }

  function isValidCheckDigit(value) {
    if (!/^\d+$/.test(value) || value.length < 2) {
      return false;
    }

    const body = value.slice(0, -1);
    const suppliedCheckDigit = value.slice(-1);

    return calculateCheckDigit(body) === suppliedCheckDigit;
  }

  function updatePlaceholder() {
    barcodeValue.placeholder = getCurrentConfiguration().placeholder;
  }

  function showToast(text, type = "info") {
    if (!toast || !text) {
      return;
    }

    window.clearTimeout(toastTimer);

    toast.textContent = text;
    toast.className = `toast-${type}`;
    toast.style.display = "block";
    toast.setAttribute("aria-hidden", "false");

    toastTimer = window.setTimeout(function () {
      toast.style.display = "none";
      toast.className = "";
      toast.setAttribute("aria-hidden", "true");
    }, 2200);
  }

  function showMessage(text = "", type = "info", useToast = true) {
    if (message) {
      message.textContent = text;

      if (type === "error") {
        message.style.color = "#dc2626";
      } else if (type === "success") {
        message.style.color = "#047857";
      } else {
        message.style.color = "#6b7280";
      }
    }

    if (text && useToast) {
      showToast(text, type);
    }
  }

  function resetStatistics() {
    formatStat.textContent = "-";
    lengthStat.textContent = "0";
    widthStat.textContent = "0";
    heightStat.textContent = "0";
  }

  function hidePreview() {
    barcodeGenerated = false;
    barcodeSvg.replaceChildren();
    previewBox.style.display = "none";
    resetStatistics();
  }

  function updateStatistics(value) {
    const selectedFormat =
      barcodeFormat.options[barcodeFormat.selectedIndex].text;

    formatStat.textContent = selectedFormat;
    lengthStat.textContent = String(value.length);
    widthStat.textContent = barcodeWidth.value;
    heightStat.textContent = barcodeHeight.value;
  }

  function validateBarcodeValue(value, format) {
    const configuration =
      formatConfiguration[format] || formatConfiguration.CODE128;

    return configuration.validate(value);
  }

  function generateBarcode(options = {}) {
    const announce = options.announce !== false;

    const format = barcodeFormat.value;
    const value = normalizeValue(barcodeValue.value, format);
    const width = Number(barcodeWidth.value);
    const height = Number(barcodeHeight.value);
    const showText = displayValue.value === "true";

    barcodeValue.value = value;

    const validationError = validateBarcodeValue(value, format);

    if (validationError) {
      hidePreview();
      showMessage(validationError, "error", announce);
      return false;
    }

    if (typeof window.JsBarcode !== "function") {
      hidePreview();
      showMessage(
        "The barcode library could not be loaded. Refresh the page and try again.",
        "error",
        announce
      );
      return false;
    }

    generateBtn.disabled = true;
    generateBtn.setAttribute("aria-busy", "true");

    try {
      barcodeSvg.replaceChildren();

      window.JsBarcode(barcodeSvg, value, {
        format,
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
        textMargin: 4
      });

      barcodeGenerated = true;
      previewBox.style.display = "block";

      updateStatistics(value);
      showMessage("Barcode generated successfully.", "success", announce);

      return true;
    } catch (error) {
      console.error("Barcode generation failed:", error);

      hidePreview();
      showMessage(
        "Could not generate the barcode. Check the value and selected format.",
        "error",
        announce
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
      height: Math.max(height, 1)
    };
  }

  function getSvgContent() {
    if (!ensureGeneratedBarcode()) {
      showMessage("Generate a valid barcode first.", "error");
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
        `0 0 ${dimensions.width} ${dimensions.height}`
      );
    }

    clone.setAttribute("role", "img");
    clone.setAttribute(
      "aria-label",
      `${getCurrentConfiguration().label} barcode`
    );

    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  }

  function createSafeFilename(extension) {
    const configuration = getCurrentConfiguration();

    const cleanValue = normalizeValue(
      barcodeValue.value,
      barcodeFormat.value
    )
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    const suffix = cleanValue ? `-${cleanValue}` : "";

    return `xavert-${configuration.filename}${suffix}.${extension}`;
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.hidden = true;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function downloadSvg() {
    const svgContent = getSvgContent();

    if (!svgContent) {
      return;
    }

    const blob = new Blob([svgContent], {
      type: "image/svg+xml;charset=utf-8"
    });

    downloadBlob(createSafeFilename("svg"), blob);
    showMessage("SVG download started.", "success");
  }

  function downloadPng() {
    const svgContent = getSvgContent();

    if (!svgContent) {
      return;
    }

    const svgBlob = new Blob([svgContent], {
      type: "image/svg+xml;charset=utf-8"
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
        showMessage("PNG export failed.", "error");
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
            showMessage("PNG export failed.", "error");
            return;
          }

          downloadBlob(createSafeFilename("png"), blob);
          showMessage("High-resolution PNG download started.", "success");
        },
        "image/png",
        1
      );
    };

    image.onerror = function () {
      URL.revokeObjectURL(svgUrl);
      showMessage("PNG export failed.", "error");
    };

    image.src = svgUrl;
  }

  async function copySvg() {
    const svgContent = getSvgContent();

    if (!svgContent) {
      return;
    }

    try {
      if (typeof window.xavertCopyText === "function") {
        const result = window.xavertCopyText(
          svgContent,
          "SVG code copied."
        );

        if (result instanceof Promise) {
          await result;
        }
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(svgContent);
        showMessage("SVG code copied.", "success");
      } else {
        const temporaryTextarea = document.createElement("textarea");

        temporaryTextarea.value = svgContent;
        temporaryTextarea.setAttribute("readonly", "");
        temporaryTextarea.style.position = "fixed";
        temporaryTextarea.style.opacity = "0";

        document.body.appendChild(temporaryTextarea);
        temporaryTextarea.select();

        const copied = document.execCommand("copy");
        temporaryTextarea.remove();

        if (!copied) {
          throw new Error("Clipboard command failed.");
        }

        showMessage("SVG code copied.", "success");
      }
    } catch (error) {
      console.error("SVG copy failed:", error);
      showMessage("Could not copy the SVG code.", "error");
    }
  }

  function clearTool() {
    barcodeValue.value = "";
    barcodeFormat.value = "CODE128";
    barcodeWidth.value = "2";
    barcodeHeight.value = "90";
    displayValue.value = "true";

    hidePreview();
    updatePlaceholder();
    showMessage("Editor cleared.", "success");

    barcodeValue.focus();
  }

  function loadSample() {
    const configuration = getCurrentConfiguration();

    barcodeValue.value = configuration.sample;

    generateBarcode();
    barcodeValue.focus();
    barcodeValue.select();
  }

  function invalidateGeneratedBarcode() {
    if (!barcodeGenerated) {
      showMessage("", "info", false);
      return;
    }

    hidePreview();
    showMessage(
      "Settings changed. Generate the barcode again.",
      "info",
      false
    );
  }

  function regenerateWhenAvailable() {
    if (barcodeGenerated) {
      generateBarcode({ announce: false });
    }
  }

  generateBtn.addEventListener("click", function () {
    generateBarcode();
  });

  downloadSvgBtn.addEventListener("click", downloadSvg);
  downloadPngBtn.addEventListener("click", downloadPng);
  copySvgBtn.addEventListener("click", copySvg);
  clearBtn.addEventListener("click", clearTool);
  sampleBtn.addEventListener("click", loadSample);

  barcodeValue.addEventListener("input", invalidateGeneratedBarcode);

  barcodeValue.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      generateBarcode();
    }
  });

  barcodeFormat.addEventListener("change", function () {
    barcodeValue.value = "";
    updatePlaceholder();
    hidePreview();
    showMessage("", "info", false);
    barcodeValue.focus();
  });

  barcodeWidth.addEventListener("change", regenerateWhenAvailable);
  barcodeHeight.addEventListener("change", regenerateWhenAvailable);
  displayValue.addEventListener("change", regenerateWhenAvailable);

  updatePlaceholder();
  resetStatistics();
});
