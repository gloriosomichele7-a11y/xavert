"use strict";

function initUserAgentParser() {
  const userAgentInput = document.getElementById("userAgentInput");
  const parseBtn = document.getElementById("parseBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const resultBox = document.getElementById("resultBox");
  const reportOutput = document.getElementById("reportOutput");
  const browserStat = document.getElementById("browserStat");
  const osStat = document.getElementById("osStat");
  const deviceStat = document.getElementById("deviceStat");
  const botStat = document.getElementById("botStat");
  const engineStat = document.getElementById("engineStat");
  const architectureStat = document.getElementById("architectureStat");
  const message = document.getElementById("message");

  const required = [
    userAgentInput,
    parseBtn,
    sampleBtn,
    copyBtn,
    downloadBtn,
    clearBtn,
    resultBox,
    reportOutput,
    browserStat,
    osStat,
    deviceStat,
    botStat,
    engineStat,
    architectureStat,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("User-Agent Parser: HTML and JS do not match.");
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

  function clearPersistentMessage() {
    if (typeof window.clearMessage === "function") {
      window.clearMessage();
    } else {
      setInlineMessage("");
    }
  }

  function getMatch(text, regex) {
    const match = text.match(regex);
    return match ? match[1] : "";
  }

  function detectBrowser(ua) {
    const tests = [
      [/EdgA\/([\d.]+)/, "Microsoft Edge", "Blink"],
      [/EdgiOS\/([\d.]+)/, "Microsoft Edge", "WebKit"],
      [/Edg\/([\d.]+)/, "Microsoft Edge", "Blink"],
      [/OPR\/([\d.]+)/, "Opera", "Blink"],
      [/SamsungBrowser\/([\d.]+)/, "Samsung Internet", "Blink"],
      [/CriOS\/([\d.]+)/, "Google Chrome", "WebKit"],
      [/Chrome\/([\d.]+)/, "Google Chrome", "Blink"],
      [/FxiOS\/([\d.]+)/, "Mozilla Firefox", "WebKit"],
      [/Firefox\/([\d.]+)/, "Mozilla Firefox", "Gecko"],
    ];

    for (const [regex, name, engine] of tests) {
      if (regex.test(ua)) {
        return { name, version: getMatch(ua, regex), engine };
      }
    }

    if (
      /Version\/([\d.]+).*Safari/.test(ua) &&
      !/(Chrome|CriOS|Chromium|OPR|Edg)/.test(ua)
    ) {
      return {
        name: "Safari",
        version: getMatch(ua, /Version\/([\d.]+)/),
        engine: "WebKit",
      };
    }

    return { name: "Unknown", version: "Unknown", engine: "Unknown" };
  }

  function detectOS(ua) {
    if (/Windows NT 10.0/.test(ua)) return "Windows 10 / 11";
    if (/Windows NT 6.3/.test(ua)) return "Windows 8.1";
    if (/Windows NT 6.2/.test(ua)) return "Windows 8";
    if (/Windows NT 6.1/.test(ua)) return "Windows 7";

    if (/Android ([\d.]+)/.test(ua)) {
      return `Android ${getMatch(ua, /Android ([\d.]+)/)}`;
    }

    if (/iPhone OS ([\d_]+)/.test(ua)) {
      return `iOS ${getMatch(ua, /iPhone OS ([\d_]+)/).replace(/_/g, ".")}`;
    }

    if (/CPU OS ([\d_]+)/.test(ua)) {
      return `iPadOS ${getMatch(ua, /CPU OS ([\d_]+)/).replace(/_/g, ".")}`;
    }

    if (/Mac OS X ([\d_]+)/.test(ua)) {
      return `macOS ${getMatch(ua, /Mac OS X ([\d_]+)/).replace(/_/g, ".")}`;
    }

    if (/CrOS/.test(ua)) return "ChromeOS";
    if (/Linux/.test(ua)) return "Linux";

    return "Unknown";
  }

  function detectDevice(ua) {
    if (/bot|crawler|spider|slurp|bingpreview/i.test(ua)) return "Bot";
    if (/iPad|Tablet|Nexus 7|Nexus 10/i.test(ua)) return "Tablet";
    if (/Mobi|iPhone|Android/i.test(ua)) return "Mobile";
    return "Desktop";
  }

  function detectBot(ua) {
    const bots = [
      "Googlebot",
      "Bingbot",
      "DuckDuckBot",
      "YandexBot",
      "Baiduspider",
      "Slurp",
      "facebookexternalhit",
      "Twitterbot",
      "LinkedInBot",
      "Applebot",
      "AhrefsBot",
      "SemrushBot",
    ];

    return (
      bots.find((bot) => ua.toLowerCase().includes(bot.toLowerCase())) || ""
    );
  }

  function detectArchitecture(ua) {
    if (/WOW64/i.test(ua)) return "32-bit app on 64-bit Windows";
    if (/arm64|aarch64/i.test(ua)) return "ARM64";
    if (/arm/i.test(ua)) return "ARM";
    if (/Win64|x64|x86_64|amd64/i.test(ua)) return "64-bit";
    if (/i[3-6]86|x86/i.test(ua)) return "32-bit";

    return "Unknown";
  }

  function resetResult() {
    reportOutput.textContent = "";
    resultBox.hidden = true;
    browserStat.textContent = "—";
    osStat.textContent = "—";
    deviceStat.textContent = "—";
    botStat.textContent = "No";
    engineStat.textContent = "—";
    architectureStat.textContent = "—";
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function parseUserAgent({ announce = true } = {}) {
    const ua = userAgentInput.value.trim();

    if (!ua) {
      resetResult();
      notify("Paste a User-Agent string first.", "error");
      userAgentInput.focus();
      return false;
    }

    const browser = detectBrowser(ua);
    const os = detectOS(ua);
    const device = detectDevice(ua);
    const bot = detectBot(ua);
    const architecture = detectArchitecture(ua);

    browserStat.textContent =
      browser.version !== "Unknown"
        ? `${browser.name} ${browser.version}`
        : browser.name;

    engineStat.textContent = browser.engine;
    osStat.textContent = os;
    deviceStat.textContent = device;
    botStat.textContent = bot ? "Yes" : "No";
    architectureStat.textContent = architecture;

    reportOutput.textContent = [
      "USER-AGENT ANALYSIS",
      "",
      "Browser",
      "--------------------",
      `Name: ${browser.name}`,
      `Version: ${browser.version}`,
      `Rendering Engine: ${browser.engine}`,
      "",
      "Operating System",
      "--------------------",
      os,
      "",
      "Device",
      "--------------------",
      `Type: ${device}`,
      `Architecture: ${architecture}`,
      "",
      "Bot / Crawler",
      "--------------------",
      bot ? `Detected: ${bot}` : "No known bot detected",
      "",
      "Original User-Agent",
      "--------------------",
      ua,
    ].join("\n");

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
  }

  function loadSample() {
    userAgentInput.value =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/120.0.0.0 Safari/537.36";

    resetResult();
    clearPersistentMessage();

    const parsed = parseUserAgent({ announce: false });

    if (!parsed) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    userAgentInput.focus();
  }

  async function copyReport() {
    if (!reportOutput.textContent) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(reportOutput.textContent);
  }

  function downloadReport() {
    if (!reportOutput.textContent) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-user-agent-report.txt",
      reportOutput.textContent,
      "text/plain;charset=utf-8",
    );
  }

  function clearTool() {
    userAgentInput.value = "";
    resetResult();
    clearPersistentMessage();
    userAgentInput.focus();
  }

  userAgentInput.addEventListener("input", () => {
    if (!resultBox.hidden) {
      resetResult();
    }

    clearPersistentMessage();
  });

  parseBtn.addEventListener("click", () => {
    parseUserAgent();
  });

  sampleBtn.addEventListener("click", loadSample);

  copyBtn.addEventListener("click", () => {
    void copyReport();
  });

  downloadBtn.addEventListener("click", downloadReport);
  clearBtn.addEventListener("click", clearTool);

  resetResult();
}

initUserAgentParser();
