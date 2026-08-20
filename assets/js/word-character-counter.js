"use strict";

function initWordCharacterCounter() {
  const inputText = document.getElementById("inputText");

  const analyzeBtn = document.getElementById("analyzeBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");

  const resultBox = document.getElementById("resultBox");
  const message = document.getElementById("message");

  const wordCount = document.getElementById("wordCount");
  const characterCount = document.getElementById("characterCount");
  const characterNoSpacesCount = document.getElementById(
    "characterNoSpacesCount",
  );
  const sentenceCount = document.getElementById("sentenceCount");
  const paragraphCount = document.getElementById("paragraphCount");
  const lineCount = document.getElementById("lineCount");

  const spaceCount = document.getElementById("spaceCount");
  const uniqueWordCount = document.getElementById("uniqueWordCount");
  const averageWordLength = document.getElementById("averageWordLength");
  const readingTime = document.getElementById("readingTime");
  const speakingTime = document.getElementById("speakingTime");
  const byteCount = document.getElementById("byteCount");

  const required = [
    inputText,
    analyzeBtn,
    sampleBtn,
    copyBtn,
    clearBtn,
    resultBox,
    message,
    wordCount,
    characterCount,
    characterNoSpacesCount,
    sentenceCount,
    paragraphCount,
    lineCount,
    spaceCount,
    uniqueWordCount,
    averageWordLength,
    readingTime,
    speakingTime,
    byteCount,
  ];

  if (required.some((element) => !element)) {
    console.error("Word & Character Counter: HTML and JS do not match.");
    return;
  }

  const encoder = new TextEncoder();

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

  function resetStats() {
    wordCount.textContent = "0";
    characterCount.textContent = "0";
    characterNoSpacesCount.textContent = "0";
    sentenceCount.textContent = "0";
    paragraphCount.textContent = "0";
    lineCount.textContent = "0";

    spaceCount.textContent = "0";
    uniqueWordCount.textContent = "0";
    averageWordLength.textContent = "0";
    readingTime.textContent = "0 sec";
    speakingTime.textContent = "0 sec";
    byteCount.textContent = "0";

    resultBox.hidden = true;
    copyBtn.disabled = !inputText.value;
  }

  function getWords(text) {
    return text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || [];
  }

  function countSentences(text) {
    const trimmed = text.trim();

    if (!trimmed) {
      return 0;
    }

    const matches = trimmed.match(/[^.!?…]+[.!?…]+(?:["'’”)\]]+)?|[^.!?…]+$/g);

    return matches ? matches.filter((item) => item.trim()).length : 0;
  }

  function countParagraphs(text) {
    const trimmed = text.trim();

    if (!trimmed) {
      return 0;
    }

    return trimmed
      .split(/\n\s*\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean).length;
  }

  function countLines(text) {
    if (!text) {
      return 0;
    }

    return text.split(/\r\n|\r|\n/).length;
  }

  function formatDurationFromWords(words, wordsPerMinute) {
    if (!words) {
      return "0 sec";
    }

    const seconds = Math.max(1, Math.round((words / wordsPerMinute) * 60));

    if (seconds < 60) {
      return `${seconds} sec`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    return remainder ? `${minutes} min ${remainder} sec` : `${minutes} min`;
  }

  function analyzeText({ announce = true } = {}) {
    const text = inputText.value;

    if (!text.trim()) {
      resetStats();
      notify("Enter or paste text first.", "error");
      inputText.focus();
      return false;
    }

    const words = getWords(text);
    const normalizedWords = words.map((word) => word.toLocaleLowerCase());

    const characters = Array.from(text).length;
    const charactersNoSpaces = Array.from(text.replace(/\s/g, "")).length;
    const spaces = (text.match(/ /g) || []).length;
    const totalWordCharacters = words.reduce(
      (total, word) => total + Array.from(word).length,
      0,
    );

    const average = words.length > 0 ? totalWordCharacters / words.length : 0;

    wordCount.textContent = String(words.length);
    characterCount.textContent = String(characters);
    characterNoSpacesCount.textContent = String(charactersNoSpaces);
    sentenceCount.textContent = String(countSentences(text));
    paragraphCount.textContent = String(countParagraphs(text));
    lineCount.textContent = String(countLines(text));

    spaceCount.textContent = String(spaces);
    uniqueWordCount.textContent = String(new Set(normalizedWords).size);
    averageWordLength.textContent = average.toFixed(1);
    readingTime.textContent = formatDurationFromWords(words.length, 200);
    speakingTime.textContent = formatDurationFromWords(words.length, 130);
    byteCount.textContent = String(encoder.encode(text).length);

    resultBox.hidden = false;
    copyBtn.disabled = false;

    if (announce) {
      announceActionSuccess();
    }

    return true;
  }

  function loadSample() {
    inputText.value =
      "XAVERT provides fast browser-based tools for developers, writers and everyday tasks.\n\n" +
      "This sample demonstrates word count, character count, sentences, paragraphs, reading time and other useful text statistics.";

    resetStats();
    clearPersistentMessage();

    const analyzed = analyzeText({ announce: false });

    if (!analyzed) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    inputText.focus();
  }

  async function copyText() {
    if (!inputText.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(inputText.value);
  }

  function invalidateResult() {
    if (!resultBox.hidden) {
      resetStats();
    } else {
      copyBtn.disabled = !inputText.value;
    }

    clearPersistentMessage();
  }

  function clearTool() {
    inputText.value = "";

    resetStats();
    copyBtn.disabled = true;
    clearPersistentMessage();

    inputText.focus();
  }

  inputText.addEventListener("input", invalidateResult);

  analyzeBtn.addEventListener("click", () => {
    analyzeText();
  });

  sampleBtn.addEventListener("click", loadSample);

  copyBtn.addEventListener("click", () => {
    void copyText();
  });

  clearBtn.addEventListener("click", clearTool);

  resetStats();
}

initWordCharacterCounter();
