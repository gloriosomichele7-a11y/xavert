// =====================================
// XAVERT CSS Minifier
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

  const optionalElementNames = new Set(["indentSize", "beautifyButton"]);

  const missingElements = Object.entries(elements)
    .filter(([name, element]) => !element && !optionalElementNames.has(name))
    .map(([name]) => name);

  if (missingElements.length > 0) {
    console.error(
      "CSS Minifier initialization failed. Missing elements:",
      missingElements,
    );
    return;
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const SAMPLE_CSS = `/*! XAVERT sample stylesheet */

:root {
  --brand-color: #dc2626;
  --gap: calc(1rem + 2vw);
  --fallback-stack: Inter, system-ui, sans-serif;
}

body {
  margin: 0;
  color: var(--brand-color);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E");
}

.card :hover {
  transform: translateY(-2px);
}

.card {
  width: min(100%, 70rem);
  margin: 24px auto;
  padding: var(--gap);
  border: 1px solid color-mix(in srgb, var(--brand-color) 30%, white);
}

@media (width <= 768px) {
  .card {
    margin: 16px;
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

  function notify(text = "", type = "info") {
    setInlineMessage(text, type);

    if (text && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function announceActionSuccess() {
    setInlineMessage("Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
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
      `${formatNumber(Array.from(input).length)} characters · ` +
      `${formatNumber(countLines(input))} lines`;

    elements.outputMeta.textContent =
      `${formatNumber(Array.from(output).length)} characters · ` +
      `${formatNumber(countLines(output))} lines`;
  }

  // --------------------------------------------------
  // Lexical Helpers
  // --------------------------------------------------

  function isIdentifierCharacter(character) {
    return Boolean(character) && /[A-Za-z0-9_-]/.test(character);
  }

  function startsUrlFunction(css, index) {
    if (css.slice(index, index + 4).toLowerCase() !== "url(") {
      return false;
    }

    return !isIdentifierCharacter(css[index - 1]);
  }

  function readQuoted(css, startIndex) {
    const quote = css[startIndex];
    let index = startIndex + 1;

    while (index < css.length) {
      const character = css[index];

      if (character === "\\") {
        index += 2;
        continue;
      }

      if (character === quote) {
        return {
          value: css.slice(startIndex, index + 1),
          endIndex: index,
          closed: true,
        };
      }

      index += 1;
    }

    return {
      value: css.slice(startIndex),
      endIndex: css.length - 1,
      closed: false,
    };
  }

  function readComment(css, startIndex) {
    const closing = css.indexOf("*/", startIndex + 2);

    if (closing === -1) {
      return {
        value: css.slice(startIndex),
        endIndex: css.length - 1,
        closed: false,
      };
    }

    return {
      value: css.slice(startIndex, closing + 2),
      endIndex: closing + 1,
      closed: true,
    };
  }

  function readBalancedParentheses(css, openIndex) {
    let depth = 1;
    let index = openIndex + 1;

    while (index < css.length) {
      const current = css[index];
      const next = css[index + 1];

      if (current === "'" || current === '"') {
        const quoted = readQuoted(css, index);
        index = quoted.endIndex + 1;
        continue;
      }

      if (current === "/" && next === "*") {
        const comment = readComment(css, index);
        index = comment.endIndex + 1;
        continue;
      }

      if (current === "\\") {
        index += 2;
        continue;
      }

      if (current === "(") {
        depth += 1;
      } else if (current === ")") {
        depth -= 1;

        if (depth === 0) {
          return {
            value: css.slice(openIndex, index + 1),
            endIndex: index,
            closed: true,
          };
        }
      }

      index += 1;
    }

    return {
      value: css.slice(openIndex),
      endIndex: css.length - 1,
      closed: false,
    };
  }

  function readUrlFunction(css, startIndex) {
    const openIndex = startIndex + 3;
    const balanced = readBalancedParentheses(css, openIndex);

    return {
      value: css.slice(startIndex, balanced.endIndex + 1),
      endIndex: balanced.endIndex,
      closed: balanced.closed,
    };
  }

  function isPreservedComment(content) {
    const normalized = content.toLowerCase();

    return (
      content.startsWith("/*!") ||
      normalized.includes("@license") ||
      normalized.includes("@preserve") ||
      normalized.includes("@copyright")
    );
  }

  function normalizeRemovedComments(value) {
    let output = "";
    let pendingSpace = false;

    for (let index = 0; index < value.length; index += 1) {
      const current = value[index];
      const next = value[index + 1];

      if (current === "'" || current === '"') {
        if (pendingSpace && output && !/\s$/.test(output)) {
          output += " ";
        }

        pendingSpace = false;
        const quoted = readQuoted(value, index);
        output += quoted.value;
        index = quoted.endIndex;
        continue;
      }

      if (current === "/" && next === "*") {
        const comment = readComment(value, index);
        pendingSpace = true;
        index = comment.endIndex;
        continue;
      }

      if (/\s/.test(current)) {
        pendingSpace = true;
        continue;
      }

      if (pendingSpace && output && !/\s$/.test(output)) {
        output += " ";
      }

      pendingSpace = false;
      output += current;
    }

    if (pendingSpace && output) {
      output += " ";
    }

    return output;
  }

  function readCustomPropertyValue(css, startIndex, preserveLicenseComments) {
    let output = "";
    let index = startIndex;
    let parenthesisDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    while (index < css.length) {
      const current = css[index];
      const next = css[index + 1];

      if (current === "'" || current === '"') {
        const quoted = readQuoted(css, index);
        output += quoted.value;
        index = quoted.endIndex + 1;
        continue;
      }

      if (current === "/" && next === "*") {
        const comment = readComment(css, index);

        if (
          preserveLicenseComments &&
          isPreservedComment(comment.value)
        ) {
          output += comment.value;
        } else {
          const previous = output[output.length - 1] ?? "";
          const following = css[comment.endIndex + 1] ?? "";

          if (
            previous &&
            following &&
            !/\s/.test(previous) &&
            !/\s/.test(following)
          ) {
            output += " ";
          }
        }

        index = comment.endIndex + 1;
        continue;
      }

      if (current === "\\") {
        output += current;

        if (index + 1 < css.length) {
          output += css[index + 1];
          index += 2;
        } else {
          index += 1;
        }

        continue;
      }

      if (current === "(") {
        parenthesisDepth += 1;
      } else if (current === ")" && parenthesisDepth > 0) {
        parenthesisDepth -= 1;
      } else if (current === "[") {
        bracketDepth += 1;
      } else if (current === "]" && bracketDepth > 0) {
        bracketDepth -= 1;
      } else if (current === "{") {
        braceDepth += 1;
      } else if (current === "}" && braceDepth > 0) {
        braceDepth -= 1;
      } else if (
        (current === ";" || current === "}") &&
        parenthesisDepth === 0 &&
        bracketDepth === 0 &&
        braceDepth === 0
      ) {
        break;
      }

      output += current;
      index += 1;
    }

    return {
      value: output,
      endIndex: index - 1,
    };
  }

  function isPropertyName(statement) {
    return /^(?:--[A-Za-z_-][A-Za-z0-9_-]*|-?[A-Za-z_][A-Za-z0-9_-]*)$/.test(
      statement,
    );
  }

  function isCustomPropertyName(statement) {
    return /^--[A-Za-z_-][A-Za-z0-9_-]*$/.test(statement);
  }

  function looksLikeDeclarationAfterColon(css, startIndex) {
    let parenthesisDepth = 0;
    let bracketDepth = 0;

    for (let index = startIndex; index < css.length; index += 1) {
      const current = css[index];
      const next = css[index + 1];

      if (current === "'" || current === '"') {
        const quoted = readQuoted(css, index);
        index = quoted.endIndex;
        continue;
      }

      if (current === "/" && next === "*") {
        const comment = readComment(css, index);
        index = comment.endIndex;
        continue;
      }

      if (startsUrlFunction(css, index)) {
        const url = readUrlFunction(css, index);
        index = url.endIndex;
        continue;
      }

      if (current === "\\") {
        index += 1;
        continue;
      }

      if (current === "(") {
        parenthesisDepth += 1;
        continue;
      }

      if (current === ")" && parenthesisDepth > 0) {
        parenthesisDepth -= 1;
        continue;
      }

      if (current === "[") {
        bracketDepth += 1;
        continue;
      }

      if (current === "]" && bracketDepth > 0) {
        bracketDepth -= 1;
        continue;
      }

      if (parenthesisDepth !== 0 || bracketDepth !== 0) {
        continue;
      }

      if (current === "{") {
        return false;
      }

      if (current === ";" || current === "}") {
        return true;
      }
    }

    return true;
  }

  // --------------------------------------------------
  // Validation
  // --------------------------------------------------

  function validateCssStructure(css) {
    const errors = [];
    const braceStack = [];
    const parenthesisStack = [];
    const bracketStack = [];

    for (let index = 0; index < css.length; index += 1) {
      const current = css[index];
      const next = css[index + 1];

      if (current === "'" || current === '"') {
        const quoted = readQuoted(css, index);

        if (!quoted.closed) {
          errors.push(
            `Unclosed quoted string beginning at character ${index + 1}.`,
          );
          break;
        }

        index = quoted.endIndex;
        continue;
      }

      if (current === "/" && next === "*") {
        const comment = readComment(css, index);

        if (!comment.closed) {
          errors.push(`Unclosed comment beginning at character ${index + 1}.`);
          break;
        }

        index = comment.endIndex;
        continue;
      }

      if (startsUrlFunction(css, index)) {
        const url = readUrlFunction(css, index);

        if (!url.closed) {
          errors.push(`Unclosed url() beginning at character ${index + 1}.`);
          break;
        }

        index = url.endIndex;
        continue;
      }

      if (current === "\\") {
        index += 1;
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

    if (braceStack.length > 0) {
      errors.push(
        `${braceStack.length} opening brace` +
          `${braceStack.length === 1 ? "" : "s"} without a matching closing brace.`,
      );
    }

    if (parenthesisStack.length > 0) {
      errors.push(
        `${parenthesisStack.length} opening parenthesis` +
          `${parenthesisStack.length === 1 ? "" : "es"} without a matching closing parenthesis.`,
      );
    }

    if (bracketStack.length > 0) {
      errors.push(
        `${bracketStack.length} opening square bracket` +
          `${bracketStack.length === 1 ? "" : "s"} without a matching closing square bracket.`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // --------------------------------------------------
  // CSS Minification
  // --------------------------------------------------

  function minifyCss(css, preserveLicenseComments) {
    let result = "";
    let pendingSpace = false;
    let statement = "";
    let suppressNextSpace = false;
    let blockDepth = 0;

    function appendRaw(value) {
      result += value;
      statement += value;
    }

    function shouldKeepPendingSpace(nextCharacter) {
      if (!result || suppressNextSpace) {
        return false;
      }

      const previous = result[result.length - 1];

      if (["{", "}", ";", ","].includes(previous)) {
        return false;
      }

      if (["{", "}", ";", ","].includes(nextCharacter)) {
        return false;
      }

      return true;
    }

    function flushPendingSpace(nextCharacter) {
      if (pendingSpace && shouldKeepPendingSpace(nextCharacter)) {
        result += " ";
        statement += " ";
      }

      pendingSpace = false;
      suppressNextSpace = false;
    }

    for (let index = 0; index < css.length; index += 1) {
      const current = css[index];
      const next = css[index + 1];

      if (/\s/.test(current)) {
        pendingSpace = true;
        continue;
      }

      if (current === "/" && next === "*") {
        const comment = readComment(css, index);

        if (
          preserveLicenseComments &&
          isPreservedComment(comment.value)
        ) {
          flushPendingSpace("/");
          appendRaw(comment.value);
          pendingSpace = true;
        } else {
          pendingSpace = true;
        }

        index = comment.endIndex;
        continue;
      }

      if (current === "'" || current === '"') {
        const quoted = readQuoted(css, index);
        flushPendingSpace(current);
        appendRaw(quoted.value);
        index = quoted.endIndex;
        continue;
      }

      if (startsUrlFunction(css, index)) {
        const url = readUrlFunction(css, index);
        flushPendingSpace("u");
        appendRaw(url.value);
        index = url.endIndex;
        continue;
      }

      if (current === "\\") {
        flushPendingSpace(current);
        appendRaw(current);

        if (index + 1 < css.length) {
          appendRaw(css[index + 1]);
          index += 1;
        }

        continue;
      }

      if (current === ":") {
        const candidate = statement.trim();

        if (
          blockDepth > 0 &&
          isPropertyName(candidate) &&
          (isCustomPropertyName(candidate) ||
            looksLikeDeclarationAfterColon(css, index + 1))
        ) {
          // Whitespace around a declaration colon is never needed. Do not apply
          // this rule to selector pseudo-classes, where a preceding space can be
          // semantically meaningful (for example: `.card :hover`).
          pendingSpace = false;
          result += ":";
          statement += ":";
          suppressNextSpace = true;

          if (isCustomPropertyName(candidate)) {
            const customValue = readCustomPropertyValue(
              css,
              index + 1,
              preserveLicenseComments,
            );

            result += customValue.value;
            statement += customValue.value;
            index = customValue.endIndex;
          }

          continue;
        }
      }

      if (current === "{") {
        pendingSpace = false;
        result = result.trimEnd();
        result += "{";
        blockDepth += 1;
        statement = "";
        suppressNextSpace = false;
        continue;
      }

      if (current === "}") {
        pendingSpace = false;
        result = result.trimEnd();
        result += "}";
        blockDepth = Math.max(0, blockDepth - 1);
        statement = "";
        suppressNextSpace = false;
        continue;
      }

      if (current === ";") {
        pendingSpace = false;
        result = result.trimEnd();
        result += ";";
        statement = "";
        suppressNextSpace = false;
        continue;
      }

      if (current === ",") {
        pendingSpace = false;
        result = result.trimEnd();
        result += ",";
        statement += ",";
        suppressNextSpace = true;
        continue;
      }

      flushPendingSpace(current);
      appendRaw(current);
    }

    return result.trim();
  }

  // --------------------------------------------------
  // CSS Beautification
  // --------------------------------------------------

  function getIndentUnit() {
    const selectedIndent = elements.indentSize?.value ?? "2";

    if (selectedIndent === "tab") {
      return "\t";
    }

    const size = Number(selectedIndent);
    return " ".repeat(Number.isFinite(size) && size > 0 ? size : 2);
  }

  function beautifyCss(css, preserveLicenseComments) {
    const compact = minifyCss(css, preserveLicenseComments);
    const indentUnit = getIndentUnit();

    let result = "";
    let depth = 0;
    let pendingSpace = false;
    let statement = "";

    function indent() {
      return indentUnit.repeat(Math.max(0, depth));
    }

    function append(value) {
      result += value;
      statement += value;
    }

    function ensureSingleSpace() {
      if (result && !/[\s\n]$/.test(result)) {
        result += " ";
        statement += " ";
      }
    }

    function newline() {
      result = result.replace(/[ \t]+$/g, "");

      if (!result.endsWith("\n")) {
        result += "\n";
      }

      result += indent();
      pendingSpace = false;
    }

    for (let index = 0; index < compact.length; index += 1) {
      const current = compact[index];
      const next = compact[index + 1];

      if (/\s/.test(current)) {
        pendingSpace = true;
        continue;
      }

      if (current === "/" && next === "*") {
        const comment = readComment(compact, index);

        if (pendingSpace) {
          ensureSingleSpace();
        }

        append(comment.value);
        pendingSpace = false;
        index = comment.endIndex;
        continue;
      }

      if (current === "'" || current === '"') {
        const quoted = readQuoted(compact, index);

        if (pendingSpace) {
          ensureSingleSpace();
        }

        append(quoted.value);
        pendingSpace = false;
        index = quoted.endIndex;
        continue;
      }

      if (startsUrlFunction(compact, index)) {
        const url = readUrlFunction(compact, index);

        if (pendingSpace) {
          ensureSingleSpace();
        }

        append(url.value);
        pendingSpace = false;
        index = url.endIndex;
        continue;
      }

      if (current === "\\") {
        if (pendingSpace) {
          ensureSingleSpace();
        }

        append(current);

        if (index + 1 < compact.length) {
          append(compact[index + 1]);
          index += 1;
        }

        pendingSpace = false;
        continue;
      }

      if (current === ":") {
        const candidate = statement.trim();

        if (
          depth > 0 &&
          isPropertyName(candidate) &&
          (isCustomPropertyName(candidate) ||
            looksLikeDeclarationAfterColon(compact, index + 1))
        ) {
          result = result.trimEnd();
          result += ": ";
          statement = `${candidate}: `;
          pendingSpace = false;

          if (isCustomPropertyName(candidate)) {
            const customValue = readCustomPropertyValue(
              compact,
              index + 1,
              preserveLicenseComments,
            );

            const normalizedValue = normalizeRemovedComments(customValue.value);
            result += normalizedValue;
            statement += normalizedValue;
            index = customValue.endIndex;
          }

          continue;
        }
      }

      if (current === "{") {
        result = result.trimEnd();
        result += " {\n";
        depth += 1;
        result += indent();
        statement = "";
        pendingSpace = false;
        continue;
      }

      if (current === "}") {
        result = result.trimEnd();

        if (!result.endsWith("\n")) {
          result += "\n";
        }

        depth = Math.max(0, depth - 1);
        result += `${indent()}}`;
        statement = "";
        pendingSpace = false;

        const following = compact[index + 1];

        if (following) {
          result += "\n";
          result += indent();
        }

        continue;
      }

      if (current === ";") {
        result = result.trimEnd();
        result += ";";
        statement = "";
        newline();
        continue;
      }

      if (current === ",") {
        result = result.trimEnd();
        result += ", ";
        statement += ", ";
        pendingSpace = false;
        continue;
      }

      if (pendingSpace) {
        ensureSingleSpace();
      }

      pendingSpace = false;
      append(current);
    }

    return `${result.trim()}\n`;
  }

  // --------------------------------------------------
  // Statistics
  // --------------------------------------------------

  function countTopLevelRules(css) {
    let count = 0;
    let depth = 0;

    for (let index = 0; index < css.length; index += 1) {
      const current = css[index];
      const next = css[index + 1];

      if (current === "'" || current === '"') {
        const quoted = readQuoted(css, index);
        index = quoted.endIndex;
        continue;
      }

      if (current === "/" && next === "*") {
        const comment = readComment(css, index);
        index = comment.endIndex;
        continue;
      }

      if (startsUrlFunction(css, index)) {
        const url = readUrlFunction(css, index);
        index = url.endIndex;
        continue;
      }

      if (current === "\\") {
        index += 1;
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

    const inputLength = Array.from(input).length;
    const outputLength = Array.from(output).length;
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

  function resetOutput(message = "") {
    elements.output.value = "";
    currentOperation = "";
    updateStats();
    setInlineMessage(message, message ? "info" : "info");
  }

  // --------------------------------------------------
  // Processing Actions
  // --------------------------------------------------

  function processCss(operation, { announce = true } = {}) {
    const input = elements.input.value;

    if (!input.trim()) {
      notify("Enter CSS code first.", "error");
      elements.input.focus();
      return false;
    }

    const validation = validateCssStructure(input);

    if (!validation.valid) {
      resetOutput();
      notify(validation.errors[0], "error");
      return false;
    }

    const preserveComments = elements.preserveComments.checked;

    try {
      const output =
        operation === "beautify"
          ? beautifyCss(input, preserveComments)
          : minifyCss(input, preserveComments);

      elements.output.value = output;
      currentOperation = operation;
      updateStats();

      if (announce) {
        announceActionSuccess();
      }

      return true;
    } catch (error) {
      console.error("CSS processing failed:", error);
      resetOutput();
      notify("The CSS could not be processed safely.", "error");
      return false;
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
      resetOutput();
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

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(output);
  }

  function downloadOutput() {
    const output = elements.output.value;

    if (!output) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    const suffix = currentOperation || "processed";

    window.downloadFile(
      `xavert-css-${suffix}.css`,
      output,
      "text/css;charset=utf-8",
    );
  }

  function moveOutputToInput() {
    const output = elements.output.value;

    if (!output) {
      notify("Nothing to move.", "error");
      return;
    }

    elements.input.value = output;
    resetOutput();
    notify("Output moved to input.", "success");
    elements.input.focus();
  }

  function loadSample() {
    elements.input.value = SAMPLE_CSS;
    resetOutput();
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
    if (elements.indentSize) {
      elements.indentSize.value = "2";
    }
    currentOperation = "";
    setInlineMessage("");
    updateStats();
    elements.input.focus();
  }

  // --------------------------------------------------
  // Event Listeners
  // --------------------------------------------------

  elements.input.addEventListener("input", () => {
    if (elements.output.value) {
      resetOutput("Input changed. Process the CSS again.");
    } else {
      updateStats();
    }
  });

  elements.minifyButton.addEventListener("click", () => {
    processCss("minify");
  });

  elements.beautifyButton?.addEventListener("click", () => {
    processCss("beautify");
  });

  elements.validateButton.addEventListener("click", validateCurrentCss);

  elements.importButton.addEventListener("click", () => {
    elements.fileInput.click();
  });

  elements.fileInput.addEventListener("change", () => {
    void importCssFile(elements.fileInput.files?.[0]);
  });

  elements.sampleButton.addEventListener("click", loadSample);
  elements.swapButton.addEventListener("click", moveOutputToInput);
  elements.clearButton.addEventListener("click", clearTool);
  elements.copyButton.addEventListener("click", () => {
    void copyOutput();
  });
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

    if (isBeautifyShortcut && elements.beautifyButton) {
      event.preventDefault();
      processCss("beautify");
    }
  });

  elements.preserveComments.addEventListener("change", () => {
    if (!elements.output.value) {
      return;
    }

    resetOutput("Processing options changed. Process the CSS again.");
  });

  elements.indentSize?.addEventListener("change", () => {
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
