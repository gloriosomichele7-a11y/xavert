"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "spreadsheet-toolkit") return;

  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  const PREVIEW_LIMIT = 500;
  const allowedExtensions = new Set(["xlsx", "xls", "ods", "csv"]);
  const byId = (id) => document.getElementById(id);

  const elements = {
    dropZone: byId("dropZone"),
    fileInput: byId("spreadsheetFile"),
    fileInfo: byId("fileInfo"),
    sampleBtn: byId("sampleBtn"),
    clearBtn: byId("clearBtn"),
    workspace: byId("workspace"),
    sheetSelector: byId("sheetSelector"),
    searchInput: byId("searchInput"),
    sortColumn: byId("sortColumn"),
    sortDirection: byId("sortDirection"),
    sortBtn: byId("sortBtn"),
    trimBtn: byId("trimBtn"),
    duplicatesBtn: byId("duplicatesBtn"),
    emptyRowsBtn: byId("emptyRowsBtn"),
    addRowBtn: byId("addRowBtn"),
    mergeSheetsBtn: byId("mergeSheetsBtn"),
    sheetCount: byId("sheetCount"),
    rowCount: byId("rowCount"),
    columnCount: byId("columnCount"),
    cellCount: byId("cellCount"),
    sheetTable: byId("sheetTable"),
    previewNote: byId("previewNote"),
    downloadXlsxBtn: byId("downloadXlsxBtn"),
    downloadCsvBtn: byId("downloadCsvBtn"),
    downloadJsonBtn: byId("downloadJsonBtn"),
    message: byId("message"),
  };

  if (Object.values(elements).some((element) => !element)) {
    console.error("Spreadsheet Toolkit is missing required page elements.", elements);
    return;
  }

  const state = {
    sheets: new Map(),
    currentSheet: "",
    sourceName: "spreadsheet",
  };

  function notify(text = "", type = "info", toast = true) {
    const safeType = ["success", "error", "info"].includes(type) ? type : "info";
    elements.message.textContent = text;
    elements.message.classList.remove("message-success", "message-error", "message-info");
    if (text) elements.message.classList.add(`message-${safeType}`);
    if (text && toast && typeof window.showMessage === "function") {
      window.showMessage(text, safeType);
    }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function cleanFileStem(name) {
    return String(name || "spreadsheet")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "spreadsheet";
  }

  function uniqueSheetName(baseName) {
    const safeBase = String(baseName || "Sheet").slice(0, 25) || "Sheet";
    if (!state.sheets.has(safeBase)) return safeBase;
    let suffix = 2;
    while (state.sheets.has(`${safeBase}-${suffix}`)) suffix += 1;
    return `${safeBase}-${suffix}`;
  }

  function normalizeRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const normalized = safeRows.map((row) => {
      const values = Array.isArray(row) ? row : [row];
      return values.map((value) => {
        if (value === null || typeof value === "undefined") return "";
        if (value instanceof Date) return value.toISOString();
        return String(value);
      });
    });
    const width = Math.max(1, ...normalized.map((row) => row.length));
    normalized.forEach((row) => {
      while (row.length < width) row.push("");
    });
    return normalized.length ? normalized : [[""]];
  }

  function currentRows() {
    return state.sheets.get(state.currentSheet) || [[""]];
  }

  function displayHeader(value, index) {
    const text = String(value ?? "").trim();
    return text || `Column ${index + 1}`;
  }

  function refreshSelectors() {
    const previousColumn = Number(elements.sortColumn.value || 0);
    elements.sheetSelector.replaceChildren();
    state.sheets.forEach((_rows, name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      option.selected = name === state.currentSheet;
      elements.sheetSelector.append(option);
    });

    const rows = currentRows();
    const width = Math.max(1, ...rows.map((row) => row.length));
    elements.sortColumn.replaceChildren();
    for (let index = 0; index < width; index += 1) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = displayHeader(rows[0]?.[index], index);
      option.selected = index === Math.min(previousColumn, width - 1);
      elements.sortColumn.append(option);
    }
  }

  function updateStats() {
    const rows = currentRows();
    const columns = Math.max(0, ...rows.map((row) => row.length));
    elements.sheetCount.textContent = String(state.sheets.size);
    elements.rowCount.textContent = String(Math.max(0, rows.length - 1));
    elements.columnCount.textContent = String(columns);
    elements.cellCount.textContent = String(Math.max(0, rows.length - 1) * columns);
  }

  function matchingRowIndexes(rows) {
    const query = elements.searchInput.value.trim().toLocaleLowerCase();
    const indexes = [];
    for (let index = 1; index < rows.length; index += 1) {
      if (!query || rows[index].some((value) => String(value).toLocaleLowerCase().includes(query))) {
        indexes.push(index);
      }
    }
    return indexes;
  }

  function renderTable() {
    const rows = currentRows();
    const width = Math.max(1, ...rows.map((row) => row.length));
    const rowIndexes = matchingRowIndexes(rows);
    const shownIndexes = rowIndexes.slice(0, PREVIEW_LIMIT);
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.scope = "col";
    corner.textContent = "#";
    headerRow.append(corner);

    for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
      const th = document.createElement("th");
      th.scope = "col";
      th.contentEditable = "true";
      th.dataset.row = "0";
      th.dataset.column = String(columnIndex);
      th.textContent = rows[0]?.[columnIndex] ?? "";
      th.setAttribute("aria-label", `Edit ${displayHeader(rows[0]?.[columnIndex], columnIndex)} header`);
      headerRow.append(th);
    }
    thead.append(headerRow);

    const tbody = document.createElement("tbody");
    shownIndexes.forEach((sourceRowIndex) => {
      const tr = document.createElement("tr");
      const numberCell = document.createElement("td");
      numberCell.textContent = String(sourceRowIndex);
      tr.append(numberCell);
      for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
        const td = document.createElement("td");
        td.contentEditable = "true";
        td.dataset.row = String(sourceRowIndex);
        td.dataset.column = String(columnIndex);
        td.textContent = rows[sourceRowIndex]?.[columnIndex] ?? "";
        tr.append(td);
      }
      tbody.append(tr);
    });

    elements.sheetTable.replaceChildren(thead, tbody);
    const hiddenCount = Math.max(0, rowIndexes.length - shownIndexes.length);
    const filterText = elements.searchInput.value.trim()
      ? `${rowIndexes.length} matching row${rowIndexes.length === 1 ? "" : "s"}. `
      : "";
    elements.previewNote.textContent = hiddenCount
      ? `${filterText}Showing the first ${PREVIEW_LIMIT} rows for performance. All rows remain available in downloads.`
      : `${filterText}Showing ${shownIndexes.length} data row${shownIndexes.length === 1 ? "" : "s"}. Click any cell to edit it.`;
    updateStats();
  }

  function refreshWorkspace() {
    elements.workspace.hidden = state.sheets.size === 0;
    if (!state.sheets.size) return;
    refreshSelectors();
    renderTable();
  }

  function loadWorkbook(workbook, sourceName, fileSize = null) {
    const nextSheets = new Map();
    workbook.SheetNames.forEach((name) => {
      const worksheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: true,
      });
      nextSheets.set(String(name), normalizeRows(rows));
    });

    if (!nextSheets.size) throw new Error("The workbook does not contain readable worksheets.");
    state.sheets = nextSheets;
    state.currentSheet = nextSheets.keys().next().value;
    state.sourceName = cleanFileStem(sourceName);
    elements.searchInput.value = "";
    elements.fileInfo.textContent = fileSize === null
      ? `${sourceName} · sample workbook`
      : `${sourceName} · ${formatBytes(fileSize)} · ${nextSheets.size} sheet${nextSheets.size === 1 ? "" : "s"}`;
    refreshWorkspace();
  }

  async function openFile(file) {
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop();
    if (!allowedExtensions.has(extension)) {
      notify("Choose an XLSX, XLS, ODS or CSV file.", "error");
      return;
    }
    if (!file.size) {
      notify("The selected file is empty.", "error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      notify("The spreadsheet must be smaller than 25 MB.", "error");
      return;
    }
    if (typeof window.XLSX === "undefined") {
      notify("Spreadsheet support is unavailable. Refresh the page and try again.", "error");
      return;
    }

    notify("Opening spreadsheet…", "info", false);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      loadWorkbook(workbook, file.name, file.size);
      notify("Spreadsheet opened locally in your browser.", "success");
    } catch (error) {
      console.error(error);
      notify("The spreadsheet could not be read. It may be damaged, encrypted or unsupported.", "error");
    }
  }

  function clearAll() {
    state.sheets.clear();
    state.currentSheet = "";
    state.sourceName = "spreadsheet";
    elements.fileInput.value = "";
    elements.searchInput.value = "";
    elements.fileInfo.textContent = "No spreadsheet selected.";
    elements.sheetTable.replaceChildren();
    elements.workspace.hidden = true;
    notify("", "info", false);
  }

  function loadSample() {
    if (typeof window.XLSX === "undefined") {
      notify("Spreadsheet support is unavailable. Refresh the page and try again.", "error");
      return;
    }
    const workbook = XLSX.utils.book_new();
    const sales = [
      ["Product", "Category", "Units", "Revenue"],
      ["Notebook", "Office", 18, 126],
      ["Headphones", "Electronics", 7, 315],
      ["Desk Lamp", "Office", 11, 242],
      ["Headphones", "Electronics", 7, 315],
      ["  Cable  ", "Electronics", 25, 200],
    ];
    const regions = [
      ["Region", "Manager", "Orders"],
      ["North", "Amira", 24],
      ["South", "Luca", 19],
      ["West", "Sara", 31],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sales), "Sales");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(regions), "Regions");
    loadWorkbook(workbook, "XAVERT sample", null);
    notify("Sample workbook loaded.", "success");
  }

  function sortRows() {
    const rows = currentRows();
    if (rows.length < 3) {
      notify("There are not enough rows to sort.", "info");
      return;
    }
    const column = Number(elements.sortColumn.value || 0);
    const direction = elements.sortDirection.value === "desc" ? -1 : 1;
    const header = rows[0];
    const data = rows.slice(1).sort((left, right) => {
      const a = left[column] ?? "";
      const b = right[column] ?? "";
      const numberA = Number(a);
      const numberB = Number(b);
      if (String(a).trim() && String(b).trim() && Number.isFinite(numberA) && Number.isFinite(numberB)) {
        return (numberA - numberB) * direction;
      }
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }) * direction;
    });
    state.sheets.set(state.currentSheet, [header, ...data]);
    renderTable();
    notify("Rows sorted.", "success");
  }

  function trimCells() {
    const rows = currentRows();
    let changed = 0;
    rows.forEach((row) => row.forEach((value, index) => {
      const trimmed = String(value ?? "").trim();
      if (trimmed !== value) changed += 1;
      row[index] = trimmed;
    }));
    renderTable();
    notify(`${changed} cell${changed === 1 ? "" : "s"} trimmed.`, "success");
  }

  function removeDuplicates() {
    const rows = currentRows();
    const seen = new Set();
    const data = [];
    let removed = 0;
    rows.slice(1).forEach((row) => {
      const key = JSON.stringify(row.map((value) => String(value ?? "").trim()));
      if (seen.has(key)) removed += 1;
      else {
        seen.add(key);
        data.push(row);
      }
    });
    state.sheets.set(state.currentSheet, [rows[0], ...data]);
    renderTable();
    notify(`${removed} duplicate row${removed === 1 ? "" : "s"} removed.`, "success");
  }

  function removeEmptyRows() {
    const rows = currentRows();
    const data = rows.slice(1).filter((row) => row.some((value) => String(value ?? "").trim() !== ""));
    const removed = rows.length - 1 - data.length;
    state.sheets.set(state.currentSheet, [rows[0], ...data]);
    renderTable();
    notify(`${removed} empty row${removed === 1 ? "" : "s"} removed.`, "success");
  }

  function addRow() {
    const rows = currentRows();
    const width = Math.max(1, ...rows.map((row) => row.length));
    rows.push(Array(width).fill(""));
    elements.searchInput.value = "";
    renderTable();
    elements.sheetTable.querySelector("tbody tr:last-child td:nth-child(2)")?.focus();
    notify("Blank row added.", "success", false);
  }

  function mergeAllSheets() {
    if (state.sheets.size < 2) {
      notify("Open a workbook with at least two worksheets to merge them.", "info");
      return;
    }
    const headers = [];
    const headerKeys = new Set();
    state.sheets.forEach((rows) => {
      const width = Math.max(1, ...rows.map((row) => row.length));
      for (let index = 0; index < width; index += 1) {
        const header = displayHeader(rows[0]?.[index], index);
        if (!headerKeys.has(header)) {
          headerKeys.add(header);
          headers.push(header);
        }
      }
    });

    let sourceHeader = "_sheet";
    while (headerKeys.has(sourceHeader)) sourceHeader = `_${sourceHeader}`;
    const merged = [[sourceHeader, ...headers]];

    state.sheets.forEach((rows, sheetName) => {
      const localHeaders = rows[0].map((value, index) => displayHeader(value, index));
      rows.slice(1).forEach((row) => {
        if (!row.some((value) => String(value ?? "").trim() !== "")) return;
        const lookup = new Map(localHeaders.map((header, index) => [header, row[index] ?? ""]));
        merged.push([sheetName, ...headers.map((header) => lookup.get(header) ?? "")]);
      });
    });

    const name = uniqueSheetName("Merged");
    state.sheets.set(name, normalizeRows(merged));
    state.currentSheet = name;
    elements.searchInput.value = "";
    refreshWorkspace();
    notify(`Created ${name} with ${Math.max(0, merged.length - 1)} rows.`, "success");
  }

  function rowsToRecords(rows) {
    const headers = [];
    const used = new Set();
    const width = Math.max(1, ...rows.map((row) => row.length));
    for (let index = 0; index < width; index += 1) {
      const base = displayHeader(rows[0]?.[index], index);
      let header = base;
      let suffix = 2;
      while (used.has(header)) {
        header = `${base} ${suffix}`;
        suffix += 1;
      }
      used.add(header);
      headers.push(header);
    }
    return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildWorkbook() {
    const workbook = XLSX.utils.book_new();
    state.sheets.forEach((rows, name) => {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 31));
    });
    return workbook;
  }

  function downloadXlsx() {
    if (!state.sheets.size || typeof window.XLSX === "undefined") return;
    try {
      const bytes = XLSX.write(buildWorkbook(), { bookType: "xlsx", type: "array" });
      downloadBlob(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${state.sourceName}-edited.xlsx`);
      notify("XLSX workbook downloaded.", "success");
    } catch (error) {
      console.error(error);
      notify("The XLSX workbook could not be created.", "error");
    }
  }

  function downloadCsv() {
    if (!state.sheets.size || typeof window.XLSX === "undefined") return;
    const worksheet = XLSX.utils.aoa_to_sheet(currentRows());
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    downloadBlob(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), `${state.sourceName}-${cleanFileStem(state.currentSheet)}.csv`);
    notify("CSV file downloaded.", "success");
  }

  function downloadJson() {
    if (!state.sheets.size) return;
    const json = JSON.stringify(rowsToRecords(currentRows()), null, 2);
    downloadBlob(new Blob([json], { type: "application/json;charset=utf-8" }), `${state.sourceName}-${cleanFileStem(state.currentSheet)}.json`);
    notify("JSON file downloaded.", "success");
  }

  elements.dropZone.addEventListener("click", () => elements.fileInput.click());
  elements.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.fileInput.click();
    }
  });
  ["dragenter", "dragover"].forEach((eventName) => elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragover");
  }));
  ["dragleave", "drop"].forEach((eventName) => elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragover");
  }));
  elements.dropZone.addEventListener("drop", (event) => openFile(event.dataTransfer?.files?.[0]));
  elements.fileInput.addEventListener("change", () => openFile(elements.fileInput.files?.[0]));
  elements.sampleBtn.addEventListener("click", loadSample);
  elements.clearBtn.addEventListener("click", clearAll);
  elements.sheetSelector.addEventListener("change", () => {
    state.currentSheet = elements.sheetSelector.value;
    elements.searchInput.value = "";
    refreshSelectors();
    renderTable();
  });
  elements.searchInput.addEventListener("input", renderTable);
  elements.sheetTable.addEventListener("input", (event) => {
    const cell = event.target.closest("[data-row][data-column]");
    if (!cell) return;
    const rowIndex = Number(cell.dataset.row);
    const columnIndex = Number(cell.dataset.column);
    const rows = currentRows();
    if (!rows[rowIndex]) return;
    while (rows[rowIndex].length <= columnIndex) rows[rowIndex].push("");
    rows[rowIndex][columnIndex] = cell.textContent ?? "";
    updateStats();
  });
  elements.sheetTable.addEventListener("paste", (event) => {
    const cell = event.target.closest("[contenteditable='true']");
    if (!cell) return;
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") ?? "";
    const selection = window.getSelection();
    if (!selection?.rangeCount) {
      cell.textContent += text;
      cell.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(text));
    selection.collapseToEnd();
    cell.dispatchEvent(new Event("input", { bubbles: true }));
  });
  elements.sheetTable.addEventListener("blur", (event) => {
    if (event.target.matches("thead [contenteditable='true']")) refreshSelectors();
  }, true);
  elements.sortBtn.addEventListener("click", sortRows);
  elements.trimBtn.addEventListener("click", trimCells);
  elements.duplicatesBtn.addEventListener("click", removeDuplicates);
  elements.emptyRowsBtn.addEventListener("click", removeEmptyRows);
  elements.addRowBtn.addEventListener("click", addRow);
  elements.mergeSheetsBtn.addEventListener("click", mergeAllSheets);
  elements.downloadXlsxBtn.addEventListener("click", downloadXlsx);
  elements.downloadCsvBtn.addEventListener("click", downloadCsv);
  elements.downloadJsonBtn.addEventListener("click", downloadJson);
});
