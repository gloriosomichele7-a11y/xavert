// =====================================
// XAVERT CSS Minifier & Beautifier
// =====================================

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "css-minifier") {
    return;
  }

  const $ = (id) => document.getElementById(id);

  const elements = {
    input: $("inputCss"),
    output: $("outputCss"),
    inputMeta: $("inputMeta"),
    outputMeta: $("outputMeta"),

    preserveComments: $("preserveComments"),
    indentSize: $("indentSize"),

    minifyButton: $("minifyBtn"),
    beautifyButton: $("beautifyBtn"),
    validateButton: $("validateBtn"),
    importButton: $("importBtn"),
    sampleButton: $("sampleBtn"),
    swapButton: $("swapBtn"),
    clearButton: $("clearBtn"),
    copyButton: $("copyBtn"),
    downloadButton: $("downloadBtn"),

    fileInput: $("fileInput"),
    message: $("css-message"),

    inputChars: $("inputChars"),
    outputChars: $("outputChars"),
    inputLines: $("inputLines"),
    ruleCount: $("ruleCount"),
    savedChars: $("savedChars"),
    compression: $("compression"),
  };

  const missingElements = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length > 0) {
    console.error(
      "CSS Minifier initialization failed. Missing elements:",
      missingElements,
    );

    return;
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const SAMPLE_CSS = `/* XAVERT sample stylesheet */

:root {
  --brand-color: #dc2626;
  --page-width: 1100px;
}

body {
  margin: 0;
  background: #f7f8fb;
  color: #111827;
}

.card {
  max-width: var(--page-width);
  margin: 24px auto;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
}

@media (max-width: 768px) {
  .card {
    margin: 16px;
    padding: 18px;
  }
}`;

  let currentOperation = "";

  // --------------------------------------------------
  // UI Helpers
  // --------------------------------------------------

  function setInlineMessage(text = "", type = "info") {
    const allowedTypes = ["success", "error", "info"];

    const safeType = allowedTypes.includes(type) ? type : "info";

    elements.message.textContent = text;
    elements.message.className = "message css-status";

    if (text) {
      elements.message.classList.add(`message-${safeType}`);
    }
  }

  function notify(text = "", type = "info", useToast = true) {
    setInlineMessage(text, type);

    if (text && useToast && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function countLines(value) {
    return value ? value.split(/\r\n?|\n/).length : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value);
  }

  function updateMeta() {
    const input = elements.input.value;
    const output = elements.output.value;

    elements.inputMeta.textContent =
      `${formatNumber(input.length)} characters · ` +
      `${formatNumber(countLines(input))} lines`;

    elements.outputMeta.textContent =
      `${formatNumber(output.length)} characters · ` +
      `${formatNumber(countLines(output))} lines`;
  }

  function countTopLevelRules(css) {
    let count = 0;
    let depth = 0;
    let quote = "";
    let inComment = false;

    for (let index = 0; index < css.length; index += 1) {
      const current = css[index];
      const next = css[index + 1];

      if (inComment) {
        if (current === "*" && next === "/") {
          inComment = false;
          index += 1;
        }

        continue;
      }

      if (!quote && current === "/" && next === "*") {
        inComment = true;
        index += 1;
        continue;
      }

      if (quote) {
        if (current === "\\") {
          index += 1;
          continue;
        }

        if (current === quote) {
          quote = "";
        }

        continue;
      }

      if (current === '"' || current === "'") {
        quote = current;
        continue;
      }

      if (current === "{") {
        if (depth === 0) {
          count += 1;
        }

        depth += 1;
      } else if (current === "}") {
        depth = Math.max(0, depth - 1);
      }
    }

    return count;
  }

  function updateStats() {
    const input = elements.input.value;
    const output = elements.output.value;

    const inputLength = input.length;
    const outputLength = output.length;

    const saved = Math.max(0, inputLength - outputLength);

    const reduction = inputLength > 0 ? (saved / inputLength) * 100 : 0;

    elements.inputChars.textContent = formatNumber(inputLength);

    elements.outputChars.textContent = formatNumber(outputLength);

    elements.inputLines.textContent = formatNumber(countLines(input));

    elements.ruleCount.textContent = formatNumber(
      countTopLevelRules(output || input),
    );

    elements.savedChars.textContent = formatNumber(saved);

    elements.compression.textContent = `${reduction.toFixed(1)}%`;

    const hasOutput = output.length > 0;

    elements.copyButton.disabled = !hasOutput;

    elements.downloadButton.disabled = !hasOutput;

    elements.swapButton.disabled = !hasOutput;

    updateMeta();
  }

  // --------------------------------------------------
  // Validation
  // --------------------------------------------------

  function validateCssStructure(css) {
    const errors = [];
    const braceStack = [];
    const parenthesisStack = [];
    const bracketStack = [];

    let quote = "";
    let quoteStart = -1;
    let inComment = false;
    let commentStart = -1;

    for (let index = 0; index < css.length; index += 1) {
      const current = css[index];
      const next = css[index + 1];

      if (inComment) {
        if (current === "*" && next === "/") {
          inComment = false;
          index += 1;
        }

        continue;
      }

      if (!quote && current === "/" && next === "*") {
        inComment = true;
        commentStart = index;
        index += 1;
        continue;
      }

      if (quote) {
        if (current === "\\") {
          index += 1;
          continue;
        }

        if (current === quote) {
          quote = "";
          quoteStart = -1;
        }

        continue;
      }

      if (current === '"' || current === "'") {
        quote = current;
        quoteStart = index;
        continue;
      }

      if (current === "{") {
        braceStack.push(index);
      } else if (current === "}") {
        if (braceStack.length === 0) {
          errors.push(`Unexpected closing brace at character ${index + 1}.`);
        } else {
          braceStack.pop();
        }
      } else if (current === "(") {
        parenthesisStack.push(index);
      } else if (current === ")") {
        if (parenthesisStack.length === 0) {
          errors.push(
            `Unexpected closing parenthesis at character ${index + 1}.`,
          );
        } else {
          parenthesisStack.pop();
        }
      } else if (current === "[") {
        bracketStack.push(index);
      } else if (current === "]") {
        if (bracketStack.length === 0) {
          errors.push(
            `Unexpected closing square bracket at character ${index + 1}.`,
          );
        } else {
          bracketStack.pop();
        }
      }
    }

    if (inComment) {
      errors.push(
        `Unclosed comment beginning at character ${commentStart + 1}.`,
      );
    }

    if (quote) {
      errors.push(
        `Unclosed quoted string beginning at character ${quoteStart + 1}.`,
      );
    }

    if (braceStack.length > 0) {
      errors.push(
        `${braceStack.length} opening brace` +
          `${braceStack.length === 1 ? "" : "s"} ` +
          `without a matching closing brace.`,
      );
    }

    if (parenthesisStack.length > 0) {
      errors.push(
        `${parenthesisStack.length} opening parenthesis` +
          `${parenthesisStack.length === 1 ? "" : "es"} ` +
          `without a matching closing parenthesis.`,
      );
    }

    if (bracketStack.length > 0) {
      errors.push(
        `${bracketStack.length} opening square bracket` +
          `${bracketStack.length === 1 ? "" : "s"} ` +
          `without a matching closing square bracket.`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // --------------------------------------------------
  // CSS Processing
  // --------------------------------------------------

  function isPreservedComment(content) {
    const normalizedContent = content.toLowerCase();

    return (
      content.startsWith("/*!") ||
      normalizedContent.includes("@license") ||
      normalizedContent.includes("@preserve") ||
      normalizedContent.includes("@copyright")
    );
  }

  function tokenizeCss(css, preserveLicenseComments) {
    const tokens = [];

    let buffer = "";
    let quote = "";
    let inComment = false;
    let comment = "";

    function flushBuffer() {
      if (!buffer) {
        return;
      }

      tokens.push({
        type: "text",
        value: buffer,
      });

      buffer = "";
    }

    for (let index = 0; index < css.length; index += 1) {
      const current = css[index];
      const next = css[index + 1];

      if (inComment) {
        comment += current;

        if (current === "*" && next === "/") {
          comment += next;
          index += 1;
          inComment = false;

          if (preserveLicenseComments && isPreservedComment(comment)) {
            flushBuffer();

            tokens.push({
              type: "comment",
              value: comment,
            });
          }

          comment = "";
        }

        continue;
      }

      if (quote) {
        buffer += current;

        if (current === "\\") {
          if (index + 1 < css.length) {
            buffer += css[index + 1];
            index += 1;
          }

          continue;
        }

        if (current === quote) {
          quote = "";
        }

        continue;
      }

      if (current === "/" && next === "*") {
        flushBuffer();

        inComment = true;
        comment = "/*";
        index += 1;

        continue;
      }

      if (current === '"' || current === "'") {
        quote = current;
        buffer += current;

        continue;
      }

      buffer += current;
    }

    flushBuffer();

    return tokens;
  }

  function minifyTextSegment(segment) {
    let result = "";
    let pendingSpace = false;

    const noSpaceBefore = new Set(["{", "}", ":", ";", ",", ")"]);

    const noSpaceAfter = new Set(["{", "}", ":", ";", ",", "("]);

    for (let index = 0; index < segment.length; index += 1) {
      const current = segment[index];

      if (/\s/.test(current)) {
        pendingSpace = true;
        continue;
      }

      if (pendingSpace && result) {
        const previous = result[result.length - 1];

        if (!noSpaceAfter.has(previous) && !noSpaceBefore.has(current)) {
          result += " ";
        }
      }

      pendingSpace = false;
      result += current;
    }

    return result.trim();
  }

  function minifyCss(css, preserveLicenseComments) {
    const tokens = tokenizeCss(css, preserveLicenseComments);

    return tokens
      .map((token) => {
        if (token.type === "comment") {
          return `${token.value}\n`;
        }

        return minifyTextSegment(token.value);
      })
      .join("")
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  function getIndentUnit() {
    if (elements.indentSize.value === "tab") {
      return "\t";
    }

    return " ".repeat(Number(elements.indentSize.value));
  }

  function beautifyCss(css, preserveLicenseComments) {
    const compact = minifyCss(css, preserveLicenseComments);

    const indentUnit = getIndentUnit();

    let result = "";
    let depth = 0;
    let quote = "";
    let inComment = false;

    function appendIndent() {
      result += indentUnit.repeat(Math.max(0, depth));
    }

    for (let index = 0; index < compact.length; index += 1) {
      const current = compact[index];
      const next = compact[index + 1];

      if (inComment) {
        result += current;

        if (current === "*" && next === "/") {
          result += next;
          index += 1;
          inComment = false;

          result += "\n";
          appendIndent();
        }

        continue;
      }

      if (quote) {
        result += current;

        if (current === "\\") {
          if (index + 1 < compact.length) {
            result += compact[index + 1];
            index += 1;
          }

          continue;
        }

        if (current === quote) {
          quote = "";
        }

        continue;
      }

      if (current === "/" && next === "*") {
        inComment = true;
        result += "/*";
        index += 1;

        continue;
      }

      if (current === '"' || current === "'") {
        quote = current;
        result += current;

        continue;
      }

      if (current === "{") {
        result = result.trimEnd();
        result += " {\n";

        depth += 1;
        appendIndent();

        continue;
      }

      if (current === "}") {
        result = result.trimEnd();
        result += "\n";

        depth = Math.max(0, depth - 1);

        appendIndent();
        result += "}";

        const following = compact[index + 1];

        if (following && following !== ";") {
          result += "\n\n";
          appendIndent();
        }

        continue;
      }

      if (current === ";") {
        result += ";\n";
        appendIndent();

        continue;
      }

      if (current === ",") {
        result += ",";

        if (depth === 0) {
          result += "\n";
          appendIndent();
        } else {
          result += " ";
        }

        continue;
      }

      if (current === ":") {
        result += ": ";
        continue;
      }

      result += current;
    }

    return `${result.trim()}\n`;
  }

  function processCss(operation, { announce = true } = {}) {
    const input = elements.input.value;

    if (!input.trim()) {
      notify("Enter CSS code first.", "error");

      elements.input.focus();
      return;
    }

    const validation = validateCssStructure(input);

    if (!validation.valid) {
      notify(validation.errors[0], "error");

      return;
    }

    const preserveComments = elements.preserveComments.checked;

    try {
      const output =
        operation === "minify"
          ? minifyCss(input, preserveComments)
          : beautifyCss(input, preserveComments);

      elements.output.value = output;
      currentOperation = operation;

      updateStats();

      if (announce) {
        setInlineMessage("Action completed successfully.", "success");

        if (typeof window.showActionSuccess === "function") {
          window.showActionSuccess();
        } else if (typeof window.showMessage === "function") {
          window.showMessage("Action completed successfully.", "success");
        }
      }
    } catch (error) {
      console.error("CSS processing failed:", error);

      notify("The CSS could not be processed.", "error");
    }
  }

  function validateCurrentCss() {
    const input = elements.input.value;

    if (!input.trim()) {
      notify("Enter CSS code first.", "error");

      elements.input.focus();
      return;
    }

    const validation = validateCssStructure(input);

    if (validation.valid) {
      notify("No structural issues detected.", "success");

      return;
    }

    notify(validation.errors[0], "error");
  }

  // --------------------------------------------------
  // File and Output Actions
  // --------------------------------------------------

  async function importCssFile(file) {
    if (!file) {
      return;
    }

    if (file.size === 0) {
      notify("The selected file is empty.", "error");

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      notify("The CSS file must be smaller than 5 MB.", "error");

      return;
    }

    const validType =
      file.type === "text/css" || file.name.toLowerCase().endsWith(".css");

    if (!validType) {
      notify("Select a valid .css file.", "error");

      return;
    }

    try {
      const content = await file.text();

      elements.input.value = content;
      elements.output.value = "";
      currentOperation = "";

      updateStats();

      notify("CSS imported.", "success");

      elements.input.focus();
    } catch (error) {
      console.error("CSS import failed:", error);

      notify("The CSS file could not be read.", "error");
    } finally {
      elements.fileInput.value = "";
    }
  }

  async function copyOutput() {
    const output = elements.output.value;

    if (!output) {
      notify("Nothing to copy.", "error");

      return;
    }

    await xavertCopyText(output);
  }

  function downloadOutput() {
    const output = elements.output.value;

    if (!output) {
      notify("Nothing to download.", "error");

      return;
    }

    const suffix = currentOperation || "processed";

    downloadFile(`xavert-css-${suffix}.css`, output, "text/css;charset=utf-8");
  }

  function moveOutputToInput() {
    const output = elements.output.value;

    if (!output) {
      notify("Nothing to move.", "error");

      return;
    }

    elements.input.value = output;
    elements.output.value = "";
    currentOperation = "";

    updateStats();

    notify("Output moved to input.", "success");

    elements.input.focus();
  }

  function loadSample() {
    elements.input.value = SAMPLE_CSS;
    elements.output.value = "";
    currentOperation = "";

    updateStats();
    processCss("minify", { announce: false });

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    elements.input.focus();
    elements.input.select();
  }

  function clearTool() {
    elements.input.value = "";
    elements.output.value = "";
    elements.fileInput.value = "";
    elements.preserveComments.checked = true;
    elements.indentSize.value = "2";
    currentOperation = "";

    updateStats();
    elements.input.focus();
  }

  // --------------------------------------------------
  // Event Listeners
  // --------------------------------------------------

  elements.input.addEventListener("input", () => {
    if (elements.output.value) {
      elements.output.value = "";
      currentOperation = "";

      setInlineMessage("Input changed. Process the CSS again.", "info");
    }

    updateStats();
  });

  elements.minifyButton.addEventListener("click", () => {
    processCss("minify");
  });

  elements.beautifyButton.addEventListener("click", () => {
    processCss("beautify");
  });

  elements.validateButton.addEventListener("click", validateCurrentCss);

  elements.importButton.addEventListener("click", () => {
    elements.fileInput.click();
  });

  elements.fileInput.addEventListener("change", () => {
    const file = elements.fileInput.files?.[0];

    importCssFile(file);
  });

  elements.sampleButton.addEventListener("click", loadSample);

  elements.swapButton.addEventListener("click", moveOutputToInput);

  elements.clearButton.addEventListener("click", clearTool);

  elements.copyButton.addEventListener("click", copyOutput);

  elements.downloadButton.addEventListener("click", downloadOutput);

  elements.input.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();

    const start = elements.input.selectionStart;

    const end = elements.input.selectionEnd;

    const indentation = getIndentUnit();

    elements.input.setRangeText(indentation, start, end, "end");

    updateStats();
  });

  document.addEventListener("keydown", (event) => {
    const isBeautifyShortcut =
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "b";

    if (isBeautifyShortcut) {
      event.preventDefault();
      processCss("beautify");
    }
  });

  elements.preserveComments.addEventListener("change", () => {
    if (!elements.output.value) {
      return;
    }

    setInlineMessage(
      "Processing options changed. Run the conversion again.",
      "info",
    );

    elements.output.value = "";
    currentOperation = "";

    updateStats();
  });

  elements.indentSize.addEventListener("change", () => {
    if (currentOperation !== "beautify" || !elements.input.value.trim()) {
      return;
    }

    processCss("beautify", { announce: false });
    setInlineMessage("Beautify indentation updated.", "success");
  });

  // --------------------------------------------------
  // Initialization
  // --------------------------------------------------

  updateStats();

  if (!elements.input.value) {
    setInlineMessage("Paste CSS or import a stylesheet to begin.", "info");
  }

  elements.input.focus();
});
