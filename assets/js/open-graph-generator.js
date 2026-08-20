"use strict";

function initOpenGraphGenerator() {
  const pageTitle = document.getElementById("pageTitle");
  const pageDescription = document.getElementById("pageDescription");
  const pageUrl = document.getElementById("pageUrl");
  const imageUrl = document.getElementById("imageUrl");
  const siteName = document.getElementById("siteName");
  const ogType = document.getElementById("ogType");
  const twitterCard = document.getElementById("twitterCard");
  const output = document.getElementById("output");

  const generateBtn = document.getElementById("generateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const titleCounter = document.getElementById("titleCounter");
  const descriptionCounter = document.getElementById("descriptionCounter");
  const previewImage = document.getElementById("previewImage");
  const previewDomain = document.getElementById("previewDomain");
  const previewTitle = document.getElementById("previewTitle");
  const previewDescription = document.getElementById("previewDescription");
  const message = document.getElementById("message");

  const required = [
    pageTitle,
    pageDescription,
    pageUrl,
    imageUrl,
    siteName,
    ogType,
    twitterCard,
    output,
    generateBtn,
    sampleBtn,
    clearBtn,
    copyBtn,
    downloadBtn,
    titleCounter,
    descriptionCounter,
    previewImage,
    previewDomain,
    previewTitle,
    previewDescription,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("Open Graph Generator: HTML and JS do not match.");
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

  function normalizeUrl(value, label, required = false) {
    const text = value.trim();

    if (!text) {
      if (required) {
        throw new Error(`${label} is required.`);
      }

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

  function getDomain(value) {
    try {
      return new URL(value).hostname.replace(/^www\./i, "");
    } catch {
      return "example.com";
    }
  }

  function setCounter(element, count, type) {
    element.textContent = `${count} characters`;

    element.classList.remove(
      "og-counter-good",
      "og-counter-warn",
      "og-counter-bad",
    );

    let className = "og-counter-good";

    if (type === "title") {
      if (count > 90) {
        className = "og-counter-bad";
      } else if (count < 30 || count > 70) {
        className = "og-counter-warn";
      }
    }

    if (type === "description") {
      if (count > 250) {
        className = "og-counter-bad";
      } else if (count < 80 || count > 200) {
        className = "og-counter-warn";
      }
    }

    element.classList.add(className);
  }

  function updatePreview() {
    const title = pageTitle.value.trim();
    const description = pageDescription.value.trim();
    const url = pageUrl.value.trim();
    const image = imageUrl.value.trim();

    previewTitle.textContent =
      title || "Your Open Graph title will appear here";

    previewDescription.textContent =
      description || "Your Open Graph description will appear here.";

    previewDomain.textContent = url ? getDomain(url) : "example.com";

    if (image) {
      try {
        const safeImage = normalizeUrl(image, "Image URL");

        previewImage.style.backgroundImage = `url("${safeImage.replace(/"/g, "%22")}")`;

        previewImage.textContent = "";
      } catch {
        previewImage.style.backgroundImage = "none";
        previewImage.textContent = "Invalid image URL";
      }
    } else {
      previewImage.style.backgroundImage = "none";
      previewImage.textContent = "Social image preview";
    }

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
    const title = pageTitle.value.trim();
    const description = pageDescription.value.trim();
    const site = siteName.value.trim();

    if (!title || !description) {
      resetGeneratedResult();
      notify("Please enter at least title and description.", "error");
      (!title ? pageTitle : pageDescription).focus();
      return false;
    }

    let url;
    let image;

    try {
      url = normalizeUrl(pageUrl.value, "Page URL", true);
      image = normalizeUrl(imageUrl.value, "Image URL");
    } catch (error) {
      resetGeneratedResult();
      notify(error instanceof Error ? error.message : "Invalid URL.", "error");
      return false;
    }

    const lines = [
      "<!-- Open Graph -->",
      `<meta property="og:title" content="${escapeAttribute(title)}">`,
      `<meta property="og:description" content="${escapeAttribute(description)}">`,
      `<meta property="og:url" content="${escapeAttribute(url)}">`,
      `<meta property="og:type" content="${escapeAttribute(ogType.value)}">`,
    ];

    if (site) {
      lines.push(
        `<meta property="og:site_name" content="${escapeAttribute(site)}">`,
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
    pageTitle.value = "XAVERT | Privacy-First Browser Tools";
    pageDescription.value =
      "Use professional online tools that run directly in your browser. No uploads, no accounts and privacy-first processing.";
    pageUrl.value = "https://xavert.com";
    imageUrl.value = "https://xavert.com/assets/images/og-image.png";
    siteName.value = "XAVERT";
    ogType.value = "website";
    twitterCard.value = "summary_large_image";

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

    pageTitle.focus();
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
      "xavert-open-graph-snippet.html",
      output.value,
      "text/html;charset=utf-8",
    );
  }

  function clearAll() {
    pageTitle.value = "";
    pageDescription.value = "";
    pageUrl.value = "";
    imageUrl.value = "";
    siteName.value = "";
    ogType.value = "website";
    twitterCard.value = "summary_large_image";

    resetGeneratedResult();
    updatePreview();
    setInlineMessage("");
    pageTitle.focus();
  }

  [pageTitle, pageDescription, pageUrl, imageUrl, siteName].forEach(
    (element) => {
      element.addEventListener("input", invalidateResult);
    },
  );

  [ogType, twitterCard].forEach((element) => {
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

initOpenGraphGenerator();
