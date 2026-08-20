"use strict";

function initMetaTagGenerator() {
  const siteTitle = document.getElementById("siteTitle");
  const siteDescription = document.getElementById("siteDescription");
  const authorName = document.getElementById("authorName");
  const keywords = document.getElementById("keywords");
  const canonicalUrl = document.getElementById("canonicalUrl");
  const imageUrl = document.getElementById("imageUrl");
  const twitterCard = document.getElementById("twitterCard");
  const robotsMeta = document.getElementById("robotsMeta");
  const output = document.getElementById("output");

  const generateBtn = document.getElementById("generateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const titleCounter = document.getElementById("titleCounter");
  const descriptionCounter = document.getElementById("descriptionCounter");
  const previewTitle = document.getElementById("previewTitle");
  const previewUrl = document.getElementById("previewUrl");
  const previewDescription = document.getElementById("previewDescription");
  const message = document.getElementById("message");

  const required = [
    siteTitle,
    siteDescription,
    authorName,
    keywords,
    canonicalUrl,
    imageUrl,
    twitterCard,
    robotsMeta,
    output,
    generateBtn,
    sampleBtn,
    clearBtn,
    copyBtn,
    downloadBtn,
    titleCounter,
    descriptionCounter,
    previewTitle,
    previewUrl,
    previewDescription,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("Meta Tag Generator: HTML and JS do not match.");
    return;
  }

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

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function normalizeUrl(value, label) {
    const text = value.trim();

    if (!text) {
      return "";
    }

    let url;

    try {
      url = new URL(text);
    } catch {
      throw new Error(`${label} must be a valid absolute URL.`);
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(`${label} must use HTTP or HTTPS.`);
    }

    return url.href;
  }

  function setCounter(element, count, type) {
    element.textContent = `${count} characters`;

    element.classList.remove(
      "meta-counter-good",
      "meta-counter-warn",
      "meta-counter-bad",
    );

    let className = "meta-counter-good";

    if (type === "title") {
      if (count > 75) {
        className = "meta-counter-bad";
      } else if (count < 30 || count > 65) {
        className = "meta-counter-warn";
      }
    }

    if (type === "description") {
      if (count > 180) {
        className = "meta-counter-bad";
      } else if (count < 80 || count > 160) {
        className = "meta-counter-warn";
      }
    }

    element.classList.add(className);
  }

  function updatePreview() {
    const title = siteTitle.value.trim();
    const description = siteDescription.value.trim();
    const url = canonicalUrl.value.trim();

    previewTitle.textContent = title || "Your page title will appear here";
    previewDescription.textContent =
      description || "Your meta description preview will appear here.";
    previewUrl.textContent = url || "https://example.com/page";

    setCounter(titleCounter, Array.from(title).length, "title");
    setCounter(
      descriptionCounter,
      Array.from(description).length,
      "description",
    );
  }

  function resetGeneratedResult() {
    output.value = "";
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function invalidateResult() {
    if (output.value) {
      resetGeneratedResult();
    }

    updatePreview();
    setInlineMessage("");
  }

  function generateTags({ announce = true } = {}) {
    const title = siteTitle.value.trim();
    const description = siteDescription.value.trim();
    const author = authorName.value.trim();
    const keywordValue = keywords.value.trim();

    if (!title || !description) {
      resetGeneratedResult();
      notify("Please enter at least a title and description.", "error");
      (!title ? siteTitle : siteDescription).focus();
      return false;
    }

    let canonical = "";
    let image = "";

    try {
      canonical = normalizeUrl(canonicalUrl.value, "Canonical URL");
      image = normalizeUrl(imageUrl.value, "Image URL");
    } catch (error) {
      resetGeneratedResult();
      notify(error instanceof Error ? error.message : "Invalid URL.", "error");
      return false;
    }

    const lines = [
      `<title>${escapeText(title)}</title>`,
      `<meta name="description" content="${escapeAttribute(description)}">`,
      `<meta name="robots" content="${escapeAttribute(robotsMeta.value)}">`,
    ];

    if (keywordValue) {
      lines.push(
        `<meta name="keywords" content="${escapeAttribute(keywordValue)}">`,
      );
    }

    if (author) {
      lines.push(`<meta name="author" content="${escapeAttribute(author)}">`);
    }

    if (canonical) {
      lines.push(`<link rel="canonical" href="${escapeAttribute(canonical)}">`);
    }

    lines.push(
      "",
      "<!-- Open Graph -->",
      `<meta property="og:title" content="${escapeAttribute(title)}">`,
      `<meta property="og:description" content="${escapeAttribute(description)}">`,
      '<meta property="og:type" content="website">',
    );

    if (canonical) {
      lines.push(
        `<meta property="og:url" content="${escapeAttribute(canonical)}">`,
      );
    }

    if (author) {
      lines.push(
        `<meta property="og:site_name" content="${escapeAttribute(author)}">`,
      );
    }

    if (image) {
      lines.push(
        `<meta property="og:image" content="${escapeAttribute(image)}">`,
      );
    }

    lines.push(
      "",
      "<!-- Twitter Card -->",
      `<meta name="twitter:card" content="${escapeAttribute(twitterCard.value)}">`,
      `<meta name="twitter:title" content="${escapeAttribute(title)}">`,
      `<meta name="twitter:description" content="${escapeAttribute(description)}">`,
    );

    if (image) {
      lines.push(
        `<meta name="twitter:image" content="${escapeAttribute(image)}">`,
      );
    }

    output.value = lines.join("\n");
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    updatePreview();

    if (announce) {
      setInlineMessage("Action completed successfully.", "success");

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    }

    return true;
  }

  function loadSample() {
    siteTitle.value = "XAVERT | Privacy-First Browser Tools";
    siteDescription.value =
      "Use professional online tools that run directly in your browser. No uploads, no accounts and privacy-first processing.";
    authorName.value = "XAVERT";
    keywords.value =
      "browser tools, privacy tools, online tools, developer tools";
    canonicalUrl.value = "https://xavert.com";
    imageUrl.value = "https://xavert.com/assets/images/og-image.png";
    twitterCard.value = "summary_large_image";
    robotsMeta.value = "index, follow";

    resetGeneratedResult();
    updatePreview();
    setInlineMessage("");

    const generated = generateTags({ announce: false });

    if (!generated) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    siteTitle.focus();
  }

  async function copyOutput() {
    if (!output.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(output.value);
  }

  function downloadOutput() {
    if (!output.value) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-meta-tags-snippet.html",
      output.value,
      "text/html;charset=utf-8",
    );
  }

  function clearAll() {
    siteTitle.value = "";
    siteDescription.value = "";
    authorName.value = "";
    keywords.value = "";
    canonicalUrl.value = "";
    imageUrl.value = "";
    twitterCard.value = "summary_large_image";
    robotsMeta.value = "index, follow";

    resetGeneratedResult();
    updatePreview();
    setInlineMessage("");
    siteTitle.focus();
  }

  [
    siteTitle,
    siteDescription,
    authorName,
    keywords,
    canonicalUrl,
    imageUrl,
  ].forEach((element) => {
    element.addEventListener("input", invalidateResult);
  });

  [twitterCard, robotsMeta].forEach((element) => {
    element.addEventListener("change", invalidateResult);
  });

  generateBtn.addEventListener("click", () => {
    generateTags();
  });

  sampleBtn.addEventListener("click", loadSample);
  clearBtn.addEventListener("click", clearAll);

  copyBtn.addEventListener("click", () => {
    void copyOutput();
  });

  downloadBtn.addEventListener("click", downloadOutput);

  resetGeneratedResult();
  updatePreview();
}

initMetaTagGenerator();
