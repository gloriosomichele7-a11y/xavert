"use strict";

function initHtaccessGenerator() {
  const configType = document.getElementById("configType");
  const domain = document.getElementById("domain");
  const domainHelp = document.getElementById("domainHelp");

  const generateBtn = document.getElementById("generateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearBtn = document.getElementById("clearBtn");

  const resultBox = document.getElementById("resultBox");
  const output = document.getElementById("output");
  const message = document.getElementById("message");

  const required = [
    configType,
    domain,
    domainHelp,
    generateBtn,
    sampleBtn,
    copyBtn,
    downloadBtn,
    clearBtn,
    resultBox,
    output,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("HTACCESS Generator: HTML and JS do not match.");
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

  function notify(text, type = "info", useToast = true) {
    setInlineMessage(text, type);

    if (text && useToast && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function clearPersistentMessage() {
    setInlineMessage("");
  }

  function normalizeDomain(value) {
    return value
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .trim();
  }

  function isValidDomain(value) {
    if (!value) {
      return false;
    }

    return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
      value,
    );
  }

  function requiresDomain(type) {
    return type === "www" || type === "nonwww" || type === "redirect301";
  }

  function buildHtaccess(type, domainValue) {
    const escapedDomain = domainValue.replace(/\./g, "\\.");

    switch (type) {
      case "https":
        return [
          "RewriteEngine On",
          "RewriteCond %{HTTPS} !=on",
          "RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]",
        ].join("\n");

      case "www":
        return [
          "RewriteEngine On",
          `RewriteCond %{HTTP_HOST} !^www\\.${escapedDomain}$ [NC]`,
          `RewriteRule ^ https://www.${domainValue}%{REQUEST_URI} [L,R=301]`,
        ].join("\n");

      case "nonwww":
        return [
          "RewriteEngine On",
          `RewriteCond %{HTTP_HOST} ^www\\.${escapedDomain}$ [NC]`,
          `RewriteRule ^ https://${domainValue}%{REQUEST_URI} [L,R=301]`,
        ].join("\n");

      case "redirect301":
        return [
          "RewriteEngine On",
          `RewriteRule ^(.*)$ https://${domainValue}/$1 [L,R=301]`,
        ].join("\n");

      case "security":
        return [
          "<IfModule mod_headers.c>",
          '  Header always set X-Content-Type-Options "nosniff"',
          '  Header always set X-Frame-Options "SAMEORIGIN"',
          '  Header always set Referrer-Policy "strict-origin-when-cross-origin"',
          '  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"',
          "</IfModule>",
        ].join("\n");

      default:
        throw new Error("Unsupported configuration type.");
    }
  }

  function resetResult() {
    output.value = "";
    resultBox.hidden = true;
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function syncDomainState() {
    const type = configType.value;
    const needed = requiresDomain(type);

    domain.disabled = !needed;
    domain.required = needed;

    if (!needed) {
      domain.value = "";
    }

    if (type === "www") {
      domain.placeholder = "example.com";
      domainHelp.textContent =
        "Enter the canonical domain without protocol or www.";
    } else if (type === "nonwww") {
      domain.placeholder = "example.com";
      domainHelp.textContent =
        "Enter the non-WWW canonical domain without protocol.";
    } else if (type === "redirect301") {
      domain.placeholder = "new-example.com";
      domainHelp.textContent =
        "Enter the destination domain. All request paths are preserved.";
    } else {
      domain.placeholder = "example.com";
      domainHelp.textContent = "No domain is required for this configuration.";
    }
  }

  function generateHtaccess({ announce = true } = {}) {
    const type = configType.value;
    const normalizedDomain = normalizeDomain(domain.value);

    if (requiresDomain(type) && !isValidDomain(normalizedDomain)) {
      resetResult();
      notify("Please enter a valid domain.", "error", announce);
      domain.focus();
      return false;
    }

    try {
      if (requiresDomain(type)) {
        domain.value = normalizedDomain;
      }

      output.value = buildHtaccess(type, normalizedDomain);
      resultBox.hidden = false;
      copyBtn.disabled = false;
      downloadBtn.disabled = false;

      if (announce) {
        setInlineMessage("Action completed successfully.", "success");

        if (typeof window.showActionSuccess === "function") {
          window.showActionSuccess();
        } else if (typeof window.showMessage === "function") {
          window.showMessage("Action completed successfully.", "success");
        }
      }

      return true;
    } catch (error) {
      console.error("HTACCESS generation failed:", error);
      resetResult();
      notify("Unable to generate .htaccess rules.", "error", announce);
      return false;
    }
  }

  function loadSample() {
    configType.value = "www";
    domain.value = "example.com";
    syncDomainState();

    const generated = generateHtaccess({ announce: false });

    if (!generated) {
      return;
    }

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    domain.focus();
    domain.select();
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

    window.downloadFile(".htaccess", output.value, "text/plain;charset=utf-8");
  }

  function invalidateResult() {
    if (!resultBox.hidden) {
      resetResult();
    }

    clearPersistentMessage();
  }

  function clearTool() {
    configType.value = "https";
    domain.value = "";

    syncDomainState();
    resetResult();
    clearPersistentMessage();

    configType.focus();
  }

  configType.addEventListener("change", () => {
    syncDomainState();
    invalidateResult();
  });

  domain.addEventListener("input", invalidateResult);

  generateBtn.addEventListener("click", () => {
    generateHtaccess();
  });

  sampleBtn.addEventListener("click", loadSample);

  copyBtn.addEventListener("click", () => {
    void copyOutput();
  });

  downloadBtn.addEventListener("click", downloadOutput);
  clearBtn.addEventListener("click", clearTool);

  resetResult();
  syncDomainState();
}

document.addEventListener("DOMContentLoaded", initHtaccessGenerator);
