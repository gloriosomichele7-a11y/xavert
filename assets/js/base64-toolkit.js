"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const inputText = document.getElementById("inputText");
  const inputInfo = document.getElementById("inputInfo");
  const inputType = document.getElementById("inputType");

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
  const toast = document.getElementById("toast");

  let toastTimer = null;
  let messageTimer = null;
  let lastAction = "result";
  let resultAvailable = false;

  const sampleText =
    "XAVERT makes browser-side tools simple, fast and private.";

  function showToast(text, type = "info") {
    if (!toast || !text) {
      return;
    }

    const allowedTypes = ["success", "error", "info"];
    const safeType = allowedTypes.includes(type) ? type : "info";

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

  function showMessage(text = "", type = "info", useToast = true) {
    if (message) {
      const allowedTypes = ["success", "error", "info"];
      const safeType = allowedTypes.includes(type) ? type : "info";

      message.textContent = text;

      message.classList.remove(
        "message-success",
        "message-error",
        "message-info"
      );

      message.classList.add(`message-${safeType}`);
    }

    if (text && useToast) {
      showToast(text, type);
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

    inputInfo.textContent =
      `Characters: ${formatNumber(characters)} • UTF-8 bytes: ${formatNumber(bytes)}`;

    updateDetectedInputType();
  }

  function updateOutputInformation() {
    const value = outputText.value;
    const characters = getCharacterCount(value);
    const bytes = getUtf8ByteLength(value);

    outputInfo.textContent =
      `Characters: ${formatNumber(characters)} • UTF-8 bytes: ${formatNumber(bytes)}`;
  }

  function normalizeBase64(value) {
    return value
      .trim()
      .replace(/\s+/g, "")
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

    if (
      paddingIndex !== -1 &&
      paddingIndex < normalized.length - 2
    ) {
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
      inputType.textContent = "Detected: Valid Base64";
      return;
    }

    inputType.textContent = "Detected: Plain text";
  }

  function encodeUtf8ToBase64(value) {
    const bytes = new TextEncoder().encode(value);
    const chunkSize = 32768;
    let binary = "";

    for (
      let index = 0;
      index < bytes.length;
      index += chunkSize
    ) {
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
      fatal: true
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
    const {
      value,
      label,
      action,
      inputBytes,
      outputBytes,
      encodingLabel
    } = options;

    outputText.value = value;
    outputLabel.textContent = label;
    lastAction = action;
    resultAvailable = true;

    updateOutputInformation();

    const percentageDifference =
      calculatePercentageDifference(inputBytes, outputBytes);

    conversionStats.textContent =
      `Input: ${formatNumber(inputBytes)} bytes` +
      ` • Output: ${formatNumber(outputBytes)} bytes` +
      ` • Difference: ${formatSignedPercentage(percentageDifference)}`;

    conversionStats.style.display = "block";

    utfInfo.textContent = encodingLabel;
    utfInfo.style.display = "block";

    resultBox.style.display = "block";
  }

  function hideResult() {
    resultAvailable = false;
    lastAction = "result";

    outputText.value = "";
    outputLabel.textContent = "Output";
    outputInfo.textContent =
      "Characters: 0 • UTF-8 bytes: 0";

    conversionStats.textContent = "";
    conversionStats.style.display = "none";

    utfInfo.textContent = "";
    utfInfo.style.display = "none";

    resultBox.style.display = "none";
  }

  function encodeBase64(options = {}) {
    const announce = options.announce !== false;
    const value = inputText.value;

    if (!value) {
      hideResult();
      showMessage(
        "Enter text to encode first.",
        "error",
        announce
      );

      inputText.focus();
      return false;
    }

    encodeBtn.disabled = true;
    encodeBtn.setAttribute("aria-busy", "true");

    try {
      const encoded = encodeUtf8ToBase64(value);
      const inputBytes = getUtf8ByteLength(value);
      const outputBytes = getUtf8ByteLength(encoded);

      showResult({
        value: encoded,
        label: "Encoded Output",
        action: "encoded",
        inputBytes,
        outputBytes,
        encodingLabel: "Encoded from UTF-8 text to standard Base64"
      });

      showMessage(
        "Text encoded successfully.",
        "success",
        announce
      );

      return true;
    } catch (error) {
      console.error("Base64 encoding failed:", error);

      hideResult();

      showMessage(
        "Could not encode the text.",
        "error",
        announce
      );

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

      showMessage(
        "Enter Base64 data to decode first.",
        "error",
        announce
      );

      inputText.focus();
      return false;
    }

    if (!isValidBase64(value)) {
      hideResult();

      showMessage(
        "Enter valid Base64 data.",
        "error",
        announce
      );

      inputText.focus();
      return false;
    }

    decodeBtn.disabled = true;
    decodeBtn.setAttribute("aria-busy", "true");

    try {
      const decoded = decodeBase64ToUtf8(value);
      const inputBytes =
        getUtf8ByteLength(normalizeBase64(value));
      const outputBytes = getUtf8ByteLength(decoded);

      showResult({
        value: decoded,
        label: "Decoded Output",
        action: "decoded",
        inputBytes,
        outputBytes,
        encodingLabel:
          "Decoded from Base64 as valid UTF-8 text"
      });

      showMessage(
        "Base64 decoded successfully.",
        "success",
        announce
      );

      return true;
    } catch (error) {
      console.error("Base64 decoding failed:", error);

      hideResult();

      showMessage(
        "The Base64 data does not contain valid UTF-8 text.",
        "error",
        announce
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
      showMessage("", "info", false);
      return;
    }

    if (isValidBase64(value)) {
      showMessage(
        "Valid Base64 detected. It is ready to decode.",
        "success",
        false
      );

      return;
    }

    showMessage(
      "Plain text detected. It is ready to encode.",
      "info",
      false
    );
  }

  async function copyResult() {
    if (!resultAvailable || !outputText.value) {
      showMessage("Nothing to copy.", "error");
      return;
    }

    try {
      if (typeof window.xavertCopyText === "function") {
        const result = window.xavertCopyText(
          outputText.value,
          "Result copied."
        );

        if (result instanceof Promise) {
          await result;
        }

        return;
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(outputText.value);
        showMessage("Result copied.", "success");
        return;
      }

      const temporaryTextarea =
        document.createElement("textarea");

      temporaryTextarea.value = outputText.value;
      temporaryTextarea.setAttribute("readonly", "");
      temporaryTextarea.style.position = "fixed";
      temporaryTextarea.style.opacity = "0";
      temporaryTextarea.style.pointerEvents = "none";

      document.body.appendChild(temporaryTextarea);
      temporaryTextarea.select();

      const copied = document.execCommand("copy");
      temporaryTextarea.remove();

      if (!copied) {
        throw new Error("Clipboard command failed.");
      }

      showMessage("Result copied.", "success");
    } catch (error) {
      console.error("Base64 result copy failed:", error);

      showMessage(
        "Could not copy the result.",
        "error"
      );
    }
  }

  function createSafeFilename() {
    const suffix =
      lastAction === "encoded"
        ? "encoded"
        : lastAction === "decoded"
          ? "decoded"
          : "result";

    return `xavert-base64-${suffix}.txt`;
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

  function downloadResult() {
    if (!resultAvailable || !outputText.value) {
      showMessage("Nothing to download.", "error");
      return;
    }

    const blob = new Blob([outputText.value], {
      type: "text/plain;charset=utf-8"
    });

    downloadBlob(createSafeFilename(), blob);

    showMessage(
      "Download started.",
      "success"
    );
  }

  function clearTool() {
    inputText.value = "";

    hideResult();
    updateInputInformation();

    window.clearTimeout(messageTimer);

    showMessage(
      "Editor cleared.",
      "success"
    );

    messageTimer = window.setTimeout(function () {
      if (
        message &&
        message.textContent === "Editor cleared."
      ) {
        showMessage("", "info", false);
      }
    }, 1800);

    inputText.focus();
  }

  function loadSample() {
    inputText.value = sampleText;

    updateInputInformation();
    encodeBase64();

    inputText.focus();
    inputText.select();
  }

  function invalidateResult() {
    if (!resultAvailable) {
      return;
    }

    hideResult();

    showMessage(
      "Input changed. Run the conversion again.",
      "info",
      false
    );
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

  inputText.addEventListener("keydown", function (event) {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();

      if (isValidBase64(inputText.value)) {
        decodeBase64();
      } else {
        encodeBase64();
      }
    }
  });

  updateInputInformation();
  hideResult();
});
