"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "html-entity-encoder-decoder") {
    return;
  }

  const inputText = document.getElementById("inputText");
  const encodeMode = document.getElementById("encodeMode");

  const encodeBtn = document.getElementById("encodeBtn");
  const decodeBtn = document.getElementById("decodeBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");

  const resultBox = document.getElementById("resultBox");
  const result = document.getElementById("result");

  const charCount = document.getElementById("charCount");
  const entityCount = document.getElementById("entityCount");
  const lineCount = document.getElementById("lineCount");
  const sizeCount = document.getElementById("sizeCount");

  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const message = document.getElementById("message");

  const requiredElements = {
    inputText,
    encodeMode,
    encodeBtn,
    decodeBtn,
    sampleBtn,
    clearBtn,
    resultBox,
    result,
    charCount,
    entityCount,
    lineCount,
    sizeCount,
    copyBtn,
    downloadBtn,
    message,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error(
      "HTML Entity Encoder / Decoder initialization failed.",
      missingElements,
    );
    return;
  }

  const textEncoder = new TextEncoder();

  const NAMED_ENCODINGS = new Map([
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ['"', "&quot;"],
    ["'", "&#39;"],
    ["\u00a0", "&nbsp;"],
    ["©", "&copy;"],
    ["®", "&reg;"],
    ["™", "&trade;"],
    ["€", "&euro;"],
    ["£", "&pound;"],
    ["¥", "&yen;"],
    ["¢", "&cent;"],
    ["§", "&sect;"],
    ["¶", "&para;"],
    ["•", "&bull;"],
    ["–", "&ndash;"],
    ["—", "&mdash;"],
    ["…", "&hellip;"],
    ["×", "&times;"],
    ["÷", "&divide;"],
  ]);

  let currentResult = "";
  let resultAvailable = false;

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

  function notify(text = "", type = "info", useToast = true) {
    setInlineMessage(text, type);

    if (text && useToast && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function shouldEncodeCharacter(character) {
    return NAMED_ENCODINGS.has(character);
  }

  function encodeEntities(text) {
    const mode = encodeMode.value;

    return Array.from(text)
      .map((character) => {
        if (!shouldEncodeCharacter(character)) {
          return character;
        }

        if (mode === "named") {
          return NAMED_ENCODINGS.get(character);
        }

        const codePoint = character.codePointAt(0);

        if (mode === "hex") {
          return `&#x${codePoint.toString(16).toUpperCase()};`;
        }

        return `&#${codePoint};`;
      })
      .join("");
  }

  function decodeEntities(text) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  function countEntities(text) {
    const matches = text.match(/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/gi);
    return matches?.length ?? 0;
  }

  function countLines(text) {
    if (text === "") {
      return 0;
    }

    return text.split(/\r\n|\r|\n/).length;
  }

  function updateStats(output) {
    charCount.textContent = String(Array.from(output).length);
    entityCount.textContent = String(countEntities(output));
    lineCount.textContent = String(countLines(output));
    sizeCount.textContent = String(textEncoder.encode(output).length);
  }

  function updateResultButtons() {
    copyBtn.disabled = !resultAvailable;
    downloadBtn.disabled = !resultAvailable;
  }

  function resetResult() {
    currentResult = "";
    resultAvailable = false;

    result.textContent = "";
    resultBox.hidden = true;

    charCount.textContent = "0";
    entityCount.textContent = "0";
    lineCount.textContent = "0";
    sizeCount.textContent = "0";

    updateResultButtons();
  }

  function invalidateResult() {
    if (resultAvailable) {
      resetResult();
    }

    setInlineMessage("");
  }

  function renderOutput(output, { announce = true } = {}) {
    currentResult = output;
    resultAvailable = true;

    result.textContent = output;
    updateStats(output);

    resultBox.hidden = false;
    updateResultButtons();

    if (announce) {
      setInlineMessage("Action completed successfully.", "success");

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    }
  }

  function encodeText({ announce = true } = {}) {
    const text = inputText.value;

    if (text.length === 0) {
      resetResult();
      notify("Enter text first.", "error", announce);
      inputText.focus();
      return false;
    }

    renderOutput(encodeEntities(text), { announce });
    return true;
  }

  function decodeText({ announce = true } = {}) {
    const text = inputText.value;

    if (text.length === 0) {
      resetResult();
      notify("Enter text first.", "error", announce);
      inputText.focus();
      return false;
    }

    renderOutput(decodeEntities(text), { announce });
    return true;
  }

  function loadSample() {
    inputText.value = '<p title="Tom & Jerry">© XAVERT — €10</p>';
    encodeMode.value = "named";
    resetResult();

    const generated = encodeText({ announce: false });

    if (!generated) {
      return;
    }

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    inputText.focus();
    inputText.select();
  }

  async function copyResult() {
    if (!resultAvailable) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(currentResult);
  }

  function downloadResult() {
    if (!resultAvailable) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-html-entity-result.txt",
      currentResult,
      "text/plain;charset=utf-8",
    );
  }

  function clearTool() {
    inputText.value = "";
    encodeMode.value = "named";

    resetResult();
    setInlineMessage("");

    inputText.focus();
  }

  encodeBtn.addEventListener("click", () => {
    encodeText();
  });

  decodeBtn.addEventListener("click", () => {
    decodeText();
  });

  sampleBtn.addEventListener("click", loadSample);
  clearBtn.addEventListener("click", clearTool);

  copyBtn.addEventListener("click", () => {
    void copyResult();
  });

  downloadBtn.addEventListener("click", downloadResult);

  inputText.addEventListener("input", invalidateResult);
  encodeMode.addEventListener("change", invalidateResult);

  resetResult();
});
