"use strict";

function initLoremIpsumGenerator() {
  const type = document.getElementById("type");
  const quantity = document.getElementById("quantity");
  const startLorem = document.getElementById("startLorem");
  const output = document.getElementById("output");
  const generateBtn = document.getElementById("generateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");
  const paragraphCount = document.getElementById("paragraphCount");
  const message = document.getElementById("message");

  const required = [
    type,
    quantity,
    startLorem,
    output,
    generateBtn,
    sampleBtn,
    clearBtn,
    copyBtn,
    downloadBtn,
    wordCount,
    charCount,
    paragraphCount,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("Lorem Ipsum Generator: HTML and JS do not match.");
    return;
  }

  const loremWords = (
    "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua " +
    "ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure " +
    "dolor in reprehenderit voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non " +
    "proident sunt in culpa qui officia deserunt mollit anim id est laborum"
  ).split(" ");

  const loremOpening =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

  function setInlineMessage(text = "", status = "info") {
    const safeStatus = ["success", "error", "info"].includes(status)
      ? status
      : "info";

    message.textContent = text;
    message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      message.classList.add(`message-${safeStatus}`);
    }
  }

  function notify(text, status = "info") {
    setInlineMessage(text, status);

    if (typeof window.showMessage === "function") {
      window.showMessage(text, status);
    }
  }

  function randomWord() {
    return loremWords[Math.floor(Math.random() * loremWords.length)];
  }

  function createSentence() {
    const length = Math.floor(Math.random() * 10) + 8;
    const words = Array.from({ length }, randomWord);
    const sentence = words.join(" ");

    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
  }

  function createParagraph() {
    const sentenceCount = Math.floor(Math.random() * 4) + 4;

    return Array.from({ length: sentenceCount }, createSentence).join(" ");
  }

  function updateStats(text) {
    const trimmed = text.trim();

    wordCount.textContent = String(trimmed ? trimmed.split(/\s+/).length : 0);
    charCount.textContent = String(Array.from(text).length);
    paragraphCount.textContent = String(
      trimmed ? text.split(/\n\s*\n/).length : 0,
    );
  }

  function resetResult() {
    output.value = "";
    updateStats("");

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function getQuantity() {
    const value = Number(quantity.value);

    if (!Number.isInteger(value) || value < 1 || value > 100) {
      throw new Error("Quantity must be between 1 and 100.");
    }

    return value;
  }

  function generateLorem({ announce = true } = {}) {
    let amount;

    try {
      amount = getQuantity();
    } catch (error) {
      resetResult();
      notify(
        error instanceof Error ? error.message : "Invalid quantity.",
        "error",
      );
      quantity.focus();
      return false;
    }

    let result = "";

    if (type.value === "words") {
      result = Array.from({ length: amount }, randomWord).join(" ");
    } else if (type.value === "sentences") {
      result = Array.from({ length: amount }, createSentence).join(" ");
    } else {
      result = Array.from({ length: amount }, createParagraph).join("\n\n");
    }

    if (startLorem.checked) {
      if (type.value === "paragraphs") {
        const paragraphs = result ? result.split(/\n\s*\n/) : [];

        if (paragraphs.length) {
          paragraphs[0] = `${loremOpening} ${paragraphs[0]}`;
          result = paragraphs.join("\n\n");
        } else {
          result = loremOpening;
        }
      } else {
        result = result ? `${loremOpening} ${result}` : loremOpening;
      }
    }

    output.value = result;
    updateStats(result);

    copyBtn.disabled = !result;
    downloadBtn.disabled = !result;

    if (announce) {
      setInlineMessage("Action completed successfully.", "success");

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    }

    return true;
  }

  function loadSample() {
    type.value = "paragraphs";
    quantity.value = "3";
    startLorem.checked = true;

    resetResult();
    setInlineMessage("");

    const generated = generateLorem({ announce: false });

    if (!generated) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    quantity.focus();
  }

  async function copyOutput() {
    const text = output.value;

    if (!text) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(text);
  }

  function downloadOutput() {
    const text = output.value;

    if (!text) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      `xavert-lorem-${type.value}.txt`,
      text,
      "text/plain;charset=utf-8",
    );
  }

  function clearAll() {
    type.value = "paragraphs";
    quantity.value = quantity.defaultValue || "5";
    startLorem.checked = true;

    resetResult();
    setInlineMessage("");

    quantity.value = "5";
    quantity.focus();
  }

  function invalidateResult() {
    if (output.value) {
      resetResult();
    }

    setInlineMessage("");
  }

  generateBtn.addEventListener("click", generateLorem);
  sampleBtn.addEventListener("click", loadSample);
  clearBtn.addEventListener("click", clearAll);

  copyBtn.addEventListener("click", () => {
    void copyOutput();
  });

  downloadBtn.addEventListener("click", downloadOutput);

  type.addEventListener("change", invalidateResult);
  quantity.addEventListener("input", invalidateResult);
  startLorem.addEventListener("change", invalidateResult);

  resetResult();
}

initLoremIpsumGenerator();
