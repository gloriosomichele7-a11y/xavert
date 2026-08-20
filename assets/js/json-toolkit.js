"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "json-toolkit") return;

  const $ = (id) => document.getElementById(id);

  const jsonInput = $("jsonInput");
  const jsonOutput = $("jsonOutput");
  const jsonFile = $("jsonFile");
  const dropZone = $("dropZone");
  const fileInfo = $("fileInfo");

  const formatBtn = $("formatBtn");
  const minifyBtn = $("minifyBtn");
  const validateBtn = $("validateBtn");
  const sampleBtn = $("sampleBtn");
  const clearMainBtn = $("clearMainBtn");
  const copyMainBtn = $("copyMainBtn");
  const downloadMainBtn = $("downloadMainBtn");

  const jsonStats = $("jsonStats");
  const jsonType = $("jsonType");
  const jsonStructure = $("jsonStructure");
  const jsonLines = $("jsonLines");
  const jsonChars = $("jsonChars");
  const mainMessage = $("mainMessage");

  const escapeInput = $("escapeInput");
  const escapeOutput = $("escapeOutput");
  const escapeBtn = $("escapeBtn");
  const unescapeBtn = $("unescapeBtn");
  const clearEscapeBtn = $("clearEscapeBtn");
  const copyEscapeBtn = $("copyEscapeBtn");
  const downloadEscapeBtn = $("downloadEscapeBtn");
  const escapeMessage = $("escapeMessage");

  const compareA = $("compareA");
  const compareB = $("compareB");
  const compareBtn = $("compareBtn");
  const compareSampleBtn = $("compareSampleBtn");
  const clearCompareBtn = $("clearCompareBtn");
  const compareResult = $("compareResult");
  const compareMessage = $("compareMessage");

  const required = [
    jsonInput,
    jsonOutput,
    jsonFile,
    dropZone,
    fileInfo,
    formatBtn,
    minifyBtn,
    validateBtn,
    sampleBtn,
    clearMainBtn,
    copyMainBtn,
    downloadMainBtn,
    jsonStats,
    jsonType,
    jsonStructure,
    jsonLines,
    jsonChars,
    mainMessage,
    escapeInput,
    escapeOutput,
    escapeBtn,
    unescapeBtn,
    clearEscapeBtn,
    copyEscapeBtn,
    downloadEscapeBtn,
    escapeMessage,
    compareA,
    compareB,
    compareBtn,
    compareSampleBtn,
    clearCompareBtn,
    compareResult,
    compareMessage,
  ];

  if (required.some((element) => !element)) {
    console.error("JSON Toolkit initialization failed.");
    return;
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  let mainOperation = "";
  let mainResultAvailable = false;

  function setMessage(element, text = "", type = "info") {
    element.textContent = text;
    element.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      element.classList.add(`message-${type}`);
    }
  }

  function notify(element, text, type = "info", toast = true) {
    setMessage(element, text, type);

    if (toast && text && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function parseJson(text) {
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid JSON.",
      };
    }
  }

  function getJsonType(value) {
    if (value === null) return "Null";
    if (Array.isArray(value)) return "Array";

    const type = typeof value;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function getJsonStructure(value) {
    if (Array.isArray(value)) {
      return `${value.length} item${value.length === 1 ? "" : "s"}`;
    }

    if (value && typeof value === "object") {
      const count = Object.keys(value).length;
      return `${count} key${count === 1 ? "" : "s"}`;
    }

    return "Scalar";
  }

  function updateStats(text, value) {
    jsonType.textContent = getJsonType(value);
    jsonStructure.textContent = getJsonStructure(value);
    jsonLines.textContent = String(
      text === "" ? 0 : text.split(/\r\n|\r|\n/).length,
    );
    jsonChars.textContent = String(Array.from(text).length);
    jsonStats.hidden = false;
  }

  function resetMainResult() {
    jsonOutput.value = "";
    jsonStats.hidden = true;

    jsonType.textContent = "—";
    jsonStructure.textContent = "—";
    jsonLines.textContent = "0";
    jsonChars.textContent = "0";

    mainOperation = "";
    mainResultAvailable = false;

    copyMainBtn.disabled = true;
    downloadMainBtn.disabled = true;
  }

  function getParsedMainInput() {
    const text = jsonInput.value.trim();

    if (!text) {
      notify(mainMessage, "Please enter JSON data.", "error");
      jsonInput.focus();
      return null;
    }

    const parsed = parseJson(text);

    if (!parsed.ok) {
      resetMainResult();
      notify(mainMessage, `Invalid JSON: ${parsed.error}`, "error");
      return null;
    }

    return parsed;
  }

  function renderMainResult(
    output,
    value,
    operation,
    messageText,
    toast = true,
  ) {
    jsonOutput.value = output;
    updateStats(output, value);

    mainOperation = operation;
    mainResultAvailable = true;

    copyMainBtn.disabled = false;
    downloadMainBtn.disabled = false;

    notify(mainMessage, messageText, "success", toast);
  }

  function formatJson() {
    const parsed = getParsedMainInput();
    if (!parsed) return;

    renderMainResult(
      JSON.stringify(parsed.value, null, 2),
      parsed.value,
      "format",
      "Action completed successfully.",
      false,
    );

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
    }
  }

  function minifyJson() {
    const parsed = getParsedMainInput();
    if (!parsed) return;

    renderMainResult(
      JSON.stringify(parsed.value),
      parsed.value,
      "minify",
      "JSON minified successfully.",
    );
  }

  function validateJson() {
    const parsed = getParsedMainInput();
    if (!parsed) return;

    const output = [
      "Valid JSON",
      `Top-level type: ${getJsonType(parsed.value)}`,
      `Structure: ${getJsonStructure(parsed.value)}`,
    ].join("\n");

    jsonOutput.value = output;
    updateStats(jsonInput.value, parsed.value);

    mainOperation = "validate";
    mainResultAvailable = true;

    copyMainBtn.disabled = false;
    downloadMainBtn.disabled = false;

    notify(mainMessage, "JSON is valid.", "success");
  }

  function invalidateMainResult() {
    if (mainResultAvailable) {
      resetMainResult();
    }

    setMessage(mainMessage);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  async function loadJsonFile(file) {
    if (!file) {
      fileInfo.textContent = "No file selected";
      return;
    }

    if (file.size === 0) {
      notify(mainMessage, "The selected file is empty.", "error");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      notify(mainMessage, "The JSON file must be smaller than 10 MB.", "error");
      return;
    }

    try {
      const text = await file.text();

      if (!text.trim()) {
        throw new Error("Empty file.");
      }

      jsonInput.value = text;
      fileInfo.textContent = `${file.name} • ${formatFileSize(file.size)}`;

      resetMainResult();
      notify(mainMessage, "JSON file loaded successfully.", "success");
    } catch (error) {
      console.error("JSON file read failed:", error);
      notify(mainMessage, "Unable to read file.", "error");
    }
  }

  function loadSampleJson() {
    jsonInput.value = JSON.stringify(
      {
        name: "XAVERT",
        type: "JSON Toolkit",
        version: 1,
        features: ["format", "minify", "validate", "compare"],
        active: true,
      },
      null,
      2,
    );

    jsonFile.value = "";
    fileInfo.textContent = "No file selected";

    resetMainResult();
    formatJson();

    setMessage(mainMessage, "Sample loaded successfully.", "success");

    if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    jsonInput.focus();
  }

  async function copyMainResult() {
    if (!mainResultAvailable || !jsonOutput.value) {
      notify(mainMessage, "Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify(mainMessage, "Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(jsonOutput.value);
  }

  function downloadMainResult() {
    if (!mainResultAvailable || !jsonOutput.value) {
      notify(mainMessage, "Nothing to download.", "error");
      return;
    }

    const names = {
      format: "xavert-json-formatted.json",
      minify: "xavert-json-minified.json",
      validate: "xavert-json-validation.txt",
    };

    const mimeType =
      mainOperation === "validate"
        ? "text/plain;charset=utf-8"
        : "application/json;charset=utf-8";

    if (typeof window.downloadFile !== "function") {
      notify(mainMessage, "Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      names[mainOperation] ?? "xavert-json-result.txt",
      jsonOutput.value,
      mimeType,
    );
  }

  function clearMain() {
    jsonInput.value = "";
    jsonFile.value = "";
    fileInfo.textContent = "No file selected";

    resetMainResult();
    setMessage(mainMessage);
    jsonInput.focus();
  }

  function escapeJsonText() {
    if (!escapeInput.value) {
      notify(escapeMessage, "Please enter text to escape.", "error");
      return;
    }

    escapeOutput.value = JSON.stringify(escapeInput.value).slice(1, -1);
    notify(escapeMessage, "Text escaped successfully.", "success");
  }

  function unescapeJsonText() {
    if (!escapeInput.value) {
      notify(escapeMessage, "Please enter text to unescape.", "error");
      return;
    }

    try {
      escapeOutput.value = JSON.parse(`"${escapeInput.value}"`);
      notify(escapeMessage, "Text unescaped successfully.", "success");
    } catch (error) {
      console.error("JSON unescape failed:", error);
      notify(escapeMessage, "Invalid escaped text.", "error");
    }
  }

  async function copyEscapeResult() {
    if (!escapeOutput.value) {
      notify(escapeMessage, "Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify(escapeMessage, "Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(escapeOutput.value);
  }

  function downloadEscapeResult() {
    if (!escapeOutput.value) {
      notify(escapeMessage, "Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify(escapeMessage, "Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-json-escaped.txt",
      escapeOutput.value,
      "text/plain;charset=utf-8",
    );
  }

  function clearEscape() {
    escapeInput.value = "";
    escapeOutput.value = "";
    setMessage(escapeMessage);
    escapeInput.focus();
  }

  function flattenJson(value, prefix = "$", output = new Map()) {
    if (value === null || typeof value !== "object") {
      output.set(prefix, value);
      return output;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        output.set(prefix, []);
        return output;
      }

      value.forEach((item, index) => {
        flattenJson(item, `${prefix}[${index}]`, output);
      });

      return output;
    }

    const keys = Object.keys(value);

    if (keys.length === 0) {
      output.set(prefix, {});
      return output;
    }

    keys.forEach((key) => {
      const suffix = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
        ? `.${key}`
        : `[${JSON.stringify(key)}]`;

      flattenJson(value[key], `${prefix}${suffix}`, output);
    });

    return output;
  }

  function createDiffItem(type, path, valueA, valueB) {
    const article = document.createElement("article");
    const title = document.createElement("strong");
    const value = document.createElement("pre");

    article.className = `json-diff-item json-diff-${type}`;
    title.className = "json-diff-title";
    value.className = "json-diff-value";

    title.textContent = `${type.charAt(0).toUpperCase()}${type.slice(1)}: ${path}`;

    if (type === "changed") {
      value.textContent = `A: ${JSON.stringify(valueA)}\nB: ${JSON.stringify(valueB)}`;
    } else {
      value.textContent = JSON.stringify(type === "added" ? valueB : valueA);
    }

    article.append(title, value);
    return article;
  }

  function compareJson() {
    const aText = compareA.value.trim();
    const bText = compareB.value.trim();

    if (!aText || !bText) {
      compareResult.hidden = true;
      compareResult.replaceChildren();
      notify(compareMessage, "Please enter both JSON values.", "error");
      return;
    }

    const parsedA = parseJson(aText);
    const parsedB = parseJson(bText);

    if (!parsedA.ok || !parsedB.ok) {
      compareResult.hidden = true;
      compareResult.replaceChildren();
      notify(compareMessage, "Invalid JSON in one or both inputs.", "error");
      return;
    }

    const flatA = flattenJson(parsedA.value);
    const flatB = flattenJson(parsedB.value);

    const paths = [...new Set([...flatA.keys(), ...flatB.keys()])].sort();
    const fragment = document.createDocumentFragment();

    let changes = 0;

    paths.forEach((path) => {
      const hasA = flatA.has(path);
      const hasB = flatB.has(path);

      if (!hasB) {
        changes += 1;
        fragment.append(createDiffItem("removed", path, flatA.get(path)));
        return;
      }

      if (!hasA) {
        changes += 1;
        fragment.append(
          createDiffItem("added", path, undefined, flatB.get(path)),
        );
        return;
      }

      if (JSON.stringify(flatA.get(path)) !== JSON.stringify(flatB.get(path))) {
        changes += 1;
        fragment.append(
          createDiffItem("changed", path, flatA.get(path), flatB.get(path)),
        );
      }
    });

    compareResult.replaceChildren();

    if (changes === 0) {
      const identical = document.createElement("div");
      identical.className = "result-box";
      identical.textContent = "No differences found.";
      compareResult.append(identical);
    } else {
      compareResult.append(fragment);
    }

    compareResult.hidden = false;

    notify(
      compareMessage,
      changes === 0
        ? "No differences found."
        : `${changes} difference${changes === 1 ? "" : "s"} found.`,
      "success",
    );
  }

  function loadCompareSample() {
    compareA.value = JSON.stringify(
      { name: "XAVERT", version: 1, active: true },
      null,
      2,
    );

    compareB.value = JSON.stringify(
      { name: "XAVERT", version: 2, active: true, plan: "pro" },
      null,
      2,
    );

    compareResult.hidden = true;
    compareResult.replaceChildren();

    compareJson();
    setMessage(compareMessage, "Sample loaded successfully.", "success");

    if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    compareA.focus();
  }

  function clearCompare() {
    compareA.value = "";
    compareB.value = "";
    compareResult.hidden = true;
    compareResult.replaceChildren();
    setMessage(compareMessage);
    compareA.focus();
  }

  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      jsonFile.click();
    }
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    const files = event.dataTransfer?.files;

    if (!files?.length) return;

    if (files.length !== 1) {
      notify(mainMessage, "Drop exactly one JSON file.", "error");
      return;
    }

    void loadJsonFile(files[0]);
  });

  jsonFile.addEventListener("change", () => {
    void loadJsonFile(jsonFile.files?.[0] ?? null);
  });

  jsonInput.addEventListener("input", invalidateMainResult);

  escapeInput.addEventListener("input", () => {
    escapeOutput.value = "";
    setMessage(escapeMessage);
  });

  const invalidateCompare = () => {
    compareResult.hidden = true;
    compareResult.replaceChildren();
    setMessage(compareMessage);
  };

  compareA.addEventListener("input", invalidateCompare);
  compareB.addEventListener("input", invalidateCompare);

  formatBtn.addEventListener("click", formatJson);
  minifyBtn.addEventListener("click", minifyJson);
  validateBtn.addEventListener("click", validateJson);
  sampleBtn.addEventListener("click", loadSampleJson);
  clearMainBtn.addEventListener("click", clearMain);

  copyMainBtn.addEventListener("click", () => void copyMainResult());
  downloadMainBtn.addEventListener("click", downloadMainResult);

  escapeBtn.addEventListener("click", escapeJsonText);
  unescapeBtn.addEventListener("click", unescapeJsonText);
  clearEscapeBtn.addEventListener("click", clearEscape);
  copyEscapeBtn.addEventListener("click", () => void copyEscapeResult());
  downloadEscapeBtn.addEventListener("click", downloadEscapeResult);

  compareBtn.addEventListener("click", compareJson);
  compareSampleBtn.addEventListener("click", loadCompareSample);
  clearCompareBtn.addEventListener("click", clearCompare);

  resetMainResult();
  compareResult.hidden = true;
});
