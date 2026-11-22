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
    dataModified: false,
  };

  // Formula metadata remains attached to each row rather than being flattened
  // into a cached numeric/string result. Original formulas are not evaluated here.
  const rowFormulas = new WeakMap();

  function formulaFor(row, column) {
    return rowFormulas.get(row)?.get(column) || null;
  }

  function cellText(row, column) {
    const formula = formulaFor(row, column);
    if (formula?.f) return `=${formula.f}`;
    const value = row?.[column];
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
    return value == null ? "" : String(value);
  }

  function rowHasData(row) {
    return row.some((_value, column) => cellText(row, column).trim() !== "");
  }

  function workbookHasFormulas() {
    return Array.from(state.sheets.values()).some((rows) =>
      rows.some((row) => (rowFormulas.get(row)?.size || 0) > 0),
    );
  }

  function preventUnsafeRowMovement() {
    if (!workbookHasFormulas()) return false;
    notify(
      "Sorting or deleting rows is disabled for workbooks with formulas: references cannot be safely updated here. Cell editing and XLSX export remain available.",
      "error",
    );
    return true;
  }

  function parseEditedValue(text) {
    const trimmed = text.trim();
    // Strict canonical number detection. Strings like 0012 stay as text.
    if (/^-?(?:0|[1-9][0-9]*)(?:[.][0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(trimmed)) {
      const number = Number(trimmed);
      if (Number.isFinite(number)) return number;
    }
    if (trimmed === "TRUE") return true;
    if (trimmed === "FALSE") return false;
    return text;
  }

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
        if (value instanceof Date) return new Date(value.getTime());
        if (["number", "boolean", "string"].includes(typeof value)) return value;
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
      option.textContent = displayHeader(cellText(rows[0], index), index);
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
      if (!query || rows[index].some((_value, column) => cellText(rows[index], column).toLocaleLowerCase().includes(query))) {
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
      th.textContent = cellText(rows[0], columnIndex);
      th.setAttribute("aria-label", `Edit ${displayHeader(cellText(rows[0], columnIndex), columnIndex)} header`);
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
        td.textContent = cellText(rows[sourceRowIndex], columnIndex);
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
      const values = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: true,
        blankrows: true,
        range: 0,
      });
      const rows = normalizeRows(values);
      // SheetJS data arrays contain cached results, but not formula expressions.
      Object.entries(worksheet).forEach(([reference, cell]) => {
        if (reference.startsWith("!") || !cell || typeof cell.f !== "string") return;
        const { r, c } = XLSX.utils.decode_cell(reference);
        if (r < 0 || c < 0 || r > 100000 || c > 16383) {
          throw new Error("The spreadsheet contains a formula outside the supported preview range.");
        }
        while (rows.length <= r) rows.push([""]);
        while (rows[r].length <= c) rows[r].push("");
        let formulas = rowFormulas.get(rows[r]);
        if (!formulas) {
          formulas = new Map();
          rowFormulas.set(rows[r], formulas);
        }
        formulas.set(c, { ...cell, t: cell.t || (typeof cell.v === "string" ? "s" : "n") });
      });
      nextSheets.set(String(name), rows);
    });

    if (!nextSheets.size) throw new Error("The workbook does not contain readable worksheets.");
    state.sheets = nextSheets;
    state.dataModified = false;
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
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true, cellNF: true, cellFormula: true });
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
    state.dataModified = false;
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
    if (preventUnsafeRowMovement()) return;
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
    state.dataModified = true;
    renderTable();
    notify("Rows sorted.", "success");
  }

  function trimCells() {
    const rows = currentRows();
    let changed = 0;
    rows.forEach((row) => row.forEach((value, index) => {
      if (formulaFor(row, index) || typeof value !== "string") return;
      const trimmed = value.trim();
      if (trimmed !== value) {
        changed += 1;
        row[index] = trimmed;
      }
    }));
    if (changed) state.dataModified = true;
    renderTable();
    notify(`${changed} cell${changed === 1 ? "" : "s"} trimmed.`, "success");
  }

  function removeDuplicates() {
    if (preventUnsafeRowMovement()) return;
    const rows = currentRows();
    const seen = new Set();
    const data = [];
    let removed = 0;
    rows.slice(1).forEach((row) => {
      const key = JSON.stringify(row.map((_value, index) => cellText(row, index).trim()));
      if (seen.has(key)) removed += 1;
      else {
        seen.add(key);
        data.push(row);
      }
    });
    state.sheets.set(state.currentSheet, [rows[0], ...data]);
    if (removed) state.dataModified = true;
    renderTable();
    notify(`${removed} duplicate row${removed === 1 ? "" : "s"} removed.`, "success");
  }

  function removeEmptyRows() {
    if (preventUnsafeRowMovement()) return;
    const rows = currentRows();
    const data = rows.slice(1).filter(rowHasData);
    const removed = rows.length - 1 - data.length;
    state.sheets.set(state.currentSheet, [rows[0], ...data]);
    if (removed) state.dataModified = true;
    renderTable();
    notify(`${removed} empty row${removed === 1 ? "" : "s"} removed.`, "success");
  }

  function addRow() {
    const rows = currentRows();
    const width = Math.max(1, ...rows.map((row) => row.length));
    rows.push(Array(width).fill(""));
    state.dataModified = true;
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
        const header = displayHeader(cellText(rows[0], index), index);
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
      const localHeaders = rows[0].map((_value, index) => displayHeader(cellText(rows[0], index), index));
      rows.slice(1).forEach((row) => {
        if (!rowHasData(row)) return;
        const lookup = new Map(localHeaders.map((header, index) => [header, row[index] ?? ""]));
        merged.push([sheetName, ...headers.map((header) => lookup.get(header) ?? "")]);
      });
    });

    const name = uniqueSheetName("Merged");
    state.sheets.set(name, normalizeRows(merged));
    state.dataModified = true;
    state.currentSheet = name;
    elements.searchInput.value = "";
    refreshWorkspace();
    notify(
      `Created ${name} with ${Math.max(0, merged.length - 1)} rows.` +
        (workbookHasFormulas() ? " Formula cells use saved results in the merged sheet; original formulas remain on their source sheets." : ""),
      "success",
    );
  }

  function rowsToRecords(rows) {
    const headers = [];
    const used = new Set();
    const width = Math.max(1, ...rows.map((row) => row.length));
    for (let index = 0; index < width; index += 1) {
      const base = displayHeader(cellText(rows[0], index), index);
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
      const worksheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
      rows.forEach((row, r) => {
        const formulas = rowFormulas.get(row);
        if (!formulas) return;
        formulas.forEach((original, c) => {
          const reference = XLSX.utils.encode_cell({ r, c });
          const cell = { ...original };
          if (state.dataModified) {
            // Clear old cached results when the spreadsheet may have changed.
            delete cell.v;
            delete cell.w;
          }
          worksheet[reference] = cell;
          const range = XLSX.utils.decode_range(worksheet["!ref"] || reference);
          range.s.r = Math.min(range.s.r, r);
          range.s.c = Math.min(range.s.c, c);
          range.e.r = Math.max(range.e.r, r);
          range.e.c = Math.max(range.e.c, c);
          worksheet["!ref"] = XLSX.utils.encode_range(range);
        });
      });
      XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
    });
    if (workbookHasFormulas()) {
      workbook.Workbook = { CalcPr: { calcMode: "auto", fullCalcOnLoad: true, forceFullCalc: true } };
    }
    return workbook;
  }

  function downloadXlsx() {
    if (!state.sheets.size || typeof window.XLSX === "undefined") return;
    try {
      const bytes = XLSX.write(buildWorkbook(), { bookType: "xlsx", type: "array" });
      downloadBlob(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${state.sourceName}-edited.xlsx`);
      notify(
        state.dataModified && workbookHasFormulas()
          ? "XLSX downloaded with formulas preserved. Recalculate formulas when opening the file in Excel or Calc."
          : "XLSX workbook downloaded.",
        "success",
      );
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
    notify(
      workbookHasFormulas()
        ? "CSV downloaded. Formula results use the last saved values and are not recalculated."
        : "CSV file downloaded.",
      "success",
    );
  }

  function downloadJson() {
    if (!state.sheets.size) return;
    const json = JSON.stringify(rowsToRecords(currentRows()), null, 2);
    downloadBlob(new Blob([json], { type: "application/json;charset=utf-8" }), `${state.sourceName}-${cleanFileStem(state.currentSheet)}.json`);
    notify(
      workbookHasFormulas()
        ? "JSON downloaded. Formula results use the last saved values and are not recalculated."
        : "JSON file downloaded.",
      "success",
    );
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
    const entered = cell.textContent ?? "";
    let formulas = rowFormulas.get(rows[rowIndex]);
    if (entered.trim().startsWith("=") && entered.trim().length > 1) {
      if (!formulas) {
        formulas = new Map();
        rowFormulas.set(rows[rowIndex], formulas);
      }
      formulas.set(columnIndex, { t: "n", f: entered.trim().slice(1) });
      rows[rowIndex][columnIndex] = "";
    } else {
      formulas?.delete(columnIndex);
      rows[rowIndex][columnIndex] = parseEditedValue(entered);
    }
    state.dataModified = true;
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
