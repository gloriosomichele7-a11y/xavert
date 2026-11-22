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
    // Choose a marker absent from the actual input. Fixed markers can collide
    // with user text and accidentally replace that text with a script/block.
    let marker = "___XAVERT_BLOCK_";
    while (html.includes(marker)) {
      marker += "_";
    }

    const placeholder = html.replace(
      /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(pre|textarea|script|style|xmp|code|svg|math|title)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>/gi,
      (match) => {
        const token = `${marker}${protectedBlocks.length}___`;
        protectedBlocks.push(match);
        return token;
      },
    );

    return { placeholder, protectedBlocks, marker };
  }

  function restoreBlocks(html, protectedBlocks, marker) {
    const tokenPattern = new RegExp(`${marker}(\\d+)___`, "g");
    return html.replace(
      tokenPattern,
      (match, index) => protectedBlocks[Number(index)] ?? match,
    );
  }

  function splitMarkupAndText(html) {
    const segments = [];
    let textStart = 0;
    let index = 0;

    function isMarkupStart(position) {
      const next = html[position + 1] || "";
      return /[A-Za-z!/?]/.test(next);
    }

    while (index < html.length) {
      if (html[index] !== "<" || !isMarkupStart(index)) {
        index += 1;
        continue;
      }

      if (index > textStart) {
        segments.push({ type: "text", value: html.slice(textStart, index) });
      }

      const markupStart = index;
      let quote = "";
      index += 1;

      while (index < html.length) {
        const character = html[index];

        if (quote) {
          if (character === quote) {
            quote = "";
          }
        } else if (character === '"' || character === "'") {
          quote = character;
        } else if (character === ">") {
          index += 1;
          break;
        }

        index += 1;
      }

      segments.push({ type: "markup", value: html.slice(markupStart, index) });
      textStart = index;
    }

    if (textStart < html.length) {
      segments.push({ type: "text", value: html.slice(textStart) });
    }

    return segments;
  }

  // Only change whitespace at block-tag boundaries. Text-node whitespace can
  // be meaningful with CSS white-space rules, inline elements, or user content.
  const blockTags = new Set([
    "html", "head", "body", "main", "div", "section", "article",
    "header", "footer", "nav", "aside", "form", "fieldset",
    "ul", "ol", "li", "dl", "dt", "dd", "table", "thead",
    "tbody", "tfoot", "tr", "td", "th", "p", "h1", "h2",
    "h3", "h4", "h5", "h6", "blockquote", "figure", "figcaption",
    "details", "summary",
  ]);
  const voidTags = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);

  function getBlockTag(segment) {
    if (!segment || segment.type !== "markup") {
      return null;
    }
    const match = segment.value.match(/^<\/?([A-Za-z][\w:-]*)\b/);
    if (!match || !blockTags.has(match[1].toLowerCase())) {
      return null;
    }
    return {
      name: match[1].toLowerCase(),
      closing: /^<\//.test(segment.value),
      selfClosing: /\/\s*>$/.test(segment.value),
    };
  }

  function minifyHtmlText(html) {
    const { placeholder, protectedBlocks, marker } = protectBlocks(html);
    const segments = splitMarkupAndText(placeholder);

    const minified = segments.map((segment, index) => {
      if (
        segment.type === "text" &&
        !segment.value.trim() &&
        getBlockTag(segments[index - 1]) &&
        getBlockTag(segments[index + 1])
      ) {
        return "";
      }
      return segment.value;
    }).join("").trim();

    return restoreBlocks(minified, protectedBlocks, marker);
  }

  function beautifyHtmlText(html) {
    if (!html.trim()) {
      return "";
    }

    // Do not split or indent text-bearing inline markup: this would add text
    // nodes (and can change the visible contents of <p>, <span>, <textarea>). 
    const { placeholder, protectedBlocks, marker } = protectBlocks(html);
    const segments = splitMarkupAndText(placeholder);
    let result = "";
    let depth = 0;
    let pendingBlockWhitespace = false;
    let previousBlock = false;

    segments.forEach((segment, index) => {
      if (segment.type === "text") {
        const betweenBlocks =
          !segment.value.trim() &&
          getBlockTag(segments[index - 1]) &&
          getBlockTag(segments[index + 1]);

        if (betweenBlocks) {
          pendingBlockWhitespace = true;
        } else {
          result += segment.value;
          previousBlock = false;
          pendingBlockWhitespace = false;
        }
        return;
      }

      const info = getBlockTag(segment);
      if (info?.closing) {
        depth = Math.max(0, depth - 1);
      }

      if (info && previousBlock && result) {
        result += `\n${"  ".repeat(depth)}`;
      } else if (pendingBlockWhitespace) {
        result += " ";
      }

      result += segment.value;
      pendingBlockWhitespace = false;
      previousBlock = Boolean(info);

      if (info && !info.closing && !info.selfClosing && !voidTags.has(info.name)) {
        depth += 1;
      }
    });

    return restoreBlocks(result.trim(), protectedBlocks, marker);
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
