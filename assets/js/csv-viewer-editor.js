"use strict";

const CSV_VIEWER_TOOL_ID = "csv-viewer-editor";
const MAX_CSV_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_CSV_MIME_TYPES = new Set([
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);

function initCsvViewerEditor() {
  const csvFile = document.getElementById("csvFile");
  const dropZone = document.getElementById("dropZone");
  const searchInput = document.getElementById("searchInput");
  const newCsvColumns = document.getElementById("newCsvColumns");
  const newCsvBtn = document.getElementById("newCsvBtn");
  const addRowBtn = document.getElementById("addRowBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const tableContainer = document.getElementById("tableContainer");
  const csvTable = document.getElementById("csvTable");
  const message = document.getElementById("message");
  const rowCount = document.getElementById("rowCount");
  const columnCount = document.getElementById("columnCount");
  const cellCount = document.getElementById("cellCount");
  const fileSize = document.getElementById("fileSize");

  const requiredElements = [
    csvFile,
    dropZone,
    searchInput,
    newCsvColumns,
    newCsvBtn,
    addRowBtn,
    downloadBtn,
    copyBtn,
    clearBtn,
    sampleBtn,
    tableContainer,
    csvTable,
    message,
    rowCount,
    columnCount,
    cellCount,
    fileSize,
  ];

  const missingElements = requiredElements.filter((element) => !element);
  if (missingElements.length > 0) {
    console.error("CSV viewer missing required elements", missingElements);
    return;
  }

  let csvData = [];
  let currentDelimiter = ",";
  let sortDirection = 1;
  let sortedColumn = -1;

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

  function detectDelimiter(text) {
    const firstLine = text.split(/\r\n|\r|\n/)[0] || "";
    const delimiters = [",", ";", "\t", "|"];
    let bestDelimiter = ",";
    let bestCount = 0;

    delimiters.forEach((delimiter) => {
      const count = firstLine.split(delimiter).length - 1;
      if (count > bestCount) {
        bestCount = count;
        bestDelimiter = delimiter;
      }
    });

    return bestDelimiter;
  }

  function isValidCsvFile(file) {
    if (!file) {
      return false;
    }

    const fileName = file.name.toLowerCase();

    const hasCsvExtension = fileName.endsWith(".csv");
    const hasAllowedMimeType =
      !file.type || ALLOWED_CSV_MIME_TYPES.has(file.type);

    return hasCsvExtension && hasAllowedMimeType;
  }

  function validateCsvFile(file) {
    if (!file) {
      return false;
    }

    if (file.size === 0) {
      notify("The selected CSV file is empty.", "error");
      return false;
    }

    if (file.size > MAX_CSV_FILE_SIZE) {
      notify("The CSV file must be smaller than 10 MB.", "error");
      return false;
    }

    if (!isValidCsvFile(file)) {
      notify("Select a valid CSV file.", "error");
      return false;
    }

    return true;
  }

  function readCsvFile(file) {
    if (!validateCsvFile(file)) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      loadCSV(String(event.target?.result ?? ""));
    };

    reader.onerror = () => {
      notify("The CSV file could not be read.", "error");
    };

    reader.readAsText(file);
  }

  function parseCSV(text) {
    const delimiter = currentDelimiter || detectDelimiter(text);
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
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (char === "\r" && next === "\n") {
          i += 1;
        }
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (cell !== "" || row.length) {
      row.push(cell);
      rows.push(row);
    }

    return rows.filter((item) => item.some((value) => value.trim() !== ""));
  }

  function escapeCSV(value, delimiter = currentDelimiter) {
    value = String(value ?? "");

    if (
      value.includes(delimiter) ||
      value.includes('"') ||
      value.includes("\n") ||
      value.includes("\r")
    ) {
      return '"' + value.replace(/"/g, '""') + '"';
    }

    return value;
  }

  function toCSV(data) {
    const delimiter = currentDelimiter || ",";

    return data
      .map((row) =>
        row.map((value) => escapeCSV(value, delimiter)).join(delimiter),
      )
      .join("\n");
  }

  function normalizeRows(data) {
    const maxColumns = Math.max(...data.map((row) => row.length));
    return data.map((row) => {
      const normalized = row.slice();
      while (normalized.length < maxColumns) {
        normalized.push("");
      }
      return normalized;
    });
  }

  function updateStats() {
    const rows = csvData.length ? csvData.length - 1 : 0;
    const columns = csvData[0] ? csvData[0].length : 0;
    const cells = rows * columns;
    const text = csvData.length ? toCSV(csvData) : "";

    rowCount.textContent = rows;
    columnCount.textContent = columns;
    cellCount.textContent = cells;
    fileSize.textContent = text.length;
  }

  function renderTable(data) {
    csvTable.replaceChildren();

    if (!data.length) {
      tableContainer.hidden = true;
      updateStats();
      return;
    }

    tableContainer.hidden = false;

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    data[0].forEach((header, index) => {
      const th = document.createElement("th");
      const columnName = header || `Column ${index + 1}`;
      th.scope = "col";
      th.textContent =
        index === sortedColumn
          ? `${columnName}${sortDirection === 1 ? " ▲" : " ▼"}`
          : columnName;
      th.tabIndex = 0;
      th.setAttribute("role", "button");
      th.setAttribute("aria-label", `Sort by ${columnName}`);
      th.addEventListener("click", () => sortByColumn(index));
      th.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          sortByColumn(index);
        }
      });
      headerRow.appendChild(th);
    });

    const deleteHeader = document.createElement("th");
    deleteHeader.textContent = "Delete";
    deleteHeader.className = "delete-header";
    deleteHeader.setAttribute("scope", "col");
    headerRow.appendChild(deleteHeader);
    thead.appendChild(headerRow);
    csvTable.appendChild(thead);

    const tbody = document.createElement("tbody");

    data.slice(1).forEach((row, rowIndex) => {
      const tr = document.createElement("tr");

      row.forEach((cell, colIndex) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.value = cell;
        input.setAttribute(
          "aria-label",
          `Row ${rowIndex + 2}, Column ${colIndex + 1}`,
        );
        input.addEventListener("input", () => {
          csvData[rowIndex + 1][colIndex] = input.value;
          updateStats();
        });
        td.appendChild(input);
        tr.appendChild(td);
      });

      const deleteCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "🗑";
      deleteButton.title = "Delete row";
      deleteButton.className = "delete-row-btn";
      deleteButton.setAttribute("aria-label", `Delete row ${rowIndex + 2}`);
      deleteButton.addEventListener("click", () => {
        csvData.splice(rowIndex + 1, 1);
        renderTable(csvData);
        notify("Row deleted.", "success");
      });
      deleteCell.appendChild(deleteButton);
      tr.appendChild(deleteCell);
      tbody.appendChild(tr);
    });

    csvTable.appendChild(tbody);
    updateStats();
  }

  function loadCSV(text) {
    currentDelimiter = detectDelimiter(text);
    const parsed = parseCSV(text);
    if (!parsed.length) {
      notify("CSV is empty or invalid.", "error");
      return;
    }
    csvData = normalizeRows(parsed);
    sortedColumn = -1;
    sortDirection = 1;
    searchInput.value = "";
    renderTable(csvData);
    notify("CSV loaded.", "success");
  }

  function sortByColumn(index) {
    if (csvData.length < 2) {
      return;
    }

    if (sortedColumn === index) {
      sortDirection *= -1;
    } else {
      sortedColumn = index;
      sortDirection = 1;
    }

    const header = csvData[0];
    const rows = csvData.slice(1);

    rows.sort((a, b) => {
      const av = a[index] || "";
      const bv = b[index] || "";
      const an = Number(av);
      const bn = Number(bv);

      if (
        av.trim() !== "" &&
        bv.trim() !== "" &&
        !Number.isNaN(an) &&
        !Number.isNaN(bn)
      ) {
        return (an - bn) * sortDirection;
      }

      return (
        av.localeCompare(bv, undefined, {
          numeric: true,
          sensitivity: "base",
        }) * sortDirection
      );
    });

    csvData = [header].concat(rows);
    renderTable(csvData);
  }

  function filterRows() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      renderTable(csvData);
      setInlineMessage("");
      return;
    }

    document.querySelectorAll("#csvTable tbody tr").forEach((row) => {
      const text = Array.from(row.querySelectorAll("input"))
        .map((input) => input.value)
        .join(" ")
        .toLowerCase();
      row.classList.toggle("is-hidden-row", !text.includes(query));
    });

    const found = Array.from(
      document.querySelectorAll("#csvTable tbody tr"),
    ).filter((row) => !row.classList.contains("is-hidden-row")).length;
    notify(`${found} row${found !== 1 ? "s" : ""} found.`, "info", false);
  }

  function createNewCsv() {
    const requested = Number.parseInt(newCsvColumns.value, 10);
    const columns = Number.isFinite(requested)
      ? Math.max(1, Math.min(50, requested))
      : 3;

    newCsvColumns.value = String(columns);
    currentDelimiter = ",";
    sortedColumn = -1;
    sortDirection = 1;
    searchInput.value = "";

    csvData = [
      Array.from({ length: columns }, (_, index) => `Column ${index + 1}`),
      new Array(columns).fill(""),
    ];

    renderTable(csvData);
    notify("New CSV created.", "success");
  }

  function addRow() {
    if (!csvData.length) {
      createNewCsv();
      return;
    } else {
      const columns = csvData[0].length;
      const newRow = new Array(columns).fill("");
      csvData.push(newRow);
    }
    renderTable(csvData);
    notify("Row added.", "success");
  }

  function downloadCSV() {
    if (!csvData.length) {
      notify("Nothing to download.", "error");
      return;
    }

    downloadFile(
      "xavert-csv-data.csv",
      toCSV(csvData),
      "text/csv;charset=utf-8",
    );
  }

  async function copyTable() {
    if (!csvData.length) {
      notify("Nothing to copy.", "error");
      return;
    }

    await xavertCopyText(toCSV(csvData));
  }

  function clearTool() {
    csvData = [];
    currentDelimiter = ",";
    csvFile.value = "";
    searchInput.value = "";
    newCsvColumns.value = "3";
    csvTable.replaceChildren();
    tableContainer.hidden = true;
    updateStats();
    setInlineMessage("");
  }

  function loadSample() {
    currentDelimiter = ",";

    const sample = [
      "Name,Role,Country,Score",
      "Alice,Developer,USA,92",
      "Marco,Designer,Italy,88",
      "Yuki,Engineer,Japan,95",
      "Sofia,Manager,Spain,84",
    ].join("\n");

    const parsed = parseCSV(sample);

    csvData = normalizeRows(parsed);
    sortedColumn = -1;
    sortDirection = 1;
    searchInput.value = "";

    renderTable(csvData);

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else {
      notify("Sample loaded successfully.", "success");
    }
  }

  csvFile.addEventListener("change", () => {
    const file = csvFile.files?.[0];

    readCsvFile(file);

    csvFile.value = "";
  });

  searchInput.addEventListener("input", filterRows);
  newCsvBtn.addEventListener("click", createNewCsv);
  addRowBtn.addEventListener("click", addRow);
  downloadBtn.addEventListener("click", downloadCSV);
  copyBtn.addEventListener("click", () => {
    void copyTable();
  });
  clearBtn.addEventListener("click", clearTool);
  sampleBtn.addEventListener("click", loadSample);

  dropZone.addEventListener("click", () => {
    csvFile.click();
  });

  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      csvFile.click();
    }
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    const file = event.dataTransfer?.files?.[0];

    readCsvFile(file);
  });

  tableContainer.hidden = true;

  setInlineMessage(
    "Choose or drop a CSV file, create a new CSV, or load the sample to begin.",
    "info",
  );

  updateStats();

  dropZone.focus();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool === CSV_VIEWER_TOOL_ID) {
    initCsvViewerEditor();
  }
});
