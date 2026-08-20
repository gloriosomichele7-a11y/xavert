"use strict";

function initDiffChecker() {
  const textA = document.getElementById("textA");
  const textB = document.getElementById("textB");
  const ignoreCase = document.getElementById("ignoreCase");
  const ignoreWhitespace = document.getElementById("ignoreWhitespace");
  const ignoreBlankLines = document.getElementById("ignoreBlankLines");
  const compareBtn = document.getElementById("compareBtn");
  const swapBtn = document.getElementById("swapBtn");
  const clearBtn = document.getElementById("clearBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const resultBox = document.getElementById("resultBox");
  const similarityValue = document.getElementById("similarityValue");
  const differenceCount = document.getElementById("differenceCount");
  const lineCountA = document.getElementById("lineCountA");
  const lineCountB = document.getElementById("lineCountB");
  const result = document.getElementById("result");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const message = document.getElementById("message");

  const required = [
    textA,
    textB,
    ignoreCase,
    ignoreWhitespace,
    ignoreBlankLines,
    compareBtn,
    swapBtn,
    clearBtn,
    sampleBtn,
    resultBox,
    similarityValue,
    differenceCount,
    lineCountA,
    lineCountB,
    result,
    copyBtn,
    downloadBtn,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("Text Diff Checker: HTML and JS do not match.");
    return;
  }

  let currentReport = "";

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

  function resetResult() {
    currentReport = "";
    resultBox.hidden = true;
    result.replaceChildren();
    similarityValue.textContent = "0%";
    differenceCount.textContent = "0";
    lineCountA.textContent = "0";
    lineCountB.textContent = "0";
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function normalizeLine(line) {
    let value = line;

    if (ignoreWhitespace.checked) {
      value = value.replace(/\s+/g, " ").trim();
    }

    if (ignoreCase.checked) {
      value = value.toLocaleLowerCase();
    }

    return value;
  }

  function prepareLines(text) {
    const lines = text.split(/\r\n|\r|\n/);

    if (!ignoreBlankLines.checked) {
      return lines;
    }

    return lines.filter((line) => line.trim() !== "");
  }

  function compareLines(linesA, linesB) {
    const maxLength = Math.max(linesA.length, linesB.length);
    const diffs = [];
    let equalCount = 0;

    for (let index = 0; index < maxLength; index += 1) {
      const a = linesA[index] ?? "";
      const b = linesB[index] ?? "";

      if (normalizeLine(a) === normalizeLine(b)) {
        equalCount += 1;
        continue;
      }

      diffs.push({
        line: index + 1,
        a,
        b,
      });
    }

    return {
      diffs,
      similarity:
        maxLength > 0 ? Math.round((equalCount / maxLength) * 100) : 100,
    };
  }

  function renderDiffs(diffs) {
    result.replaceChildren();

    if (!diffs.length) {
      const identical = document.createElement("div");
      identical.className = "diff-identical";
      identical.textContent = "The compared texts are identical.";
      result.append(identical);
      return;
    }

    diffs.forEach((diff) => {
      const entry = document.createElement("div");
      entry.className = "diff-entry";

      const title = document.createElement("div");
      title.className = "diff-entry-title";
      title.textContent = `Difference at line ${diff.line}`;

      const sideA = document.createElement("div");
      sideA.className = "diff-side";

      const labelA = document.createElement("div");
      labelA.className = "diff-side-label";
      labelA.textContent = "Text A";

      const codeA = document.createElement("pre");
      codeA.className = "diff-code";
      codeA.textContent = diff.a || "(empty)";

      const sideB = document.createElement("div");
      sideB.className = "diff-side";

      const labelB = document.createElement("div");
      labelB.className = "diff-side-label";
      labelB.textContent = "Text B";

      const codeB = document.createElement("pre");
      codeB.className = "diff-code";
      codeB.textContent = diff.b || "(empty)";

      if (!diff.a) codeA.classList.add("diff-empty");
      if (!diff.b) codeB.classList.add("diff-empty");

      sideA.append(labelA, codeA);
      sideB.append(labelB, codeB);
      entry.append(title, sideA, sideB);
      result.append(entry);
    });
  }

  function buildReport(linesA, linesB, diffs, similarity) {
    const lines = [
      "XAVERT Text Diff Checker",
      "",
      `Similarity: ${similarity}%`,
      `Differences: ${diffs.length}`,
      `Lines A: ${linesA.length}`,
      `Lines B: ${linesB.length}`,
      "",
    ];

    if (!diffs.length) {
      lines.push("The compared texts are identical.");
      return lines.join("\n");
    }

    diffs.forEach((diff) => {
      lines.push(
        `Line ${diff.line}`,
        `Text A: ${diff.a || "(empty)"}`,
        `Text B: ${diff.b || "(empty)"}`,
        "",
      );
    });

    return lines.join("\n").trimEnd();
  }

  function compareTexts({ announce = true } = {}) {
    const valueA = textA.value;
    const valueB = textB.value;

    if (!valueA && !valueB) {
      resetResult();
      notify("Enter text in at least one field.", "error");
      textA.focus();
      return false;
    }

    const linesA = prepareLines(valueA);
    const linesB = prepareLines(valueB);
    const comparison = compareLines(linesA, linesB);

    similarityValue.textContent = `${comparison.similarity}%`;
    differenceCount.textContent = String(comparison.diffs.length);
    lineCountA.textContent = String(linesA.length);
    lineCountB.textContent = String(linesB.length);

    renderDiffs(comparison.diffs);

    currentReport = buildReport(
      linesA,
      linesB,
      comparison.diffs,
      comparison.similarity,
    );

    resultBox.hidden = false;
    copyBtn.disabled = false;
    downloadBtn.disabled = false;

    if (announce) {
      setInlineMessage("Comparison completed successfully.", "success");

      if (typeof window.showMessage === "function") {
        window.showMessage("Comparison completed successfully.", "success");
      }
    }

    return true;
  }

  function loadSample() {
    textA.value = [
      "XAVERT provides fast browser tools.",
      "Files stay on your device.",
      "No sign-up is required.",
    ].join("\n");

    textB.value = [
      "XAVERT provides fast browser-based tools.",
      "Files stay on your device.",
      "No account is required.",
    ].join("\n");

    ignoreCase.checked = false;
    ignoreWhitespace.checked = false;
    ignoreBlankLines.checked = false;

    resetResult();
    setInlineMessage("");

    if (!compareTexts({ announce: false })) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    textA.focus();
  }

  function swapTexts() {
    const temporary = textA.value;
    textA.value = textB.value;
    textB.value = temporary;

    resetResult();
    setInlineMessage("");
    textA.focus();
  }

  async function copyReport() {
    if (!currentReport) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(currentReport);
  }

  function downloadReport() {
    if (!currentReport) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-text-diff.txt",
      currentReport,
      "text/plain;charset=utf-8",
    );
  }

  function invalidateResult() {
    if (!resultBox.hidden) {
      resetResult();
    }

    setInlineMessage("");
  }

  function clearTool() {
    textA.value = "";
    textB.value = "";
    ignoreCase.checked = false;
    ignoreWhitespace.checked = false;
    ignoreBlankLines.checked = false;

    resetResult();
    setInlineMessage("");
    textA.focus();
  }

  textA.addEventListener("input", invalidateResult);
  textB.addEventListener("input", invalidateResult);

  [ignoreCase, ignoreWhitespace, ignoreBlankLines].forEach((option) => {
    option.addEventListener("change", invalidateResult);
  });

  compareBtn.addEventListener("click", () => {
    compareTexts();
  });

  sampleBtn.addEventListener("click", loadSample);
  swapBtn.addEventListener("click", swapTexts);

  copyBtn.addEventListener("click", () => {
    void copyReport();
  });

  downloadBtn.addEventListener("click", downloadReport);
  clearBtn.addEventListener("click", clearTool);

  resetResult();
}

initDiffChecker();
