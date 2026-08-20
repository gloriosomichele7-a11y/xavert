"use strict";

function initYamlJsonConverter() {
  const conversionMode = document.getElementById("conversionMode");
  const inputText = document.getElementById("inputText");
  const outputText = document.getElementById("outputText");

  const convertBtn = document.getElementById("convertBtn");
  const validateBtn = document.getElementById("validateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearBtn = document.getElementById("clearBtn");

  const lineCount = document.getElementById("lineCount");
  const charCount = document.getElementById("charCount");
  const sizeCount = document.getElementById("sizeCount");
  const statusCount = document.getElementById("statusCount");
  const message = document.getElementById("message");

  const required = [
    conversionMode,
    inputText,
    outputText,
    convertBtn,
    validateBtn,
    sampleBtn,
    copyBtn,
    downloadBtn,
    clearBtn,
    lineCount,
    charCount,
    sizeCount,
    statusCount,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("YAML ↔ JSON Converter: HTML and JS do not match.");
    return;
  }

  if (
    typeof window.jsyaml !== "object" ||
    typeof window.jsyaml.load !== "function" ||
    typeof window.jsyaml.dump !== "function"
  ) {
    console.error("YAML ↔ JSON Converter: js-yaml is unavailable.");
    setInlineMessage("YAML library is unavailable.", "error");
    convertBtn.disabled = true;
    validateBtn.disabled = true;
    sampleBtn.disabled = true;
    return;
  }

  let outputType = "";

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

  function announceActionSuccess() {
    setInlineMessage("Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
    }
  }

  function setStatus(text, type = "ready") {
    statusCount.textContent = text;

    statusCount.classList.toggle("yaml-json-status-ok", type === "success");

    statusCount.classList.toggle("yaml-json-status-error", type === "error");
  }

  function updateStats() {
    const output = outputText.value;

    lineCount.textContent = String(output ? output.split(/\r?\n/).length : 0);

    charCount.textContent = String(Array.from(output).length);

    sizeCount.textContent = String(new TextEncoder().encode(output).length);
  }

  function resetOutput() {
    outputText.value = "";
    outputType = "";

    updateStats();
    setStatus("Ready");

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function getInput() {
    const input = inputText.value.trim();

    if (!input) {
      resetOutput();
      notify("Paste YAML or JSON first.", "error");
      inputText.focus();
      return "";
    }

    return input;
  }

  function getYamlErrorMessage(error) {
    if (error?.mark && Number.isInteger(error.mark.line)) {
      return `YAML syntax error at line ${error.mark.line + 1}.`;
    }

    return "Invalid YAML.";
  }

  function convertYamlToJson(input) {
    const parsed = window.jsyaml.load(input);

    return JSON.stringify(parsed, null, 2);
  }

  function convertJsonToYaml(input) {
    const parsed = JSON.parse(input);

    return window.jsyaml.dump(parsed, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  }

  function handleConvert({ announce = true } = {}) {
    const input = getInput();

    if (!input) {
      return false;
    }

    try {
      if (conversionMode.value === "yaml-json") {
        outputText.value = convertYamlToJson(input);
        outputType = "json";
        setStatus("YAML → JSON", "success");
      } else {
        outputText.value = convertJsonToYaml(input);
        outputType = "yaml";
        setStatus("JSON → YAML", "success");
      }

      copyBtn.disabled = false;
      downloadBtn.disabled = false;
      updateStats();

      if (announce) {
        announceActionSuccess();
      }

      return true;
    } catch (error) {
      resetOutput();
      setStatus("Error", "error");

      if (conversionMode.value === "yaml-json") {
        notify(getYamlErrorMessage(error), "error");
      } else {
        notify("Invalid JSON.", "error");
      }

      return false;
    }
  }

  function handleValidate() {
    const input = getInput();

    if (!input) {
      return false;
    }

    try {
      if (conversionMode.value === "yaml-json") {
        window.jsyaml.load(input);
        outputText.value = "Valid YAML.";
        outputType = "txt";
        setStatus("Valid YAML", "success");
      } else {
        JSON.parse(input);
        outputText.value = "Valid JSON.";
        outputType = "txt";
        setStatus("Valid JSON", "success");
      }

      copyBtn.disabled = false;
      downloadBtn.disabled = false;
      updateStats();
      announceActionSuccess();

      return true;
    } catch (error) {
      resetOutput();
      setStatus("Error", "error");

      if (conversionMode.value === "yaml-json") {
        notify(getYamlErrorMessage(error), "error");
      } else {
        notify("Invalid JSON.", "error");
      }

      return false;
    }
  }

  function loadSample() {
    conversionMode.value = "yaml-json";

    inputText.value = [
      "app:",
      "  name: XAVERT",
      "  environment: production",
      "  features:",
      "    - converters",
      "    - validators",
      "    - generators",
      "  private: true",
    ].join("\n");

    syncMode();
    resetOutput();
    clearPersistentMessage();

    const converted = handleConvert({ announce: false });

    if (!converted) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    inputText.focus();
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

    const config = {
      json: {
        filename: "xavert-yaml-json-result.json",
        mime: "application/json;charset=utf-8",
      },
      yaml: {
        filename: "xavert-yaml-json-result.yaml",
        mime: "text/yaml;charset=utf-8",
      },
      txt: {
        filename: "xavert-yaml-json-validation.txt",
        mime: "text/plain;charset=utf-8",
      },
    }[outputType];

    if (!config) {
      notify("Unknown output format.", "error");
      return;
    }

    window.downloadFile(config.filename, outputText.value, config.mime);
  }

  function invalidateOutput() {
    if (outputText.value) {
      resetOutput();
    }

    clearPersistentMessage();
  }

  function syncMode() {
    const yamlMode = conversionMode.value === "yaml-json";

    convertBtn.textContent = yamlMode ? "YAML → JSON" : "JSON → YAML";

    inputText.placeholder = yamlMode
      ? "Paste YAML here..."
      : "Paste JSON here...";

    invalidateOutput();
  }

  function clearTool() {
    conversionMode.value = "yaml-json";
    inputText.value = "";

    resetOutput();
    clearPersistentMessage();

    convertBtn.textContent = "YAML → JSON";
    inputText.placeholder = "Paste YAML here...";

    inputText.focus();
  }

  conversionMode.addEventListener("change", syncMode);
  inputText.addEventListener("input", invalidateOutput);

  convertBtn.addEventListener("click", () => {
    handleConvert();
  });

  validateBtn.addEventListener("click", handleValidate);
  sampleBtn.addEventListener("click", loadSample);

  copyBtn.addEventListener("click", () => {
    void copyResult();
  });

  downloadBtn.addEventListener("click", downloadResult);
  clearBtn.addEventListener("click", clearTool);

  resetOutput();
  syncMode();
}

initYamlJsonConverter();
