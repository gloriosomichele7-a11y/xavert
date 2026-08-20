"use strict";

function initHtmlMinifierBeautifier() {
  const inputHtml = document.getElementById("inputHtml");
  const outputHtml = document.getElementById("outputHtml");
  const minifyBtn = document.getElementById("minifyBtn");
  const beautifyBtn = document.getElementById("beautifyBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const swapBtn = document.getElementById("swapBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const inputChars = document.getElementById("inputChars");
  const outputChars = document.getElementById("outputChars");
  const savedChars = document.getElementById("savedChars");
  const compression = document.getElementById("compression");
  const lineCount = document.getElementById("lineCount");
  const operationType = document.getElementById("operationType");
  const message = document.getElementById("message");

  const required = [
    inputHtml,
    outputHtml,
    minifyBtn,
    beautifyBtn,
    sampleBtn,
    swapBtn,
    clearBtn,
    copyBtn,
    downloadBtn,
    inputChars,
    outputChars,
    savedChars,
    compression,
    lineCount,
    operationType,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("HTML Minifier & Beautifier: HTML and JS do not match.");
    return;
  }

  let lastOperation = "";

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

  function countLines(text) {
    return text ? text.split(/\r\n|\r|\n/).length : 0;
  }

  function updateStats() {
    const inputLength = Array.from(inputHtml.value).length;
    const outputLength = Array.from(outputHtml.value).length;
    const saved = Math.max(inputLength - outputLength, 0);
    const percent =
      inputLength > 0 ? Math.round((saved / inputLength) * 100) : 0;

    inputChars.textContent = String(inputLength);
    outputChars.textContent = String(outputLength);
    savedChars.textContent = String(saved);
    compression.textContent = `${percent}%`;
    lineCount.textContent = String(countLines(inputHtml.value));
    operationType.textContent = lastOperation || "—";
  }

  function resetOutput() {
    outputHtml.value = "";
    lastOperation = "";
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    swapBtn.disabled = true;
    updateStats();
  }

  function protectBlocks(html) {
    const protectedBlocks = [];

    const placeholder = html.replace(
      /<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
      (match) => {
        const token = `___XAVERT_BLOCK_${protectedBlocks.length}___`;
        protectedBlocks.push(match);
        return token;
      },
    );

    return { placeholder, protectedBlocks };
  }

  function restoreBlocks(html, protectedBlocks) {
    return html.replace(
      /___XAVERT_BLOCK_(\d+)___/g,
      (match, index) => protectedBlocks[Number(index)] ?? match,
    );
  }

  function minifyHtmlText(html) {
    const { placeholder, protectedBlocks } = protectBlocks(html);

    const minified = placeholder
      .replace(/<!--(?!\[if)[\s\S]*?-->/gi, "")
      .replace(/>\s+</g, "><")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .trim();

    return restoreBlocks(minified, protectedBlocks);
  }

  function beautifyHtmlText(html) {
    const source = html.trim();

    if (!source) {
      return "";
    }

    const tokens =
      source.match(
        /<!DOCTYPE[\s\S]*?>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<pre\b[\s\S]*?<\/pre\s*>|<textarea\b[\s\S]*?<\/textarea\s*>|<\/?[a-zA-Z][^>]*>|[^<]+/gi,
      ) || [];

    const voidTags = new Set([
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "input",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr",
    ]);

    const rawTextTags = new Set(["script", "style", "pre", "textarea"]);

    const lines = [];
    let indent = 0;

    function pushLine(value, level = indent) {
      const text = String(value).trim();

      if (!text) {
        return;
      }

      lines.push(`${"  ".repeat(Math.max(level, 0))}${text}`);
    }

    tokens.forEach((token) => {
      const trimmed = token.trim();

      if (!trimmed) {
        return;
      }

      if (
        /^<!DOCTYPE/i.test(trimmed) ||
        /^<!--/.test(trimmed) ||
        /^<\?/.test(trimmed) ||
        /^<!\[CDATA\[/.test(trimmed)
      ) {
        pushLine(trimmed);
        return;
      }

      const rawMatch = trimmed.match(
        /^<(script|style|pre|textarea)\b([^>]*)>([\s\S]*?)<\/\1\s*>$/i,
      );

      if (rawMatch) {
        const tagName = rawMatch[1].toLowerCase();
        const attributes = rawMatch[2] || "";
        const content = rawMatch[3];

        pushLine(`<${tagName}${attributes}>`);

        if (content.trim()) {
          content
            .replace(/^\n+|\n+$/g, "")
            .split(/\r\n|\r|\n/)
            .forEach((line) => {
              if (rawTextTags.has(tagName)) {
                lines.push(`${"  ".repeat(indent + 1)}${line}`);
              }
            });
        }

        pushLine(`</${tagName}>`);
        return;
      }

      const closingMatch = trimmed.match(/^<\/([a-zA-Z][\w:-]*)\s*>$/);

      if (closingMatch) {
        indent = Math.max(indent - 1, 0);
        pushLine(trimmed);
        return;
      }

      const openingMatch = trimmed.match(/^<([a-zA-Z][\w:-]*)(?:\s[^>]*)?>$/);

      if (openingMatch) {
        const tagName = openingMatch[1].toLowerCase();
        const selfClosing = /\/>$/.test(trimmed);

        pushLine(trimmed);

        if (!selfClosing && !voidTags.has(tagName)) {
          indent += 1;
        }

        return;
      }

      pushLine(trimmed);
    });

    return lines.join("\n");
  }

  function processHtml(mode, { announce = true } = {}) {
    const input = inputHtml.value;

    if (!input.trim()) {
      resetOutput();
      notify("Paste HTML first.", "error");
      inputHtml.focus();
      return false;
    }

    const processed =
      mode === "beautify" ? beautifyHtmlText(input) : minifyHtmlText(input);

    outputHtml.value = processed;
    lastOperation = mode === "beautify" ? "Beautify" : "Minify";

    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    swapBtn.disabled = false;

    updateStats();

    if (announce) {
      const text =
        mode === "beautify"
          ? "HTML beautified successfully."
          : "HTML minified successfully.";

      setInlineMessage(text, "success");

      if (typeof window.showMessage === "function") {
        window.showMessage(text, "success");
      }
    }

    return true;
  }

  function loadSample() {
    inputHtml.value = [
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      '    <meta charset="UTF-8" />',
      "    <title>XAVERT Sample</title>",
      "  </head>",
      "  <body>",
      '    <main class="container">',
      "      <h1>XAVERT</h1>",
      "      <p>Fast browser-based tools.</p>",
      "    </main>",
      "  </body>",
      "</html>",
    ].join("\n");

    resetOutput();
    setInlineMessage("");

    if (!processHtml("minify", { announce: false })) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    inputHtml.focus();
  }

  function swapOutput() {
    if (!outputHtml.value) {
      notify("Nothing to move to input.", "error");
      return;
    }

    inputHtml.value = outputHtml.value;
    resetOutput();
    setInlineMessage("");
    inputHtml.focus();
  }

  async function copyOutput() {
    if (!outputHtml.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(outputHtml.value);
  }

  function downloadOutput() {
    if (!outputHtml.value) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-processed.html",
      outputHtml.value,
      "text/html;charset=utf-8",
    );
  }

  function invalidateOutput() {
    if (outputHtml.value) {
      resetOutput();
    } else {
      updateStats();
    }

    setInlineMessage("");
  }

  function clearTool() {
    inputHtml.value = "";
    resetOutput();
    setInlineMessage("");
    inputHtml.focus();
  }

  inputHtml.addEventListener("input", invalidateOutput);

  minifyBtn.addEventListener("click", () => {
    processHtml("minify");
  });

  beautifyBtn.addEventListener("click", () => {
    processHtml("beautify");
  });

  sampleBtn.addEventListener("click", loadSample);
  swapBtn.addEventListener("click", swapOutput);

  copyBtn.addEventListener("click", () => {
    void copyOutput();
  });

  downloadBtn.addEventListener("click", downloadOutput);
  clearBtn.addEventListener("click", clearTool);

  resetOutput();
}

initHtmlMinifierBeautifier();
