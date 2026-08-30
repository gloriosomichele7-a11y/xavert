"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const elements = {
    dropZone: $("dropZone"),
    imageInput: $("imageInput"),
    fileInfo: $("fileInfo"),
    inspectBtn: $("inspectBtn"),
    replaceBtn: $("replaceBtn"),
    clearBtn: $("clearBtn"),
    message: $("message"),
    resultSection: $("resultSection"),
    previewImage: $("previewImage"),
    previewEmpty: $("previewEmpty"),
    gpsRisk: $("gpsRisk"),
    authorRisk: $("authorRisk"),
    deviceRisk: $("deviceRisk"),
    dateRisk: $("dateRisk"),
    softwareRisk: $("softwareRisk"),
    gpsBox: $("gpsBox"),
    gpsValue: $("gpsValue"),
    copyGpsBtn: $("copyGpsBtn"),
    tagsStat: $("tagsStat"),
    groupsStat: $("groupsStat"),
    sensitiveStat: $("sensitiveStat"),
    dimensionsStat: $("dimensionsStat"),
    formatStat: $("formatStat"),
    fileSizeStat: $("fileSizeStat"),
    cleanSupportNote: $("cleanSupportNote"),
    cleanStatus: $("cleanStatus"),
    cleanMethod: $("cleanMethod"),
    removedStat: $("removedStat"),
    verificationStat: $("verificationStat"),
    cleanBtn: $("cleanBtn"),
    downloadCleanBtn: $("downloadCleanBtn"),
    metadataSearch: $("metadataSearch"),
    groupFilter: $("groupFilter"),
    metadataTableBody: $("metadataTableBody"),
    copyJsonBtn: $("copyJsonBtn"),
    downloadJsonBtn: $("downloadJsonBtn"),
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error("Image Metadata tool initialization failed:", missing);
    return;
  }

  const CLEANABLE_FORMATS = new Set(["jpeg", "png", "webp"]);

  const state = {
    file: null,
    metadata: null,
    flatRows: [],
    format: "",
    width: 0,
    height: 0,
    orientation: 1,
    gps: null,
    cleanedBlob: null,
    cleanedName: "",
    cleanedRemovedCount: 0,
    cleanedMethod: "",
    previewUrl: "",
    operationToken: 0,
  };

  const SENSITIVE_PATTERNS = {
    gps: [
      /gps/i,
      /latitude/i,
      /longitude/i,
      /location/i,
      /geotag/i,
      /geolocation/i,
    ],
    author: [
      /artist/i,
      /author/i,
      /creator/i,
      /owner/i,
      /copyright/i,
      /credit/i,
      /by[-_ ]?line/i,
      /contact/i,
    ],
    device: [
      /serial/i,
      /unique.?id/i,
      /owner.?name/i,
      /camera.?id/i,
      /device.?id/i,
      /lens.?serial/i,
      /body.?serial/i,
    ],
    date: [
      /date.?time/i,
      /^date$/i,
      /created/i,
      /creation.?date/i,
      /modify.?date/i,
      /timestamp/i,
      /time.?original/i,
      /digitized/i,
    ],
    software: [
      /software/i,
      /processing.?software/i,
      /host.?computer/i,
      /application/i,
      /creator.?tool/i,
    ],
  };

  function setInlineMessage(text = "", type = "info") {
    elements.message.textContent = text;
    elements.message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      elements.message.classList.add(`message-${type}`);
    }
  }

  function notify(text, type = "info") {
    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
      return;
    }

    setInlineMessage(text, type);

    if (typeof window.showToast === "function") {
      window.showToast(text, type);
    }
  }

  function showActionSuccess(text) {
    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess(text);
    } else {
      notify(text, "success");
    }
  }

  function showCopySuccess(text) {
    if (typeof window.showCopySuccess === "function") {
      window.showCopySuccess(text);
    } else {
      notify(text, "success");
    }
  }

  function showDownloadSuccess(text) {
    if (typeof window.showDownloadSuccess === "function") {
      window.showDownloadSuccess(text);
    } else {
      notify(text, "success");
    }
  }

  function clearSuccessFeedback() {
    if (typeof window.clearPersistentSuccessMessages === "function") {
      window.clearPersistentSuccessMessages();
    }

    if (
      elements.message.classList.contains("message-success") ||
      elements.message.classList.contains("success")
    ) {
      setInlineMessage("", "info");
    }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** power;

    return `${value >= 10 || power === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[power]}`;
  }

  function getMaxFileSize() {
    const memory = Number(navigator.deviceMemory || 0);
    const mobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      Math.min(window.innerWidth, window.innerHeight) < 700;

    if (memory > 0 && memory <= 2) {
      return 25 * 1024 * 1024;
    }

    if (mobile || (memory > 0 && memory <= 4)) {
      return 50 * 1024 * 1024;
    }

    return 120 * 1024 * 1024;
  }

  function inferFormat(file) {
    const type = (file?.type || "").toLowerCase();
    const name = (file?.name || "").toLowerCase();

    if (type === "image/jpeg" || /\.jpe?g$/.test(name)) return "jpeg";
    if (type === "image/png" || /\.png$/.test(name)) return "png";
    if (type === "image/webp" || /\.webp$/.test(name)) return "webp";
    if (type === "image/heic" || /\.heic$/.test(name)) return "heic";
    if (type === "image/heif" || /\.heif$/.test(name)) return "heif";
    if (type === "image/avif" || /\.avif$/.test(name)) return "avif";
    if (type === "image/tiff" || /\.tiff?$/.test(name)) return "tiff";

    return "";
  }

  function displayFormat(format) {
    const labels = {
      jpeg: "JPEG",
      png: "PNG",
      webp: "WebP",
      heic: "HEIC",
      heif: "HEIF",
      avif: "AVIF",
      tiff: "TIFF",
    };

    return labels[format] || "Unknown";
  }

  function isSupportedFile(file) {
    return Boolean(inferFormat(file));
  }

  function revokePreview() {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = "";
    }

    elements.previewImage.removeAttribute("src");
    elements.previewImage.hidden = true;
    elements.previewEmpty.hidden = false;
  }

  function setPreview(file) {
    revokePreview();

    if (!file) {
      return;
    }

    state.previewUrl = URL.createObjectURL(file);
    elements.previewImage.onload = () => {
      elements.previewImage.hidden = false;
      elements.previewEmpty.hidden = true;

      if (!state.width || !state.height) {
        state.width = elements.previewImage.naturalWidth || state.width;
        state.height = elements.previewImage.naturalHeight || state.height;
        updateDimensionStat();
      }
    };
    elements.previewImage.onerror = () => {
      elements.previewImage.hidden = true;
      elements.previewEmpty.hidden = false;
    };
    elements.previewImage.src = state.previewUrl;
  }

  function safeString(value) {
    if (value == null) {
      return "";
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
    }

    if (ArrayBuffer.isView(value)) {
      return `[Binary data: ${value.byteLength} bytes]`;
    }

    if (value instanceof ArrayBuffer) {
      return `[Binary data: ${value.byteLength} bytes]`;
    }

    if (Array.isArray(value)) {
      if (value.length > 40) {
        return `[Array: ${value.length} values]`;
      }

      return value.map((item) => safeString(item)).join(", ");
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  }

  function extractTagValue(tag) {
    if (tag == null) {
      return "";
    }

    if (typeof tag !== "object" || tag instanceof Date || Array.isArray(tag)) {
      return safeString(tag);
    }

    if ("description" in tag && tag.description != null) {
      return safeString(tag.description);
    }

    if ("computed" in tag && tag.computed != null) {
      return safeString(tag.computed);
    }

    if ("value" in tag && tag.value != null) {
      return safeString(tag.value);
    }

    return safeString(tag);
  }

  function classifySensitive(group, tagName) {
    const haystack = `${group} ${tagName}`;

    for (const [category, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
      if (patterns.some((pattern) => pattern.test(haystack))) {
        return category;
      }
    }

    return "";
  }

  function flattenMetadata(metadata) {
    const rows = [];
    const seen = new Set();

    function visit(value, path, group) {
      if (value == null) {
        return;
      }

      if (
        typeof value !== "object" ||
        value instanceof Date ||
        Array.isArray(value) ||
        ArrayBuffer.isView(value) ||
        value instanceof ArrayBuffer
      ) {
        const tag = path.join(".");
        const key = `${group}|${tag}`;

        if (!seen.has(key)) {
          seen.add(key);
          rows.push({
            group,
            tag,
            value: safeString(value),
            sensitive: classifySensitive(group, tag),
          });
        }
        return;
      }

      const keys = Object.keys(value);

      if (
        keys.some((key) => ["value", "description", "computed"].includes(key))
      ) {
        const tag = path.join(".");
        const key = `${group}|${tag}`;

        if (!seen.has(key)) {
          seen.add(key);
          rows.push({
            group,
            tag,
            value: extractTagValue(value),
            sensitive: classifySensitive(group, tag),
          });
        }
        return;
      }

      keys.forEach((key) => {
        if (
          [
            "thumbnail",
            "Thumbnail",
            "metadataRange",
            "base64",
            "image",
          ].includes(key)
        ) {
          return;
        }

        const nextGroup = path.length === 0 ? key : group;
        visit(value[key], [...path, key], nextGroup || "General");
      });
    }

    Object.entries(metadata || {}).forEach(([group, value]) => {
      visit(value, [], group || "General");
    });

    return rows
      .filter((row) => row.tag && row.value !== "")
      .sort(
        (a, b) =>
          a.group.localeCompare(b.group) ||
          a.tag.localeCompare(b.tag),
      );
  }

  function findRow(patterns) {
    return state.flatRows.find((row) =>
      patterns.some((pattern) => pattern.test(`${row.group} ${row.tag}`)),
    );
  }

  function findNumericMetadata(patterns) {
    const row = findRow(patterns);

    if (!row) {
      return 0;
    }

    const match = row.value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function resolveDimensions() {
    const width =
      findNumericMetadata([
        /Image Width/i,
        /ImageWidth/i,
        /PixelXDimension/i,
        /ExifImageWidth/i,
      ]) || state.width;

    const height =
      findNumericMetadata([
        /Image Height/i,
        /ImageHeight/i,
        /PixelYDimension/i,
        /ExifImageHeight/i,
      ]) || state.height;

    state.width = width || 0;
    state.height = height || 0;
  }

  function resolveOrientation() {
    const row = findRow([/(^|[. ])Orientation$/i]);

    if (!row) {
      state.orientation = 1;
      return;
    }

    const numeric = row.value.match(/\b([1-8])\b/);
    state.orientation = numeric ? Number(numeric[1]) : 1;
  }

  function resolveGps(metadata) {
    const expandedGps = metadata?.gps;

    if (
      expandedGps &&
      Number.isFinite(Number(expandedGps.Latitude)) &&
      Number.isFinite(Number(expandedGps.Longitude))
    ) {
      return {
        latitude: Number(expandedGps.Latitude),
        longitude: Number(expandedGps.Longitude),
        altitude: Number.isFinite(Number(expandedGps.Altitude))
          ? Number(expandedGps.Altitude)
          : null,
      };
    }

    const latRow = findRow([/latitude/i]);
    const lonRow = findRow([/longitude/i]);

    if (!latRow || !lonRow) {
      return null;
    }

    const lat = Number(latRow.value.match(/-?\d+(?:\.\d+)?/)?.[0]);
    const lon = Number(lonRow.value.match(/-?\d+(?:\.\d+)?/)?.[0]);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    return { latitude: lat, longitude: lon, altitude: null };
  }

  function setRiskBadge(element, found, label = null) {
    element.classList.remove(
      "meta-risk-found",
      "meta-risk-clear",
      "meta-risk-info",
    );

    if (found) {
      element.textContent = label || "Found";
      element.classList.add("meta-risk-found");
    } else {
      element.textContent = label || "Not found";
      element.classList.add("meta-risk-clear");
    }
  }

  function updatePrivacySummary() {
    const categories = {
      gps: state.flatRows.some((row) => row.sensitive === "gps"),
      author: state.flatRows.some((row) => row.sensitive === "author"),
      device: state.flatRows.some((row) => row.sensitive === "device"),
      date: state.flatRows.some((row) => row.sensitive === "date"),
      software: state.flatRows.some((row) => row.sensitive === "software"),
    };

    if (state.gps) {
      categories.gps = true;
    }

    setRiskBadge(elements.gpsRisk, categories.gps);
    setRiskBadge(elements.authorRisk, categories.author);
    setRiskBadge(elements.deviceRisk, categories.device);
    setRiskBadge(elements.dateRisk, categories.date);
    setRiskBadge(elements.softwareRisk, categories.software);

    if (state.gps) {
      const altitude =
        state.gps.altitude == null
          ? ""
          : ` · Altitude ${state.gps.altitude.toFixed(1)} m`;

      elements.gpsValue.textContent =
        `${state.gps.latitude.toFixed(6)}, ${state.gps.longitude.toFixed(6)}` +
        altitude;
      elements.gpsBox.hidden = false;
    } else {
      elements.gpsBox.hidden = true;
      elements.gpsValue.textContent = "";
    }
  }

  function updateDimensionStat() {
    elements.dimensionsStat.textContent =
      state.width && state.height ? `${state.width}×${state.height}` : "—";
  }

  function updateStats() {
    const groups = new Set(state.flatRows.map((row) => row.group));
    const sensitive = state.flatRows.filter((row) => row.sensitive).length;

    elements.tagsStat.textContent =
      new Intl.NumberFormat("en-US").format(state.flatRows.length);
    elements.groupsStat.textContent =
      new Intl.NumberFormat("en-US").format(groups.size);
    elements.sensitiveStat.textContent =
      new Intl.NumberFormat("en-US").format(sensitive);
    elements.formatStat.textContent = displayFormat(state.format);
    elements.fileSizeStat.textContent = state.file
      ? formatBytes(state.file.size)
      : "0 B";
    updateDimensionStat();
  }

  function populateGroupFilter() {
    const current = elements.groupFilter.value;
    const groups = [...new Set(state.flatRows.map((row) => row.group))].sort(
      (a, b) => a.localeCompare(b),
    );

    elements.groupFilter.replaceChildren();

    const all = document.createElement("option");
    all.value = "";
    all.textContent = "All groups";
    elements.groupFilter.appendChild(all);

    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      elements.groupFilter.appendChild(option);
    });

    if (groups.includes(current)) {
      elements.groupFilter.value = current;
    }
  }

  function renderMetadataTable() {
    const query = elements.metadataSearch.value.trim().toLocaleLowerCase();
    const group = elements.groupFilter.value;

    const rows = state.flatRows.filter((row) => {
      if (group && row.group !== group) {
        return false;
      }

      if (!query) {
        return true;
      }

      return `${row.group} ${row.tag} ${row.value}`
        .toLocaleLowerCase()
        .includes(query);
    });

    elements.metadataTableBody.replaceChildren();

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "meta-empty-row";
      td.textContent = state.flatRows.length
        ? "No metadata matches the current filter."
        : "No readable metadata tags were found.";
      tr.appendChild(td);
      elements.metadataTableBody.appendChild(tr);
      return;
    }

    const fragment = document.createDocumentFragment();

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      if (row.sensitive) {
        tr.classList.add("meta-sensitive-row");
      }

      const groupCell = document.createElement("td");
      groupCell.className = "meta-table-category";
      groupCell.textContent = row.group;

      const tagCell = document.createElement("td");
      tagCell.className = "meta-table-tag";
      tagCell.textContent = row.tag;

      const valueCell = document.createElement("td");
      valueCell.className = "meta-table-value";
      valueCell.textContent = row.value;

      const privacyCell = document.createElement("td");
      privacyCell.textContent = row.sensitive
        ? row.sensitive.charAt(0).toUpperCase() + row.sensitive.slice(1)
        : "—";

      tr.append(groupCell, tagCell, valueCell, privacyCell);
      fragment.appendChild(tr);
    });

    elements.metadataTableBody.appendChild(fragment);
  }

  function resetCleanResult() {
    state.cleanedBlob = null;
    state.cleanedName = "";
    state.cleanedRemovedCount = 0;
    state.cleanedMethod = "";
    elements.cleanStatus.hidden = true;
    elements.cleanMethod.textContent = "—";
    elements.removedStat.textContent = "—";
    elements.verificationStat.textContent = "—";
    elements.downloadCleanBtn.disabled = true;
  }

  function updateCleanerAvailability() {
    resetCleanResult();

    const cleanable = CLEANABLE_FORMATS.has(state.format);
    elements.cleanBtn.disabled = !cleanable || !state.file;

    if (cleanable) {
      elements.cleanSupportNote.textContent =
        `${displayFormat(state.format)} supports browser-side metadata cleaning. ` +
        "The cleaner preserves encoded image data where safe and verifies the result.";
    } else {
      elements.cleanSupportNote.textContent =
        `${displayFormat(state.format)} is inspection-only in this tool. ` +
        "A clean copy is not generated because safe metadata rewriting for this format is not guaranteed in the browser.";
    }
  }

  async function inspectMetadata({ silent = false } = {}) {
    if (!state.file) {
      return;
    }

    if (
      !window.ExifReader ||
      typeof window.ExifReader.load !== "function"
    ) {
      notify(
        "The metadata reader library could not be loaded. Check your connection and reload the page.",
        "error",
      );
      return;
    }

    const token = ++state.operationToken;
    elements.inspectBtn.disabled = true;
    elements.cleanBtn.disabled = true;
    clearSuccessFeedback();

    try {
      const metadata = await window.ExifReader.load(state.file, {
        expanded: true,
        async: true,
      });

      if (token !== state.operationToken) {
        return;
      }

      state.metadata = metadata || {};
      state.flatRows = flattenMetadata(state.metadata);
      state.gps = resolveGps(state.metadata);
      resolveDimensions();
      resolveOrientation();

      populateGroupFilter();
      renderMetadataTable();
      updatePrivacySummary();
      updateStats();
      updateCleanerAvailability();

      elements.resultSection.hidden = false;
      elements.inspectBtn.disabled = false;

      if (!silent) {
        showActionSuccess(
          state.flatRows.length
            ? "Image metadata inspected successfully."
            : "Inspection completed. No readable metadata was found.",
        );

        elements.resultSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    } catch (error) {
      console.error("Metadata inspection failed:", error);

      if (token === state.operationToken) {
        state.metadata = {};
        state.flatRows = [];
        state.gps = null;
        elements.inspectBtn.disabled = false;
        elements.cleanBtn.disabled = true;
        notify(
          "Metadata could not be read from this image. The file may be unsupported, damaged or contain an unsupported metadata structure.",
          "error",
        );
      }
    }
  }

  async function selectFile(file) {
    if (!file) {
      return;
    }

    if (!isSupportedFile(file)) {
      notify(
        "Select a JPEG, PNG, WebP, HEIC/HEIF, AVIF or TIFF image.",
        "error",
      );
      elements.imageInput.value = "";
      return;
    }

    if (file.size === 0) {
      notify("The selected image is empty.", "error");
      elements.imageInput.value = "";
      return;
    }

    const maxSize = getMaxFileSize();

    if (file.size > maxSize) {
      notify(
        `This device is limited to images up to ${formatBytes(maxSize)} for safer browser processing.`,
        "error",
      );
      elements.imageInput.value = "";
      return;
    }

    state.operationToken += 1;
    state.file = file;
    state.format = inferFormat(file);
    state.metadata = null;
    state.flatRows = [];
    state.width = 0;
    state.height = 0;
    state.orientation = 1;
    state.gps = null;

    resetCleanResult();
    clearSuccessFeedback();

    elements.resultSection.hidden = true;
    elements.metadataSearch.value = "";
    elements.groupFilter.replaceChildren();
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "All groups";
    elements.groupFilter.appendChild(option);

    elements.fileInfo.textContent =
      `${file.name} · ${formatBytes(file.size)} · ${displayFormat(state.format)}`;
    elements.inspectBtn.disabled = false;
    setPreview(file);
    setInlineMessage("Image selected. Inspect its metadata.", "info");
  }

  function readUint32BE(bytes, offset) {
    return (
      bytes[offset] * 0x1000000 +
      bytes[offset + 1] * 0x10000 +
      bytes[offset + 2] * 0x100 +
      bytes[offset + 3]
    );
  }

  function readUint32LE(bytes, offset) {
    return (
      bytes[offset] +
      bytes[offset + 1] * 0x100 +
      bytes[offset + 2] * 0x10000 +
      bytes[offset + 3] * 0x1000000
    ) >>> 0;
  }

  function writeUint32LE(bytes, offset, value) {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
  }

  function ascii(bytes, start, length) {
    return String.fromCharCode(...bytes.slice(start, start + length));
  }

  function concatParts(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(total);
    let offset = 0;

    parts.forEach((part) => {
      output.set(part, offset);
      offset += part.length;
    });

    return output;
  }

  function cleanJpegLossless(bytes) {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new Error("Invalid JPEG structure.");
    }

    const parts = [bytes.slice(0, 2)];
    let offset = 2;
    let removed = 0;

    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        throw new Error("Unexpected JPEG marker structure.");
      }

      const markerStart = offset;

      while (offset < bytes.length && bytes[offset] === 0xff) {
        offset += 1;
      }

      if (offset >= bytes.length) {
        break;
      }

      const marker = bytes[offset];
      offset += 1;

      if (marker === 0xd9) {
        parts.push(bytes.slice(markerStart, offset));
        break;
      }

      if (marker === 0xda) {
        if (offset + 2 > bytes.length) {
          throw new Error("Invalid JPEG scan header.");
        }

        const length = bytes[offset] * 256 + bytes[offset + 1];
        const end = offset + length;

        if (length < 2 || end > bytes.length) {
          throw new Error("Invalid JPEG scan length.");
        }

        parts.push(bytes.slice(markerStart));
        offset = bytes.length;
        break;
      }

      if (
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        parts.push(bytes.slice(markerStart, offset));
        continue;
      }

      if (offset + 2 > bytes.length) {
        throw new Error("Invalid JPEG segment.");
      }

      const length = bytes[offset] * 256 + bytes[offset + 1];
      const end = offset + length;

      if (length < 2 || end > bytes.length) {
        throw new Error("Invalid JPEG segment length.");
      }

      const remove =
        marker === 0xe1 || // EXIF / XMP
        marker === 0xed || // IPTC / Photoshop metadata
        marker === 0xfe || // COM
        marker === 0xec;   // Ducky / APP12 metadata

      if (remove) {
        removed += 1;
      } else {
        parts.push(bytes.slice(markerStart, end));
      }

      offset = end;
    }

    return {
      bytes: concatParts(parts),
      removed,
      method: "Lossless JPEG segment cleanup",
    };
  }

  function cleanPngLossless(bytes) {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];

    if (!signature.every((value, index) => bytes[index] === value)) {
      throw new Error("Invalid PNG structure.");
    }

    const removable = new Set([
      "eXIf",
      "tEXt",
      "zTXt",
      "iTXt",
      "tIME",
    ]);

    const parts = [bytes.slice(0, 8)];
    let offset = 8;
    let removed = 0;

    while (offset + 12 <= bytes.length) {
      const length = readUint32BE(bytes, offset);
      const type = ascii(bytes, offset + 4, 4);
      const end = offset + 12 + length;

      if (end > bytes.length) {
        throw new Error("Invalid PNG chunk length.");
      }

      if (removable.has(type)) {
        removed += 1;
      } else {
        parts.push(bytes.slice(offset, end));
      }

      offset = end;

      if (type === "IEND") {
        break;
      }
    }

    return {
      bytes: concatParts(parts),
      removed,
      method: "Lossless PNG chunk cleanup",
    };
  }

  function cleanWebpLossless(bytes) {
    if (
      bytes.length < 12 ||
      ascii(bytes, 0, 4) !== "RIFF" ||
      ascii(bytes, 8, 4) !== "WEBP"
    ) {
      throw new Error("Invalid WebP structure.");
    }

    const outputParts = [bytes.slice(0, 12)];
    let offset = 12;
    let removed = 0;

    while (offset + 8 <= bytes.length) {
      const type = ascii(bytes, offset, 4);
      const length = readUint32LE(bytes, offset + 4);
      const paddedLength = length + (length % 2);
      const end = offset + 8 + paddedLength;

      if (end > bytes.length) {
        throw new Error("Invalid WebP chunk length.");
      }

      if (type === "EXIF" || type === "XMP ") {
        removed += 1;
      } else {
        const chunk = bytes.slice(offset, end);

        if (type === "VP8X" && length >= 10) {
          const mutable = new Uint8Array(chunk);
          mutable[8] &= ~0x0c; // Clear EXIF (0x08) and XMP (0x04).
          outputParts.push(mutable);
        } else {
          outputParts.push(chunk);
        }
      }

      offset = end;
    }

    const output = concatParts(outputParts);
    writeUint32LE(output, 4, output.length - 8);

    return {
      bytes: output,
      removed,
      method: "Lossless WebP metadata chunk cleanup",
    };
  }

  async function decodeForCanvas(file) {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch {
        try {
          return await createImageBitmap(file);
        } catch {
          // Fall through.
        }
      }
    }

    const url = URL.createObjectURL(file);

    try {
      const image = new Image();
      image.decoding = "async";

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("The image could not be decoded."));
        image.src = url;
      });

      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function renderCleanCopy(file, format) {
    const image = await decodeForCanvas(file);
    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;

    if (!width || !height) {
      if (typeof image.close === "function") image.close();
      throw new Error("Image dimensions are unavailable.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: format !== "jpeg" });

    if (!context) {
      if (typeof image.close === "function") image.close();
      throw new Error("Canvas rendering is unavailable.");
    }

    if (format === "jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(image, 0, 0);

    if (typeof image.close === "function") {
      image.close();
    }

    const mime =
      format === "jpeg"
        ? "image/jpeg"
        : format === "png"
          ? "image/png"
          : "image/webp";

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, mime, format === "png" ? undefined : 0.96);
    });

    if (!blob) {
      throw new Error("The clean image could not be encoded.");
    }

    return {
      blob,
      removed: state.flatRows.length,
      method: "Rendered clean copy to preserve visual orientation",
    };
  }

  async function verifyCleanBlob(blob) {
    if (
      !window.ExifReader ||
      typeof window.ExifReader.load !== "function"
    ) {
      return { remaining: null, sensitive: null };
    }

    try {
      const metadata = await window.ExifReader.load(blob, {
        expanded: true,
        async: true,
      });
      const rows = flattenMetadata(metadata || {});

      return {
        remaining: rows.length,
        sensitive: rows.filter((row) => row.sensitive).length,
      };
    } catch {
      return { remaining: null, sensitive: null };
    }
  }

  function makeCleanName() {
    const name = state.file?.name || "image";
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : `.${state.format}`;

    return `${base}-clean${extension}`;
  }

  async function cleanMetadata() {
    if (!state.file || !CLEANABLE_FORMATS.has(state.format)) {
      return;
    }

    elements.cleanBtn.disabled = true;
    elements.downloadCleanBtn.disabled = true;
    resetCleanResult();
    clearSuccessFeedback();

    try {
      let result;
      const orientationNeedsRendering =
        Number.isFinite(state.orientation) &&
        state.orientation >= 2 &&
        state.orientation <= 8;

      if (orientationNeedsRendering) {
        result = await renderCleanCopy(state.file, state.format);
        state.cleanedBlob = result.blob;
      } else {
        const bytes = new Uint8Array(await state.file.arrayBuffer());

        if (state.format === "jpeg") {
          result = cleanJpegLossless(bytes);
        } else if (state.format === "png") {
          result = cleanPngLossless(bytes);
        } else {
          result = cleanWebpLossless(bytes);
        }

        state.cleanedBlob = new Blob([result.bytes], {
          type: state.file.type || `image/${state.format}`,
        });
      }

      const verification = await verifyCleanBlob(state.cleanedBlob);

      state.cleanedName = makeCleanName();
      state.cleanedRemovedCount = result.removed;
      state.cleanedMethod = result.method;

      elements.cleanMethod.textContent = result.method;
      elements.removedStat.textContent =
        result.removed > 0
          ? `${result.removed} metadata block${result.removed === 1 ? "" : "s"}`
          : "No removable blocks found";

      if (verification.remaining == null) {
        elements.verificationStat.textContent = "Could not verify";
      } else if (verification.sensitive === 0) {
        elements.verificationStat.textContent =
          verification.remaining === 0
            ? "No readable metadata"
            : `No sensitive tags · ${verification.remaining} structural tag${verification.remaining === 1 ? "" : "s"}`;
      } else {
        elements.verificationStat.textContent =
          `${verification.sensitive} sensitive tag${verification.sensitive === 1 ? "" : "s"} still readable`;
      }

      elements.cleanStatus.hidden = false;
      elements.downloadCleanBtn.disabled = false;
      elements.cleanBtn.disabled = false;

      showActionSuccess("Clean image copy created and verified.");
    } catch (error) {
      console.error("Metadata cleaning failed:", error);
      elements.cleanBtn.disabled = false;
      elements.downloadCleanBtn.disabled = true;
      notify(
        error instanceof Error && error.message
          ? error.message
          : "The metadata could not be removed safely from this image.",
        "error",
      );
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadCleanCopy() {
    if (!state.cleanedBlob || !state.cleanedName) {
      notify("Create a clean copy first.", "error");
      return;
    }

    downloadBlob(state.cleanedBlob, state.cleanedName);
    showDownloadSuccess("Clean image download started.");
  }

  function buildMetadataExport() {
    return {
      tool: "XAVERT Image Metadata & EXIF Cleaner",
      source: {
        fileName: state.file?.name || null,
        fileSize: state.file?.size || 0,
        format: displayFormat(state.format),
        width: state.width || null,
        height: state.height || null,
      },
      privacy: {
        gps: state.gps,
        sensitiveTagCount: state.flatRows.filter((row) => row.sensitive).length,
      },
      metadata: state.flatRows.map((row) => ({
        group: row.group,
        tag: row.tag,
        value: row.value,
        privacyCategory: row.sensitive || null,
      })),
    };
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      showCopySuccess(successMessage);
    } catch {
      notify("Clipboard access failed.", "error");
    }
  }

  function copyGps() {
    if (!state.gps) {
      notify("No GPS coordinates are available.", "error");
      return;
    }

    void copyText(
      `${state.gps.latitude.toFixed(6)}, ${state.gps.longitude.toFixed(6)}`,
      "GPS coordinates copied.",
    );
  }

  function copyMetadataJson() {
    if (!state.file || !state.metadata) {
      notify("Inspect an image first.", "error");
      return;
    }

    void copyText(
      JSON.stringify(buildMetadataExport(), null, 2),
      "Metadata JSON copied.",
    );
  }

  function downloadMetadataJson() {
    if (!state.file || !state.metadata) {
      notify("Inspect an image first.", "error");
      return;
    }

    const base =
      (state.file.name || "image")
        .replace(/\.[^.]+$/, "")
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "image";

    const blob = new Blob(
      [JSON.stringify(buildMetadataExport(), null, 2)],
      { type: "application/json;charset=utf-8" },
    );

    downloadBlob(blob, `${base}-metadata.json`);
    showDownloadSuccess("Metadata JSON download started.");
  }

  function clearTool() {
    state.operationToken += 1;
    state.file = null;
    state.metadata = null;
    state.flatRows = [];
    state.format = "";
    state.width = 0;
    state.height = 0;
    state.orientation = 1;
    state.gps = null;

    resetCleanResult();
    revokePreview();

    elements.imageInput.value = "";
    elements.fileInfo.textContent = "No image selected.";
    elements.inspectBtn.disabled = true;
    elements.cleanBtn.disabled = true;
    elements.resultSection.hidden = true;
    elements.metadataSearch.value = "";
    elements.metadataTableBody.replaceChildren();
    elements.groupFilter.replaceChildren();

    const option = document.createElement("option");
    option.value = "";
    option.textContent = "All groups";
    elements.groupFilter.appendChild(option);

    setInlineMessage("", "info");

    elements.dropZone.focus();
  }

  elements.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.imageInput.click();
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
      void selectFile(file);
    }
  });

  elements.imageInput.addEventListener("change", () => {
    const file = elements.imageInput.files?.[0];

    if (file) {
      void selectFile(file);
    }
  });

  elements.inspectBtn.addEventListener("click", () => {
    void inspectMetadata();
  });

  elements.replaceBtn.addEventListener("click", () => {
    elements.imageInput.click();
  });

  elements.clearBtn.addEventListener("click", clearTool);
  elements.cleanBtn.addEventListener("click", cleanMetadata);
  elements.downloadCleanBtn.addEventListener("click", downloadCleanCopy);
  elements.copyGpsBtn.addEventListener("click", copyGps);
  elements.copyJsonBtn.addEventListener("click", copyMetadataJson);
  elements.downloadJsonBtn.addEventListener("click", downloadMetadataJson);
  elements.metadataSearch.addEventListener("input", renderMetadataTable);
  elements.groupFilter.addEventListener("change", renderMetadataTable);

  window.addEventListener(
    "pagehide",
    () => {
      revokePreview();
    },
    { once: true },
  );
});
