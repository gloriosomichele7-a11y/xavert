"use strict";

const ENV_GENERATOR_TOOL_ID = "env-generator";

function initEnvGenerator() {
  const appNameInput = document.getElementById("appName");
  const appKeyInput = document.getElementById("appKey");
  const appEnvSelect = document.getElementById("appEnv");
  const appDebugSelect = document.getElementById("appDebug");
  const appUrlInput = document.getElementById("appUrl");
  const dbConnectionSelect = document.getElementById("dbConnection");
  const dbHostInput = document.getElementById("dbHost");
  const dbPortInput = document.getElementById("dbPort");
  const dbNameInput = document.getElementById("dbName");
  const dbUserInput = document.getElementById("dbUser");
  const dbPasswordInput = document.getElementById("dbPassword");
  const outputTextarea = document.getElementById("output");
  const message = document.getElementById("message");
  const generateAppKeyButton = document.querySelector(
    "[data-action='generate-app-key']",
  );
  const generateDbPasswordButton = document.querySelector(
    "[data-action='generate-db-password']",
  );
  const toggleAppKeyButton = document.querySelector(
    "[data-action='toggle-app-key']",
  );
  const toggleDbPasswordButton = document.querySelector(
    "[data-action='toggle-db-password']",
  );
  const generateEnvButton = document.querySelector(
    "[data-action='generate-env']",
  );
  const copyButton = document.querySelector("[data-action='copy-output']");
  const downloadButton = document.querySelector(
    "[data-action='download-output']",
  );
  const sampleButton = document.querySelector("[data-action='load-sample']");
  const clearButton = document.querySelector("[data-action='clear-all']");

  const requiredElements = [
    appNameInput,
    appKeyInput,
    appEnvSelect,
    appDebugSelect,
    appUrlInput,
    dbConnectionSelect,
    dbHostInput,
    dbPortInput,
    dbNameInput,
    dbUserInput,
    dbPasswordInput,
    outputTextarea,
    message,
    generateAppKeyButton,
    generateDbPasswordButton,
    toggleAppKeyButton,
    toggleDbPasswordButton,
    generateEnvButton,
    copyButton,
    downloadButton,
    sampleButton,
    clearButton,
  ];

  const missingElements = requiredElements.filter((element) => !element);

  if (missingElements.length > 0) {
    console.error("Env generator missing required elements", missingElements);
    return;
  }

  const hasSecureCrypto =
    window.isSecureContext &&
    window.crypto &&
    typeof window.crypto.getRandomValues === "function";

  function setInlineMessage(text = "", type = "info") {
    if (!message) return;

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

    if (text && useToast && typeof showMessage === "function") {
      showMessage(text, type);
    }
  }

  function updateActionButtons() {
    const hasOutput = Boolean(outputTextarea.value.trim());

    copyButton.disabled = !hasOutput;
    downloadButton.disabled = !hasOutput;
  }

  function invalidateOutput() {
    if (!outputTextarea.value) {
      return;
    }

    outputTextarea.value = "";
    outputTextarea.scrollTop = 0;

    updateActionButtons();

    setInlineMessage("Configuration changed. Generate the .ENV again.", "info");
  }

  function getSecureRandomChar(chars) {
    if (!chars) {
      throw new Error("Character set cannot be empty.");
    }

    const maxValidValue = Math.floor(0x100000000 / chars.length) * chars.length;

    const randomArray = new Uint32Array(1);

    do {
      window.crypto.getRandomValues(randomArray);
    } while (randomArray[0] >= maxValidValue);

    return chars.charAt(randomArray[0] % chars.length);
  }

  function generateAppKey({ notifyUser = true } = {}) {
    if (!hasSecureCrypto) {
      notify(
        "Secure random generation is not available in this browser context.",
        "error",
      );
      return;
    }
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);

    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    const key = `base64:${btoa(binary)}`;
    appKeyInput.value = key;
    invalidateOutput();

    if (notifyUser) {
      notify("APP_KEY generated.", "success");
    }

    return key;
  }

  function generateDbPassword({ notifyUser = true } = {}) {
    if (!hasSecureCrypto) {
      notify(
        "Secure random generation is not available in this browser context.",
        "error",
      );
      return;
    }
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const lowercase = "abcdefghijklmnopqrstuvwxyz";

    const numbers = "0123456789";

    const symbols = "!@#$%^&*";

    const allChars = uppercase + lowercase + numbers + symbols;

    const passwordChars = [
      getSecureRandomChar(uppercase),
      getSecureRandomChar(lowercase),
      getSecureRandomChar(numbers),
      getSecureRandomChar(symbols),
    ];

    while (passwordChars.length < 24) {
      passwordChars.push(getSecureRandomChar(allChars));
    }

    for (let i = passwordChars.length - 1; i > 0; i -= 1) {
      const randomArray = new Uint32Array(1);

      const range = i + 1;

      const maxValidValue = Math.floor(0x100000000 / range) * range;

      do {
        window.crypto.getRandomValues(randomArray);
      } while (randomArray[0] >= maxValidValue);

      const j = randomArray[0] % range;

      [passwordChars[i], passwordChars[j]] = [
        passwordChars[j],
        passwordChars[i],
      ];
    }

    dbPasswordInput.value = passwordChars.join("");

    invalidateOutput();

    if (notifyUser) {
      notify("Database password generated.", "success");
    }

    return dbPasswordInput.value;
  }

  function toggleSecretVisibility(input, button) {
    const isHidden = input.type === "password";

    input.type = isHidden ? "text" : "password";
    button.textContent = isHidden ? "Hide" : "Show";
    button.setAttribute("aria-pressed", String(isHidden));
  }

  function resetSecretVisibility(input, button) {
    input.type = "password";
    button.textContent = "Show";
    button.setAttribute("aria-pressed", "false");
  }
  function escapeEnvValue(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r\n|\r|\n/g, "\\n");
  }

  function quoteEnvValue(value) {
    return `"${escapeEnvValue(value)}"`;
  }

  function isValidUrl(value) {
    if (!value) {
      return true;
    }

    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }

  function isValidPort(value) {
    if (!value) {
      return true;
    }

    const port = Number(value);

    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  function hasControlCharacters(value) {
    return /[\u0000-\u001F\u007F]/.test(value);
  }

  function generateEnv({ announce = true } = {}) {
    if (!isValidUrl(appUrlInput.value.trim())) {
      notify(
        "Enter a valid application URL using http:// or https://.",
        "error",
      );

      appUrlInput.focus();
      return;
    }

    if (!isValidPort(dbPortInput.value.trim())) {
      notify("Database port must be a number between 1 and 65535.", "error");

      dbPortInput.focus();
      return;
    }

    if (hasControlCharacters(dbNameInput.value)) {
      notify("Database name contains control characters.", "error");
      dbNameInput.focus();
      return;
    }

    if (hasControlCharacters(dbUserInput.value)) {
      notify("Database user contains control characters.", "error");
      dbUserInput.focus();
      return;
    }

    if (hasControlCharacters(dbHostInput.value)) {
      notify("Database host contains control characters.", "error");
      dbHostInput.focus();
      return;
    }

    const appName = appNameInput.value.trim();
    const appUrl = appUrlInput.value.trim();
    const dbHost = dbHostInput.value.trim();
    const dbPort = dbPortInput.value.trim();
    const dbName = dbNameInput.value.trim();
    const dbUser = dbUserInput.value.trim();
    const dbPassword = dbPasswordInput.value;

    if (!appKeyInput.value) {
      generateAppKey({ notifyUser: false });

      if (!appKeyInput.value) {
        return;
      }
    }

    const env = [
      `APP_NAME=${quoteEnvValue(appName || "XAVERT")}`,
      `APP_ENV=${appEnvSelect.value}`,
      `APP_DEBUG=${appDebugSelect.value}`,
      `APP_URL=${quoteEnvValue(appUrl || "http://localhost")}`,
      `APP_KEY=${quoteEnvValue(appKeyInput.value)}`,
      "",
      `DB_CONNECTION=${dbConnectionSelect.value}`,
      `DB_HOST=${quoteEnvValue(dbHost || "localhost")}`,
      `DB_PORT=${dbPort || "3306"}`,
      `DB_NAME=${quoteEnvValue(dbName || "database")}`,
      `DB_USER=${quoteEnvValue(dbUser || "root")}`,
      `DB_PASSWORD=${quoteEnvValue(dbPassword)}`,
    ].join("\n");

    outputTextarea.value = env;
    outputTextarea.scrollTop = 0;

    updateActionButtons();

    if (announce) {
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
    appNameInput.value = "XAVERT Demo";
    appEnvSelect.value = "development";
    appDebugSelect.value = "true";
    appUrlInput.value = "http://localhost:3000";
    dbConnectionSelect.value = "mysql";
    dbHostInput.value = "127.0.0.1";
    dbPortInput.value = "3306";
    dbNameInput.value = "xavert_demo";
    dbUserInput.value = "xavert_user";

    if (!generateAppKey({ notifyUser: false })) {
      return;
    }

    if (!generateDbPassword({ notifyUser: false })) {
      return;
    }

    if (!generateEnv({ announce: false })) {
      return;
    }

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else {
      notify("Sample loaded successfully.", "success");
    }
  }

  async function copyOutput() {
    const text = outputTextarea.value;
    if (!text) {
      notify("Nothing to copy.", "error");
      return;
    }

    await xavertCopyText(text);
  }

  function downloadOutput() {
    const text = outputTextarea.value;
    if (!text) {
      notify("Nothing to download.", "error");
      return;
    }

    downloadFile(".env", text, "text/plain;charset=utf-8");
  }

  function clearAll() {
    appNameInput.value = "";
    appEnvSelect.value = "production";
    appDebugSelect.value = "false";
    appUrlInput.value = "";
    dbConnectionSelect.value = "mysql";
    dbHostInput.value = "";
    dbPortInput.value = "";
    dbNameInput.value = "";
    dbUserInput.value = "";
    dbPasswordInput.value = "";
    appKeyInput.value = "";

    resetSecretVisibility(dbPasswordInput, toggleDbPasswordButton);
    resetSecretVisibility(appKeyInput, toggleAppKeyButton);
    outputTextarea.value = "";
    outputTextarea.scrollTop = 0;
    updateActionButtons();
    setInlineMessage("");
  }

  updateActionButtons();

  generateAppKeyButton.addEventListener("click", generateAppKey);
  generateDbPasswordButton.addEventListener("click", generateDbPassword);
  toggleAppKeyButton.addEventListener("click", () => {
    toggleSecretVisibility(appKeyInput, toggleAppKeyButton);
  });
  toggleDbPasswordButton.addEventListener("click", () => {
    toggleSecretVisibility(dbPasswordInput, toggleDbPasswordButton);
  });
  generateEnvButton.addEventListener("click", generateEnv);
  copyButton.addEventListener("click", () => {
    void copyOutput();
  });
  downloadButton.addEventListener("click", downloadOutput);
  sampleButton.addEventListener("click", loadSample);
  clearButton.addEventListener("click", clearAll);

  const DEFAULT_DB_PORTS = {
    mysql: "3306",
    mariadb: "3306",
    pgsql: "5432",
    sqlsrv: "1433",
  };

  function syncDefaultDatabasePort() {
    const knownDefaults = new Set(Object.values(DEFAULT_DB_PORTS));
    const currentPort = dbPortInput.value.trim();

    if (!currentPort || knownDefaults.has(currentPort)) {
      dbPortInput.value = DEFAULT_DB_PORTS[dbConnectionSelect.value] || "";
      invalidateOutput();
    }
  }

  dbConnectionSelect.addEventListener("change", syncDefaultDatabasePort);

  const configurationInputs = [
    appNameInput,
    appEnvSelect,
    appDebugSelect,
    appUrlInput,
    dbConnectionSelect,
    dbHostInput,
    dbPortInput,
    dbNameInput,
    dbUserInput,
    dbPasswordInput,
  ];

  configurationInputs.forEach((element) => {
    element.addEventListener("input", invalidateOutput);
    element.addEventListener("change", invalidateOutput);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool === ENV_GENERATOR_TOOL_ID) {
    initEnvGenerator();
  }
});
