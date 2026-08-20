"use strict";

function initMarkdownEditor() {
  const markdownInput = document.getElementById("markdownInput");
  const previewBox = document.getElementById("previewBox");
  const updateBtn = document.getElementById("updateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyMarkdownBtn = document.getElementById("copyMarkdownBtn");
  const copyHtmlBtn = document.getElementById("copyHtmlBtn");
  const downloadMarkdownBtn = document.getElementById("downloadMarkdownBtn");
  const downloadHtmlBtn = document.getElementById("downloadHtmlBtn");

  const wordCount = document.getElementById("wordCount");
  const charCount = document.getElementById("charCount");
  const lineCount = document.getElementById("lineCount");
  const headingCount = document.getElementById("headingCount");
  const readingTime = document.getElementById("readingTime");
  const message = document.getElementById("message");

  const required = [
    markdownInput,
    previewBox,
    updateBtn,
    sampleBtn,
    clearBtn,
    copyMarkdownBtn,
    copyHtmlBtn,
    downloadMarkdownBtn,
    downloadHtmlBtn,
    wordCount,
    charCount,
    lineCount,
    headingCount,
    readingTime,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("Markdown Editor: HTML and JS do not match.");
    return;
  }

  let currentHtml = "";

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

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeUrl(url) {
    const value = url.trim();

    if (!value) {
      return "";
    }

    if (
      /^(https?:|mailto:|tel:)/i.test(value) ||
      value.startsWith("/") ||
      value.startsWith("./") ||
      value.startsWith("../") ||
      value.startsWith("#")
    ) {
      return value;
    }

    return "";
  }

  function parseInline(source) {
    let text = escapeHtml(source);

    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    text = text.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, rawUrl) => {
      const safeUrl = sanitizeUrl(rawUrl.replace(/&amp;/g, "&"));

      if (!safeUrl) {
        return label;
      }

      return (
        `<a href="${escapeHtml(safeUrl)}" ` +
        'target="_blank" rel="noopener noreferrer">' +
        `${label}</a>`
      );
    });

    return text;
  }

  function isTableSeparator(line) {
    const trimmed = line.trim();

    if (!trimmed.includes("|")) {
      return false;
    }

    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  }

  function splitTableRow(row) {
    const cells = row.split("|").map((cell) => cell.trim());

    if (cells[0] === "") {
      cells.shift();
    }

    if (cells[cells.length - 1] === "") {
      cells.pop();
    }

    return cells;
  }

  function parseTable(lines, startIndex) {
    const headerCells = splitTableRow(lines[startIndex]);
    const separatorCells = splitTableRow(lines[startIndex + 1]);

    if (
      headerCells.length === 0 ||
      headerCells.length !== separatorCells.length ||
      !separatorCells.every((cell) => /^:?-{3,}:?$/.test(cell))
    ) {
      return null;
    }

    const rows = [];
    let index = startIndex + 2;

    while (
      index < lines.length &&
      lines[index].trim() &&
      lines[index].includes("|")
    ) {
      rows.push(splitTableRow(lines[index]));
      index += 1;
    }

    let html = "<table><thead><tr>";

    headerCells.forEach((cell) => {
      html += `<th>${parseInline(cell)}</th>`;
    });

    html += "</tr></thead><tbody>";

    rows.forEach((row) => {
      html += "<tr>";

      headerCells.forEach((_, cellIndex) => {
        html += `<td>${parseInline(row[cellIndex] ?? "")}</td>`;
      });

      html += "</tr>";
    });

    html += "</tbody></table>";

    return {
      html,
      nextIndex: index,
    };
  }

  function markdownToHtml(markdown) {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");

    let html = "";
    let inUnorderedList = false;
    let inOrderedList = false;
    let inCodeBlock = false;
    let codeBuffer = [];

    function closeLists() {
      if (inUnorderedList) {
        html += "</ul>";
        inUnorderedList = false;
      }

      if (inOrderedList) {
        html += "</ol>";
        inOrderedList = false;
      }
    }

    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index];
      const trimmed = rawLine.trim();

      if (trimmed.startsWith("```")) {
        if (!inCodeBlock) {
          closeLists();
          inCodeBlock = true;
          codeBuffer = [];
        } else {
          html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
          inCodeBlock = false;
          codeBuffer = [];
        }

        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(rawLine);
        continue;
      }

      if (!trimmed) {
        closeLists();
        continue;
      }

      if (
        index + 1 < lines.length &&
        rawLine.includes("|") &&
        isTableSeparator(lines[index + 1])
      ) {
        closeLists();

        const table = parseTable(lines, index);

        if (table) {
          html += table.html;
          index = table.nextIndex - 1;
          continue;
        }
      }

      const headingMatch = rawLine.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        closeLists();

        const level = headingMatch[1].length;
        html += `<h${level}>${parseInline(headingMatch[2])}</h${level}>`;

        continue;
      }

      if (rawLine.startsWith("> ")) {
        closeLists();
        html += `<blockquote>${parseInline(rawLine.slice(2))}</blockquote>`;
        continue;
      }

      const unorderedMatch = rawLine.match(/^\s*[-*+]\s+(.+)$/);

      if (unorderedMatch) {
        if (inOrderedList) {
          html += "</ol>";
          inOrderedList = false;
        }

        if (!inUnorderedList) {
          html += "<ul>";
          inUnorderedList = true;
        }

        let itemText = unorderedMatch[1];

        if (/^\[x\]\s+/i.test(itemText)) {
          html += `<li><input type="checkbox" checked disabled> ${parseInline(itemText.replace(/^\[x\]\s+/i, ""))}</li>`;
        } else if (/^\[\s\]\s+/.test(itemText)) {
          html += `<li><input type="checkbox" disabled> ${parseInline(itemText.replace(/^\[\s\]\s+/, ""))}</li>`;
        } else {
          html += `<li>${parseInline(itemText)}</li>`;
        }

        continue;
      }

      const orderedMatch = rawLine.match(/^\s*\d+\.\s+(.+)$/);

      if (orderedMatch) {
        if (inUnorderedList) {
          html += "</ul>";
          inUnorderedList = false;
        }

        if (!inOrderedList) {
          html += "<ol>";
          inOrderedList = true;
        }

        html += `<li>${parseInline(orderedMatch[1])}</li>`;
        continue;
      }

      closeLists();
      html += `<p>${parseInline(rawLine)}</p>`;
    }

    closeLists();

    if (inCodeBlock) {
      html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
    }

    return html;
  }

  function updateStats(text) {
    const trimmed = text.trim();

    const words = trimmed ? trimmed.split(/\s+/).length : 0;

    wordCount.textContent = String(words);
    charCount.textContent = String(Array.from(text).length);
    lineCount.textContent = String(
      text ? text.replace(/\r\n?/g, "\n").split("\n").length : 0,
    );

    const headings = text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .filter((line) => /^(#{1,6})\s+/.test(line)).length;

    headingCount.textContent = String(headings);

    readingTime.textContent =
      words > 0 ? `${Math.max(1, Math.ceil(words / 200))} min` : "0 min";
  }

  function renderPreview(showMessage = false) {
    const text = markdownInput.value;

    currentHtml = markdownToHtml(text);

    if (currentHtml) {
      previewBox.innerHTML = currentHtml;
    } else {
      previewBox.replaceChildren();

      const placeholder = document.createElement("p");
      placeholder.textContent = "Live preview will appear here.";
      placeholder.className = "message-info";

      previewBox.append(placeholder);
    }

    updateStats(text);

    copyMarkdownBtn.disabled = !text;
    copyHtmlBtn.disabled = !currentHtml;
    downloadMarkdownBtn.disabled = !text;
    downloadHtmlBtn.disabled = !currentHtml;

    if (showMessage) {
      setInlineMessage("Action completed successfully.", "success");

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    }
  }

  async function copyMarkdown() {
    const text = markdownInput.value;

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

  async function copyHtml() {
    if (!currentHtml) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(currentHtml);
  }

  function downloadMarkdown() {
    const text = markdownInput.value;

    if (!text) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-markdown-document.md",
      text,
      "text/markdown;charset=utf-8",
    );
  }

  function downloadHtml() {
    if (!currentHtml) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    const documentHtml = [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '  <meta charset="UTF-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      "  <title>XAVERT Markdown Export</title>",
      "</head>",
      "<body>",
      currentHtml,
      "</body>",
      "</html>",
    ].join("\n");

    window.downloadFile(
      "xavert-markdown-export.html",
      documentHtml,
      "text/html;charset=utf-8",
    );
  }

  function loadSample() {
    markdownInput.value = `# XAVERT Markdown Editor

Write **Markdown** and preview it instantly.

## Features

- Live preview
- Markdown to HTML
- Copy Markdown
- Copy HTML
- Download .md
- Download .html

> Everything runs directly in your browser.

| Feature | Status |
|---|---|
| Preview | Ready |
| Export | Ready |

- [x] Create content
- [ ] Export final document`;

    renderPreview(false);
    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    markdownInput.focus();
  }

  function clearAll() {
    markdownInput.value = "";
    currentHtml = "";

    renderPreview(false);
    setInlineMessage("");
    markdownInput.focus();
  }

  markdownInput.addEventListener("input", () => {
    renderPreview(false);
    setInlineMessage("");
  });

  updateBtn.addEventListener("click", () => {
    renderPreview(true);
  });

  sampleBtn.addEventListener("click", loadSample);
  clearBtn.addEventListener("click", clearAll);

  copyMarkdownBtn.addEventListener("click", () => {
    void copyMarkdown();
  });

  copyHtmlBtn.addEventListener("click", () => {
    void copyHtml();
  });

  downloadMarkdownBtn.addEventListener("click", downloadMarkdown);

  downloadHtmlBtn.addEventListener("click", downloadHtml);

  renderPreview(false);
}

initMarkdownEditor();
