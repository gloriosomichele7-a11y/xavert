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
    if (text === "") {
      return [];
    }

    const lines = text.split(/\r\n|\r|\n/);

    if (!ignoreBlankLines.checked) {
      return lines;
    }

    return lines.filter((line) => line.trim() !== "");
  }

  function buildFallbackEditScript(linesA, linesB) {
    const edits = [];
    let prefix = 0;
    let suffixA = linesA.length;
    let suffixB = linesB.length;

    while (
      prefix < suffixA &&
      prefix < suffixB &&
      normalizeLine(linesA[prefix]) === normalizeLine(linesB[prefix])
    ) {
      edits.push({
        type: "equal",
        a: linesA[prefix],
        b: linesB[prefix],
        lineA: prefix + 1,
        lineB: prefix + 1,
      });
      prefix += 1;
    }

    while (
      suffixA > prefix &&
      suffixB > prefix &&
      normalizeLine(linesA[suffixA - 1]) === normalizeLine(linesB[suffixB - 1])
    ) {
      suffixA -= 1;
      suffixB -= 1;
    }

    for (let index = prefix; index < suffixA; index += 1) {
      edits.push({
        type: "delete",
        a: linesA[index],
        lineA: index + 1,
      });
    }

    for (let index = prefix; index < suffixB; index += 1) {
      edits.push({
        type: "insert",
        b: linesB[index],
        lineB: index + 1,
      });
    }

    for (
      let offset = 0;
      suffixA + offset < linesA.length &&
      suffixB + offset < linesB.length;
      offset += 1
    ) {
      edits.push({
        type: "equal",
        a: linesA[suffixA + offset],
        b: linesB[suffixB + offset],
        lineA: suffixA + offset + 1,
        lineB: suffixB + offset + 1,
      });
    }

    return edits;
  }

  function buildEditScript(linesA, linesB) {
    const lengthA = linesA.length;
    const lengthB = linesB.length;
    const maxDepth = lengthA + lengthB;
    const maxSearchDepth = Math.min(maxDepth, 2500);
    const trace = [];

    function frontierValue(snapshot, depth, diagonal) {
      if (
        !snapshot ||
        diagonal < -depth ||
        diagonal > depth ||
        (diagonal + depth) % 2 !== 0
      ) {
        return Number.NEGATIVE_INFINITY;
      }

      const value = snapshot[diagonal + depth];

      return value === -1 ? Number.NEGATIVE_INFINITY : value;
    }

    function backtrack(finalDepth) {
      let x = lengthA;
      let y = lengthB;
      const edits = [];

      for (let depth = finalDepth; depth > 0; depth -= 1) {
        const previousFrontier = trace[depth - 1];
        const diagonal = x - y;
        let previousDiagonal;

        if (
          diagonal === -depth ||
          (diagonal !== depth &&
            frontierValue(previousFrontier, depth - 1, diagonal - 1) <
              frontierValue(previousFrontier, depth - 1, diagonal + 1))
        ) {
          previousDiagonal = diagonal + 1;
        } else {
          previousDiagonal = diagonal - 1;
        }

        const previousX = frontierValue(
          previousFrontier,
          depth - 1,
          previousDiagonal,
        );
        const previousY = previousX - previousDiagonal;

        while (x > previousX && y > previousY) {
          edits.push({
            type: "equal",
            a: linesA[x - 1],
            b: linesB[y - 1],
            lineA: x,
            lineB: y,
          });
          x -= 1;
          y -= 1;
        }

        if (x === previousX) {
          edits.push({
            type: "insert",
            b: linesB[y - 1],
            lineB: y,
          });
          y -= 1;
        } else {
          edits.push({
            type: "delete",
            a: linesA[x - 1],
            lineA: x,
          });
          x -= 1;
        }
      }

      while (x > 0 && y > 0) {
        edits.push({
          type: "equal",
          a: linesA[x - 1],
          b: linesB[y - 1],
          lineA: x,
          lineB: y,
        });
        x -= 1;
        y -= 1;
      }

      while (x > 0) {
        edits.push({
          type: "delete",
          a: linesA[x - 1],
          lineA: x,
        });
        x -= 1;
      }

      while (y > 0) {
        edits.push({
          type: "insert",
          b: linesB[y - 1],
          lineB: y,
        });
        y -= 1;
      }

      return edits.reverse();
    }

    if (maxDepth === 0) {
      return [];
    }

    let previousFrontier = null;

    for (let depth = 0; depth <= maxSearchDepth; depth += 1) {
      const currentFrontier = new Int32Array(2 * depth + 1);
      currentFrontier.fill(-1);

      for (
        let diagonal = -depth;
        diagonal <= depth;
        diagonal += 2
      ) {
        let x;

        if (depth === 0) {
          x = 0;
        } else if (
          diagonal === -depth ||
          (diagonal !== depth &&
            frontierValue(previousFrontier, depth - 1, diagonal - 1) <
              frontierValue(previousFrontier, depth - 1, diagonal + 1))
        ) {
          x = frontierValue(
            previousFrontier,
            depth - 1,
            diagonal + 1,
          );
        } else {
          x =
            frontierValue(
              previousFrontier,
              depth - 1,
              diagonal - 1,
            ) + 1;
        }

        if (!Number.isFinite(x)) {
          x = 0;
        }

        let y = x - diagonal;

        while (
          x < lengthA &&
          y < lengthB &&
          normalizeLine(linesA[x]) === normalizeLine(linesB[y])
        ) {
          x += 1;
          y += 1;
        }

        currentFrontier[diagonal + depth] = x;

        if (x >= lengthA && y >= lengthB) {
          trace.push(currentFrontier);
          return backtrack(depth);
        }
      }

      trace.push(currentFrontier);
      previousFrontier = currentFrontier;
    }

    return buildFallbackEditScript(linesA, linesB);
  }

  function buildDiffEntries(edits) {
    const diffs = [];
    let pending = [];

    function flushPending() {
      if (!pending.length) {
        return;
      }

      const removed = pending.filter((edit) => edit.type === "delete");
      const added = pending.filter((edit) => edit.type === "insert");
      const count = Math.max(removed.length, added.length);

      for (let index = 0; index < count; index += 1) {
        const deletion = removed[index] || null;
        const insertion = added[index] || null;

        if (deletion && insertion) {
          diffs.push({
            type: "changed",
            a: deletion.a,
            b: insertion.b,
            lineA: deletion.lineA,
            lineB: insertion.lineB,
          });
        } else if (deletion) {
          diffs.push({
            type: "removed",
            a: deletion.a,
            b: "",
            lineA: deletion.lineA,
            lineB: null,
          });
        } else if (insertion) {
          diffs.push({
            type: "added",
            a: "",
            b: insertion.b,
            lineA: null,
            lineB: insertion.lineB,
          });
        }
      }

      pending = [];
    }

    edits.forEach((edit) => {
      if (edit.type === "equal") {
        flushPending();
      } else {
        pending.push(edit);
      }
    });

    flushPending();
    return diffs;
  }

  function compareLines(linesA, linesB) {
    if (!linesA.length && !linesB.length) {
      return {
        diffs: [],
        similarity: 100,
      };
    }

    const edits = buildEditScript(linesA, linesB);
    const equalCount = edits.reduce(
      (total, edit) => total + (edit.type === "equal" ? 1 : 0),
      0,
    );
    const denominator = Math.max(linesA.length, linesB.length, 1);

    return {
      diffs: buildDiffEntries(edits),
      similarity: Math.round((equalCount / denominator) * 100),
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

      if (diff.type === "changed") {
        title.textContent = `Changed: line ${diff.lineA} in Text A → line ${diff.lineB} in Text B`;
      } else if (diff.type === "added") {
        title.textContent = `Added at line ${diff.lineB} in Text B`;
      } else {
        title.textContent = `Removed from line ${diff.lineA} in Text A`;
      }

      const sideA = document.createElement("div");
      sideA.className = "diff-side";

      const labelA = document.createElement("div");
      labelA.className = "diff-side-label";
      labelA.textContent = diff.lineA
        ? `Text A · ${diff.lineA}`
        : "Text A";

      const codeA = document.createElement("pre");
      codeA.className = "diff-code";
      codeA.textContent = diff.lineA ? diff.a || "(empty line)" : "(no line)";

      const sideB = document.createElement("div");
      sideB.className = "diff-side";

      const labelB = document.createElement("div");
      labelB.className = "diff-side-label";
      labelB.textContent = diff.lineB
        ? `Text B · ${diff.lineB}`
        : "Text B";

      const codeB = document.createElement("pre");
      codeB.className = "diff-code";
      codeB.textContent = diff.lineB ? diff.b || "(empty line)" : "(no line)";

      if (!diff.lineA || !diff.a) {
        codeA.classList.add("diff-empty");
      }

      if (!diff.lineB || !diff.b) {
        codeB.classList.add("diff-empty");
      }

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
      if (diff.type === "changed") {
        lines.push(
          `Changed: Text A line ${diff.lineA} → Text B line ${diff.lineB}`,
          `Text A: ${diff.a || "(empty line)"}`,
          `Text B: ${diff.b || "(empty line)"}`,
          "",
        );
        return;
      }

      if (diff.type === "added") {
        lines.push(
          `Added: Text B line ${diff.lineB}`,
          "Text A: (no line)",
          `Text B: ${diff.b || "(empty line)"}`,
          "",
        );
        return;
      }

      lines.push(
        `Removed: Text A line ${diff.lineA}`,
        `Text A: ${diff.a || "(empty line)"}`,
        "Text B: (no line)",
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
