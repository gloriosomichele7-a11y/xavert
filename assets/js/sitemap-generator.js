"use strict";

function initSitemapGenerator() {
  const urls = document.getElementById("urls");
  const changefreq = document.getElementById("changefreq");
  const priority = document.getElementById("priority");

  const output = document.getElementById("output");
  const generateBtn = document.getElementById("generateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const urlCount = document.getElementById("urlCount");
  const xmlSize = document.getElementById("xmlSize");
  const inputCount = document.getElementById("inputCount");
  const invalidCount = document.getElementById("invalidCount");
  const message = document.getElementById("message");

  const required = [
    urls,
    changefreq,
    priority,
    output,
    generateBtn,
    sampleBtn,
    clearBtn,
    copyBtn,
    downloadBtn,
    urlCount,
    xmlSize,
    inputCount,
    invalidCount,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("Sitemap Generator: HTML and JS do not match.");
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

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function normalizeUrl(value) {
    const text = value.trim();

    if (!text) {
      return null;
    }

    let url;

    try {
      url = new URL(text);
    } catch {
      return null;
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    url.hash = "";

    return url.href;
  }

  function isHomepage(urlValue) {
    try {
      const url = new URL(urlValue);

      return (url.pathname === "/" || url.pathname === "") && !url.search;
    } catch {
      return false;
    }
  }

  function resetOutput() {
    output.value = "";

    urlCount.textContent = "0";
    xmlSize.textContent = "0";
    inputCount.textContent = "0";
    invalidCount.textContent = "0";

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function invalidateResult() {
    if (output.value) {
      resetOutput();
    }

    setInlineMessage("");
  }

  function generateSitemap({ announce = true } = {}) {
    const rawText = urls.value.trim();

    if (!rawText) {
      resetOutput();

      notify("Please enter at least one URL.", "error");

      urls.focus();
      return false;
    }

    const inputUrls = rawText
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    const normalized = inputUrls.map(normalizeUrl);

    const invalid = normalized.filter((value) => !value).length;

    const validUrls = [...new Set(normalized.filter(Boolean))];

    if (!validUrls.length) {
      resetOutput();

      inputCount.textContent = String(inputUrls.length);
      invalidCount.textContent = String(invalid);

      notify("No valid HTTP or HTTPS URLs found.", "error");

      return false;
    }

    const today = new Date().toISOString().slice(0, 10);

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];

    validUrls.forEach((url) => {
      const pagePriority = isHomepage(url) ? "1.0" : priority.value;

      lines.push(
        "  <url>",
        `    <loc>${escapeXml(url)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${changefreq.value}</changefreq>`,
        `    <priority>${pagePriority}</priority>`,
        "  </url>",
      );
    });

    lines.push("</urlset>");

    const xml = `${lines.join("\n")}\n`;

    output.value = xml;

    urlCount.textContent = String(validUrls.length);
    xmlSize.textContent = String(Array.from(xml).length);
    inputCount.textContent = String(inputUrls.length);
    invalidCount.textContent = String(invalid);

    copyBtn.disabled = false;
    downloadBtn.disabled = false;

    if (invalid > 0) {
      setInlineMessage(
        `Sitemap generated. ${invalid} invalid URL${
          invalid === 1 ? "" : "s"
        } ignored.`,
        "info",
      );

      if (announce && typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    } else if (announce) {
      setInlineMessage("Action completed successfully.", "success");

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    } else {
      setInlineMessage("");
    }

    return true;
  }

  function loadSample() {
    urls.value = [
      "https://xavert.com/",
      "https://xavert.com/privacy-policy.html",
      "https://xavert.com/terms-of-use.html",
      "https://xavert.com/tools/sitemap-generator.html",
      "https://xavert.com/tools/markup-generator.html",
    ].join("\n");

    changefreq.value = "daily";
    priority.value = "0.8";

    resetOutput();
    setInlineMessage("");

    const generated = generateSitemap({ announce: false });

    if (!generated) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    urls.focus();
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
      "sitemap.xml",
      output.value,
      "application/xml;charset=utf-8",
    );
  }

  function clearAll() {
    urls.value = "";
    changefreq.value = "daily";
    priority.value = "0.8";

    resetOutput();
    setInlineMessage("");
    urls.focus();
  }

  urls.addEventListener("input", invalidateResult);
  changefreq.addEventListener("change", invalidateResult);
  priority.addEventListener("change", invalidateResult);

  generateBtn.addEventListener("click", () => {
    generateSitemap();
  });

  sampleBtn.addEventListener("click", loadSample);
  clearBtn.addEventListener("click", clearAll);

  copyBtn.addEventListener("click", () => {
    void copyOutput();
  });

  downloadBtn.addEventListener("click", downloadOutput);

  resetOutput();
}

initSitemapGenerator();
