"use strict";

const CSV_VIEWER_TOOL_ID = "csv-viewer-editor";
const MAX_CSV_FILE_SIZE = 10 * 1024 * 1024;
const MAX_CSV_ROWS = 100000;
const MAX_CSV_COLUMNS = 500;
const MAX_CSV_CELLS = 1000000;
const MAX_RENDERED_CSV_ROWS = 500;
const MAX_RENDERED_CSV_CELLS = 5000;

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
  let currentViewData = [];
  let currentPage = 1;
  let csvCharacterCount = 0;
  let searchTimer = 0;

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
    // Count separators only outside quoted CSV fields, over several records.
    // A comma in "Company, Inc" must not override a semicolon separator.
    const delimiters = [",", ";", "\t", "|"];
    const samples = new Map(delimiters.map((delimiter) => [delimiter, []]));
    let current = new Map(delimiters.map((delimiter) => [delimiter, 0]));
    let inQuotes = false;
    let atFieldStart = true;
    let rowHasContent = false;
    let records = 0;

    function endRecord() {
      if (rowHasContent) {
        delimiters.forEach((delimiter) => {
          samples.get(delimiter).push(current.get(delimiter));
        });
        records += 1;
      }
      current = new Map(delimiters.map((delimiter) => [delimiter, 0]));
      atFieldStart = true;
      rowHasContent = false;
    }

    for (let i = 0; i < text.length && records < 8; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          i += 1;
        } else if (inQuotes) {
          inQuotes = false;
        } else if (atFieldStart) {
          inQuotes = true;
        }
        rowHasContent = true;
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        endRecord();
      } else if (!inQuotes && delimiters.includes(char)) {
        current.set(char, current.get(char) + 1);
        atFieldStart = true;
        rowHasContent = true;
      } else {
        atFieldStart = false;
        rowHasContent = true;
      }
    }
    if (rowHasContent && records < 8) endRecord();

    let bestDelimiter = ",";
    let bestScore = 0;
    delimiters.forEach((delimiter) => {
      const counts = samples.get(delimiter);
      const total = counts.reduce((sum, count) => sum + count, 0);
      const consistent = counts.length > 1 && counts.every((count) => count === counts[0]);
      const score = total + (consistent && total > 0 ? counts.length : 0);
      if (score > bestScore) {
        bestScore = score;
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
    let justClosedQuote = false;
    let parsedCells = 0;

    function appendRow() {
      if (row.length > MAX_CSV_COLUMNS) {
        throw new Error(
          `This CSV has more than ${MAX_CSV_COLUMNS.toLocaleString()} columns and cannot be edited safely in the browser.`,
        );
      }

      parsedCells += row.length;

      if (parsedCells > MAX_CSV_CELLS) {
        throw new Error(
          `This CSV has more than ${MAX_CSV_CELLS.toLocaleString()} cells and cannot be edited safely in the browser.`,
        );
      }

      rows.push(row);

      if (rows.length > MAX_CSV_ROWS) {
        throw new Error(
          `This CSV has more than ${MAX_CSV_ROWS.toLocaleString()} rows and cannot be edited safely in the browser.`,
        );
      }

      row = [];
    }

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (insideQuotes && next === '"') {
          cell += '"';
          i += 1;
        } else if (insideQuotes) {
          insideQuotes = false;
          justClosedQuote = true;
        } else if (cell === "" && !justClosedQuote) {
          insideQuotes = true;
        } else {
          throw new Error("CSV contains a quote in an invalid position.");
        }
      } else if (char === delimiter && !insideQuotes) {
        row.push(cell);
        if (row.length > MAX_CSV_COLUMNS) {
          throw new Error(
            `This CSV has more than ${MAX_CSV_COLUMNS.toLocaleString()} columns and cannot be edited safely in the browser.`,
          );
        }
        cell = "";
        justClosedQuote = false;
      } else if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        appendRow();
        cell = "";
        justClosedQuote = false;
      } else {
        if (justClosedQuote && !/^[ \t]$/.test(char)) {
          throw new Error("CSV contains extra text after a closing quote.");
        }
        if (!justClosedQuote) cell += char;
      }
    }
    if (insideQuotes) {
      throw new Error("CSV contains an unterminated quoted field.");
    }

    if (cell !== "" || row.length) {
      row.push(cell);
      appendRow();
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
    const maxColumns = data.reduce(
      (largest, row) => Math.max(largest, row.length),
      0,
    );

    if (data.length * maxColumns > MAX_CSV_CELLS) {
      throw new Error(
        `This CSV would require more than ${MAX_CSV_CELLS.toLocaleString()} editable cells after normalization.`,
      );
    }

    return data.map((row) => {
      const normalized = row.slice();
      while (normalized.length < maxColumns) {
        normalized.push("");
      }
      return normalized;
    });
  }

  function updateStats({ recalculateSize = true } = {}) {
    const rows = csvData.length ? csvData.length - 1 : 0;
    const columns = csvData[0] ? csvData[0].length : 0;
    const cells = rows * columns;

    if (recalculateSize) {
      csvCharacterCount = csvData.length ? toCSV(csvData).length : 0;
    }

    rowCount.textContent = rows;
    columnCount.textContent = columns;
    cellCount.textContent = cells;
    fileSize.textContent = csvCharacterCount;
  }

  function removePaginationControls() {
    tableContainer.querySelector(".csv-pagination-controls")?.remove();
  }

  function renderTable(
    data,
    { resetPage = true, recalculateSize = true } = {},
  ) {
    removePaginationControls();
    csvTable.replaceChildren();
    currentViewData = data;

    if (!data.length) {
      tableContainer.hidden = true;
      currentPage = 1;
      updateStats({ recalculateSize });
      return;
    }

    tableContainer.hidden = false;

    const columnTotal = Math.max(1, data[0].length);
    const pageSize = Math.max(
      1,
      Math.min(
        MAX_RENDERED_CSV_ROWS,
        Math.floor(MAX_RENDERED_CSV_CELLS / columnTotal),
      ),
    );
    const dataRows = data.slice(1);
    const totalPages = Math.max(1, Math.ceil(dataRows.length / pageSize));

    if (resetPage) {
      currentPage = 1;
    }

    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const startIndex = (currentPage - 1) * pageSize;
    const visibleRows = dataRows.slice(startIndex, startIndex + pageSize);

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

    visibleRows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      const visibleRowNumber = startIndex + rowIndex + 2;

      row.forEach((cell, colIndex) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.value = cell;
        input.setAttribute(
          "aria-label",
          `Row ${visibleRowNumber}, Column ${colIndex + 1}`,
        );
        input.addEventListener("input", () => {
          const previousValue = row[colIndex] ?? "";
          const nextValue = input.value;

          if (previousValue === nextValue) {
            return;
          }

          csvCharacterCount +=
            escapeCSV(nextValue).length - escapeCSV(previousValue).length;
          row[colIndex] = nextValue;
          updateStats({ recalculateSize: false });
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
      deleteButton.setAttribute("aria-label", `Delete row ${visibleRowNumber}`);
      deleteButton.addEventListener("click", () => {
        const sourceIndex = csvData.indexOf(row);

        if (sourceIndex <= 0) {
          return;
        }

        csvData.splice(sourceIndex, 1);
        renderFilteredRows({
          announce: false,
          resetPage: false,
          recalculateSize: true,
        });
        notify("Row deleted.", "success");
      });
      deleteCell.appendChild(deleteButton);
      tr.appendChild(deleteCell);
      tbody.appendChild(tr);
    });

    csvTable.appendChild(tbody);

    if (totalPages > 1) {
      const controls = document.createElement("div");
      const previousButton = document.createElement("button");
      const pageStatus = document.createElement("span");
      const nextButton = document.createElement("button");
      const visibleStart = startIndex + 1;
      const visibleEnd = Math.min(startIndex + pageSize, dataRows.length);

      controls.className = "button-grid csv-actions csv-pagination-controls";

      previousButton.type = "button";
      previousButton.className = "btn btn-secondary";
      previousButton.textContent = "Previous Rows";
      previousButton.disabled = currentPage === 1;
      previousButton.addEventListener("click", () => {
        currentPage -= 1;
        renderTable(currentViewData, {
          resetPage: false,
          recalculateSize: false,
        });
      });

      pageStatus.className = "message message-info";
      pageStatus.setAttribute("role", "status");
      pageStatus.setAttribute("aria-live", "polite");
      pageStatus.setAttribute("aria-atomic", "true");
      pageStatus.textContent = `Rows ${visibleStart.toLocaleString()}–${visibleEnd.toLocaleString()} of ${dataRows.length.toLocaleString()}`;

      nextButton.type = "button";
      nextButton.className = "btn btn-secondary";
      nextButton.textContent = "Next Rows";
      nextButton.disabled = currentPage === totalPages;
      nextButton.addEventListener("click", () => {
        currentPage += 1;
        renderTable(currentViewData, {
          resetPage: false,
          recalculateSize: false,
        });
      });

      controls.append(previousButton, pageStatus, nextButton);
      tableContainer.appendChild(controls);
    }

    updateStats({ recalculateSize });
  }

  function loadCSV(text) {
    const previousDelimiter = currentDelimiter;
    currentDelimiter = detectDelimiter(text);
    let parsed;

    try {
      parsed = parseCSV(text);
    } catch (error) {
      currentDelimiter = previousDelimiter;
      notify(
        error instanceof Error
          ? error.message
          : "The CSV is too large to edit safely in the browser.",
        "error",
      );
      return;
    }

    if (!parsed.length) {
      currentDelimiter = previousDelimiter;
      notify("CSV is empty or invalid.", "error");
      return;
    }

    try {
      csvData = normalizeRows(parsed);
    } catch (error) {
      currentDelimiter = previousDelimiter;
      notify(
        error instanceof Error
          ? error.message
          : "The CSV is too large to edit safely in the browser.",
        "error",
      );
      return;
    }

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
    renderFilteredRows({
      announce: false,
      resetPage: true,
      recalculateSize: false,
    });
  }

  function renderFilteredRows(
    { announce = true, resetPage = true, recalculateSize = false } = {},
  ) {
    const query = searchInput.value.toLowerCase().trim();

    if (!csvData.length) {
      renderTable([], { resetPage, recalculateSize });

      if (announce && query) {
        notify("0 rows found.", "info", false);
      }

      return;
    }

    if (!query) {
      renderTable(csvData, { resetPage, recalculateSize });

      if (announce) {
        setInlineMessage("");
      }

      return;
    }

    const matchingRows = csvData.slice(1).filter((row) =>
      row.some((value) => String(value).toLowerCase().includes(query)),
    );

    renderTable([csvData[0], ...matchingRows], {
      resetPage,
      recalculateSize,
    });

    if (announce) {
      notify(
        `${matchingRows.length.toLocaleString()} row${
          matchingRows.length !== 1 ? "s" : ""
        } found.`,
        "info",
        false,
      );
    }
  }

  function filterRows() {
    renderFilteredRows();
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
    }

    const columns = csvData[0].length;

    if (
      csvData.length >= MAX_CSV_ROWS ||
      (csvData.length + 1) * columns > MAX_CSV_CELLS
    ) {
      notify("The CSV has reached the safe browser editing limit.", "error");
      return;
    }

    csvData.push(new Array(columns).fill(""));
    searchInput.value = "";
    currentPage = Number.MAX_SAFE_INTEGER;
    renderTable(csvData, { resetPage: false, recalculateSize: true });
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
    window.clearTimeout(searchTimer);
    csvData = [];
    currentDelimiter = ",";
    currentViewData = [];
    currentPage = 1;
    csvCharacterCount = 0;
    csvFile.value = "";
    searchInput.value = "";
    newCsvColumns.value = "3";
    removePaginationControls();
    csvTable.replaceChildren();
    tableContainer.hidden = true;
    updateStats({ recalculateSize: false });
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

  searchInput.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(filterRows, 150);
  });
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
