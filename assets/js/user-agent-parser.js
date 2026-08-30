"use strict";

function initUserAgentParser() {
  const userAgentInput = document.getElementById("userAgentInput");
  const parseBtn = document.getElementById("parseBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const currentBrowserBtn = document.getElementById("currentBrowserBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const resultBox = document.getElementById("resultBox");
  const reportOutput = document.getElementById("reportOutput");
  const browserStat = document.getElementById("browserStat");
  const osStat = document.getElementById("osStat");
  const deviceStat = document.getElementById("deviceStat");
  const modelStat = document.getElementById("modelStat");
  const botStat = document.getElementById("botStat");
  const engineStat = document.getElementById("engineStat");
  const architectureStat = document.getElementById("architectureStat");
  const reductionStat = document.getElementById("reductionStat");
  const message = document.getElementById("message");

  const required = [
    userAgentInput,
    parseBtn,
    sampleBtn,
    currentBrowserBtn,
    copyBtn,
    downloadBtn,
    clearBtn,
    resultBox,
    reportOutput,
    browserStat,
    osStat,
    deviceStat,
    modelStat,
    botStat,
    engineStat,
    architectureStat,
    reductionStat,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("User-Agent Parser: HTML and JS do not match.");
    return;
  }

  let activeClientHints = null;
  let activeClientHintsUa = "";

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

  function announceSuccess(text) {
    setInlineMessage(text, "success");

    if (typeof window.showMessage === "function") {
      window.showMessage(text, "success");
    }
  }

  function clearPersistentMessage() {
    if (typeof window.clearMessage === "function") {
      window.clearMessage();
    } else {
      setInlineMessage("");
    }
  }

  function firstMatch(text, regex) {
    const match = text.match(regex);
    return match ? match[1] : "";
  }

  function formatVersion(version) {
    return version || "Unknown";
  }

  function isIosUa(ua) {
    return /iPhone|iPad|iPod/i.test(ua);
  }

  function detectBrowser(ua) {
    const rules = [
      {
        regex: /HeadlessChrome\/([\d.]+)/i,
        name: "Headless Chrome",
        engine: "Blink",
      },
      {
        regex: /Electron\/([\d.]+)/i,
        name: "Electron",
        engine: "Blink",
      },
      {
        regex: /EdgiOS\/([\d.]+)/i,
        name: "Microsoft Edge",
        engine: "WebKit",
      },
      {
        regex: /EdgA\/([\d.]+)/i,
        name: "Microsoft Edge",
        engine: "Blink",
      },
      {
        regex: /Edg\/([\d.]+)/i,
        name: "Microsoft Edge",
        engine: "Blink",
      },
      {
        regex: /Edge\/([\d.]+)/i,
        name: "Microsoft Edge Legacy",
        engine: "EdgeHTML",
      },
      {
        regex: /OPiOS\/([\d.]+)/i,
        name: "Opera",
        engine: "WebKit",
      },
      {
        regex: /OPR\/([\d.]+)/i,
        name: "Opera",
        engine: "Blink",
      },
      {
        regex: /SamsungBrowser\/([\d.]+)/i,
        name: "Samsung Internet",
        engine: "Blink",
      },
      {
        regex: /Vivaldi\/([\d.]+)/i,
        name: "Vivaldi",
        engine: "Blink",
      },
      {
        regex: /YaBrowser\/([\d.]+)/i,
        name: "Yandex Browser",
        engine: "Blink",
      },
      {
        regex: /Silk\/([\d._-]+)/i,
        name: "Amazon Silk",
        engine: "Blink",
      },
      {
        regex: /DuckDuckGo\/([\d.]+)/i,
        name: "DuckDuckGo Browser",
        engine: isIosUa(ua) ? "WebKit" : "Blink",
      },
      {
        regex: /FxiOS\/([\d.]+)/i,
        name: "Mozilla Firefox",
        engine: "WebKit",
      },
      {
        regex: /Firefox\/([\d.]+)/i,
        name: "Mozilla Firefox",
        engine: "Gecko",
      },
      {
        regex: /CriOS\/([\d.]+)/i,
        name: "Google Chrome",
        engine: "WebKit",
      },
      {
        regex: /Chromium\/([\d.]+)/i,
        name: "Chromium",
        engine: "Blink",
      },
      {
        regex: /MSIE\s([\d.]+)/i,
        name: "Internet Explorer",
        engine: "Trident",
      },
      {
        regex: /Trident\/.*rv:([\d.]+)/i,
        name: "Internet Explorer",
        engine: "Trident",
      },
      {
        regex: /curl\/([\d.]+)/i,
        name: "curl",
        engine: "N/A",
      },
      {
        regex: /Wget\/([\d.]+)/i,
        name: "Wget",
        engine: "N/A",
      },
      {
        regex: /PostmanRuntime\/([\d.]+)/i,
        name: "Postman Runtime",
        engine: "N/A",
      },
      {
        regex: /python-requests\/([\d.]+)/i,
        name: "Python Requests",
        engine: "N/A",
      },
      {
        regex: /okhttp\/([\d.]+)/i,
        name: "OkHttp",
        engine: "N/A",
      },
      {
        regex: /Go-http-client\/([\d.]+)/i,
        name: "Go HTTP Client",
        engine: "N/A",
      },
    ];

    for (const rule of rules) {
      const match = ua.match(rule.regex);

      if (match) {
        return {
          name: rule.name,
          version: formatVersion(match[1]),
          engine: rule.engine,
          versionPrecision: "reported",
          note: "",
        };
      }
    }

    const chromeMatch = ua.match(/Chrome\/([\d.]+)/i);

    if (chromeMatch) {
      if (/;\s*wv\)|\bVersion\/4\.0\b.*\bChrome\//i.test(ua)) {
        return {
          name: "Android WebView",
          version: formatVersion(chromeMatch[1]),
          engine: "Blink",
          versionPrecision: "reported",
          note: "",
        };
      }

      return {
        name: "Google Chrome / Chromium-based",
        version: formatVersion(chromeMatch[1]),
        engine: "Blink",
        versionPrecision: "reported",
        note:
          "The Chrome token alone cannot reliably distinguish Google Chrome from every Chromium-based derivative.",
      };
    }

    if (
      /AppleWebKit\/[\d.]+/i.test(ua) &&
      /Mobile\/[A-Za-z0-9]+/i.test(ua) &&
      !/Safari\/[\d.]+/i.test(ua)
    ) {
      return {
        name: "iOS / iPadOS WebView",
        version: "Not exposed",
        engine: "WebKit",
        versionPrecision: "hidden",
        note: "",
      };
    }

    const safariMatch = ua.match(/Version\/([\d.]+).*Safari\/[\d.]+/i);

    if (
      safariMatch &&
      !/(Chrome|CriOS|Chromium|OPR|OPiOS|Edg|FxiOS)/i.test(ua)
    ) {
      return {
        name: "Safari",
        version: formatVersion(safariMatch[1]),
        engine: "WebKit",
        versionPrecision: "reported",
        note: "",
      };
    }

    return {
      name: "Unknown",
      version: "Unknown",
      engine: "Unknown",
      versionPrecision: "unknown",
      note: "",
    };
  }

  function detectUaReduction(ua, browser) {
    const reasons = [];
    const hiddenFields = [];
    const chromeVersion = ua.match(/(?:Chrome|Chromium)\/(\d+)\.(\d+)\.(\d+)\.(\d+)/i);
    const blinkFamily = browser.engine === "Blink" || /\bChrome\//i.test(ua);

    const frozenChromeVersion = Boolean(
      chromeVersion &&
        chromeVersion[2] === "0" &&
        chromeVersion[3] === "0" &&
        chromeVersion[4] === "0",
    );

    const androidFrozen = /Android 10;\s*K(?:[;)])/i.test(ua);
    const macFrozen = /Macintosh; Intel Mac OS X 10_15_7/i.test(ua);
    const windowsFrozen = /Windows NT 10\.0;\s*Win64;\s*x64/i.test(ua);
    const chromeOsFrozen = /CrOS x86_64 14541\.0\.0/i.test(ua);
    const linuxFrozen = /X11; Linux x86_64/i.test(ua);

    if (blinkFamily && frozenChromeVersion) {
      reasons.push("Chromium minor/build/patch version fields are zeroed.");
      hiddenFields.push("Chromium minor/build/patch version");
    }

    if (blinkFamily && androidFrozen) {
      reasons.push("Android uses the frozen \"Android 10; K\" platform value.");
      hiddenFields.push("Android version", "device model");
    }

    if (blinkFamily && frozenChromeVersion && macFrozen) {
      reasons.push("macOS uses the common frozen 10_15_7 platform value.");
      hiddenFields.push("macOS version", "hardware architecture");
    }

    if (blinkFamily && frozenChromeVersion && windowsFrozen) {
      reasons.push("Windows uses the common frozen NT 10.0 / Win64 / x64 platform value.");
      hiddenFields.push("exact Windows version", "hardware architecture");
    }

    if (blinkFamily && frozenChromeVersion && chromeOsFrozen) {
      reasons.push("ChromeOS uses the common frozen 14541.0.0 build value.");
      hiddenFields.push("ChromeOS version", "hardware architecture");
    }

    if (blinkFamily && frozenChromeVersion && linuxFrozen) {
      reasons.push("Linux uses the reduced Chromium platform form.");
      hiddenFields.push("hardware architecture");
    }

    const likely = reasons.length > 0;

    return {
      likely,
      reasons,
      hiddenFields: [...new Set(hiddenFields)],
      frozenChromeVersion,
      androidFrozen,
      macFrozen,
      windowsFrozen,
      chromeOsFrozen,
      linuxFrozen,
    };
  }

  function normalizeBrandName(brand) {
    const value = String(brand || "").trim();

    if (/Microsoft Edge/i.test(value)) return "Microsoft Edge";
    if (/Google Chrome/i.test(value)) return "Google Chrome";
    if (/Opera/i.test(value)) return "Opera";
    if (/Brave/i.test(value)) return "Brave";
    if (/Vivaldi/i.test(value)) return "Vivaldi";
    if (/Chromium/i.test(value)) return "Chromium";

    return value;
  }

  function isGreaseBrand(brand) {
    return /Not[\s_A;()/-]*A?[\s_A;()/-]*Brand/i.test(String(brand || ""));
  }

  function enrichBrowserWithClientHints(browser, hints) {
    if (!hints) {
      return browser;
    }

    const source =
      Array.isArray(hints.fullVersionList) && hints.fullVersionList.length
        ? hints.fullVersionList
        : Array.isArray(hints.brands)
          ? hints.brands
          : [];

    const cleaned = source.filter((item) => item && !isGreaseBrand(item.brand));
    const priorities = [
      /Microsoft Edge/i,
      /Google Chrome/i,
      /Opera/i,
      /Brave/i,
      /Vivaldi/i,
      /^Chromium$/i,
    ];

    let selected = null;

    for (const pattern of priorities) {
      selected = cleaned.find((item) => pattern.test(item.brand));

      if (selected) {
        break;
      }
    }

    if (!selected) {
      return browser;
    }

    return {
      ...browser,
      name: normalizeBrandName(selected.brand),
      version: selected.version || browser.version,
      engine: "Blink",
      versionPrecision:
        Array.isArray(hints.fullVersionList) && hints.fullVersionList.length
          ? "client-hints-full"
          : "client-hints-major",
      note: "Browser identity enriched with User-Agent Client Hints.",
    };
  }

  function detectOS(ua, reduction, hints) {
    if (hints?.platform) {
      const platform = String(hints.platform);
      const platformVersion = String(hints.platformVersion || "").trim();
      const versionSuffix =
        platformVersion && platformVersion !== "0.0.0"
          ? ` (platform version ${platformVersion} via Client Hints)`
          : "";

      return {
        display: `${platform}${versionSuffix}`,
        name: platform,
        version: platformVersion || "Not exposed",
        source: "Client Hints",
      };
    }

    if (/Windows NT 10\.0/i.test(ua)) {
      return {
        display: reduction.likely
          ? "Windows 10 / 11 (exact version not exposed)"
          : "Windows 10 / 11",
        name: "Windows",
        version: "10 / 11",
        source: "User-Agent",
      };
    }

    const windowsVersions = [
      [/Windows NT 6\.3/i, "Windows 8.1"],
      [/Windows NT 6\.2/i, "Windows 8"],
      [/Windows NT 6\.1/i, "Windows 7"],
      [/Windows NT 6\.0/i, "Windows Vista"],
      [/Windows NT 5\.1/i, "Windows XP"],
    ];

    for (const [regex, label] of windowsVersions) {
      if (regex.test(ua)) {
        return {
          display: label,
          name: "Windows",
          version: label.replace("Windows ", ""),
          source: "User-Agent",
        };
      }
    }

    if (/Macintosh/i.test(ua) && /Mobile\/[A-Za-z0-9]+/i.test(ua)) {
      const version = firstMatch(ua, /CPU (?:iPhone )?OS ([\d_]+)/i).replace(
        /_/g,
        ".",
      );

      return {
        display: version ? `iPadOS ${version}` : "iPadOS",
        name: "iPadOS",
        version: version || "Not exposed",
        source: "User-Agent",
      };
    }

    const androidVersion = firstMatch(ua, /Android\s+([\d.]+)/i);

    if (/Android/i.test(ua)) {
      return {
        display: reduction.androidFrozen
          ? "Android (version hidden by reduced UA)"
          : androidVersion
            ? `Android ${androidVersion}`
            : "Android",
        name: "Android",
        version: reduction.androidFrozen
          ? "Hidden by reduced UA"
          : androidVersion || "Not exposed",
        source: "User-Agent",
      };
    }

    const iosVersion = firstMatch(
      ua,
      /(?:iPhone|CPU(?: iPhone)?) OS ([\d_]+)/i,
    ).replace(/_/g, ".");

    if (/iPhone|iPod/i.test(ua)) {
      return {
        display: iosVersion ? `iOS ${iosVersion}` : "iOS",
        name: "iOS",
        version: iosVersion || "Not exposed",
        source: "User-Agent",
      };
    }

    const ipadVersion = firstMatch(ua, /CPU OS ([\d_]+)/i).replace(/_/g, ".");

    if (/iPad/i.test(ua)) {
      return {
        display: ipadVersion ? `iPadOS ${ipadVersion}` : "iPadOS",
        name: "iPadOS",
        version: ipadVersion || "Not exposed",
        source: "User-Agent",
      };
    }

    const macVersion = firstMatch(ua, /Mac OS X ([\d_]+)/i).replace(/_/g, ".");

    if (/Macintosh|Mac OS X/i.test(ua)) {
      return {
        display: reduction.macFrozen
          ? "macOS (version hidden by reduced UA)"
          : macVersion
            ? `macOS ${macVersion}`
            : "macOS",
        name: "macOS",
        version: reduction.macFrozen
          ? "Hidden by reduced UA"
          : macVersion || "Not exposed",
        source: "User-Agent",
      };
    }

    const chromeOsVersion = firstMatch(ua, /CrOS\s+[^\s;]+\s+([\d.]+)/i);

    if (/CrOS/i.test(ua)) {
      return {
        display: reduction.chromeOsFrozen
          ? "ChromeOS (version hidden by reduced UA)"
          : chromeOsVersion
            ? `ChromeOS ${chromeOsVersion}`
            : "ChromeOS",
        name: "ChromeOS",
        version: reduction.chromeOsFrozen
          ? "Hidden by reduced UA"
          : chromeOsVersion || "Not exposed",
        source: "User-Agent",
      };
    }

    const tizenVersion = firstMatch(ua, /Tizen[\s/]([\d.]+)/i);
    if (/Tizen/i.test(ua)) {
      return {
        display: tizenVersion ? `Tizen ${tizenVersion}` : "Tizen",
        name: "Tizen",
        version: tizenVersion || "Not exposed",
        source: "User-Agent",
      };
    }

    if (/webOS|Web0S/i.test(ua)) {
      const webOsVersion = firstMatch(ua, /(?:webOS|Web0S)[\s/]([\d.]+)/i);
      return {
        display: webOsVersion ? `webOS ${webOsVersion}` : "webOS",
        name: "webOS",
        version: webOsVersion || "Not exposed",
        source: "User-Agent",
      };
    }

    if (/KaiOS/i.test(ua)) {
      const kaiVersion = firstMatch(ua, /KaiOS\/([\d.]+)/i);
      return {
        display: kaiVersion ? `KaiOS ${kaiVersion}` : "KaiOS",
        name: "KaiOS",
        version: kaiVersion || "Not exposed",
        source: "User-Agent",
      };
    }

    if (/Ubuntu/i.test(ua)) {
      return {
        display: "Ubuntu Linux",
        name: "Linux",
        version: "Ubuntu",
        source: "User-Agent",
      };
    }

    if (/Linux/i.test(ua)) {
      return {
        display: "Linux",
        name: "Linux",
        version: "Not exposed",
        source: "User-Agent",
      };
    }

    return {
      display: "Unknown",
      name: "Unknown",
      version: "Unknown",
      source: "User-Agent",
    };
  }

  function detectBot(ua) {
    const bots = [
      [/Google-InspectionTool/i, "Google Inspection Tool"],
      [/GoogleOther/i, "GoogleOther"],
      [/AdsBot-Google/i, "AdsBot-Google"],
      [/Mediapartners-Google/i, "Mediapartners-Google"],
      [/Googlebot/i, "Googlebot"],
      [/bingpreview/i, "Bing Preview"],
      [/bingbot/i, "Bingbot"],
      [/DuckDuckBot/i, "DuckDuckBot"],
      [/YandexBot/i, "YandexBot"],
      [/Baiduspider/i, "Baiduspider"],
      [/Yahoo! Slurp|\bSlurp\b/i, "Yahoo Slurp"],
      [/Applebot/i, "Applebot"],
      [/PetalBot/i, "PetalBot"],
      [/Bytespider/i, "Bytespider"],
      [/OAI-SearchBot/i, "OAI-SearchBot"],
      [/ChatGPT-User/i, "ChatGPT-User"],
      [/GPTBot/i, "GPTBot"],
      [/Claude-User/i, "Claude-User"],
      [/ClaudeBot/i, "ClaudeBot"],
      [/PerplexityBot/i, "PerplexityBot"],
      [/Amazonbot/i, "Amazonbot"],
      [/CCBot/i, "CCBot"],
      [/AhrefsBot/i, "AhrefsBot"],
      [/SemrushBot/i, "SemrushBot"],
      [/MJ12bot/i, "MJ12bot"],
      [/DotBot/i, "DotBot"],
      [/facebookexternalhit/i, "Facebook External Hit"],
      [/\bFacebot\b/i, "Facebook Bot"],
      [/Twitterbot/i, "Twitterbot"],
      [/LinkedInBot/i, "LinkedInBot"],
      [/Discordbot/i, "Discordbot"],
      [/Slackbot/i, "Slackbot"],
      [/TelegramBot/i, "TelegramBot"],
      [/WhatsApp/i, "WhatsApp Link Preview"],
    ];

    for (const [regex, name] of bots) {
      if (regex.test(ua)) {
        return { detected: true, name };
      }
    }

    if (/\b(?:bot|crawler|spider)\b/i.test(ua)) {
      return { detected: true, name: "Generic bot / crawler" };
    }

    return { detected: false, name: "" };
  }

  function detectDeviceType(ua, bot, hints) {
    if (bot.detected) return "Bot";

    if (typeof hints?.mobile === "boolean") {
      if (hints.mobile) return "Mobile";
      if (/Android/i.test(String(hints.platform || ""))) return "Tablet";
    }

    if (/HbbTV|SMART-TV|SmartTV|Tizen.+TV|Web0S|webOS.+TV|NetCast/i.test(ua)) {
      return "Smart TV";
    }

    if (/PlayStation|Xbox|Nintendo/i.test(ua)) {
      return "Game Console";
    }

    if (/iPad|Tablet|Kindle|Silk|Nexus 7|Nexus 9|Nexus 10/i.test(ua)) {
      return "Tablet";
    }

    if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
      return "Tablet";
    }

    if (/Mobi|iPhone|iPod|Windows Phone|IEMobile/i.test(ua)) {
      return "Mobile";
    }

    if (/curl|Wget|PostmanRuntime|python-requests|okhttp|Go-http-client/i.test(ua)) {
      return "HTTP Client";
    }

    return "Desktop";
  }

  function detectDeviceModel(ua, reduction, hints) {
    const hintModel = String(hints?.model || "").trim();

    if (hintModel) {
      return hintModel;
    }

    if (reduction.androidFrozen) {
      return "Hidden by reduced UA";
    }

    if (/iPhone/i.test(ua)) return "iPhone (exact model not exposed)";
    if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile\//i.test(ua))) {
      return "iPad (exact model not exposed)";
    }

    const buildModel = firstMatch(
      ua,
      /Android\s+[^;()]+;(?:\s*[^;()]+;)*\s*([^;()]+?)\s+Build\//i,
    );

    if (buildModel) {
      return buildModel.trim();
    }

    const windowsPhone = firstMatch(ua, /Microsoft;\s*([^;)]+)\)/i);
    if (windowsPhone) return windowsPhone.trim();

    return reduction.likely && /Android/i.test(ua)
      ? "Not reliably exposed"
      : "Not exposed";
  }

  function detectArchitecture(ua, reduction, hints) {
    const hintArchitecture = String(hints?.architecture || "").trim();
    const bitness = String(hints?.bitness || "").trim();

    if (hintArchitecture || bitness) {
      const parts = [];

      if (hintArchitecture) {
        const architectureMap = {
          x86: "x86",
          arm: "ARM",
        };
        parts.push(architectureMap[hintArchitecture.toLowerCase()] || hintArchitecture);
      }

      if (bitness) {
        parts.push(`${bitness}-bit`);
      }

      if (hints?.wow64 === true) {
        parts.push("32-bit process on 64-bit Windows");
      }

      return parts.join(" · ") || "Not exposed";
    }

    if (
      reduction.likely &&
      (reduction.windowsFrozen ||
        reduction.macFrozen ||
        reduction.chromeOsFrozen ||
        reduction.linuxFrozen)
    ) {
      return "Not reliable in reduced UA";
    }

    if (/Macintosh; Intel Mac OS X/i.test(ua)) {
      return "Not reliably exposed";
    }

    if (/iPhone|iPad|iPod/i.test(ua)) {
      return "Not exposed";
    }

    if (/WOW64/i.test(ua)) return "32-bit app on 64-bit Windows";
    if (/arm64|aarch64/i.test(ua)) return "ARM64";
    if (/\barmv?8\b|\barmv?7\b|\barm\b/i.test(ua)) return "ARM";
    if (/Win64|x64|x86_64|amd64/i.test(ua)) return "64-bit";
    if (/i[3-6]86|\bx86\b/i.test(ua)) return "32-bit";

    return "Not exposed";
  }

  function getUaDetailLabel(reduction, hints) {
    if (hints && reduction.likely) return "Reduced + Client Hints";
    if (hints) return "Client Hints enriched";
    if (reduction.likely) return "Likely reduced";
    return "UA string only";
  }

  function getBrowserVersionDescription(browser, reduction) {
    if (browser.versionPrecision === "client-hints-full") {
      return `${browser.version} (full version from Client Hints)`;
    }

    if (browser.versionPrecision === "client-hints-major") {
      return `${browser.version} (brand version from Client Hints)`;
    }

    if (
      reduction.frozenChromeVersion &&
      /Google Chrome|Chromium|Headless Chrome|Android WebView/i.test(browser.name) &&
      /^\d+\.0\.0\.0$/.test(browser.version)
    ) {
      return `${browser.version} (major version only; lower components reduced)`;
    }

    return browser.version;
  }

  function formatClientHintBrands(hints) {
    const list =
      Array.isArray(hints?.fullVersionList) && hints.fullVersionList.length
        ? hints.fullVersionList
        : Array.isArray(hints?.brands)
          ? hints.brands
          : [];

    return list
      .filter((item) => item && !isGreaseBrand(item.brand))
      .map((item) => `${item.brand} ${item.version}`)
      .join(", ");
  }

  function resetResult() {
    reportOutput.textContent = "";
    resultBox.hidden = true;
    browserStat.textContent = "—";
    osStat.textContent = "—";
    deviceStat.textContent = "—";
    modelStat.textContent = "—";
    botStat.textContent = "No";
    engineStat.textContent = "—";
    architectureStat.textContent = "—";
    reductionStat.textContent = "—";
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function buildReport({
    ua,
    browser,
    os,
    device,
    model,
    bot,
    architecture,
    reduction,
    hints,
  }) {
    const report = [
      "USER-AGENT ANALYSIS",
      "",
      "Browser / Client",
      "--------------------",
      `Name: ${browser.name}`,
      `Version: ${getBrowserVersionDescription(browser, reduction)}`,
      `Rendering Engine: ${browser.engine}`,
    ];

    if (browser.note) {
      report.push(`Note: ${browser.note}`);
    }

    report.push(
      "",
      "Operating System",
      "--------------------",
      `Platform: ${os.display}`,
      `Source: ${os.source}`,
      "",
      "Device",
      "--------------------",
      `Type: ${device}`,
      `Model: ${model}`,
      `Architecture: ${architecture}`,
      "",
      "Bot / Crawler",
      "--------------------",
      bot.detected ? `Detected: ${bot.name}` : "No known bot detected",
      "",
      "User-Agent Detail",
      "--------------------",
      `Status: ${getUaDetailLabel(reduction, hints)}`,
    );

    if (reduction.likely) {
      reduction.reasons.forEach((reason) => report.push(`- ${reason}`));

      if (reduction.hiddenFields.length) {
        report.push(`Reduced UA string hides or freezes: ${reduction.hiddenFields.join(", ")}`);
        if (hints) {
          report.push("Client Hints supplied additional details where available.");
        }
      }
    } else {
      report.push("No obvious Chromium User-Agent Reduction pattern detected.");
    }

    if (hints) {
      const brands = formatClientHintBrands(hints);

      report.push("", "Client Hints (current browser only)", "--------------------");

      if (brands) report.push(`Brands: ${brands}`);
      if (hints.platform) report.push(`Platform: ${hints.platform}`);
      if (hints.platformVersion) {
        report.push(`Platform Version: ${hints.platformVersion}`);
      }
      if (hints.architecture) report.push(`Architecture: ${hints.architecture}`);
      if (hints.bitness) report.push(`Bitness: ${hints.bitness}`);
      if (hints.model) report.push(`Model: ${hints.model}`);
      if (typeof hints.mobile === "boolean") {
        report.push(`Mobile: ${hints.mobile ? "Yes" : "No"}`);
      }
      if (typeof hints.wow64 === "boolean") {
        report.push(`WOW64: ${hints.wow64 ? "Yes" : "No"}`);
      }
    }

    report.push(
      "",
      "Reliability",
      "--------------------",
      "User-Agent strings can be reduced, frozen or spoofed. Results are best-effort and should not be used as a substitute for feature detection.",
      "",
      "Original User-Agent",
      "--------------------",
      ua,
    );

    return report.join("\n");
  }

  function parseUserAgent({ announce = true, hints = null } = {}) {
    const ua = userAgentInput.value.trim();

    if (!ua) {
      resetResult();
      notify("Paste a User-Agent string first.", "error");
      userAgentInput.focus();
      return false;
    }

    const usableHints = hints || (activeClientHintsUa === ua ? activeClientHints : null);
    let browser = detectBrowser(ua);
    const preliminaryReduction = detectUaReduction(ua, browser);

    browser = enrichBrowserWithClientHints(browser, usableHints);

    const reduction = detectUaReduction(ua, browser);
    const os = detectOS(ua, reduction, usableHints);
    const bot = detectBot(ua);
    const device = detectDeviceType(ua, bot, usableHints);
    const model = detectDeviceModel(ua, reduction, usableHints);
    const architecture = detectArchitecture(ua, reduction, usableHints);

    if (
      preliminaryReduction.frozenChromeVersion &&
      browser.versionPrecision === "reported" &&
      /^\d+\.0\.0\.0$/.test(browser.version)
    ) {
      browser.versionPrecision = "reduced";
    }

    browserStat.textContent =
      browser.version && !["Unknown", "Not exposed"].includes(browser.version)
        ? `${browser.name} ${browser.version}`
        : browser.name;
    engineStat.textContent = browser.engine;
    osStat.textContent = os.display;
    deviceStat.textContent = device;
    modelStat.textContent = model;
    botStat.textContent = bot.detected ? "Yes" : "No";
    architectureStat.textContent = architecture;
    reductionStat.textContent = getUaDetailLabel(reduction, usableHints);

    reportOutput.textContent = buildReport({
      ua,
      browser,
      os,
      device,
      model,
      bot,
      architecture,
      reduction,
      hints: usableHints,
    });

    resultBox.hidden = false;
    copyBtn.disabled = false;
    downloadBtn.disabled = false;

    if (announce) {
      announceSuccess("User-Agent parsed successfully.");
    }

    return true;
  }

  async function getCurrentBrowserClientHints() {
    const data = navigator.userAgentData;

    if (!data) {
      return null;
    }

    const hints = {
      brands: Array.isArray(data.brands) ? data.brands : [],
      mobile: typeof data.mobile === "boolean" ? data.mobile : undefined,
      platform: data.platform || "",
    };

    if (typeof data.getHighEntropyValues !== "function") {
      return hints;
    }

    try {
      const highEntropy = await data.getHighEntropyValues([
        "architecture",
        "bitness",
        "fullVersionList",
        "model",
        "platformVersion",
        "wow64",
      ]);

      return { ...hints, ...highEntropy };
    } catch (error) {
      console.warn("User-Agent Parser: Client Hints were not fully available.", error);
      return hints;
    }
  }

  function loadSample() {
    activeClientHints = null;
    activeClientHintsUa = "";

    userAgentInput.value =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/143.0.0.0 Safari/537.36";

    resetResult();
    clearPersistentMessage();

    const parsed = parseUserAgent({ announce: false });

    if (!parsed) {
      return;
    }

    announceSuccess("Sample loaded successfully.");
    userAgentInput.focus();
  }

  async function useCurrentBrowser() {
    const currentUa = String(navigator.userAgent || "").trim();

    if (!currentUa) {
      notify("The current browser did not expose a User-Agent string.", "error");
      return;
    }

    currentBrowserBtn.disabled = true;
    userAgentInput.value = currentUa;
    resetResult();
    clearPersistentMessage();

    try {
      activeClientHints = await getCurrentBrowserClientHints();
      activeClientHintsUa = currentUa;

      const parsed = parseUserAgent({ announce: false, hints: activeClientHints });

      if (parsed) {
        announceSuccess(
          activeClientHints
            ? "Current browser analyzed with available Client Hints."
            : "Current browser User-Agent analyzed successfully.",
        );
      }
    } finally {
      currentBrowserBtn.disabled = false;
    }
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
    activeClientHints = null;
    activeClientHintsUa = "";
    resetResult();
    clearPersistentMessage();
    userAgentInput.focus();
  }

  userAgentInput.addEventListener("input", () => {
    activeClientHints = null;
    activeClientHintsUa = "";

    if (!resultBox.hidden) {
      resetResult();
    }

    clearPersistentMessage();
  });

  parseBtn.addEventListener("click", () => {
    parseUserAgent();
  });

  sampleBtn.addEventListener("click", loadSample);

  currentBrowserBtn.addEventListener("click", () => {
    void useCurrentBrowser();
  });

  copyBtn.addEventListener("click", () => {
    void copyReport();
  });

  downloadBtn.addEventListener("click", downloadReport);
  clearBtn.addEventListener("click", clearTool);

  resetResult();
}

initUserAgentParser();
