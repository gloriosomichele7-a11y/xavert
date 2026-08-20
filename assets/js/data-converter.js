"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "data-converter") {
    return;
  }

  const elements = {
    toolSelector: document.getElementById("toolSelector"),
    workflowContent: document.getElementById("workflowContent"),
    workflowTitle: document.getElementById("workflowTitle"),
    workflowDescription: document.getElementById("workflowDescription"),
  };

  const requiredElements = Object.values(elements);

  if (requiredElements.some((element) => !element)) {
    console.error("Data Converter missing required elements.", elements);
    return;
  }

  const state = {
    activeMode: "csvxlsx",
  };

  const modeConfigs = {
    csvxlsx: {
      title: "CSV to XLSX",
      description: "Convert a CSV file into an Excel XLSX spreadsheet.",
      body: `
                <div class="workflow-body">
                    <div
    class="drop-zone"
    data-input="csvXlsxFile"
    role="button"
    tabindex="0"
    aria-label="Choose or drop a CSV file for conversion"
>
    <strong>Choose or Drop a CSV File</strong>

    <span>
        Click anywhere here or drag and drop a CSV file
    </span>
</div>
                    <input type="file" id="csvXlsxFile" accept=".csv,text/csv" hidden aria-label="Choose CSV file">
                    <div id="csvXlsxCount" class="file-count">No file selected</div>
                    <div class="button-group">
                        <button type="button" data-action="primary">Convert to XLSX</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <div id="csvXlsxMessage" class="message"></div>
                </div>`,
    },
    xlsxcsv: {
      title: "XLSX to CSV",
      description: "Convert an Excel XLSX spreadsheet into a CSV file.",
      body: `
                <div class="workflow-body">
                    <div
    class="drop-zone"
    data-input="xlsxCsvFile"
    role="button"
    tabindex="0"
    aria-label="Choose or drop an XLSX file"
>
    <strong>Choose or Drop an XLSX File</strong>

    <span>
        Click anywhere here or drag and drop an Excel file
    </span>
</div>
                    <input type="file" id="xlsxCsvFile" accept=".xlsx,.xls" hidden aria-label="Choose XLSX file">
                    <div id="xlsxCsvCount" class="file-count">No file selected</div>
                    <div class="button-group">
                        <button type="button" data-action="primary">Convert to CSV</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <div id="xlsxCsvMessage" class="message"></div>
                </div>`,
    },
    xlsxjson: {
      title: "XLSX to JSON",
      description: "Convert an Excel XLSX spreadsheet into a JSON file.",
      body: `
                <div class="workflow-body">
                    <div
    class="drop-zone"
    data-input="xlsxJsonFile"
    role="button"
    tabindex="0"
    aria-label="Choose or drop an XLSX file"
>
    <strong>Choose or Drop an XLSX File</strong>

    <span>
        Click anywhere here or drag and drop an Excel file
    </span>
</div>
                    <input type="file" id="xlsxJsonFile" accept=".xlsx,.xls" hidden aria-label="Choose XLSX file">
                    <div id="xlsxJsonCount" class="file-count">No file selected</div>
                    <div class="button-group">
                        <button type="button" data-action="primary">Convert to JSON</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <div id="xlsxJsonMessage" class="message"></div>
                </div>`,
    },
    jsonxlsx: {
      title: "JSON to XLSX",
      description: "Convert JSON data into an Excel XLSX spreadsheet.",
      body: `
                <div class="workflow-body">
                    <label for="jsonXlsxInput">JSON Input</label>
                    <textarea id="jsonXlsxInput" placeholder="Paste JSON data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Convert to XLSX</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <div id="jsonXlsxMessage" class="message"></div>
                </div>`,
    },
    jsoncsv: {
      title: "JSON to CSV",
      description: "Convert JSON data into a CSV file.",
      body: `
                <div class="workflow-body">
                    <label for="jsonCsvInput">JSON Input</label>
                    <textarea id="jsonCsvInput" placeholder="Paste JSON data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Convert to CSV</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <div id="jsonCsvMessage" class="message"></div>
                </div>`,
    },
    csvjson: {
      title: "CSV to JSON",
      description: "Convert a CSV file into a JSON file.",
      body: `
                <div class="workflow-body">
                    <div
    class="drop-zone"
    data-input="csvJsonFile"
    role="button"
    tabindex="0"
    aria-label="Choose or drop a CSV file for conversion"
>
    <strong>Choose or Drop a CSV File</strong>

    <span>
        Click anywhere here or drag and drop a CSV file
    </span>
</div>
                    <input type="file" id="csvJsonFile" accept=".csv,text/csv" hidden aria-label="Choose CSV file">
                    <div id="csvJsonCount" class="file-count">No file selected</div>
                    <div class="button-group">
                        <button type="button" data-action="primary">Convert to JSON</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <div id="csvJsonMessage" class="message"></div>
                </div>`,
    },
    xmljson: {
      title: "XML to JSON",
      description: "Convert XML data into JSON.",
      body: `
                <div class="workflow-body">
                    <label for="xmlJsonInput">XML Input</label>
                    <textarea id="xmlJsonInput" placeholder="Paste XML data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Convert to JSON</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <label for="xmlJsonOutput">JSON Output</label>
                    <textarea id="xmlJsonOutput" readonly></textarea>
                    <div class="button-group">
                        <button type="button" data-action="copy">Copy Result</button>
                        <button type="button" data-action="download">Download</button>
                    </div>
                    <div id="xmlJsonMessage" class="message"></div>
                </div>`,
    },
    jsonxml: {
      title: "JSON to XML",
      description: "Convert JSON data into XML.",
      body: `
                <div class="workflow-body">
                    <label for="jsonXmlInput">JSON Input</label>
                    <textarea id="jsonXmlInput" placeholder="Paste JSON data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Convert to XML</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <label for="jsonXmlOutput">XML Output</label>
                    <textarea id="jsonXmlOutput" readonly></textarea>
                    <div class="button-group">
                        <button type="button" data-action="copy">Copy Result</button>
                        <button type="button" data-action="download">Download</button>
                    </div>
                    <div id="jsonXmlMessage" class="message"></div>
                </div>`,
    },
    jsonformat: {
      title: "JSON Formatter",
      description: "Format and beautify JSON data.",
      body: `
                <div class="workflow-body">
                    <label for="jsonFormatInput">JSON Input</label>
                    <div class="workflow-sample-link"><button type="button" id="loadJsonExampleLink" class="btn btn-secondary" data-sample-loader>Load Sample JSON</button></div>
                    <textarea id="jsonFormatInput" placeholder="Paste JSON data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Format JSON</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <label for="jsonFormatOutput">Formatted JSON</label>
                    <textarea id="jsonFormatOutput" readonly></textarea>
                    <div class="button-group">
                        <button type="button" data-action="copy">Copy Result</button>
                        <button type="button" data-action="download">Download</button>
                    </div>
                    <div id="jsonFormatMessage" class="message"></div>
                </div>`,
    },
    jsonminify: {
      title: "JSON Minifier",
      description:
        "Minify JSON data by removing unnecessary spaces and line breaks.",
      body: `
                <div class="workflow-body">
                    <label for="jsonMinifyInput">JSON Input</label>
                    <textarea id="jsonMinifyInput" placeholder="Paste JSON data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Minify JSON</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <label for="jsonMinifyOutput">Minified JSON</label>
                    <textarea id="jsonMinifyOutput" readonly></textarea>
                    <div class="button-group">
                        <button type="button" data-action="copy">Copy Result</button>
                        <button type="button" data-action="download">Download</button>
                    </div>
                    <div id="jsonMinifyMessage" class="message"></div>
                </div>`,
    },
    jsonvalidate: {
      title: "JSON Validator",
      description: "Validate JSON syntax.",
      body: `
                <div class="workflow-body">
                    <label for="jsonValidateInput">JSON Input</label>
                    <textarea id="jsonValidateInput" placeholder="Paste JSON data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Validate JSON</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <div id="jsonValidateMessage" class="message"></div>
                </div>`,
    },
    xmlformat: {
      title: "XML Formatter",
      description: "Format and beautify XML data.",
      body: `
                <div class="workflow-body">
                    <label for="xmlFormatInput">XML Input</label>
                    <div class="workflow-sample-link"><button type="button" id="loadXmlExampleLink" class="btn btn-secondary" data-sample-loader>Load Sample XML</button></div>
                    <textarea id="xmlFormatInput" placeholder="Paste XML data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Format XML</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <label for="xmlFormatOutput">Formatted XML</label>
                    <textarea id="xmlFormatOutput" readonly></textarea>
                    <div class="button-group">
                        <button type="button" data-action="copy">Copy Result</button>
                        <button type="button" data-action="download">Download</button>
                    </div>
                    <div id="xmlFormatMessage" class="message"></div>
                </div>`,
    },
    xmlminify: {
      title: "XML Minifier",
      description:
        "Minify XML data by removing unnecessary spaces and line breaks.",
      body: `
                <div class="workflow-body">
                    <label for="xmlMinifyInput">XML Input</label>
                    <textarea id="xmlMinifyInput" placeholder="Paste XML data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Minify XML</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <label for="xmlMinifyOutput">Minified XML</label>
                    <textarea id="xmlMinifyOutput" readonly></textarea>
                    <div class="button-group">
                        <button type="button" data-action="copy">Copy Result</button>
                        <button type="button" data-action="download">Download</button>
                    </div>
                    <div id="xmlMinifyMessage" class="message"></div>
                </div>`,
    },
    xmlvalidate: {
      title: "XML Validator",
      description: "Validate XML syntax.",
      body: `
                <div class="workflow-body">
                    <label for="xmlValidateInput">XML Input</label>
                    <textarea id="xmlValidateInput" placeholder="Paste XML data here"></textarea>
                    <div class="button-group">
                        <button type="button" data-action="primary">Validate XML</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                    <div id="xmlValidateMessage" class="message"></div>
                </div>`,
    },
  };

  function setMessage(id, text, type = "info") {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    const allowedTypes = ["success", "error", "info"];

    const safeType = allowedTypes.includes(type) ? type : "info";

    element.textContent = text;
    element.className = "message";

    if (text) {
      element.classList.add(`message-${safeType}`);
    }

    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.setAttribute("aria-atomic", "true");
  }

  function showPrimarySuccess(messageId) {
    setMessage(messageId, "Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
    }
  }

  function normalizeButtons() {
    elements.workflowContent.querySelectorAll("button").forEach((button) => {
      if (!button.classList.contains("btn")) {
        button.classList.add("btn");
      }

      const action = button.dataset.action || "";
      if (action === "clear" || action === "copy" || action === "download") {
        button.classList.add("btn-secondary");
      }

      if (action === "primary") {
        button.setAttribute("data-primary-action", "");
      }

      if (action === "clear") {
        button.setAttribute("data-clear-action", "");
      }
    });
  }

  function initializeMessageAreas() {
    elements.workflowContent.querySelectorAll(".message").forEach((message) => {
      message.setAttribute("role", "status");
      message.setAttribute("aria-live", "polite");
      message.setAttribute("aria-atomic", "true");
    });
  }

  const MAX_INPUT_FILE_SIZE = 10 * 1024 * 1024;

  function validateInputFile(file, extensions, messageId) {
    if (!file) {
      setMessage(messageId, "Please select a file.", "error");
      return false;
    }

    if (file.size === 0) {
      setMessage(messageId, "The selected file is empty.", "error");
      return false;
    }

    if (file.size > MAX_INPUT_FILE_SIZE) {
      setMessage(messageId, "The file must be smaller than 10 MB.", "error");
      return false;
    }

    const name = file.name.toLowerCase();
    if (!extensions.some((extension) => name.endsWith(extension))) {
      setMessage(
        messageId,
        "The selected file format is not supported.",
        "error",
      );
      return false;
    }

    return true;
  }

  function formatFileSize(bytes) {
    const megabytes = bytes / (1024 * 1024);

    if (megabytes >= 1) {
      return `${megabytes.toFixed(2)} MB`;
    }

    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  function updateFileCount(inputId) {
    const input = document.getElementById(inputId);
    const files = input?.files || [];

    const mapping = {
      csvXlsxFile: "csvXlsxCount",
      xlsxCsvFile: "xlsxCsvCount",
      xlsxJsonFile: "xlsxJsonCount",
      csvJsonFile: "csvJsonCount",
    };

    const countId = mapping[inputId];
    const countElement = countId ? document.getElementById(countId) : null;

    if (!countElement) {
      return;
    }

    if (!files.length) {
      countElement.textContent = "No file selected";
      return;
    }

    const file = files[0];

    countElement.textContent = `${file.name} • ${formatFileSize(file.size)}`;
  }

  function clearFields(inputId, outputId, messageId) {
    const input = inputId ? document.getElementById(inputId) : null;
    const output = outputId ? document.getElementById(outputId) : null;
    const message = messageId ? document.getElementById(messageId) : null;

    if (input) {
      input.value = "";
    }

    if (output) {
      output.value = "";
    }

    if (message) {
      message.textContent = "";
      message.className = "message";
    }
  }

  function clearFileTool(fileInputId, countId, messageId) {
    const fileInput = document.getElementById(fileInputId);
    const count = document.getElementById(countId);
    const message = document.getElementById(messageId);

    if (fileInput) {
      fileInput.value = "";
    }

    if (count) {
      count.textContent = "No file selected";
    }

    if (message) {
      message.textContent = "";
      message.className = "message";
    }
  }

  function detectCsvSeparator(text) {
    const separators = [",", ";", "\t", "|"];
    const counts = new Map(separators.map((separator) => [separator, 0]));
    let insideQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && insideQuotes && next === '"') {
        i += 1;
        continue;
      }

      if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (!insideQuotes && (char === "\n" || char === "\r")) {
        break;
      }

      if (!insideQuotes && counts.has(char)) {
        counts.set(char, counts.get(char) + 1);
      }
    }

    let bestSeparator = ",";
    let bestCount = -1;

    counts.forEach((count, separator) => {
      if (count > bestCount) {
        bestCount = count;
        bestSeparator = separator;
      }
    });

    return bestSeparator;
  }

  function parseCsvText(text, separator) {
    const rows = [];
    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && insideQuotes && next === '"') {
        cell += '"';
        i += 1;
        continue;
      }

      if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (char === separator && !insideQuotes) {
        row.push(cell);
        cell = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (char === "\r" && next === "\n") {
          i += 1;
        }

        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      cell += char;
    }

    if (insideQuotes) {
      throw new Error("CSV contains an unterminated quoted field.");
    }

    if (cell !== "" || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }

    return rows.filter((currentRow) =>
      currentRow.some((value) => value.trim() !== ""),
    );
  }

  function hasXlsxLibrary(messageId) {
    if (typeof XLSX !== "undefined") {
      return true;
    }

    setMessage(
      messageId,
      "Spreadsheet support could not be loaded. Please refresh and try again.",
      "error",
    );
    showMessage("Spreadsheet support is unavailable.", "error");
    return false;
  }

  function downloadBlob(blob, fileName) {
    downloadFile(fileName, blob, blob.type || "application/octet-stream");
  }

  function copyText(text) {
    if (!text) {
      showMessage("Nothing to copy.", "error");
      return;
    }

    void xavertCopyText(text);
  }

  function downloadText(text, fileName) {
    if (!text) {
      showMessage("Nothing to download.", "error");
      return;
    }

    const lowerName = fileName.toLowerCase();
    const mimeType = lowerName.endsWith(".json")
      ? "application/json;charset=utf-8"
      : lowerName.endsWith(".xml")
        ? "application/xml;charset=utf-8"
        : "text/plain;charset=utf-8";

    downloadFile(fileName, text, mimeType);
  }

  async function csvToXlsx() {
    if (!hasXlsxLibrary("csvXlsxMessage")) {
      return;
    }

    const file = document.getElementById("csvXlsxFile")?.files?.[0];

    if (!validateInputFile(file, [".csv"], "csvXlsxMessage")) {
      return;
    }

    try {
      setMessage("csvXlsxMessage", "Converting CSV to XLSX...", "info");
      const text = await file.text();
      const separator = detectCsvSeparator(text);
      const rows = parseCsvText(text, separator);

      if (!rows.length) {
        throw new Error("CSV contains no usable rows.");
      }

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

      downloadBlob(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "XAVERT-CSV-to-XLSX.xlsx",
      );
      showPrimarySuccess("csvXlsxMessage");
    } catch (error) {
      console.error(error);
      setMessage("csvXlsxMessage", "Unable to convert CSV.", "error");
      showMessage("Unable to convert CSV.", "error");
    }
  }

  async function xlsxToCsv() {
    if (!hasXlsxLibrary("xlsxCsvMessage")) {
      return;
    }

    const file = document.getElementById("xlsxCsvFile")?.files?.[0];

    if (!validateInputFile(file, [".xlsx", ".xls"], "xlsxCsvMessage")) {
      return;
    }

    try {
      setMessage("xlsxCsvMessage", "Converting XLSX to CSV...", "info");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const userLocale =
        navigator.language || navigator.userLanguage || "en-US";
      const semicolonLocales = [
        "it",
        "fr",
        "de",
        "es",
        "pt",
        "nl",
        "pl",
        "tr",
        "ru",
      ];
      const localePrefix = userLocale.split("-")[0].toLowerCase();
      const csvSeparator = semicolonLocales.includes(localePrefix) ? ";" : ",";
      const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: csvSeparator });

      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        "XAVERT-XLSX-to-CSV.csv",
      );
      showPrimarySuccess("xlsxCsvMessage");
    } catch (error) {
      console.error(error);
      setMessage("xlsxCsvMessage", "Unable to convert XLSX.", "error");
      showMessage("Unable to convert XLSX.", "error");
    }
  }

  async function xlsxToJson() {
    if (!hasXlsxLibrary("xlsxJsonMessage")) {
      return;
    }

    const file = document.getElementById("xlsxJsonFile")?.files?.[0];

    if (!validateInputFile(file, [".xlsx", ".xls"], "xlsxJsonMessage")) {
      return;
    }

    try {
      setMessage("xlsxJsonMessage", "Converting XLSX to JSON...", "info");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      downloadBlob(
        new Blob([JSON.stringify(json, null, 2)], {
          type: "application/json;charset=utf-8",
        }),
        "XAVERT-XLSX-to-JSON.json",
      );
      showPrimarySuccess("xlsxJsonMessage");
    } catch (error) {
      console.error(error);
      setMessage("xlsxJsonMessage", "Unable to convert XLSX.", "error");
      showMessage("Unable to convert XLSX.", "error");
    }
  }

  function jsonToXlsx() {
    if (!hasXlsxLibrary("jsonXlsxMessage")) {
      return;
    }

    const text = document.getElementById("jsonXlsxInput")?.value.trim();

    if (!text) {
      setMessage("jsonXlsxMessage", "Please enter JSON data.", "error");
      return;
    }

    try {
      setMessage("jsonXlsxMessage", "Converting JSON to XLSX...", "info");
      const json = JSON.parse(text);

      if (
        !Array.isArray(json) ||
        json.length === 0 ||
        json.some(
          (item) =>
            typeof item !== "object" || item === null || Array.isArray(item),
        )
      ) {
        setMessage(
          "jsonXlsxMessage",
          "JSON must be a non-empty array of objects.",
          "error",
        );
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(json);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

      downloadBlob(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "XAVERT-JSON-to-XLSX.xlsx",
      );
      showPrimarySuccess("jsonXlsxMessage");
    } catch (error) {
      console.error(error);
      setMessage(
        "jsonXlsxMessage",
        "Invalid JSON or unable to convert.",
        "error",
      );
      showMessage("Invalid JSON or unable to convert.", "error");
    }
  }

  function jsonToCsv() {
    if (!hasXlsxLibrary("jsonCsvMessage")) {
      return;
    }

    const text = document.getElementById("jsonCsvInput")?.value.trim();

    if (!text) {
      setMessage("jsonCsvMessage", "Please enter JSON data.", "error");
      return;
    }

    try {
      const json = JSON.parse(text);

      if (
        !Array.isArray(json) ||
        json.length === 0 ||
        json.some(
          (item) =>
            typeof item !== "object" || item === null || Array.isArray(item),
        )
      ) {
        setMessage(
          "jsonCsvMessage",
          "JSON must be a non-empty array of objects.",
          "error",
        );
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(json);
      const userLocale =
        navigator.language || navigator.userLanguage || "en-US";
      const semicolonLocales = [
        "it",
        "fr",
        "de",
        "es",
        "pt",
        "nl",
        "pl",
        "tr",
        "ru",
      ];
      const localePrefix = userLocale.split("-")[0].toLowerCase();
      const csvSeparator = semicolonLocales.includes(localePrefix) ? ";" : ",";
      const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: csvSeparator });

      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        "XAVERT-JSON-to-CSV.csv",
      );
      showPrimarySuccess("jsonCsvMessage");
    } catch (error) {
      console.error(error);
      setMessage(
        "jsonCsvMessage",
        "Invalid JSON or unable to convert.",
        "error",
      );
      showMessage("Invalid JSON or unable to convert.", "error");
    }
  }

  async function csvToJson() {
    const file = document.getElementById("csvJsonFile")?.files?.[0];

    if (!validateInputFile(file, [".csv"], "csvJsonMessage")) {
      return;
    }

    try {
      setMessage("csvJsonMessage", "Converting CSV to JSON...", "info");
      const text = await file.text();
      const separator = detectCsvSeparator(text);
      const rows = parseCsvText(text, separator);

      if (!rows.length) {
        throw new Error("CSV contains no usable rows.");
      }

      const seenHeaders = new Map();
      const headers = (rows[0] || []).map((header, index) => {
        const baseName = header.trim() || `Column ${index + 1}`;
        const count = (seenHeaders.get(baseName) || 0) + 1;
        seenHeaders.set(baseName, count);
        return count === 1 ? baseName : `${baseName}_${count}`;
      });

      const json = rows.slice(1).map((row) => {
        const obj = {};

        headers.forEach((header, index) => {
          obj[header] = row[index] ?? "";
        });

        return obj;
      });

      downloadBlob(
        new Blob([JSON.stringify(json, null, 2)], {
          type: "application/json;charset=utf-8",
        }),
        "XAVERT-CSV-to-JSON.json",
      );
      showPrimarySuccess("csvJsonMessage");
    } catch (error) {
      console.error(error);
      setMessage("csvJsonMessage", "Unable to convert CSV.", "error");
      showMessage("Unable to convert CSV.", "error");
    }
  }

  function loadJsonExample() {
    document.getElementById("jsonFormatInput").value = `{
  "name": "XAVERT",
  "type": "Toolkit",
  "version": 1,
  "active": true
}`;

    formatJson({ announce: false });

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else {
      showMessage("Sample loaded successfully.", "success");
    }
  }

  function formatJson({ announce = true } = {}) {
    const input = document.getElementById("jsonFormatInput")?.value.trim();

    if (!input) {
      setMessage("jsonFormatMessage", "Please enter JSON data.", "error");
      return;
    }

    try {
      const json = JSON.parse(input);
      document.getElementById("jsonFormatOutput").value = JSON.stringify(
        json,
        null,
        2,
      );
      if (announce) {
        showPrimarySuccess("jsonFormatMessage");
      } else {
        setMessage("jsonFormatMessage", "", "info");
      }
    } catch (error) {
      console.error(error);
      setMessage("jsonFormatMessage", "Invalid JSON.", "error");
    }
  }

  function minifyJson() {
    const input = document.getElementById("jsonMinifyInput")?.value.trim();

    if (!input) {
      setMessage("jsonMinifyMessage", "Please enter JSON data.", "error");
      return;
    }

    try {
      const json = JSON.parse(input);
      document.getElementById("jsonMinifyOutput").value = JSON.stringify(json);
      showPrimarySuccess("jsonMinifyMessage");
    } catch (error) {
      console.error(error);
      setMessage("jsonMinifyMessage", "Invalid JSON.", "error");
    }
  }

  function validateJson() {
    const input = document.getElementById("jsonValidateInput")?.value.trim();

    if (!input) {
      setMessage("jsonValidateMessage", "Please enter JSON data.", "error");
      return;
    }

    try {
      JSON.parse(input);
      setMessage("jsonValidateMessage", "Valid JSON", "success");
    } catch (error) {
      setMessage("jsonValidateMessage", "Invalid JSON", "error");
    }
  }

  function xmlNodeToJson(node) {
    const obj = {};

    if (node.attributes && node.attributes.length > 0) {
      obj["@attributes"] = {};
      Array.from(node.attributes).forEach((attribute) => {
        obj["@attributes"][attribute.name] = attribute.value;
      });
    }

    if (node.children.length === 0) {
      const text = node.textContent.trim();
      if (Object.keys(obj).length > 0) {
        obj["#text"] = text;
        return obj;
      }
      return text;
    }

    const directText = Array.from(node.childNodes)
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.nodeValue || "")
      .join("")
      .trim();

    if (directText) {
      obj["#text"] = directText;
    }

    Array.from(node.children).forEach((child) => {
      const childName = child.nodeName;
      const childValue = xmlNodeToJson(child);

      if (Object.prototype.hasOwnProperty.call(obj, childName)) {
        if (!Array.isArray(obj[childName])) {
          obj[childName] = [obj[childName]];
        }
        obj[childName].push(childValue);
      } else {
        obj[childName] = childValue;
      }
    });

    return obj;
  }

  function xmlToJson() {
    const input = document.getElementById("xmlJsonInput")?.value.trim();

    if (!input) {
      setMessage("xmlJsonMessage", "Please enter XML data.", "error");
      return;
    }

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input, "application/xml");

      if (xmlDoc.getElementsByTagName("parsererror").length) {
        setMessage("xmlJsonMessage", "Invalid XML.", "error");
        return;
      }

      const root = xmlDoc.documentElement;
      const json = {};
      json[root.nodeName] = xmlNodeToJson(root);

      document.getElementById("xmlJsonOutput").value = JSON.stringify(
        json,
        null,
        2,
      );
      showPrimarySuccess("xmlJsonMessage");
    } catch (error) {
      console.error(error);
      setMessage("xmlJsonMessage", "Unable to convert XML.", "error");
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

  function isValidXmlName(name) {
    return /^[A-Za-z_][A-Za-z0-9._-]*$/.test(name);
  }

  function jsonToXmlNode(name, value, level = 0) {
    if (!isValidXmlName(name)) {
      throw new Error(`Invalid XML element name: ${name}`);
    }

    const indent = "  ".repeat(level);

    if (Array.isArray(value)) {
      return value.map((item) => jsonToXmlNode(name, item, level)).join("\n");
    }

    if (typeof value !== "object" || value === null) {
      return `${indent}<${name}>${escapeXml(value)}</${name}>`;
    }

    let attributes = "";

    if (value["@attributes"]) {
      Object.keys(value["@attributes"]).forEach((attributeName) => {
        attributes += ` ${attributeName}="${escapeXml(value["@attributes"][attributeName])}"`;
      });
    }

    if (value["#text"] && Object.keys(value).length <= 2) {
      return `${indent}<${name}${attributes}>${escapeXml(value["#text"])}</${name}>`;
    }

    const childKeys = Object.keys(value).filter(
      (key) => key !== "@attributes" && key !== "#text",
    );

    if (!childKeys.length) {
      const text = Object.prototype.hasOwnProperty.call(value, "#text")
        ? escapeXml(value["#text"])
        : "";
      return `${indent}<${name}${attributes}>${text}</${name}>`;
    }

    let xml = `${indent}<${name}${attributes}>\n`;

    if (
      Object.prototype.hasOwnProperty.call(value, "#text") &&
      value["#text"] !== ""
    ) {
      xml += `${"  ".repeat(level + 1)}${escapeXml(value["#text"])}\n`;
    }

    childKeys.forEach((key) => {
      xml += `${jsonToXmlNode(key, value[key], level + 1)}\n`;
    });

    xml += `${indent}</${name}>`;
    return xml;
  }

  function jsonToXml() {
    const input = document.getElementById("jsonXmlInput")?.value.trim();

    if (!input) {
      setMessage("jsonXmlMessage", "Please enter JSON data.", "error");
      return;
    }

    try {
      const json = JSON.parse(input);

      if (
        typeof json !== "object" ||
        json === null ||
        Array.isArray(json) ||
        Object.keys(json).length === 0
      ) {
        setMessage(
          "jsonXmlMessage",
          "JSON must be a non-empty object with XML-safe root keys.",
          "error",
        );
        return;
      }

      let xml = "";

      Object.keys(json).forEach((key) => {
        xml += `${jsonToXmlNode(key, json[key], 0)}\n`;
      });

      xml = xml.trim();

      document.getElementById("jsonXmlOutput").value = xml;
      showPrimarySuccess("jsonXmlMessage");
    } catch (error) {
      console.error(error);
      setMessage("jsonXmlMessage", "Invalid JSON.", "error");
    }
  }

  function loadXmlExample() {
    document.getElementById("xmlFormatInput").value = `<company>
  <name>XAVERT</name>
  <type>Toolkit</type>
  <version>1</version>
</company>`;

    formatXml({ announce: false });

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else {
      showMessage("Sample loaded successfully.", "success");
    }
  }

  function formatXml({ announce = true } = {}) {
    const input = document.getElementById("xmlFormatInput")?.value.trim();

    if (!input) {
      setMessage("xmlFormatMessage", "Please enter XML data.", "error");
      return;
    }

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input, "application/xml");

      if (xmlDoc.getElementsByTagName("parsererror").length) {
        setMessage("xmlFormatMessage", "Invalid XML.", "error");
        return;
      }

      const serializer = new XMLSerializer();
      let xml = serializer.serializeToString(xmlDoc);
      xml = xml.replace(/>\s+</g, "><");
      xml = xml.replace(/></g, ">\n<");

      let formatted = "";
      let indent = 0;

      xml.split("\n").forEach((line) => {
        if (line.match(/^<\//)) {
          indent -= 1;
        }

        formatted += `${"  ".repeat(Math.max(indent, 0))}${line}\n`;

        if (line.match(/^<[^!?/][^>]*[^/]>/) && !line.match(/<\/[^>]+>$/)) {
          indent += 1;
        }
      });

      document.getElementById("xmlFormatOutput").value = formatted.trim();
      if (announce) {
        showPrimarySuccess("xmlFormatMessage");
      } else {
        setMessage("xmlFormatMessage", "", "info");
      }
    } catch (error) {
      console.error(error);
      setMessage("xmlFormatMessage", "Unable to format XML.", "error");
    }
  }

  function minifyXml() {
    const input = document.getElementById("xmlMinifyInput")?.value.trim();

    if (!input) {
      setMessage("xmlMinifyMessage", "Please enter XML data.", "error");
      return;
    }

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input, "application/xml");

      if (xmlDoc.getElementsByTagName("parsererror").length) {
        setMessage("xmlMinifyMessage", "Invalid XML.", "error");
        return;
      }

      const serializer = new XMLSerializer();
      let xml = serializer.serializeToString(xmlDoc);
      xml = xml
        .replace(/>\s+</g, "><")
        .replace(/\s{2,}/g, " ")
        .trim();
      document.getElementById("xmlMinifyOutput").value = xml;
      showPrimarySuccess("xmlMinifyMessage");
    } catch (error) {
      console.error(error);
      setMessage("xmlMinifyMessage", "Unable to minify XML.", "error");
    }
  }

  function validateXml() {
    const input = document.getElementById("xmlValidateInput")?.value.trim();

    if (!input) {
      setMessage("xmlValidateMessage", "Please enter XML data.", "error");
      return;
    }

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input, "application/xml");

      if (xmlDoc.getElementsByTagName("parsererror").length) {
        setMessage("xmlValidateMessage", "Invalid XML", "error");
        return;
      }

      setMessage("xmlValidateMessage", "Valid XML", "success");
    } catch (error) {
      console.error(error);
      setMessage("xmlValidateMessage", "Invalid XML", "error");
    }
  }

  function getFileModeConfig(inputId) {
    const configs = {
      csvXlsxFile: { extensions: [".csv"], messageId: "csvXlsxMessage" },
      xlsxCsvFile: {
        extensions: [".xlsx", ".xls"],
        messageId: "xlsxCsvMessage",
      },
      xlsxJsonFile: {
        extensions: [".xlsx", ".xls"],
        messageId: "xlsxJsonMessage",
      },
      csvJsonFile: { extensions: [".csv"], messageId: "csvJsonMessage" },
    };

    return configs[inputId] || null;
  }

  function attachDropZones() {
    elements.workflowContent.querySelectorAll(".drop-zone").forEach((zone) => {
      const input = document.getElementById(zone.getAttribute("data-input"));
      if (!input) {
        return;
      }

      zone.setAttribute("role", "button");
      zone.setAttribute("tabindex", "0");

      const openPicker = () => input.click();

      zone.addEventListener("click", openPicker);
      zone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      });

      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("dragover");
      });

      zone.addEventListener("dragleave", () => {
        zone.classList.remove("dragover");
      });

      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("dragover");

        const files = event.dataTransfer?.files;
        const file = files?.[0];

        if (!file || files.length !== 1) {
          const config = getFileModeConfig(input.id);
          if (config) {
            setMessage(
              config.messageId,
              "Please drop exactly one file.",
              "error",
            );
          }
          return;
        }

        const config = getFileModeConfig(input.id);
        if (
          config &&
          !validateInputFile(file, config.extensions, config.messageId)
        ) {
          return;
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        updateFileCount(input.id);
      });

      input.addEventListener("change", () => {
        const file = input.files?.[0];
        const config = getFileModeConfig(input.id);

        if (
          file &&
          config &&
          !validateInputFile(file, config.extensions, config.messageId)
        ) {
          input.value = "";
        }

        updateFileCount(input.id);
      });
    });
  }

  function attachWorkflowActions() {
    const buttons = elements.workflowContent.querySelectorAll("button");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (action === "primary") {
          runPrimaryAction();
          return;
        }

        if (action === "clear") {
          clearCurrentWorkflow();
          return;
        }

        if (action === "copy") {
          copyCurrentResult();
          return;
        }

        if (action === "download") {
          downloadCurrentResult();
        }
      });
    });
  }

  function runPrimaryAction() {
    switch (state.activeMode) {
      case "csvxlsx":
        void csvToXlsx();
        break;
      case "xlsxcsv":
        void xlsxToCsv();
        break;
      case "xlsxjson":
        void xlsxToJson();
        break;
      case "jsonxlsx":
        jsonToXlsx();
        break;
      case "jsoncsv":
        jsonToCsv();
        break;
      case "csvjson":
        void csvToJson();
        break;
      case "xmljson":
        xmlToJson();
        break;
      case "jsonxml":
        jsonToXml();
        break;
      case "jsonformat":
        formatJson();
        break;
      case "jsonminify":
        minifyJson();
        break;
      case "jsonvalidate":
        validateJson();
        break;
      case "xmlformat":
        formatXml();
        break;
      case "xmlminify":
        minifyXml();
        break;
      case "xmlvalidate":
        validateXml();
        break;
      default:
        break;
    }
  }

  function clearCurrentWorkflow() {
    switch (state.activeMode) {
      case "csvxlsx":
        clearFileTool("csvXlsxFile", "csvXlsxCount", "csvXlsxMessage");
        break;
      case "xlsxcsv":
        clearFileTool("xlsxCsvFile", "xlsxCsvCount", "xlsxCsvMessage");
        break;
      case "xlsxjson":
        clearFileTool("xlsxJsonFile", "xlsxJsonCount", "xlsxJsonMessage");
        break;
      case "jsonxlsx":
        clearFields("jsonXlsxInput", null, "jsonXlsxMessage");
        break;
      case "jsoncsv":
        clearFields("jsonCsvInput", null, "jsonCsvMessage");
        break;
      case "csvjson":
        clearFileTool("csvJsonFile", "csvJsonCount", "csvJsonMessage");
        break;
      case "xmljson":
        clearFields("xmlJsonInput", "xmlJsonOutput", "xmlJsonMessage");
        break;
      case "jsonxml":
        clearFields("jsonXmlInput", "jsonXmlOutput", "jsonXmlMessage");
        break;
      case "jsonformat":
        clearFields("jsonFormatInput", "jsonFormatOutput", "jsonFormatMessage");
        break;
      case "jsonminify":
        clearFields("jsonMinifyInput", "jsonMinifyOutput", "jsonMinifyMessage");
        break;
      case "jsonvalidate":
        clearFields("jsonValidateInput", null, "jsonValidateMessage");
        break;
      case "xmlformat":
        clearFields("xmlFormatInput", "xmlFormatOutput", "xmlFormatMessage");
        break;
      case "xmlminify":
        clearFields("xmlMinifyInput", "xmlMinifyOutput", "xmlMinifyMessage");
        break;
      case "xmlvalidate":
        clearFields("xmlValidateInput", null, "xmlValidateMessage");
        break;
      default:
        break;
    }
  }

  function copyCurrentResult() {
    switch (state.activeMode) {
      case "xmljson":
        copyText(document.getElementById("xmlJsonOutput")?.value || "");
        break;
      case "jsonxml":
        copyText(document.getElementById("jsonXmlOutput")?.value || "");
        break;
      case "jsonformat":
        copyText(document.getElementById("jsonFormatOutput")?.value || "");
        break;
      case "jsonminify":
        copyText(document.getElementById("jsonMinifyOutput")?.value || "");
        break;
      case "xmlformat":
        copyText(document.getElementById("xmlFormatOutput")?.value || "");
        break;
      case "xmlminify":
        copyText(document.getElementById("xmlMinifyOutput")?.value || "");
        break;
      default:
        break;
    }
  }

  function downloadCurrentResult() {
    switch (state.activeMode) {
      case "xmljson":
        downloadText(
          document.getElementById("xmlJsonOutput")?.value || "",
          "XAVERT-Converted-JSON.json",
        );
        break;
      case "jsonxml":
        downloadText(
          document.getElementById("jsonXmlOutput")?.value || "",
          "XAVERT-Converted-XML.xml",
        );
        break;
      case "jsonformat":
        downloadText(
          document.getElementById("jsonFormatOutput")?.value || "",
          "XAVERT-Formatted-JSON.json",
        );
        break;
      case "jsonminify":
        downloadText(
          document.getElementById("jsonMinifyOutput")?.value || "",
          "XAVERT-Minified-JSON.json",
        );
        break;
      case "xmlformat":
        downloadText(
          document.getElementById("xmlFormatOutput")?.value || "",
          "XAVERT-Formatted-XML.xml",
        );
        break;
      case "xmlminify":
        downloadText(
          document.getElementById("xmlMinifyOutput")?.value || "",
          "XAVERT-Minified-XML.xml",
        );
        break;
      default:
        break;
    }
  }

  function attachSamples() {
    const jsonLink = document.getElementById("loadJsonExampleLink");
    const xmlLink = document.getElementById("loadXmlExampleLink");

    if (jsonLink) {
      jsonLink.addEventListener("click", (event) => {
        event.preventDefault();
        loadJsonExample();
      });
    }

    if (xmlLink) {
      xmlLink.addEventListener("click", (event) => {
        event.preventDefault();
        loadXmlExample();
      });
    }
  }

  function useSharedStatusPattern() {
    elements.workflowContent.querySelectorAll(".message").forEach((message) => {
      if (
        !message.classList.contains("message-success") &&
        !message.classList.contains("message-error") &&
        !message.classList.contains("message-info")
      ) {
        message.classList.add("message-info");
      }
    });
  }

  function renderWorkflow(mode) {
    const config = modeConfigs[mode];
    if (!config) {
      return;
    }

    state.activeMode = mode;
    elements.workflowTitle.textContent = config.title;
    elements.workflowDescription.textContent = config.description;
    elements.workflowContent.innerHTML = config.body;

    initializeMessageAreas();
    normalizeButtons();
    useSharedStatusPattern();
    attachDropZones();
    attachWorkflowActions();
    attachSamples();
    elements.toolSelector.value = mode;
  }

  function attachToolSwitch() {
    elements.toolSelector.addEventListener("change", () => {
      renderWorkflow(elements.toolSelector.value);
    });
  }

  function neutralizeInlineHandlers() {
    document
      .querySelectorAll("button[onclick], a[onclick]")
      .forEach((element) => {
        element.onclick = null;
      });
  }

  neutralizeInlineHandlers();
  attachToolSwitch();
  renderWorkflow(elements.toolSelector.value || state.activeMode);
});
