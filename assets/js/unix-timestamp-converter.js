"use strict";

function initUnixTimestampConverter() {
  const conversionMode = document.getElementById("conversionMode");
  const timestampInput = document.getElementById("timestampInput");
  const timestampUnit = document.getElementById("timestampUnit");
  const dateInput = document.getElementById("dateInput");
  const dateInterpretation = document.getElementById("dateInterpretation");

  const timestampPanels = Array.from(
    document.querySelectorAll('[data-conversion-panel="timestamp-date"]'),
  );

  const datePanels = Array.from(
    document.querySelectorAll('[data-conversion-panel="date-timestamp"]'),
  );

  const convertBtn = document.getElementById("convertBtn");
  const nowBtn = document.getElementById("nowBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");

  const resultBox = document.getElementById("resultBox");
  const output = document.getElementById("output");

  const secondsStat = document.getElementById("secondsStat");
  const millisecondsStat = document.getElementById("millisecondsStat");
  const isoStat = document.getElementById("isoStat");
  const timezoneStat = document.getElementById("timezoneStat");

  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const message = document.getElementById("message");

  const required = [
    conversionMode,
    timestampInput,
    timestampUnit,
    dateInput,
    dateInterpretation,
    convertBtn,
    nowBtn,
    sampleBtn,
    clearBtn,
    resultBox,
    output,
    secondsStat,
    millisecondsStat,
    isoStat,
    timezoneStat,
    copyBtn,
    downloadBtn,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("Unix Timestamp Converter: HTML and JS do not match.");
    return;
  }

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

  function getLocalTimeZone() {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time zone"
    );
  }

  function formatLocalDate(date) {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }

  function formatUtcDate(date) {
    return date.toUTCString();
  }

  function formatDateTimeLocal(date, useUtc = false) {
    const year = useUtc ? date.getUTCFullYear() : date.getFullYear();
    const month = (useUtc ? date.getUTCMonth() : date.getMonth()) + 1;
    const day = useUtc ? date.getUTCDate() : date.getDate();
    const hours = useUtc ? date.getUTCHours() : date.getHours();
    const minutes = useUtc ? date.getUTCMinutes() : date.getMinutes();
    const seconds = useUtc ? date.getUTCSeconds() : date.getSeconds();

    const pad = (value) => String(value).padStart(2, "0");

    return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function resetResult() {
    output.value = "";
    resultBox.hidden = true;

    secondsStat.textContent = "—";
    millisecondsStat.textContent = "—";
    isoStat.textContent = "—";
    timezoneStat.textContent = "—";

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function renderResult(date) {
    const milliseconds = date.getTime();
    const seconds = Math.trunc(milliseconds / 1000);
    const iso = date.toISOString();
    const timeZone = getLocalTimeZone();

    secondsStat.textContent = String(seconds);
    millisecondsStat.textContent = String(milliseconds);
    isoStat.textContent = iso;
    timezoneStat.textContent = timeZone;

    output.value = [
      `Unix Seconds: ${seconds}`,
      `Unix Milliseconds: ${milliseconds}`,
      `ISO 8601: ${iso}`,
      `UTC: ${formatUtcDate(date)}`,
      `Local: ${formatLocalDate(date)}`,
      `Local Time Zone: ${timeZone}`,
    ].join("\n");

    resultBox.hidden = false;
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
  }

  function parseTimestampValue() {
    const raw = timestampInput.value.trim();

    if (!raw) {
      throw new Error("Enter a Unix timestamp first.");
    }

    if (!/^-?\d+(?:\.\d+)?$/.test(raw)) {
      throw new Error("Unix timestamp must be numeric.");
    }

    const value = Number(raw);

    if (!Number.isFinite(value)) {
      throw new Error("Unix timestamp is outside the supported range.");
    }

    let unit = timestampUnit.value;

    if (unit === "auto") {
      unit = Math.abs(value) >= 100000000000 ? "milliseconds" : "seconds";
    }

    const milliseconds =
      unit === "seconds" ? Math.round(value * 1000) : Math.round(value);

    const date = new Date(milliseconds);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Unix timestamp is outside the supported date range.");
    }

    return date;
  }

  function parseDateValue() {
    const raw = dateInput.value;

    if (!raw) {
      throw new Error("Choose a date and time first.");
    }

    let date;

    if (dateInterpretation.value === "utc") {
      const match = raw.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
      );

      if (!match) {
        throw new Error("Enter a valid date and time.");
      }

      date = new Date(
        Date.UTC(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          Number(match[4]),
          Number(match[5]),
          Number(match[6] || 0),
        ),
      );
    } else {
      date = new Date(raw);
    }

    if (Number.isNaN(date.getTime())) {
      throw new Error("Enter a valid date and time.");
    }

    return date;
  }

  function convert({ announce = true } = {}) {
    try {
      const date =
        conversionMode.value === "timestamp-date"
          ? parseTimestampValue()
          : parseDateValue();

      renderResult(date);

      if (announce) {
        announceActionSuccess();
      }

      return true;
    } catch (error) {
      resetResult();

      notify(
        error instanceof Error
          ? error.message
          : "Unable to convert the supplied value.",
        "error",
      );

      if (conversionMode.value === "timestamp-date") {
        timestampInput.focus();
      } else {
        dateInput.focus();
      }

      return false;
    }
  }

  function syncMode() {
    const timestampMode = conversionMode.value === "timestamp-date";

    timestampPanels.forEach((panel) => {
      panel.hidden = !timestampMode;
    });

    datePanels.forEach((panel) => {
      panel.hidden = timestampMode;
    });

    convertBtn.textContent = timestampMode
      ? "Convert Timestamp"
      : "Convert Date";

    resetResult();
    clearPersistentMessage();
  }

  function useCurrentTime() {
    const now = new Date();

    if (conversionMode.value === "timestamp-date") {
      timestampUnit.value = "seconds";
      timestampInput.value = String(Math.trunc(now.getTime() / 1000));
    } else {
      const useUtc = dateInterpretation.value === "utc";
      dateInput.value = formatDateTimeLocal(now, useUtc);
    }

    resetResult();
    clearPersistentMessage();

    const completed = convert({ announce: false });

    if (!completed) {
      return;
    }

    setInlineMessage("Current time loaded successfully.", "success");

    if (typeof window.showMessage === "function") {
      window.showMessage("Current time loaded successfully.", "success");
    }
  }

  function loadSample() {
    conversionMode.value = "timestamp-date";
    timestampInput.value = "1735689600";
    timestampUnit.value = "seconds";
    dateInput.value = "";
    dateInterpretation.value = "local";

    syncMode();

    const completed = convert({ announce: false });

    if (!completed) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    timestampInput.focus();
  }

  async function copyResult() {
    if (!output.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(output.value);
  }

  function downloadResult() {
    if (!output.value) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-unix-timestamp-result.txt",
      output.value,
      "text/plain;charset=utf-8",
    );
  }

  function invalidateResult() {
    if (!resultBox.hidden) {
      resetResult();
    }

    clearPersistentMessage();
  }

  function clearTool() {
    conversionMode.value = "timestamp-date";
    timestampInput.value = "";
    timestampUnit.value = "auto";
    dateInput.value = "";
    dateInterpretation.value = "local";

    syncMode();
    timestampInput.focus();
  }

  conversionMode.addEventListener("change", syncMode);

  timestampInput.addEventListener("input", invalidateResult);
  timestampUnit.addEventListener("change", invalidateResult);
  dateInput.addEventListener("input", invalidateResult);
  dateInterpretation.addEventListener("change", invalidateResult);

  convertBtn.addEventListener("click", () => {
    convert();
  });

  nowBtn.addEventListener("click", useCurrentTime);
  sampleBtn.addEventListener("click", loadSample);

  copyBtn.addEventListener("click", () => {
    void copyResult();
  });

  downloadBtn.addEventListener("click", downloadResult);
  clearBtn.addEventListener("click", clearTool);

  resetResult();
  syncMode();
}

initUnixTimestampConverter();
