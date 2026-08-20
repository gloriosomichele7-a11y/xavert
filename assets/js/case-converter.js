"use strict";

function initCaseConverter() {
  const inputText = document.getElementById("inputText");
  const outputText = document.getElementById("outputText");
  const caseType = document.getElementById("caseType");
  const titleStyle = document.getElementById("titleStyle");

  const convertBtn = document.getElementById("convertBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const swapBtn = document.getElementById("swapBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const resultBox = document.getElementById("resultBox");
  const inputChars = document.getElementById("inputChars");
  const outputChars = document.getElementById("outputChars");
  const wordCount = document.getElementById("wordCount");
  const lineCount = document.getElementById("lineCount");
  const message = document.getElementById("message");

  const required = [
    inputText,
    outputText,
    caseType,
    titleStyle,
    convertBtn,
    sampleBtn,
    swapBtn,
    clearBtn,
    copyBtn,
    downloadBtn,
    resultBox,
    inputChars,
    outputChars,
    wordCount,
    lineCount,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("Case Converter: HTML and JS do not match.");
    return;
  }

  const smallTitleWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "for",
    "from",
    "in",
    "nor",
    "of",
    "on",
    "or",
    "the",
    "to",
    "up",
    "via",
    "with",
    "yet",
  ]);

  function setInlineMessage(text = "", type = "info") {
    const safeType = ["success", "error", "info"].includes(type)
      ? type
      : "info";

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

  function notify(text, type = "info") {
    setInlineMessage(text, type);

    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function clearPersistentMessage() {
    setInlineMessage("");
  }

  function announceActionSuccess() {
    setInlineMessage("Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
    }
  }

  function getWords(text) {
    return (
      text
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .match(/[\p{L}\p{N}]+/gu) || []
    );
  }

  function capitalize(word) {
    const chars = Array.from(word.toLocaleLowerCase());

    if (!chars.length) {
      return "";
    }

    chars[0] = chars[0].toLocaleUpperCase();
    return chars.join("");
  }

  function toSentenceCase(text) {
    const lower = text.toLocaleLowerCase();
    let capitalizeNext = true;

    return Array.from(lower)
      .map((char) => {
        if (capitalizeNext && /\p{L}/u.test(char)) {
          capitalizeNext = false;
          return char.toLocaleUpperCase();
        }

        if (/[.!?…]/u.test(char)) {
          capitalizeNext = true;
        }

        return char;
      })
      .join("");
  }

  function toTitleCase(text, headline = false) {
    const words = text.split(/(\s+)/);
    const lexicalIndexes = words
      .map((part, index) => (/\S/.test(part) ? index : -1))
      .filter((index) => index >= 0);

    const firstIndex = lexicalIndexes[0];
    const lastIndex = lexicalIndexes[lexicalIndexes.length - 1];

    return words
      .map((part, index) => {
        if (!/\S/.test(part)) {
          return part;
        }

        const normalized = part
          .toLocaleLowerCase()
          .replace(
            /(^|[-/])([\p{L}\p{N}])/gu,
            (match, separator, character) =>
              `${separator}${character.toLocaleUpperCase()}`,
          );

        if (
          headline &&
          index !== firstIndex &&
          index !== lastIndex &&
          smallTitleWords.has(part.toLocaleLowerCase())
        ) {
          return part.toLocaleLowerCase();
        }

        return normalized;
      })
      .join("");
  }

  function convertIdentifier(text, separator, mode) {
    const words = getWords(text);

    if (!words.length) {
      return "";
    }

    if (mode === "camel") {
      return words
        .map((word, index) =>
          index === 0 ? word.toLocaleLowerCase() : capitalize(word),
        )
        .join("");
    }

    if (mode === "pascal") {
      return words.map(capitalize).join("");
    }

    const normalized =
      mode === "upper"
        ? words.map((word) => word.toLocaleUpperCase())
        : words.map((word) => word.toLocaleLowerCase());

    return normalized.join(separator);
  }

  function alternatingCase(text) {
    let upper = false;

    return Array.from(text)
      .map((char) => {
        if (!/\p{L}/u.test(char)) {
          return char;
        }

        upper = !upper;
        return upper ? char.toLocaleLowerCase() : char.toLocaleUpperCase();
      })
      .join("");
  }

  function inverseCase(text) {
    return Array.from(text)
      .map((char) => {
        if (char === char.toLocaleUpperCase()) {
          return char.toLocaleLowerCase();
        }

        return char.toLocaleUpperCase();
      })
      .join("");
  }

  function convertValue(text) {
    switch (caseType.value) {
      case "lower":
        return text.toLocaleLowerCase();

      case "upper":
        return text.toLocaleUpperCase();

      case "sentence":
        return toSentenceCase(text);

      case "title":
        return toTitleCase(text, titleStyle.value === "headline");

      case "capitalized":
        return text.replace(/[\p{L}\p{N}]+/gu, (word) => capitalize(word));

      case "camel":
        return convertIdentifier(text, "", "camel");

      case "pascal":
        return convertIdentifier(text, "", "pascal");

      case "snake":
        return convertIdentifier(text, "_", "lower");

      case "screaming-snake":
      case "constant":
        return convertIdentifier(text, "_", "upper");

      case "kebab":
        return convertIdentifier(text, "-", "lower");

      case "screaming-kebab":
        return convertIdentifier(text, "-", "upper");

      case "dot":
        return convertIdentifier(text, ".", "lower");

      case "path":
        return convertIdentifier(text, "/", "lower");

      case "alternating":
        return alternatingCase(text);

      case "inverse":
        return inverseCase(text);

      default:
        return text;
    }
  }

  function updateStats(input, output) {
    inputChars.textContent = String(Array.from(input).length);
    outputChars.textContent = String(Array.from(output).length);
    wordCount.textContent = String(getWords(input).length);
    lineCount.textContent = String(
      output ? output.split(/\r\n|\r|\n/).length : 0,
    );
  }

  function resetResult() {
    outputText.value = "";
    resultBox.hidden = true;

    inputChars.textContent = String(Array.from(inputText.value).length);
    outputChars.textContent = "0";
    wordCount.textContent = String(getWords(inputText.value).length);
    lineCount.textContent = "0";

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    swapBtn.disabled = true;
  }

  function convertCase({ announce = true } = {}) {
    const text = inputText.value;

    if (!text.trim()) {
      resetResult();
      notify("Enter or paste text first.", "error");
      inputText.focus();
      return false;
    }

    const converted = convertValue(text);

    outputText.value = converted;
    resultBox.hidden = false;

    updateStats(text, converted);

    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    swapBtn.disabled = false;

    if (announce) {
      announceActionSuccess();
    }

    return true;
  }

  function loadSample() {
    inputText.value =
      "xavert browser tools make text conversion fast and simple for developers and writers.";

    caseType.value = "title";
    titleStyle.value = "headline";

    resetResult();
    clearPersistentMessage();

    const converted = convertCase({ announce: false });

    if (!converted) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    inputText.focus();
  }

  function useResultAsInput() {
    if (!outputText.value) {
      notify("Nothing to move to input.", "error");
      return;
    }

    inputText.value = outputText.value;
    resetResult();
    clearPersistentMessage();
    inputText.focus();
  }

  async function copyResult() {
    if (!outputText.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(outputText.value);
  }

  function downloadResult() {
    if (!outputText.value) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-case-converted.txt",
      outputText.value,
      "text/plain;charset=utf-8",
    );
  }

  function invalidateResult() {
    if (!resultBox.hidden) {
      resetResult();
    } else {
      inputChars.textContent = String(Array.from(inputText.value).length);
      wordCount.textContent = String(getWords(inputText.value).length);
    }

    clearPersistentMessage();
  }

  function syncTitleStyle() {
    titleStyle.disabled = caseType.value !== "title";
    invalidateResult();
  }

  function clearTool() {
    inputText.value = "";
    outputText.value = "";
    caseType.value = "sentence";
    titleStyle.value = "standard";

    resetResult();
    clearPersistentMessage();
    syncTitleStyle();

    inputText.focus();
  }

  inputText.addEventListener("input", invalidateResult);
  caseType.addEventListener("change", syncTitleStyle);
  titleStyle.addEventListener("change", invalidateResult);

  convertBtn.addEventListener("click", () => {
    convertCase();
  });

  sampleBtn.addEventListener("click", loadSample);
  swapBtn.addEventListener("click", useResultAsInput);

  copyBtn.addEventListener("click", () => {
    void copyResult();
  });

  downloadBtn.addEventListener("click", downloadResult);
  clearBtn.addEventListener("click", clearTool);

  resetResult();
  syncTitleStyle();
}

initCaseConverter();
