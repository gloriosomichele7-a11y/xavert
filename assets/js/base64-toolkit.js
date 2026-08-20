"use strict";

document.addEventListener("DOMContentLoaded", function () {
  if (document.body.dataset.tool !== "base64-toolkit") {
    return;
  }

  const inputText = document.getElementById("inputText");
  const inputInfo = document.getElementById("inputInfo");
  const inputType = document.getElementById("inputType");
  const base64Variant = document.getElementById("base64Variant");

  const encodeBtn = document.getElementById("encodeBtn");
  const decodeBtn = document.getElementById("decodeBtn");
  const clearBtn = document.getElementById("clearBtn");
  const sampleBtn = document.getElementById("sampleBtn");

  const resultBox = document.getElementById("resultBox");
  const outputLabel = document.getElementById("outputLabel");
  const outputText = document.getElementById("outputText");
  const outputInfo = document.getElementById("outputInfo");
  const conversionStats = document.getElementById("conversionStats");
  const utfInfo = document.getElementById("utfInfo");

  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const message = document.getElementById("message");

  const requiredElements = {
    inputText,
    inputInfo,
    inputType,
    base64Variant,
    encodeBtn,
    decodeBtn,
    clearBtn,
    sampleBtn,
    resultBox,
    outputLabel,
    outputText,
    outputInfo,
    conversionStats,
    utfInfo,
    copyBtn,
    downloadBtn,
    message,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length > 0) {
    console.error(
      "Base64 Toolkit initialization failed. Missing elements:",
      missingElements,
    );

    return;
  }

  let lastAction = "result";
  let resultAvailable = false;

  const sampleText =
    "XAVERT makes browser-side tools simple, fast and private.";

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

    if (text && useToast && typeof window["showMessage"] === "function") {
      window["showMessage"](text, type);
    }
  }

  function getCharacterCount(value) {
    return Array.from(value).length;
  }

  function getUtf8ByteLength(value) {
    return new TextEncoder().encode(value).length;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value);
  }

  function updateInputInformation() {
    const value = inputText.value;
    const characters = getCharacterCount(value);
    const bytes = getUtf8ByteLength(value);

    inputInfo.textContent = `Characters: ${formatNumber(characters)} • UTF-8 bytes: ${formatNumber(bytes)}`;

    updateDetectedInputType();
  }

  function updateOutputInformation() {
    const value = outputText.value;
    const characters = getCharacterCount(value);
    const bytes = getUtf8ByteLength(value);

    outputInfo.textContent = `Characters: ${formatNumber(characters)} • UTF-8 bytes: ${formatNumber(bytes)}`;
  }

  function stripBase64Whitespace(value) {
    return value.replace(/\s+/g, "");
  }

  function isUrlSafeBase64(value) {
    const compact = stripBase64Whitespace(value.trim());

    return /[-_]/.test(compact) && !/[+/]/.test(compact);
  }

  function normalizeBase64(value) {
    return stripBase64Whitespace(value.trim())
      .replace(/-/g, "+")
      .replace(/_/g, "/");
  }

  function addBase64Padding(value) {
    const remainder = value.length % 4;

    if (remainder === 0) {
      return value;
    }

    if (remainder === 1) {
      return value;
    }

    return value.padEnd(value.length + (4 - remainder), "=");
  }

  function isValidBase64(value) {
    if (!value) {
      return false;
    }

    const normalized = normalizeBase64(value);

    if (normalized.length < 4) {
      return false;
    }

    if (normalized.length % 4 === 1) {
      return false;
    }

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
      return false;
    }

    const paddingIndex = normalized.indexOf("=");

    if (paddingIndex !== -1 && paddingIndex < normalized.length - 2) {
      return false;
    }

    try {
      const padded = addBase64Padding(normalized);
      const decoded = window.atob(padded);
      const reEncoded = window.btoa(decoded).replace(/=+$/g, "");
      const comparisonValue = padded.replace(/=+$/g, "");

      return reEncoded === comparisonValue;
    } catch (error) {
      return false;
    }
  }

  function updateDetectedInputType() {
    const value = inputText.value.trim();

    if (!value) {
      inputType.textContent = "Detected: —";
      return;
    }

    if (isValidBase64(value)) {
      inputType.textContent = isUrlSafeBase64(value)
        ? "Detected: Valid Base64URL"
        : "Detected: Valid Base64";
      return;
    }

    inputType.textContent = "Detected: Plain text";
  }

  function encodeUtf8ToBase64(value) {
    const bytes = new TextEncoder().encode(value);
    const chunkSize = 32768;
    let binary = "";

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return window.btoa(binary);
  }

  function decodeBase64ToBytes(value) {
    const normalized = normalizeBase64(value);
    const padded = addBase64Padding(normalized);
    const binary = window.atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  function decodeBase64ToUtf8(value) {
    const bytes = decodeBase64ToBytes(value);

    return new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bytes);
  }

  function calculatePercentageDifference(inputSize, outputSize) {
    if (inputSize === 0) {
      return 0;
    }

    return ((outputSize - inputSize) / inputSize) * 100;
  }

  function formatSignedPercentage(value) {
    const roundedValue = Math.round(value);

    if (roundedValue > 0) {
      return `+${roundedValue}%`;
    }

    return `${roundedValue}%`;
  }

  function showResult(options) {
    const { value, label, action, inputBytes, outputBytes, encodingLabel } =
      options;

    outputText.value = value;
    outputLabel.textContent = label;
    lastAction = action;
    resultAvailable = true;

    updateOutputInformation();

    const percentageDifference = calculatePercentageDifference(
      inputBytes,
      outputBytes,
    );

    conversionStats.textContent =
      `Input: ${formatNumber(inputBytes)} bytes` +
      ` • Output: ${formatNumber(outputBytes)} bytes` +
      ` • Difference: ${formatSignedPercentage(percentageDifference)}`;

    utfInfo.textContent = encodingLabel;

    resultBox.hidden = false;
  }

  function hideResult() {
    resultAvailable = false;
    lastAction = "result";

    outputText.value = "";
    outputLabel.textContent = "Output";
    outputInfo.textContent = "Characters: 0 • UTF-8 bytes: 0";

    conversionStats.textContent = "";
    utfInfo.textContent = "";

    resultBox.hidden = true;
  }

  function encodeBase64(options = {}) {
    const announce = options.announce !== false;
    const value = inputText.value;

    if (!value) {
      hideResult();
      notify("Enter text to encode first.", "error", announce);

      inputText.focus();
      return false;
    }

    encodeBtn.disabled = true;
    encodeBtn.setAttribute("aria-busy", "true");

    try {
      const standardEncoded = encodeUtf8ToBase64(value);
      const encoded =
        base64Variant.value === "url"
          ? standardEncoded
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/g, "")
          : standardEncoded;
      const inputBytes = getUtf8ByteLength(value);
      const outputBytes = getUtf8ByteLength(encoded);

      showResult({
        value: encoded,
        label:
          base64Variant.value === "url"
            ? "Base64URL Encoded Output"
            : "Encoded Output",
        action: base64Variant.value === "url" ? "encoded-url" : "encoded",
        inputBytes,
        outputBytes,
        encodingLabel:
          base64Variant.value === "url"
            ? "Encoded from UTF-8 text to Base64URL without padding"
            : "Encoded from UTF-8 text to standard Base64",
      });

      setInlineMessage("Action completed successfully.", "success");

      if (announce) {
        if (typeof window.showActionSuccess === "function") {
          window.showActionSuccess();
        } else if (typeof window.showMessage === "function") {
          window.showMessage("Action completed successfully.", "success");
        }
      }

      return true;
    } catch (error) {
      console.error("Base64 encoding failed:", error);

      hideResult();

      notify("Could not encode the text.", "error", announce);

      return false;
    } finally {
      encodeBtn.disabled = false;
      encodeBtn.removeAttribute("aria-busy");
    }
  }

  function decodeBase64(options = {}) {
    const announce = options.announce !== false;
    const value = inputText.value.trim();

    if (!value) {
      hideResult();

      notify("Enter Base64 data to decode first.", "error", announce);

      inputText.focus();
      return false;
    }

    if (!isValidBase64(value)) {
      hideResult();

      notify("Enter valid Base64 data.", "error", announce);

      inputText.focus();
      return false;
    }

    decodeBtn.disabled = true;
    decodeBtn.setAttribute("aria-busy", "true");

    try {
      const decoded = decodeBase64ToUtf8(value);
      const inputBytes = getUtf8ByteLength(normalizeBase64(value));
      const outputBytes = getUtf8ByteLength(decoded);

      showResult({
        value: decoded,
        label: "Decoded Output",
        action: "decoded",
        inputBytes,
        outputBytes,
        encodingLabel: "Decoded from Base64 as valid UTF-8 text",
      });

      setInlineMessage("Action completed successfully.", "success");

      if (announce) {
        if (typeof window.showActionSuccess === "function") {
          window.showActionSuccess();
        } else if (typeof window.showMessage === "function") {
          window.showMessage("Action completed successfully.", "success");
        }
      }

      return true;
    } catch (error) {
      console.error("Base64 decoding failed:", error);

      hideResult();

      notify(
        "The Base64 data does not contain valid UTF-8 text.",
        "error",
        announce,
      );

      return false;
    } finally {
      decodeBtn.disabled = false;
      decodeBtn.removeAttribute("aria-busy");
    }
  }

  function validateCurrentInput() {
    const value = inputText.value.trim();

    if (!value) {
      notify("", "info", false);
      return;
    }

    if (isValidBase64(value)) {
      notify("Valid Base64 detected. It is ready to decode.", "success", false);

      return;
    }

    notify("Plain text detected. It is ready to encode.", "info", false);
  }

  async function copyResult() {
    if (!resultAvailable || !outputText.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    await xavertCopyText(outputText.value);
  }

  function createSafeFilename() {
    const suffix =
      lastAction === "encoded-url"
        ? "encoded-url"
        : lastAction === "encoded"
          ? "encoded"
          : lastAction === "decoded"
            ? "decoded"
            : "result";

    return `xavert-base64-${suffix}.txt`;
  }

  function downloadResult() {
    if (!resultAvailable || !outputText.value) {
      notify("Nothing to download.", "error");
      return;
    }

    downloadFile(
      createSafeFilename(),
      outputText.value,
      "text/plain;charset=utf-8",
    );
  }

  function clearTool() {
    inputText.value = "";
    base64Variant.value = "standard";

    hideResult();
    updateInputInformation();
    inputText.focus();
  }

  function loadSample() {
    inputText.value = sampleText;

    updateInputInformation();

    if (encodeBase64({ announce: false })) {
      if (typeof window.showSampleSuccess === "function") {
        window.showSampleSuccess();
      } else {
        notify("Sample loaded successfully.", "success");
      }
    }

    inputText.focus();
    inputText.select();
  }

  function invalidateResult() {
    if (!resultAvailable) {
      return;
    }

    hideResult();

    notify("Input changed. Run the conversion again.", "info", false);
  }

  function handleInputChange() {
    invalidateResult();
    updateInputInformation();
    validateCurrentInput();
  }

  encodeBtn.addEventListener("click", function () {
    encodeBase64();
  });

  decodeBtn.addEventListener("click", function () {
    decodeBase64();
  });

  copyBtn.addEventListener("click", copyResult);
  downloadBtn.addEventListener("click", downloadResult);
  clearBtn.addEventListener("click", clearTool);
  sampleBtn.addEventListener("click", loadSample);

  inputText.addEventListener("input", handleInputChange);
  base64Variant.addEventListener("change", function () {
    invalidateResult();
    validateCurrentInput();
  });

  updateInputInformation();
  hideResult();
});
