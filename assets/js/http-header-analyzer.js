"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "http-header-analyzer") {
    return;
  }

  const headerInput = document.getElementById("headerInput");

  const analyzeBtn = document.getElementById("analyzeBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");

  const resultBox = document.getElementById("resultBox");
  const reportOutput = document.getElementById("reportOutput");

  const headerCount = document.getElementById("headerCount");
  const securityScore = document.getElementById("securityScore");
  const missingCount = document.getElementById("missingCount");
  const cacheStatus = document.getElementById("cacheStatus");
  const securityRating = document.getElementById("securityRating");
  const messageType = document.getElementById("messageType");

  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const message = document.getElementById("message");

  const requiredElements = {
    headerInput,
    analyzeBtn,
    sampleBtn,
    clearBtn,
    resultBox,
    reportOutput,
    headerCount,
    securityScore,
    missingCount,
    cacheStatus,
    securityRating,
    messageType,
    copyBtn,
    downloadBtn,
    message,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error(
      "HTTP Header Analyzer initialization failed.",
      missingElements,
    );
    return;
  }

  const SECURITY_HEADERS = [
    {
      name: "content-security-policy",
      label: "Content-Security-Policy",
      description: "Restricts script, style, frame and other resource sources.",
    },
    {
      name: "strict-transport-security",
      label: "Strict-Transport-Security",
      description: "Instructs browsers to use HTTPS for future requests.",
    },
    {
      name: "x-content-type-options",
      label: "X-Content-Type-Options",
      description: "Helps prevent MIME type sniffing when set to nosniff.",
    },
    {
      name: "x-frame-options",
      label: "X-Frame-Options",
      description: "Provides legacy frame embedding restrictions.",
    },
    {
      name: "referrer-policy",
      label: "Referrer-Policy",
      description: "Controls referrer information sent with requests.",
    },
    {
      name: "permissions-policy",
      label: "Permissions-Policy",
      description: "Controls access to selected browser features.",
    },
    {
      name: "cross-origin-opener-policy",
      label: "Cross-Origin-Opener-Policy",
      description: "Controls browsing-context isolation across origins.",
    },
    {
      name: "cross-origin-resource-policy",
      label: "Cross-Origin-Resource-Policy",
      description: "Restricts which origins may load the resource.",
    },
  ];

  let currentReport = "";
  let resultAvailable = false;

  function setInlineMessage(text = "", type = "info") {
    const allowedTypes = ["success", "error", "info"];
    const safeType = allowedTypes.includes(type) ? type : "info";

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

  function notify(text = "", type = "info", useToast = true) {
    setInlineMessage(text, type);

    if (text && useToast && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function normalizeLineEndings(value) {
    return value.replace(/\r\n?/g, "\n");
  }

  function parseHeaderBlock(text) {
    const lines = normalizeLineEndings(text).split("\n");
    const headers = new Map();
    const invalidLines = [];

    let startLine = "";
    let previousHeaderName = "";

    lines.forEach((rawLine, index) => {
      const line = rawLine.trimEnd();

      if (!line.trim()) {
        return;
      }

      if (
        index === 0 &&
        (/^HTTP\/\d(?:\.\d)?\s+\d{3}\b/i.test(line) ||
          /^[A-Z]+\s+\S+\s+HTTP\/\d(?:\.\d)?$/i.test(line))
      ) {
        startLine = line.trim();
        return;
      }

      if (/^[ \t]+/.test(rawLine) && previousHeaderName) {
        const values = headers.get(previousHeaderName);

        values[values.length - 1] += ` ${line.trim()}`;
        return;
      }

      const separator = line.indexOf(":");

      if (separator <= 0) {
        invalidLines.push({
          number: index + 1,
          text: line,
        });
        previousHeaderName = "";
        return;
      }

      const originalName = line.slice(0, separator).trim();
      const normalizedName = originalName.toLowerCase();
      const value = line.slice(separator + 1).trim();

      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(originalName)) {
        invalidLines.push({
          number: index + 1,
          text: line,
        });
        previousHeaderName = "";
        return;
      }

      if (!headers.has(normalizedName)) {
        headers.set(normalizedName, []);
      }

      headers.get(normalizedName).push(value);
      previousHeaderName = normalizedName;
    });

    return {
      startLine,
      headers,
      invalidLines,
    };
  }

  function getFirstHeader(headers, name) {
    return headers.get(name)?.[0] ?? "";
  }

  function getMessageType(startLine) {
    if (/^HTTP\/\d(?:\.\d)?\s+\d{3}\b/i.test(startLine)) {
      return "Response";
    }

    if (/^[A-Z]+\s+\S+\s+HTTP\/\d(?:\.\d)?$/i.test(startLine)) {
      return "Request";
    }

    return startLine ? "Unknown" : "Headers only";
  }

  function getAllHeaderValues(headers, name) {
    return headers.get(name) ?? [];
  }

  function getSecurityAnalysis(headers) {
    const present = [];
    const missing = [];

    SECURITY_HEADERS.forEach((item) => {
      if (headers.has(item.name)) {
        present.push(item);
      } else {
        missing.push(item);
      }
    });

    const percentage = Math.round(
      (present.length / SECURITY_HEADERS.length) * 100,
    );

    let rating = "Poor";

    if (percentage >= 90) {
      rating = "Excellent";
    } else if (percentage >= 75) {
      rating = "Good";
    } else if (percentage >= 50) {
      rating = "Fair";
    }

    return {
      present,
      missing,
      percentage,
      rating,
    };
  }

  function getCacheAnalysis(headers) {
    const cacheControl = getFirstHeader(headers, "cache-control");
    const pragma = getFirstHeader(headers, "pragma");
    const expires = getFirstHeader(headers, "expires");
    const etag = getFirstHeader(headers, "etag");
    const lastModified = getFirstHeader(headers, "last-modified");

    const combined = `${cacheControl} ${pragma}`.toLowerCase();

    if (combined.includes("no-store") || combined.includes("no-cache")) {
      return {
        status: "Disabled",
        detail: cacheControl || pragma,
      };
    }

    if (cacheControl || expires || etag || lastModified) {
      return {
        status: "Configured",
        detail:
          cacheControl ||
          `Expires: ${expires || "not set"}; ETag: ${etag || "not set"}; Last-Modified: ${lastModified || "not set"}`,
      };
    }

    return {
      status: "Unspecified",
      detail: "No common cache policy headers were detected.",
    };
  }

  function getHeaderWarnings(headers) {
    const warnings = [];

    const xContentTypeOptions = getFirstHeader(
      headers,
      "x-content-type-options",
    );

    if (
      xContentTypeOptions &&
      xContentTypeOptions.toLowerCase() !== "nosniff"
    ) {
      warnings.push(
        "X-Content-Type-Options is present but is not set to nosniff.",
      );
    }

    const hsts = getFirstHeader(headers, "strict-transport-security");

    if (hsts && !/max-age\s*=\s*\d+/i.test(hsts)) {
      warnings.push(
        "Strict-Transport-Security is present without a valid max-age directive.",
      );
    }

    const frameOptions = getFirstHeader(
      headers,
      "x-frame-options",
    ).toUpperCase();

    if (
      frameOptions &&
      frameOptions !== "DENY" &&
      frameOptions !== "SAMEORIGIN"
    ) {
      warnings.push("X-Frame-Options has an uncommon or unsupported value.");
    }

    const server = getFirstHeader(headers, "server");
    const poweredBy = getFirstHeader(headers, "x-powered-by");

    if (server) {
      warnings.push("Server header exposes implementation information.");
    }

    if (poweredBy) {
      warnings.push(
        "X-Powered-By exposes application or framework information.",
      );
    }

    return warnings;
  }

  function buildReport(parsed, security, cache, warnings) {
    const report = [
      "XAVERT HTTP Header Analyzer",
      "===========================",
      "",
    ];

    if (parsed.startLine) {
      report.push("Start Line", "----------", parsed.startLine, "");
    }

    report.push(
      "Summary",
      "-------",
      `Headers: ${parsed.headers.size}`,
      `Security Score: ${security.percentage}%`,
      `Security Rating: ${security.rating}`,
      `Missing Security Headers: ${security.missing.length}`,
      `Cache: ${cache.status}`,
      "",
      "Headers Found",
      "-------------",
    );

    if (parsed.headers.size === 0) {
      report.push("None");
    } else {
      parsed.headers.forEach((values, name) => {
        values.forEach((value) => {
          report.push(`${name}: ${value}`);
        });
      });
    }

    report.push("", "Missing Security Headers", "------------------------");

    if (security.missing.length === 0) {
      report.push("None");
    } else {
      security.missing.forEach((item) => {
        report.push(`- ${item.label}`, `  ${item.description}`);
      });
    }

    report.push(
      "",
      "Cache Analysis",
      "--------------",
      `Status: ${cache.status}`,
      cache.detail,
      "",
      "Server Information",
      "------------------",
      `Server: ${getFirstHeader(parsed.headers, "server") || "Unknown"}`,
      `Content-Type: ${getFirstHeader(parsed.headers, "content-type") || "Unknown"}`,
      `Via: ${getFirstHeader(parsed.headers, "via") || "Not specified"}`,
      `X-Powered-By: ${getFirstHeader(parsed.headers, "x-powered-by") || "Not specified"}`,
    );

    if (warnings.length) {
      report.push("", "Warnings", "--------");

      warnings.forEach((warning) => {
        report.push(`- ${warning}`);
      });
    }

    if (parsed.invalidLines.length) {
      report.push("", "Unparsed Lines", "--------------");

      parsed.invalidLines.forEach((item) => {
        report.push(`Line ${item.number}: ${item.text}`);
      });
    }

    return report.join("\n");
  }

  function updateResultButtons() {
    copyBtn.disabled = !resultAvailable;
    downloadBtn.disabled = !resultAvailable;
  }

  function resetResult() {
    currentReport = "";
    resultAvailable = false;

    resultBox.hidden = true;
    reportOutput.textContent = "";

    headerCount.textContent = "0";
    securityScore.textContent = "0%";
    missingCount.textContent = "0";
    cacheStatus.textContent = "—";
    securityRating.textContent = "—";
    messageType.textContent = "—";

    updateResultButtons();
  }

  function invalidateResult() {
    if (resultAvailable) {
      resetResult();
    }

    setInlineMessage("");
  }

  function analyzeHeaders({ announce = true } = {}) {
    const text = headerInput.value;

    if (!text.trim()) {
      resetResult();

      notify("Paste HTTP headers first.", "error");
      headerInput.focus();

      return false;
    }

    const parsed = parseHeaderBlock(text);

    if (parsed.headers.size === 0) {
      resetResult();

      notify("No valid HTTP header fields were found.", "error");

      headerInput.focus();
      return false;
    }

    const security = getSecurityAnalysis(parsed.headers);
    const cache = getCacheAnalysis(parsed.headers);
    const warnings = getHeaderWarnings(parsed.headers);

    currentReport = buildReport(parsed, security, cache, warnings);

    reportOutput.textContent = currentReport;

    headerCount.textContent = String(parsed.headers.size);

    securityScore.textContent = `${security.percentage}%`;

    missingCount.textContent = String(security.missing.length);

    cacheStatus.textContent = cache.status;

    securityRating.textContent = security.rating;

    resultAvailable = true;
    resultBox.hidden = false;

    updateResultButtons();

    messageType.textContent = getMessageType(parsed.startLine);

    if (parsed.invalidLines.length) {
      setInlineMessage(
        `Analysis completed with ${parsed.invalidLines.length} unparsed line${parsed.invalidLines.length === 1 ? "" : "s"}.`,
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
    headerInput.value = [
      "HTTP/1.1 200 OK",
      "Server: nginx",
      "Content-Type: text/html; charset=UTF-8",
      "Cache-Control: public, max-age=3600",
      "Content-Security-Policy: default-src 'self'",
      "Strict-Transport-Security: max-age=31536000; includeSubDomains",
      "X-Content-Type-Options: nosniff",
      "X-Frame-Options: SAMEORIGIN",
      "Referrer-Policy: strict-origin-when-cross-origin",
      "Permissions-Policy: geolocation=(), microphone=(), camera=()",
    ].join("\n");

    resetResult();

    const analyzed = analyzeHeaders({ announce: false });

    if (!analyzed) {
      return;
    }

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    headerInput.focus();
  }

  async function copyReport() {
    if (!resultAvailable || !currentReport) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(currentReport);
  }

  function downloadReport() {
    if (!resultAvailable || !currentReport) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-http-header-report.txt",
      currentReport,
      "text/plain;charset=utf-8",
    );
  }

  function clearTool() {
    headerInput.value = "";

    resetResult();
    setInlineMessage("");
    headerInput.focus();
  }

  analyzeBtn.addEventListener("click", analyzeHeaders);
  sampleBtn.addEventListener("click", loadSample);
  clearBtn.addEventListener("click", clearTool);

  copyBtn.addEventListener("click", () => {
    void copyReport();
  });

  downloadBtn.addEventListener("click", downloadReport);

  headerInput.addEventListener("input", invalidateResult);

  resetResult();
});
