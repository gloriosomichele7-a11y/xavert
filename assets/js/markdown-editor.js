"use strict";

function initMarkdownEditor() {
  const markdownInput = document.getElementById("markdownInput");
  const previewBox = document.getElementById("previewBox");
  const updateBtn = document.getElementById("updateBtn");
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

  const markedApi = window.marked;
  const purifier = window.DOMPurify;
  const advancedParserAvailable =
    markedApi &&
    typeof markedApi.parse === "function" &&
    purifier &&
    typeof purifier.sanitize === "function";

  let currentHtml = "";
  let fallbackWarningShown = false;

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
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeUrl(url) {
    const value = String(url ?? "").trim();

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

  function secureRenderedHtml(html) {
    const sanitized = purifier.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: [
        "script",
        "style",
        "iframe",
        "object",
        "embed",
        "form",
        "button",
        "textarea",
        "select",
        "option",
      ],
      FORBID_ATTR: ["style"],
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });

    const template = document.createElement("template");
    template.innerHTML = sanitized;

    template.content.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href") ?? "";
      const safeHref = sanitizeUrl(href);

      if (!safeHref) {
        link.removeAttribute("href");
        link.removeAttribute("target");
        link.removeAttribute("rel");
        return;
      }

      link.setAttribute("href", safeHref);

      if (/^https?:/i.test(safeHref)) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      } else {
        link.removeAttribute("target");
        link.removeAttribute("rel");
      }
    });

    template.content.querySelectorAll("input").forEach((input) => {
      if (input.type !== "checkbox") {
        input.remove();
        return;
      }

      input.disabled = true;
      input.removeAttribute("name");
      input.removeAttribute("value");
    });

    template.content.querySelectorAll("img").forEach((image) => {
      image.loading = "lazy";
      image.decoding = "async";
    });

    return template.innerHTML;
  }

  function renderWithMarked(markdown) {
    const rawHtml = markedApi.parse(markdown, {
      gfm: true,
      breaks: false,
      pedantic: false,
    });

    return secureRenderedHtml(rawHtml);
  }

  function parseFallbackInline(source) {
    const codeTokens = [];
    let text = escapeHtml(source);

    text = text.replace(/`([^`\n]+)`/g, (match, code) => {
      const token = `\u0000CODE${codeTokens.length}\u0000`;
      codeTokens.push(`<code>${code}</code>`);
      return token;
    });

    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g, (
      match,
      label,
      rawUrl,
      title,
    ) => {
      const safeUrl = sanitizeUrl(rawUrl.replace(/&amp;/g, "&"));

      if (!safeUrl) {
        return label;
      }

      const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
      const external = /^https?:/i.test(safeUrl);
      const targetAttributes = external
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";

      return `<a href="${escapeHtml(safeUrl)}"${titleAttribute}${targetAttributes}>${label}</a>`;
    });

    text = text.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
    text = text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    text = text.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");

    text = text.replace(
      /&lt;(https?:\/\/[^&\s]+)&gt;/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
    );

    codeTokens.forEach((html, index) => {
      text = text.replace(`\u0000CODE${index}\u0000`, html);
    });

    return text;
  }

  function isFallbackTableSeparator(line) {
    const cells = line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());

    return (
      cells.length > 0 &&
      cells.every((cell) => /^:?-{3,}:?$/.test(cell))
    );
  }

  function splitFallbackTableRow(row) {
    return row
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  function fallbackMarkdownToHtml(markdown) {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    let html = "";
    let listType = "";
    let inCodeBlock = false;
    let codeFence = "";
    let codeLanguage = "";
    let codeBuffer = [];

    function closeList() {
      if (!listType) {
        return;
      }

      html += `</${listType}>`;
      listType = "";
    }

    function openList(type) {
      if (listType === type) {
        return;
      }

      closeList();
      html += `<${type}>`;
      listType = type;
    }

    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index];
      const trimmed = rawLine.trim();
      const fenceMatch = trimmed.match(/^(```+|~~~+)\s*([\w#+.-]*)\s*$/);

      if (fenceMatch) {
        if (!inCodeBlock) {
          closeList();
          inCodeBlock = true;
          codeFence = fenceMatch[1][0];
          codeLanguage = fenceMatch[2];
          codeBuffer = [];
        } else if (fenceMatch[1][0] === codeFence) {
          const languageClass = codeLanguage
            ? ` class="language-${escapeHtml(codeLanguage)}"`
            : "";
          html += `<pre><code${languageClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
          inCodeBlock = false;
          codeFence = "";
          codeLanguage = "";
          codeBuffer = [];
        } else {
          codeBuffer.push(rawLine);
        }

        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(rawLine);
        continue;
      }

      if (!trimmed) {
        closeList();
        continue;
      }

      if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(rawLine)) {
        closeList();
        html += "<hr>";
        continue;
      }

      if (
        index + 1 < lines.length &&
        rawLine.includes("|") &&
        isFallbackTableSeparator(lines[index + 1])
      ) {
        closeList();
        const headers = splitFallbackTableRow(rawLine);
        const alignments = splitFallbackTableRow(lines[index + 1]);
        const rows = [];
        index += 2;

        while (
          index < lines.length &&
          lines[index].trim() &&
          lines[index].includes("|")
        ) {
          rows.push(splitFallbackTableRow(lines[index]));
          index += 1;
        }

        index -= 1;
        html += "<table><thead><tr>";
        headers.forEach((cell, cellIndex) => {
          const separator = alignments[cellIndex] ?? "";
          const align = separator.startsWith(":") && separator.endsWith(":")
            ? "center"
            : separator.endsWith(":")
              ? "right"
              : separator.startsWith(":")
                ? "left"
                : "";
          const alignAttr = align ? ` align="${align}"` : "";
          html += `<th${alignAttr}>${parseFallbackInline(cell)}</th>`;
        });
        html += "</tr></thead><tbody>";

        rows.forEach((row) => {
          html += "<tr>";
          headers.forEach((_, cellIndex) => {
            html += `<td>${parseFallbackInline(row[cellIndex] ?? "")}</td>`;
          });
          html += "</tr>";
        });

        html += "</tbody></table>";
        continue;
      }

      const atxHeading = rawLine.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);

      if (atxHeading) {
        closeList();
        const level = atxHeading[1].length;
        html += `<h${level}>${parseFallbackInline(atxHeading[2])}</h${level}>`;
        continue;
      }

      if (index + 1 < lines.length && /^ {0,3}(=+|-+)\s*$/.test(lines[index + 1])) {
        closeList();
        const level = lines[index + 1].trim().startsWith("=") ? 1 : 2;
        html += `<h${level}>${parseFallbackInline(trimmed)}</h${level}>`;
        index += 1;
        continue;
      }

      if (/^\s*>/.test(rawLine)) {
        closeList();
        const blockquoteLines = [];

        while (index < lines.length && /^\s*>/.test(lines[index])) {
          blockquoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
          index += 1;
        }

        index -= 1;
        html += `<blockquote>${fallbackMarkdownToHtml(blockquoteLines.join("\n"))}</blockquote>`;
        continue;
      }

      const unordered = rawLine.match(/^\s*[-*+]\s+(.+)$/);
      const ordered = rawLine.match(/^\s*(\d+)[.)]\s+(.+)$/);

      if (unordered) {
        openList("ul");
        let itemText = unordered[1];
        let taskPrefix = "";

        if (/^\[[xX]\]\s+/.test(itemText)) {
          itemText = itemText.replace(/^\[[xX]\]\s+/, "");
          taskPrefix = '<input type="checkbox" checked disabled> ';
        } else if (/^\[ \]\s+/.test(itemText)) {
          itemText = itemText.replace(/^\[ \]\s+/, "");
          taskPrefix = '<input type="checkbox" disabled> ';
        }

        html += `<li>${taskPrefix}${parseFallbackInline(itemText)}</li>`;
        continue;
      }

      if (ordered) {
        openList("ol");
        html += `<li>${parseFallbackInline(ordered[2])}</li>`;
        continue;
      }

      closeList();
      html += `<p>${parseFallbackInline(rawLine)}</p>`;
    }

    closeList();

    if (inCodeBlock) {
      const languageClass = codeLanguage
        ? ` class="language-${escapeHtml(codeLanguage)}"`
        : "";
      html += `<pre><code${languageClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
    }

    return html;
  }

  function markdownToHtml(markdown) {
    if (!markdown) {
      return "";
    }

    if (advancedParserAvailable) {
      return renderWithMarked(markdown);
    }

    if (!fallbackWarningShown) {
      console.warn(
        "Markdown Editor: Marked or DOMPurify failed to load; using the basic local fallback parser.",
      );
      fallbackWarningShown = true;
    }

    return fallbackMarkdownToHtml(markdown);
  }

  function countHeadingsFallback(text) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    let count = 0;
    let inFence = false;
    let fenceCharacter = "";

    for (let index = 0; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      const fence = trimmed.match(/^(```+|~~~+)/);

      if (fence) {
        const character = fence[1][0];

        if (!inFence) {
          inFence = true;
          fenceCharacter = character;
        } else if (character === fenceCharacter) {
          inFence = false;
          fenceCharacter = "";
        }

        continue;
      }

      if (inFence) {
        continue;
      }

      if (/^ {0,3}#{1,6}\s+/.test(lines[index])) {
        count += 1;
        continue;
      }

      if (
        trimmed &&
        index + 1 < lines.length &&
        /^ {0,3}(=+|-+)\s*$/.test(lines[index + 1])
      ) {
        count += 1;
        index += 1;
      }
    }

    return count;
  }

  function countHeadingTokens(tokens) {
    if (!Array.isArray(tokens)) {
      return 0;
    }

    let total = 0;

    tokens.forEach((token) => {
      if (!token || typeof token !== "object") {
        return;
      }

      if (token.type === "heading") {
        total += 1;
      }

      if (Array.isArray(token.tokens)) {
        total += countHeadingTokens(token.tokens);
      }

      if (Array.isArray(token.items)) {
        token.items.forEach((item) => {
          if (Array.isArray(item?.tokens)) {
            total += countHeadingTokens(item.tokens);
          }
        });
      }
    });

    return total;
  }

  function getHeadingCount(text) {
    if (advancedParserAvailable && typeof markedApi.lexer === "function") {
      try {
        return countHeadingTokens(markedApi.lexer(text, { gfm: true }));
      } catch (error) {
        console.warn("Markdown Editor: heading tokenization failed.", error);
      }
    }

    return countHeadingsFallback(text);
  }

  function getReadableText(html) {
    if (!html) {
      return "";
    }

    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content.textContent ?? "";
  }

  function updateStats(text) {
    const readableText = getReadableText(currentHtml).trim();
    const words = readableText ? readableText.split(/\s+/u).filter(Boolean).length : 0;

    wordCount.textContent = String(words);
    charCount.textContent = String(Array.from(text).length);
    lineCount.textContent = String(
      text ? text.replace(/\r\n?/g, "\n").split("\n").length : 0,
    );
    headingCount.textContent = String(getHeadingCount(text));
    readingTime.textContent =
      words > 0 ? `${Math.max(1, Math.ceil(words / 200))} min` : "0 min";
  }

  function renderPreview(showMessage = false) {
    const text = markdownInput.value;

    try {
      currentHtml = markdownToHtml(text);
    } catch (error) {
      console.error("Markdown Editor: unable to render Markdown.", error);
      currentHtml = "";

      previewBox.replaceChildren();
      const errorMessage = document.createElement("p");
      errorMessage.className = "message-error";
      errorMessage.textContent = "Unable to render this Markdown.";
      previewBox.append(errorMessage);
      updateStats(text);

      if (showMessage) {
        notify("Unable to render this Markdown.", "error");
      }

      return;
    }

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
