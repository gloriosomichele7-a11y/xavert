"use strict";

window.__XAVERT_JSFM_BUILD__ = "20260828-3";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const elements = {
    form: $("jsfmForm"),
    dropZone: $("dropZone"),
    fileInput: $("fileInput"),
    fileInfo: $("fileInfo"),
    inputCode: $("inputCode"),
    operationSelect: $("operationSelect"),
    sourceMode: $("sourceMode"),
    beautifyOptions: $("beautifyOptions"),
    minifyOptions: $("minifyOptions"),
    indentSelect: $("indentSelect"),
    braceStyle: $("braceStyle"),
    preserveNewlines: $("preserveNewlines"),
    endWithNewline: $("endWithNewline"),
    ecmaSelect: $("ecmaSelect"),
    passesSelect: $("passesSelect"),
    commentsSelect: $("commentsSelect"),
    compressCheck: $("compressCheck"),
    mangleCheck: $("mangleCheck"),
    topLevelCheck: $("topLevelCheck"),
    keepFunctionsCheck: $("keepFunctionsCheck"),
    keepClassesCheck: $("keepClassesCheck"),
    dropConsoleCheck: $("dropConsoleCheck"),
    asciiOnlyCheck: $("asciiOnlyCheck"),
    processBtn: $("processBtn"),
    validateBtn: $("validateBtn"),
    sampleBtn: $("sampleBtn"),
    cancelBtn: $("cancelBtn"),
    clearBtn: $("clearBtn"),
    message: $("message"),
    resultSection: $("resultSection"),
    inputSizeStat: $("inputSizeStat"),
    outputSizeStat: $("outputSizeStat"),
    changeStat: $("changeStat"),
    lineStat: $("lineStat"),
    executionStat: $("executionStat"),
    modeStat: $("modeStat"),
    outputCode: $("outputCode"),
    analysisList: $("analysisList"),
    copyBtn: $("copyBtn"),
    downloadBtn: $("downloadBtn"),
    replaceInputBtn: $("replaceInputBtn"),
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error("JavaScript Formatter & Minifier initialization failed:", missing);
    return;
  }

  const TERSER_URL =
    "https://cdn.jsdelivr.net/npm/terser@5.51.2/dist/bundle.min.js";
  const BEAUTIFY_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/2.0.3/beautify.min.js";

  const state = {
    worker: null,
    timeoutId: 0,
    runToken: 0,
    busy: false,
    fileName: "processed.js",
    lastOperation: "",
  };

  const minifyPresetButtons = Array.from(
    document.querySelectorAll("[data-minify-preset]"),
  );

  function clearInlineMessage() {
    elements.message.textContent = "";
    elements.message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );
  }

  function notify(text, type = "info") {
    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
      return;
    }

    clearInlineMessage();
    elements.message.textContent = text;
    elements.message.classList.add(`message-${type}`);
  }

  function showActionSuccess(text) {
    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess(text);
    } else {
      notify(text, "success");
    }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

    const units = ["B", "KB", "MB"];
    const power = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** power;

    return `${value >= 10 || power === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[power]}`;
  }

  function utf8Size(text) {
    return new TextEncoder().encode(String(text || "")).byteLength;
  }

  function lineCount(text) {
    if (!text) return 0;
    return String(text).split(/\r\n|\r|\n/).length;
  }

  function getMaxInputBytes() {
    const memory = Number(navigator.deviceMemory || 0);

    if (memory > 0 && memory <= 2) {
      return 1_500_000;
    }

    if (memory > 0 && memory <= 4) {
      return 3_000_000;
    }

    return 6_000_000;
  }

  function updateOperationUi() {
    const minify = elements.operationSelect.value === "minify";

    elements.beautifyOptions.hidden = minify;
    elements.minifyOptions.hidden = !minify;
    elements.processBtn.textContent = minify
      ? "Minify JavaScript"
      : "Beautify JavaScript";

    invalidateResult();
  }

  function invalidateResult() {
    if (!elements.resultSection.hidden) {
      elements.resultSection.hidden = true;
      elements.outputCode.value = "";
      elements.analysisList.replaceChildren();
    }
  }

  function setBusy(active) {
    state.busy = active;

    elements.processBtn.disabled = active;
    elements.validateBtn.disabled = active;
    elements.sampleBtn.disabled = active;
    elements.fileInput.disabled = active;
    elements.operationSelect.disabled = active;
    elements.sourceMode.disabled = active;
    elements.cancelBtn.disabled = !active;
  }

  function terminateWorker() {
    if (state.worker) {
      state.worker.terminate();
      state.worker = null;
    }

    if (state.timeoutId) {
      window.clearTimeout(state.timeoutId);
      state.timeoutId = 0;
    }
  }

  function workerMain() {
    let terserReady = false;
    let beautifyReady = false;

    function ensureTerser(url) {
      if (!terserReady) {
        importScripts(url);
        terserReady = Boolean(self.Terser?.minify);
      }

      if (!terserReady) {
        throw new Error("Terser could not be loaded.");
      }
    }

    function ensureBeautifier(url) {
      if (!beautifyReady) {
        importScripts(url);
        beautifyReady = typeof self.js_beautify === "function";
      }

      if (!beautifyReady) {
        throw new Error("js-beautify could not be loaded.");
      }
    }

    async function validateSyntax(code, options, terserUrl) {
      ensureTerser(terserUrl);

      await self.Terser.minify(code, {
        ecma: options.ecma,
        module: options.module,
        compress: false,
        mangle: false,
        format: {
          comments: true,
          beautify: false,
        },
      });
    }

    self.onmessage = async (event) => {
      const {
        task,
        code,
        beautifyOptions,
        minifyOptions,
        parserOptions,
        terserUrl,
        beautifyUrl,
      } = event.data;

      const started = performance.now();

      try {
        if (task === "validate") {
          await validateSyntax(code, parserOptions, terserUrl);

          self.postMessage({
            ok: true,
            task,
            elapsedMs: performance.now() - started,
          });

          return;
        }

        if (task === "beautify") {
          await validateSyntax(code, parserOptions, terserUrl);
          ensureBeautifier(beautifyUrl);

          const output = self.js_beautify(code, beautifyOptions);

          self.postMessage({
            ok: true,
            task,
            output,
            elapsedMs: performance.now() - started,
          });

          return;
        }

        ensureTerser(terserUrl);

        const result = await self.Terser.minify(code, minifyOptions);

        if (!result || typeof result.code !== "string") {
          throw new Error("Terser did not return minified JavaScript.");
        }

        self.postMessage({
          ok: true,
          task,
          output: result.code,
          elapsedMs: performance.now() - started,
        });
      } catch (error) {
        self.postMessage({
          ok: false,
          task,
          elapsedMs: performance.now() - started,
          error:
            error instanceof Error
              ? error.message
              : String(error || "Unknown processing error"),
        });
      }
    };
  }

  function createWorker() {
    const source = `(${workerMain.toString()})();`;
    const blob = new Blob([source], {
      type: "text/javascript;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    try {
      return new Worker(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function getParserOptions() {
    return {
      ecma: Number(elements.ecmaSelect.value) || 2020,
      module: elements.sourceMode.value === "module",
    };
  }

  function getBeautifyOptions() {
    const tabs = elements.indentSelect.value === "tab";

    return {
      indent_size: tabs ? 1 : Number(elements.indentSelect.value) || 2,
      indent_char: tabs ? "\t" : " ",
      indent_with_tabs: tabs,
      brace_style: elements.braceStyle.value,
      preserve_newlines: elements.preserveNewlines.checked,
      max_preserve_newlines: elements.preserveNewlines.checked ? 2 : 0,
      end_with_newline: elements.endWithNewline.checked,
      wrap_line_length: 0,
      space_in_empty_paren: false,
    };
  }

  function getCommentOption() {
    if (elements.commentsSelect.value === "all") {
      return true;
    }

    if (elements.commentsSelect.value === "none") {
      return false;
    }

    return "some";
  }

  function getMinifyOptions() {
    const ecma = Number(elements.ecmaSelect.value) || 2020;
    const moduleMode = elements.sourceMode.value === "module";
    const compressEnabled = elements.compressCheck.checked;

    return {
      ecma,
      module: moduleMode,
      compress: compressEnabled
        ? {
            passes: Number(elements.passesSelect.value) || 1,
            drop_console: elements.dropConsoleCheck.checked,
            drop_debugger: true,
          }
        : false,
      mangle: elements.mangleCheck.checked,
      toplevel: elements.topLevelCheck.checked,
      keep_fnames: elements.keepFunctionsCheck.checked,
      keep_classnames: elements.keepClassesCheck.checked,
      format: {
        comments: getCommentOption(),
        ascii_only: elements.asciiOnlyCheck.checked,
      },
    };
  }

  function validateInput() {
    const code = elements.inputCode.value;
    const bytes = utf8Size(code);

    if (!code.trim()) {
      notify("Enter JavaScript source code first.", "error");
      return null;
    }

    const maxBytes = getMaxInputBytes();

    if (bytes > maxBytes) {
      notify(
        `This device is limited to approximately ${formatBytes(maxBytes)} of JavaScript input for safe browser processing.`,
        "error",
      );
      return null;
    }

    return { code, bytes };
  }

  function runWorkerTask(task) {
    if (state.busy) {
      return;
    }

    const input = validateInput();

    if (!input) {
      return;
    }

    terminateWorker();

    const token = ++state.runToken;
    const worker = createWorker();

    state.worker = worker;
    state.lastOperation = task;
    setBusy(true);

    const timeoutMs = 15000;

    worker.onmessage = (event) => {
      if (token !== state.runToken) {
        return;
      }

      terminateWorker();
      setBusy(false);

      const result = event.data;

      if (!result?.ok) {
        notify(
          `JavaScript processing failed: ${
            result?.error || "Unknown syntax or transformation error"
          }`,
          "error",
        );
        return;
      }

      if (task === "validate") {
        showActionSuccess("JavaScript syntax is valid.");
        return;
      }

      renderResult(
        input.code,
        result.output,
        result.elapsedMs,
        task,
      );
      showActionSuccess(
        task === "minify"
          ? "JavaScript minified successfully."
          : "JavaScript formatted successfully.",
      );
    };

    worker.onerror = (event) => {
      if (token !== state.runToken) {
        return;
      }

      console.error("JavaScript processing worker failed:", event);
      terminateWorker();
      setBusy(false);

      notify(
        "The JavaScript processing worker failed. Check your connection and try again.",
        "error",
      );
    };

    state.timeoutId = window.setTimeout(() => {
      if (token !== state.runToken) {
        return;
      }

      terminateWorker();
      setBusy(false);

      notify(
        "JavaScript processing exceeded 15 seconds and was cancelled.",
        "error",
      );
    }, timeoutMs);

    worker.postMessage({
      task,
      code: input.code,
      beautifyOptions: getBeautifyOptions(),
      minifyOptions: getMinifyOptions(),
      parserOptions: getParserOptions(),
      terserUrl: TERSER_URL,
      beautifyUrl: BEAUTIFY_URL,
    });
  }

  function renderResult(input, output, elapsedMs, operation) {
    elements.outputCode.value = output;

    const inputBytes = utf8Size(input);
    const outputBytes = utf8Size(output);
    const delta =
      inputBytes > 0
        ? ((outputBytes - inputBytes) / inputBytes) * 100
        : 0;

    elements.inputSizeStat.textContent = formatBytes(inputBytes);
    elements.outputSizeStat.textContent = formatBytes(outputBytes);
    elements.changeStat.textContent =
      `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
    elements.lineStat.textContent =
      `${lineCount(input)} → ${lineCount(output)}`;
    elements.executionStat.textContent =
      `${elapsedMs.toFixed(elapsedMs < 10 ? 2 : 1)}ms`;
    elements.modeStat.textContent =
      operation === "minify" ? "Minify" : "Beautify";

    renderAnalysis(input, output, operation);
    elements.resultSection.hidden = false;
  }

  function renderAnalysis(input, output, operation) {
    elements.analysisList.replaceChildren();

    const items = [];
    const inputBytes = utf8Size(input);
    const outputBytes = utf8Size(output);

    items.push({
      label: "Parser",
      value:
        elements.sourceMode.value === "module"
          ? "ES Module"
          : "Classic Script",
    });

    if (operation === "beautify") {
      items.push({
        label: "Indentation",
        value:
          elements.indentSelect.value === "tab"
            ? "Tabs"
            : `${elements.indentSelect.value} spaces`,
      });
      items.push({
        label: "Brace style",
        value: elements.braceStyle.value,
      });
    } else {
      items.push({
        label: "ECMAScript",
        value: `ES${elements.ecmaSelect.value}`,
      });
      items.push({
        label: "Compression",
        value: elements.compressCheck.checked
          ? `${elements.passesSelect.value} pass(es)`
          : "Off",
      });
      items.push({
        label: "Mangling",
        value: elements.mangleCheck.checked ? "On" : "Off",
      });
      items.push({
        label: "Top-level optimization",
        value: elements.topLevelCheck.checked ? "On" : "Off",
      });
    }

    items.push({
      label: "Characters",
      value:
        `${Array.from(input).length.toLocaleString("en-US")} → ` +
        `${Array.from(output).length.toLocaleString("en-US")}`,
    });

    if (inputBytes > 0) {
      const saved = inputBytes - outputBytes;

      items.push({
        label: saved >= 0 ? "Bytes saved" : "Bytes added",
        value: formatBytes(Math.abs(saved)),
      });
    }

    items.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "jsfm-analysis-item";

      const strong = document.createElement("strong");
      strong.textContent = `${entry.label}: `;

      item.append(strong, document.createTextNode(entry.value));
      elements.analysisList.appendChild(item);
    });
  }

  function applyMinifyPreset(preset) {
    elements.operationSelect.value = "minify";
    updateOperationUi();

    if (preset === "safe") {
      elements.compressCheck.checked = true;
      elements.mangleCheck.checked = false;
      elements.topLevelCheck.checked = false;
      elements.keepFunctionsCheck.checked = true;
      elements.keepClassesCheck.checked = true;
      elements.dropConsoleCheck.checked = false;
      elements.passesSelect.value = "1";
      elements.commentsSelect.value = "license";
      return;
    }

    if (preset === "maximum") {
      elements.compressCheck.checked = true;
      elements.mangleCheck.checked = true;
      elements.topLevelCheck.checked = true;
      elements.keepFunctionsCheck.checked = false;
      elements.keepClassesCheck.checked = false;
      elements.dropConsoleCheck.checked = false;
      elements.passesSelect.value = "3";
      elements.commentsSelect.value = "license";
      return;
    }

    elements.compressCheck.checked = true;
    elements.mangleCheck.checked = true;
    elements.topLevelCheck.checked = false;
    elements.keepFunctionsCheck.checked = false;
    elements.keepClassesCheck.checked = false;
    elements.dropConsoleCheck.checked = false;
    elements.passesSelect.value = "2";
    elements.commentsSelect.value = "license";
  }

  function cancelProcessing() {
    if (!state.busy) {
      return;
    }

    state.runToken += 1;
    terminateWorker();
    setBusy(false);
    notify("JavaScript processing was cancelled.", "info");
  }

  async function loadFile(file) {
    if (!file) {
      return;
    }

    const valid =
      /\.(m?js)$/i.test(file.name || "") ||
      ["text/javascript", "application/javascript"].includes(file.type);

    if (!valid) {
      notify("Select a .js or .mjs JavaScript file.", "error");
      return;
    }

    const maxBytes = getMaxInputBytes();

    if (file.size > maxBytes) {
      notify(
        `This device is limited to JavaScript files up to ${formatBytes(maxBytes)}.`,
        "error",
      );
      return;
    }

    try {
      const text = await file.text();

      elements.inputCode.value = text;
      state.fileName = file.name || "processed.js";
      elements.fileInfo.textContent =
        `${state.fileName} · ${formatBytes(file.size)}`;
      invalidateResult();
      clearInlineMessage();
      elements.inputCode.focus();
    } catch (error) {
      console.error("JavaScript file loading failed:", error);
      notify("The JavaScript file could not be read.", "error");
    }
  }

  async function copyOutput() {
    const text = elements.outputCode.value;

    if (!text) {
      notify("There is no processed output to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText === "function") {
      await window.xavertCopyText(text);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      if (typeof window.showCopySuccess === "function") {
        window.showCopySuccess();
      }
    } catch {
      notify("Copy failed.", "error");
    }
  }

  function outputFilename() {
    const source = state.fileName || "processed.js";
    const base = source.replace(/\.(m?js)$/i, "") || "processed";
    const extension = elements.sourceMode.value === "module" ? ".mjs" : ".js";

    return `${base}-${state.lastOperation === "minify" ? "minified" : "formatted"}${extension}`;
  }

  function downloadOutput() {
    const text = elements.outputCode.value;

    if (!text) {
      notify("There is no processed output to download.", "error");
      return;
    }

    if (typeof window.downloadFile === "function") {
      window.downloadFile(
        outputFilename(),
        text,
        "text/javascript;charset=utf-8",
      );
      return;
    }

    const blob = new Blob([text], {
      type: "text/javascript;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = outputFilename();
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (typeof window.showDownloadSuccess === "function") {
      window.showDownloadSuccess();
    }
  }

  function replaceInput() {
    const output = elements.outputCode.value;

    if (!output) {
      notify("There is no processed output to reuse.", "error");
      return;
    }

    elements.inputCode.value = output;
    invalidateResult();
    clearInlineMessage();
    elements.inputCode.focus();
  }

  function resetToolStateAfterNativeReset() {
    state.runToken += 1;
    terminateWorker();

    state.busy = false;
    state.fileName = "processed.js";
    state.lastOperation = "";

    /*
     * The form's native reset owns all form-control values:
     * inputCode, fileInput, selects and checkboxes.
     * This guarantees that content loaded by Shared Core Load Sample
     * returns to the original empty/default HTML values.
     */
    window.setTimeout(() => {
      elements.fileInfo.textContent = "No file selected.";

      elements.processBtn.disabled = false;
      elements.validateBtn.disabled = false;
      elements.sampleBtn.disabled = false;
      elements.cancelBtn.disabled = true;

      elements.processBtn.textContent =
        elements.operationSelect.value === "minify"
          ? "Minify JavaScript"
          : "Beautify JavaScript";

      elements.beautifyOptions.hidden =
        elements.operationSelect.value === "minify";
      elements.minifyOptions.hidden =
        elements.operationSelect.value !== "minify";

      elements.resultSection.hidden = true;
      elements.outputCode.value = "";
      elements.analysisList.replaceChildren();

      elements.inputSizeStat.textContent = "0 B";
      elements.outputSizeStat.textContent = "0 B";
      elements.changeStat.textContent = "0%";
      elements.lineStat.textContent = "0 → 0";
      elements.executionStat.textContent = "0ms";
      elements.modeStat.textContent = "—";

      elements.dropZone.classList.remove("dragover");
      clearInlineMessage();

      elements.inputCode.focus();
    }, 0);
  }

  elements.operationSelect.addEventListener("change", updateOperationUi);

  elements.inputCode.addEventListener("input", invalidateResult);

  [
    elements.sourceMode,
    elements.indentSelect,
    elements.braceStyle,
    elements.preserveNewlines,
    elements.endWithNewline,
    elements.ecmaSelect,
    elements.passesSelect,
    elements.commentsSelect,
    elements.compressCheck,
    elements.mangleCheck,
    elements.topLevelCheck,
    elements.keepFunctionsCheck,
    elements.keepClassesCheck,
    elements.dropConsoleCheck,
    elements.asciiOnlyCheck,
  ].forEach((control) => {
    control.addEventListener(
      control.tagName === "SELECT" ? "change" : "input",
      invalidateResult,
    );
  });

  minifyPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyMinifyPreset(button.dataset.minifyPreset || "balanced");
    });
  });

  elements.processBtn.addEventListener("click", () => {
    runWorkerTask(elements.operationSelect.value);
  });

  elements.validateBtn.addEventListener("click", () => {
    runWorkerTask("validate");
  });

  elements.cancelBtn.addEventListener("click", cancelProcessing);

  elements.form.addEventListener("reset", resetToolStateAfterNativeReset);

  elements.fileInput.addEventListener("change", () => {
    const file = elements.fileInput.files?.[0];

    if (file) {
      void loadFile(file);
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, () => {
      elements.dropZone.classList.remove("dragover");
    });
  });

  elements.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      void loadFile(file);
    }
  });

  elements.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.fileInput.click();
    }
  });

  elements.copyBtn.addEventListener("click", () => {
    void copyOutput();
  });

  elements.downloadBtn.addEventListener("click", downloadOutput);
  elements.replaceInputBtn.addEventListener("click", replaceInput);

  window.addEventListener(
    "pagehide",
    () => {
      terminateWorker();
    },
    { once: true },
  );

  updateOperationUi();
});
