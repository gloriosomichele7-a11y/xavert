"use strict";

function initUrlToolkit() {
  const toolSelector = document.getElementById("toolSelector");

  const panels = {
    encode: document.getElementById("encodePanel"),
    decode: document.getElementById("decodePanel"),
    parse: document.getElementById("parsePanel"),
    utm: document.getElementById("utmPanel"),
  };

  const primaryBtn = document.getElementById("primaryBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearBtn = document.getElementById("clearBtn");

  const message = document.getElementById("message");
  const resultBox = document.getElementById("resultBox");
  const outputText = document.getElementById("outputText");

  const required = [
    toolSelector,
    ...Object.values(panels),
    primaryBtn,
    copyBtn,
    downloadBtn,
    clearBtn,
    message,
    resultBox,
    outputText,
  ];

  if (required.some((element) => !element)) {
    console.error("URL Toolkit: HTML and JS do not match.");
    return;
  }

  const labels = {
    encode: "URL Encode",
    decode: "URL Decode",
    parse: "Parse URL",
    utm: "Build UTM URL",
  };

  function byId(id) {
    return document.getElementById(id);
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

  function clearPersistentMessage() {
    if (typeof window.clearMessage === "function") {
      window.clearMessage();
    } else {
      setInlineMessage("");
    }
  }

  function resetResult() {
    outputText.value = "";
    resultBox.hidden = true;
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function showResult(value) {
    outputText.value = value;
    resultBox.hidden = false;
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
  }

  function announceActionSuccess() {
    setInlineMessage("Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
    }
  }

  function switchTool() {
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== toolSelector.value;
    });

    primaryBtn.textContent = labels[toolSelector.value];

    resetResult();
    clearPersistentMessage();
  }

  function encodeUrl({ announce = true } = {}) {
    const input = byId("encodeInput");
    const value = input.value;

    if (!value) {
      notify("Please enter text to encode.", "error");
      input.focus();
      return false;
    }

    try {
      showResult(encodeURIComponent(value));

      if (announce) {
        announceActionSuccess();
      }

      return true;
    } catch {
      resetResult();
      notify("Unable to encode.", "error");
      return false;
    }
  }

  function decodeUrl({ announce = true } = {}) {
    const input = byId("decodeInput");
    const value = input.value;

    if (!value) {
      notify("Please enter text to decode.", "error");
      input.focus();
      return false;
    }

    try {
      showResult(decodeURIComponent(value));

      if (announce) {
        announceActionSuccess();
      }

      return true;
    } catch {
      resetResult();
      notify("Invalid encoded URL.", "error");
      return false;
    }
  }

  function parseUrl({ announce = true } = {}) {
    const input = byId("parseInput");
    const value = input.value.trim();

    if (!value) {
      notify("Please enter a URL.", "error");
      input.focus();
      return false;
    }

    let url;

    try {
      url = new URL(value);
    } catch {
      resetResult();
      notify("Invalid URL.", "error");
      input.focus();
      return false;
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      resetResult();
      notify("URL must use HTTP or HTTPS.", "error");
      input.focus();
      return false;
    }

    const lines = [
      `Protocol: ${url.protocol}`,
      `Host: ${url.host}`,
      `Hostname: ${url.hostname}`,
      `Port: ${url.port || "—"}`,
      `Pathname: ${url.pathname}`,
      `Search: ${url.search || "—"}`,
      `Hash: ${url.hash || "—"}`,
    ];

    const parameters = Array.from(url.searchParams.entries());

    if (parameters.length) {
      lines.push("", "Parameters", "------------------");

      parameters.forEach(([key, value]) => {
        lines.push(`${key} = ${value}`);
      });
    }

    showResult(lines.join("\n"));

    if (announce) {
      announceActionSuccess();
    }

    return true;
  }

  function buildUtm({ announce = true } = {}) {
    const urlInput = byId("utmUrl");
    const source = byId("utmSource").value.trim();
    const medium = byId("utmMedium").value.trim();
    const campaign = byId("utmCampaign").value.trim();
    const term = byId("utmTerm").value.trim();
    const content = byId("utmContent").value.trim();

    if (!urlInput.value.trim()) {
      notify("Website URL required.", "error");
      urlInput.focus();
      return false;
    }

    if (!source) {
      notify("UTM source is required.", "error");
      byId("utmSource").focus();
      return false;
    }

    if (!medium) {
      notify("UTM medium is required.", "error");
      byId("utmMedium").focus();
      return false;
    }

    if (!campaign) {
      notify("UTM campaign is required.", "error");
      byId("utmCampaign").focus();
      return false;
    }

    let url;

    try {
      url = new URL(urlInput.value.trim());
    } catch {
      resetResult();
      notify("Invalid website URL.", "error");
      urlInput.focus();
      return false;
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      resetResult();
      notify("Website URL must use HTTP or HTTPS.", "error");
      urlInput.focus();
      return false;
    }

    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", medium);
    url.searchParams.set("utm_campaign", campaign);

    if (term) {
      url.searchParams.set("utm_term", term);
    } else {
      url.searchParams.delete("utm_term");
    }

    if (content) {
      url.searchParams.set("utm_content", content);
    } else {
      url.searchParams.delete("utm_content");
    }

    showResult(url.toString());

    if (announce) {
      announceActionSuccess();
    }

    return true;
  }

  const operations = {
    encode: encodeUrl,
    decode: decodeUrl,
    parse: parseUrl,
    utm: buildUtm,
  };

  function runPrimaryAction() {
    const operation = operations[toolSelector.value];

    if (operation) {
      operation();
    }
  }

  async function copyResult() {
    if (!outputText.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(outputText.value);
  }

  function downloadResult() {
    if (!outputText.value) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    const suffix = toolSelector.value;

    window.downloadFile(
      `xavert-url-${suffix}.txt`,
      outputText.value,
      "text/plain;charset=utf-8",
    );
  }

  function clearAll() {
    [
      "encodeInput",
      "decodeInput",
      "parseInput",
      "utmUrl",
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "utmTerm",
      "utmContent",
    ].forEach((id) => {
      byId(id).value = "";
    });

    resetResult();
    clearPersistentMessage();

    const focusByMode = {
      encode: "encodeInput",
      decode: "decodeInput",
      parse: "parseInput",
      utm: "utmUrl",
    };

    byId(focusByMode[toolSelector.value]).focus();
  }

  function runSample(mode, handler) {
    window.setTimeout(() => {
      if (toolSelector.value !== mode) {
        return;
      }

      const completed = handler({ announce: false });

      if (!completed) {
        return;
      }

      setInlineMessage("Sample loaded successfully.", "success");

      if (typeof window.showSampleSuccess === "function") {
        window.showSampleSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Sample loaded successfully.", "success");
      }
    }, 0);
  }

  [
    ["encodeSampleBtn", "encode", encodeUrl],
    ["decodeSampleBtn", "decode", decodeUrl],
    ["parseSampleBtn", "parse", parseUrl],
    ["utmSampleBtn", "utm", buildUtm],
  ].forEach(([buttonId, mode, handler]) => {
    const button = byId(buttonId);

    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      runSample(mode, handler);
    });
  });

  [
    "encodeInput",
    "decodeInput",
    "parseInput",
    "utmUrl",
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "utmTerm",
    "utmContent",
  ].forEach((id) => {
    byId(id).addEventListener("input", () => {
      if (!resultBox.hidden) {
        resetResult();
      }

      clearPersistentMessage();
    });
  });

  toolSelector.addEventListener("change", switchTool);

  primaryBtn.addEventListener("click", runPrimaryAction);

  copyBtn.addEventListener("click", () => {
    void copyResult();
  });

  downloadBtn.addEventListener("click", downloadResult);
  clearBtn.addEventListener("click", clearAll);

  copyBtn.disabled = true;
  downloadBtn.disabled = true;

  switchTool();
}

initUrlToolkit();
