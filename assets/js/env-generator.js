"use strict";

const ENV_GENERATOR_TOOL_ID = "env-generator";

function initEnvGenerator() {
  const outputProfileSelect = document.getElementById("outputProfile");
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
  const variablePresetSelect = document.getElementById("variablePreset");
  const customVariablesContainer = document.getElementById("customVariables");
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
  const addPresetButton = document.querySelector("[data-action='add-preset']");
  const addVariableButton = document.querySelector(
    "[data-action='add-variable']",
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
    outputProfileSelect,
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
    variablePresetSelect,
    customVariablesContainer,
    outputTextarea,
    message,
    generateAppKeyButton,
    generateDbPasswordButton,
    toggleAppKeyButton,
    toggleDbPasswordButton,
    addPresetButton,
    addVariableButton,
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

  const DEFAULT_DB_PORTS = Object.freeze({
    mysql: "3306",
    mariadb: "3306",
    pgsql: "5432",
    sqlsrv: "1433",
  });

  const RESERVED_KEYS = Object.freeze({
    generic: new Set([
      "APP_NAME",
      "APP_ENV",
      "APP_DEBUG",
      "APP_URL",
      "APP_KEY",
      "DB_CONNECTION",
      "DB_HOST",
      "DB_PORT",
      "DB_NAME",
      "DB_USER",
      "DB_PASSWORD",
    ]),
    laravel: new Set([
      "APP_NAME",
      "APP_ENV",
      "APP_KEY",
      "APP_DEBUG",
      "APP_URL",
      "DB_CONNECTION",
      "DB_HOST",
      "DB_PORT",
      "DB_DATABASE",
      "DB_USERNAME",
      "DB_PASSWORD",
    ]),
  });

  const VARIABLE_PRESETS = Object.freeze({
    redis: [
      ["REDIS_HOST", "127.0.0.1"],
      ["REDIS_PORT", "6379"],
      ["REDIS_PASSWORD", ""],
    ],
    smtp: [
      ["SMTP_HOST", "smtp.example.com"],
      ["SMTP_PORT", "587"],
      ["SMTP_USERNAME", ""],
      ["SMTP_PASSWORD", ""],
      ["SMTP_SECURE", "true"],
    ],
    s3: [
      ["AWS_ACCESS_KEY_ID", ""],
      ["AWS_SECRET_ACCESS_KEY", ""],
      ["AWS_DEFAULT_REGION", "us-east-1"],
      ["AWS_BUCKET", ""],
      ["AWS_ENDPOINT", ""],
    ],
    auth: [
      ["JWT_SECRET", null],
      ["JWT_EXPIRES_IN", "1h"],
    ],
  });

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

    if (text && useToast && typeof showMessage === "function") {
      showMessage(text, type);
    }
  }

  function updateActionButtons() {
    const hasOutput = Boolean(outputTextarea.value.trim());

    copyButton.disabled = !hasOutput;
    downloadButton.disabled = !hasOutput;
  }

  function invalidateOutput({ showNotice = true } = {}) {
    if (!outputTextarea.value) {
      return;
    }

    outputTextarea.value = "";
    outputTextarea.scrollTop = 0;

    updateActionButtons();

    if (showNotice) {
      setInlineMessage("Configuration changed. Generate the .ENV again.", "info");
    }
  }

  function getSecureRandomIndex(length) {
    if (!Number.isInteger(length) || length < 1) {
      throw new Error("Random range must be a positive integer.");
    }

    const maxValidValue = Math.floor(0x100000000 / length) * length;
    const randomArray = new Uint32Array(1);

    do {
      window.crypto.getRandomValues(randomArray);
    } while (randomArray[0] >= maxValidValue);

    return randomArray[0] % length;
  }

  function getSecureRandomChar(chars) {
    if (!chars) {
      throw new Error("Character set cannot be empty.");
    }

    return chars.charAt(getSecureRandomIndex(chars.length));
  }

  function generateUrlSafeSecret(byteLength = 32) {
    if (!hasSecureCrypto) {
      return "";
    }

    const bytes = new Uint8Array(byteLength);
    window.crypto.getRandomValues(bytes);

    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
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
      const j = getSecureRandomIndex(i + 1);
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

  function getCustomVariableRows() {
    return Array.from(
      customVariablesContainer.querySelectorAll(".env-variable-row"),
    );
  }

  function createCustomVariableRow(key = "", value = "", { focus = false } = {}) {
    const row = document.createElement("div");
    row.className = "env-variable-row";

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.className = "env-variable-key";
    keyInput.placeholder = "VARIABLE_NAME";
    keyInput.autocomplete = "off";
    keyInput.spellcheck = false;
    keyInput.setAttribute("aria-label", "Environment variable name");
    keyInput.value = key;

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.className = "env-variable-value";
    valueInput.placeholder = "value";
    valueInput.autocomplete = "off";
    valueInput.spellcheck = false;
    valueInput.setAttribute("aria-label", "Environment variable value");
    valueInput.value = value;

    const secretButton = document.createElement("button");
    secretButton.type = "button";
    secretButton.className = "btn btn-neutral env-variable-action";
    secretButton.dataset.action = "generate-custom-secret";
    secretButton.textContent = "Secret";
    secretButton.setAttribute("aria-label", "Generate secure value for this variable");

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn btn-neutral env-variable-action";
    removeButton.dataset.action = "remove-variable";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", "Remove environment variable");

    row.append(keyInput, valueInput, secretButton, removeButton);
    customVariablesContainer.append(row);

    if (focus) {
      keyInput.focus();
    }

    return row;
  }

  function clearCustomVariables() {
    customVariablesContainer.replaceChildren();
  }

  function findCustomVariableRow(key) {
    return getCustomVariableRows().find((row) => {
      const keyInput = row.querySelector(".env-variable-key");
      return keyInput?.value.trim() === key;
    });
  }

  function addOrUpdateCustomVariable(key, value) {
    const existing = findCustomVariableRow(key);

    if (existing) {
      const valueInput = existing.querySelector(".env-variable-value");
      if (valueInput) {
        valueInput.value = value;
      }
      return existing;
    }

    return createCustomVariableRow(key, value);
  }

  function collectCustomVariables() {
    const variables = [];
    const seenKeys = new Set();
    const reservedKeys =
      RESERVED_KEYS[outputProfileSelect.value] ?? RESERVED_KEYS.generic;

    for (const row of getCustomVariableRows()) {
      const keyInput = row.querySelector(".env-variable-key");
      const valueInput = row.querySelector(".env-variable-value");

      if (!(keyInput instanceof HTMLInputElement)) {
        continue;
      }

      if (!(valueInput instanceof HTMLInputElement)) {
        continue;
      }

      const key = keyInput.value.trim();
      const value = valueInput.value;

      if (!key && !value) {
        continue;
      }

      if (!key) {
        notify("Enter a name for every additional variable.", "error");
        keyInput.focus();
        return null;
      }

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        notify(
          `Invalid variable name: ${key}. Use letters, numbers and underscores, and do not start with a number.`,
          "error",
        );
        keyInput.focus();
        return null;
      }

      if (seenKeys.has(key)) {
        notify(`Duplicate variable name: ${key}.`, "error");
        keyInput.focus();
        return null;
      }

      if (reservedKeys.has(key)) {
        notify(
          `${key} is already generated by the selected output profile.`,
          "error",
        );
        keyInput.focus();
        return null;
      }

      if (hasControlCharacters(value)) {
        notify(`${key} contains unsupported control characters.`, "error");
        valueInput.focus();
        return null;
      }

      seenKeys.add(key);
      variables.push({ key, value });
    }

    return variables;
  }

  function buildCoreEnvironment() {
    const appName = appNameInput.value.trim();
    const appUrl = appUrlInput.value.trim();
    const dbHost = dbHostInput.value.trim();
    const dbPort = dbPortInput.value.trim();
    const dbName = dbNameInput.value.trim();
    const dbUser = dbUserInput.value.trim();
    const dbPassword = dbPasswordInput.value;

    if (outputProfileSelect.value === "laravel") {
      return [
        `APP_NAME=${quoteEnvValue(appName || "XAVERT")}`,
        `APP_ENV=${appEnvSelect.value}`,
        `APP_KEY=${quoteEnvValue(appKeyInput.value)}`,
        `APP_DEBUG=${appDebugSelect.value}`,
        `APP_URL=${quoteEnvValue(appUrl || "http://localhost")}`,
        "",
        `DB_CONNECTION=${dbConnectionSelect.value}`,
        `DB_HOST=${quoteEnvValue(dbHost || "localhost")}`,
        `DB_PORT=${dbPort || DEFAULT_DB_PORTS[dbConnectionSelect.value] || "3306"}`,
        `DB_DATABASE=${quoteEnvValue(dbName || "database")}`,
        `DB_USERNAME=${quoteEnvValue(dbUser || "root")}`,
        `DB_PASSWORD=${quoteEnvValue(dbPassword)}`,
      ];
    }

    return [
      `APP_NAME=${quoteEnvValue(appName || "XAVERT")}`,
      `APP_ENV=${appEnvSelect.value}`,
      `APP_DEBUG=${appDebugSelect.value}`,
      `APP_URL=${quoteEnvValue(appUrl || "http://localhost")}`,
      `APP_KEY=${quoteEnvValue(appKeyInput.value)}`,
      "",
      `DB_CONNECTION=${dbConnectionSelect.value}`,
      `DB_HOST=${quoteEnvValue(dbHost || "localhost")}`,
      `DB_PORT=${dbPort || DEFAULT_DB_PORTS[dbConnectionSelect.value] || "3306"}`,
      `DB_NAME=${quoteEnvValue(dbName || "database")}`,
      `DB_USER=${quoteEnvValue(dbUser || "root")}`,
      `DB_PASSWORD=${quoteEnvValue(dbPassword)}`,
    ];
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

    if (!appKeyInput.value) {
      generateAppKey({ notifyUser: false });

      if (!appKeyInput.value) {
        return;
      }
    }

    const customVariables = collectCustomVariables();
    if (!customVariables) {
      return;
    }

    const envLines = buildCoreEnvironment();

    if (customVariables.length > 0) {
      envLines.push("");
      customVariables.forEach(({ key, value }) => {
        envLines.push(`${key}=${quoteEnvValue(value)}`);
      });
    }

    outputTextarea.value = envLines.join("\n");
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

  function addSelectedPreset({ notifyUser = true } = {}) {
    const presetName = variablePresetSelect.value;
    const preset = VARIABLE_PRESETS[presetName];

    if (!preset) {
      if (notifyUser) {
        notify("Choose a variable preset first.", "info");
      }
      return false;
    }

    if (presetName === "auth" && !hasSecureCrypto) {
      notify(
        "Secure random generation is required to create the JWT preset.",
        "error",
      );
      return false;
    }

    preset.forEach(([key, presetValue]) => {
      let value = presetValue;

      if (value === null && key === "JWT_SECRET") {
        value = generateUrlSafeSecret(32);
      }

      addOrUpdateCustomVariable(key, value ?? "");
    });

    invalidateOutput();

    if (notifyUser) {
      notify("Variable preset added.", "success");
    }

    return true;
  }

  function loadSample() {
    outputProfileSelect.value = "laravel";
    appNameInput.value = "XAVERT Demo";
    appEnvSelect.value = "development";
    appDebugSelect.value = "true";
    appUrlInput.value = "http://localhost:3000";
    dbConnectionSelect.value = "mysql";
    dbHostInput.value = "127.0.0.1";
    dbPortInput.value = "3306";
    dbNameInput.value = "xavert_demo";
    dbUserInput.value = "xavert_user";
    variablePresetSelect.value = "";

    clearCustomVariables();
    createCustomVariableRow("LOG_LEVEL", "debug");

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
    outputProfileSelect.value = "generic";
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
    variablePresetSelect.value = "";
    clearCustomVariables();

    resetSecretVisibility(dbPasswordInput, toggleDbPasswordButton);
    resetSecretVisibility(appKeyInput, toggleAppKeyButton);
    outputTextarea.value = "";
    outputTextarea.scrollTop = 0;
    updateActionButtons();
    setInlineMessage("");
  }

  function syncDefaultDatabasePort() {
    const knownDefaults = new Set(Object.values(DEFAULT_DB_PORTS));
    const currentPort = dbPortInput.value.trim();

    if (!currentPort || knownDefaults.has(currentPort)) {
      dbPortInput.value = DEFAULT_DB_PORTS[dbConnectionSelect.value] || "";
      invalidateOutput();
    }
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
  addPresetButton.addEventListener("click", () => {
    addSelectedPreset();
  });
  addVariableButton.addEventListener("click", () => {
    createCustomVariableRow("", "", { focus: true });
    invalidateOutput();
  });
  generateEnvButton.addEventListener("click", generateEnv);
  copyButton.addEventListener("click", () => {
    void copyOutput();
  });
  downloadButton.addEventListener("click", downloadOutput);
  sampleButton.addEventListener("click", loadSample);
  clearButton.addEventListener("click", clearAll);

  dbConnectionSelect.addEventListener("change", syncDefaultDatabasePort);

  customVariablesContainer.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const row = target.closest(".env-variable-row");
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const removeButton = target.closest("[data-action='remove-variable']");
    if (removeButton instanceof HTMLButtonElement) {
      row.remove();
      invalidateOutput();
      return;
    }

    const secretButton = target.closest(
      "[data-action='generate-custom-secret']",
    );

    if (secretButton instanceof HTMLButtonElement) {
      if (!hasSecureCrypto) {
        notify(
          "Secure random generation is not available in this browser context.",
          "error",
        );
        return;
      }

      const valueInput = row.querySelector(".env-variable-value");
      if (valueInput instanceof HTMLInputElement) {
        valueInput.value = generateUrlSafeSecret(32);
        invalidateOutput();
        notify("Secure variable value generated.", "success");
      }
    }
  });

  customVariablesContainer.addEventListener("input", () => {
    invalidateOutput();
  });

  customVariablesContainer.addEventListener("change", () => {
    invalidateOutput();
  });

  const configurationInputs = [
    outputProfileSelect,
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
