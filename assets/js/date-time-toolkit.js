"use strict";

(() => {
  if (document.body.dataset.tool !== "date-time-toolkit") {
    return;
  }

  const state = {
    lastResultText: "",
  };

  const elements = {
    toolSelector: document.getElementById("toolSelector"),
    sampleBtn: document.getElementById("sampleBtn"),

    differenceTool: document.getElementById("differenceTool"),
    dateStart: document.getElementById("dateStart"),
    dateEnd: document.getElementById("dateEnd"),
    differenceMessage: document.getElementById("differenceMessage"),
    differenceResult: document.getElementById("differenceResult"),

    ageTool: document.getElementById("ageTool"),
    birthDate: document.getElementById("birthDate"),
    ageMessage: document.getElementById("ageMessage"),
    ageResult: document.getElementById("ageResult"),

    timestampTool: document.getElementById("timestampTool"),
    timestampInput: document.getElementById("timestampInput"),
    timestampMessage: document.getElementById("timestampMessage"),
    timestampResult: document.getElementById("timestampResult"),

    dateaddTool: document.getElementById("dateaddTool"),
    baseDate: document.getElementById("baseDate"),
    daysToAdd: document.getElementById("daysToAdd"),
    dateaddMessage: document.getElementById("dateaddMessage"),
    dateaddResult: document.getElementById("dateaddResult"),

    countdownTool: document.getElementById("countdownTool"),
    countdownDate: document.getElementById("countdownDate"),
    countdownMessage: document.getElementById("countdownMessage"),
    countdownResult: document.getElementById("countdownResult"),
  };

  function getMissingElements() {
    return Object.entries(elements)
      .filter(([, element]) => !element)
      .map(([name]) => name);
  }

  function showToast(text, type = "info") {
    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
      return;
    }

    console.info(`[${type}] ${text}`);
  }

  async function copyText(text) {
    if (!text) {
      showToast("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      showToast("Copy is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(text);
  }

  function setMessage(element, text, type = "info") {
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
  }

  function clearMessage(element) {
    element.textContent = "";
    element.className = "message";
  }

  function showPrimarySuccess(messageElement) {
    setMessage(messageElement, "Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else {
      showToast("Action completed successfully.", "success");
    }
  }

  function createButton(label, handler) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "btn btn-secondary";
    button.textContent = label;
    button.addEventListener("click", handler);

    return button;
  }

  function renderResult({
    container,
    primaryText,
    details = [],
    copyLabel = "Copy Result",
    copyValue = primaryText,
  }) {
    container.replaceChildren();

    const primary = document.createElement("strong");
    primary.textContent = primaryText;
    container.append(primary);

    details.forEach(({ label, value }) => {
      container.append(document.createElement("br"));

      if (label) {
        container.append(document.createTextNode(`${label}: `));
      }

      const strong = document.createElement("strong");
      strong.textContent = value;
      container.append(strong);
    });

    const actions = document.createElement("div");
    actions.className = "button-group";
    actions.append(
      createButton(copyLabel, () => {
        copyText(copyValue);
      }),
    );

    container.append(document.createElement("br"), actions);

    container.hidden = false;
  }

  function clearAll() {
    const inputElements = [
      elements.dateStart,
      elements.dateEnd,
      elements.birthDate,
      elements.timestampInput,
      elements.baseDate,
      elements.daysToAdd,
      elements.countdownDate,
    ];

    const messageElements = [
      elements.differenceMessage,
      elements.ageMessage,
      elements.timestampMessage,
      elements.dateaddMessage,
      elements.countdownMessage,
    ];

    const resultElements = [
      elements.differenceResult,
      elements.ageResult,
      elements.timestampResult,
      elements.dateaddResult,
      elements.countdownResult,
    ];

    inputElements.forEach((input) => {
      input.value = "";
    });

    messageElements.forEach(clearMessage);

    resultElements.forEach((box) => {
      box.replaceChildren();
      box.hidden = true;
    });

    state.lastResultText = "";
  }

  const DAY_MS = 86400000;

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function createLocalDate(year, monthIndex, day) {
    const safeDay = Math.min(day, daysInMonth(year, monthIndex));

    return new Date(year, monthIndex, safeDay, 12, 0, 0, 0);
  }

  function parseLocalDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) {
      return null;
    }

    return createLocalDate(year, month, day);
  }

  function calendarDayNumber(date) {
    return Math.floor(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
    );
  }

  function totalCalendarDays(start, end) {
    return Math.abs(calendarDayNumber(end) - calendarDayNumber(start));
  }

  function addCalendarDays(date, days) {
    const result = createLocalDate(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    result.setDate(result.getDate() + days);

    return result;
  }

  function addYearsClamped(date, years) {
    return createLocalDate(
      date.getFullYear() + years,
      date.getMonth(),
      date.getDate(),
    );
  }

  function addMonthsClamped(date, months) {
    const totalMonths = date.getFullYear() * 12 + date.getMonth() + months;

    const year = Math.floor(totalMonths / 12);
    const month = ((totalMonths % 12) + 12) % 12;

    return createLocalDate(year, month, date.getDate());
  }

  function getCalendarDifference(start, end) {
    let years = end.getFullYear() - start.getFullYear();
    let cursor = addYearsClamped(start, years);

    if (cursor > end) {
      years -= 1;
      cursor = addYearsClamped(start, years);
    }

    let months = 0;

    while (months < 11) {
      const next = addMonthsClamped(cursor, 1);

      if (next > end) {
        break;
      }

      cursor = next;
      months += 1;
    }

    const days = totalCalendarDays(cursor, end);

    return {
      years,
      months,
      days,
    };
  }

  function calculateDifference({ announce = true } = {}) {
    const startValue = elements.dateStart.value;
    const endValue = elements.dateEnd.value;

    if (!startValue || !endValue) {
      setMessage(
        elements.differenceMessage,
        "Please select both dates.",
        "error",
      );

      showToast("Please select both dates.", "error");
      return;
    }

    const firstDate = parseLocalDate(startValue);
    const secondDate = parseLocalDate(endValue);

    if (!firstDate || !secondDate) {
      setMessage(elements.differenceMessage, "Invalid date.", "error");
      showToast("Invalid date.", "error");
      return;
    }

    const start = firstDate <= secondDate ? firstDate : secondDate;
    const end = firstDate <= secondDate ? secondDate : firstDate;
    const differenceDays = totalCalendarDays(start, end);
    const weeks = Math.floor(differenceDays / 7);
    const remainingDays = differenceDays % 7;
    const calendar = getCalendarDifference(start, end);

    state.lastResultText =
      `${calendar.years} years, ` +
      `${calendar.months} months, ` +
      `${calendar.days} days`;

    if (announce) {
      showPrimarySuccess(elements.differenceMessage);
    } else {
      clearMessage(elements.differenceMessage);
    }

    renderResult({
      container: elements.differenceResult,
      primaryText: state.lastResultText,
      details: [
        {
          label: "Total Days",
          value: String(differenceDays),
        },
        {
          label: "Total Weeks",
          value: `${weeks} weeks and ${remainingDays} days`,
        },
      ],
      copyValue:
        `${state.lastResultText} • Total Days: ${differenceDays} • ` +
        `Total Weeks: ${weeks} weeks and ${remainingDays} days`,
    });
  }

  function calculateAge({ announce = true } = {}) {
    const birthValue = elements.birthDate.value;

    if (!birthValue) {
      setMessage(elements.ageMessage, "Please select a birth date.", "error");
      showToast("Please select a birth date.", "error");
      return;
    }

    const birthDate = parseLocalDate(birthValue);
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12,
    );

    if (!birthDate) {
      setMessage(elements.ageMessage, "Invalid birth date.", "error");
      showToast("Invalid birth date.", "error");
      return;
    }

    if (birthDate > today) {
      setMessage(
        elements.ageMessage,
        "Birth date cannot be in the future.",
        "error",
      );
      showToast("Birth date cannot be in the future.", "error");
      return;
    }

    const age = getCalendarDifference(birthDate, today);
    const totalDays = totalCalendarDays(birthDate, today);

    state.lastResultText = `${age.years} years, ${age.months} months, ${age.days} days`;
    if (announce) {
      showPrimarySuccess(elements.ageMessage);
    } else {
      clearMessage(elements.ageMessage);
    }

    renderResult({
      container: elements.ageResult,
      primaryText: state.lastResultText,
      details: [
        {
          label: "Total Days",
          value: String(totalDays),
        },
      ],
    });
  }

  function getCurrentTimestamp() {
    const unixSeconds = Math.floor(Date.now() / 1000);

    elements.timestampInput.value = String(unixSeconds);

    state.lastResultText = `Current Unix Timestamp: ${unixSeconds}`;

    setMessage(
      elements.timestampMessage,
      "Current timestamp generated.",
      "success",
    );

    showToast("Current timestamp generated.", "success");

    renderResult({
      container: elements.timestampResult,
      primaryText: state.lastResultText,
      copyLabel: "Copy Timestamp",
      copyValue: String(unixSeconds),
    });
  }

  function convertTimestamp({ announce = true } = {}) {
    const value = elements.timestampInput.value.trim();

    if (!value) {
      setMessage(
        elements.timestampMessage,
        "Please enter a timestamp.",
        "error",
      );

      showToast("Please enter a timestamp.", "error");
      return;
    }

    if (!/^-?\d+$/.test(value)) {
      setMessage(elements.timestampMessage, "Invalid timestamp.", "error");
      showToast("Invalid timestamp.", "error");
      return;
    }

    let timestamp = Number(value);

    if (!Number.isSafeInteger(timestamp)) {
      setMessage(
        elements.timestampMessage,
        "Timestamp is out of range.",
        "error",
      );
      showToast("Timestamp is out of range.", "error");
      return;
    }

    const absoluteTimestamp = Math.abs(timestamp);

    if (absoluteTimestamp < 100000000000) {
      timestamp *= 1000;
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      setMessage(elements.timestampMessage, "Invalid timestamp.", "error");

      showToast("Invalid timestamp.", "error");
      return;
    }

    state.lastResultText = date.toLocaleString();

    if (announce) {
      showPrimarySuccess(elements.timestampMessage);
    } else {
      clearMessage(elements.timestampMessage);
    }

    renderResult({
      container: elements.timestampResult,
      primaryText: state.lastResultText,
      details: [
        {
          label: "ISO 8601",
          value: date.toISOString(),
        },
      ],
      copyValue: `${state.lastResultText} • ISO 8601: ${date.toISOString()}`,
    });
  }

  function calculateNewDate({ announce = true } = {}) {
    const dateValue = elements.baseDate.value;
    const rawDays = elements.daysToAdd.value.trim();

    if (!dateValue || !/^-?\d+$/.test(rawDays)) {
      setMessage(
        elements.dateaddMessage,
        "Please enter a date and a whole number of days.",
        "error",
      );
      showToast("Please enter a date and a whole number of days.", "error");
      return;
    }

    const daysValue = Number(rawDays);
    const date = parseLocalDate(dateValue);

    if (!date || !Number.isSafeInteger(daysValue)) {
      setMessage(
        elements.dateaddMessage,
        "Invalid date or day value.",
        "error",
      );
      showToast("Invalid date or day value.", "error");
      return;
    }

    const resultDate = addCalendarDays(date, daysValue);
    const result = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(resultDate);

    state.lastResultText = result;
    if (announce) {
      showPrimarySuccess(elements.dateaddMessage);
    } else {
      clearMessage(elements.dateaddMessage);
    }

    renderResult({
      container: elements.dateaddResult,
      primaryText: result,
    });
  }

  function calculateCountdown({ announce = true } = {}) {
    const value = elements.countdownDate.value;

    if (!value) {
      setMessage(
        elements.countdownMessage,
        "Please select a future date and time.",
        "error",
      );

      showToast("Please select a future date and time.", "error");

      return;
    }

    const target = new Date(value);
    const targetTime = target.getTime();
    const now = Date.now();

    if (Number.isNaN(targetTime)) {
      setMessage(elements.countdownMessage, "Invalid date and time.", "error");
      showToast("Invalid date and time.", "error");
      return;
    }

    if (targetTime <= now) {
      setMessage(
        elements.countdownMessage,
        "Countdown date must be in the future.",
        "error",
      );

      showToast("Countdown date must be in the future.", "error");

      return;
    }

    let difference = targetTime - now;

    const days = Math.floor(difference / 86400000);

    difference -= days * 86400000;

    const hours = Math.floor(difference / 3600000);

    difference -= hours * 3600000;

    const minutes = Math.floor(difference / 60000);

    difference -= minutes * 60000;

    const seconds = Math.floor(difference / 1000);

    state.lastResultText =
      `${days} days, ` +
      `${hours} hours, ` +
      `${minutes} minutes, ` +
      `${seconds} seconds`;

    if (announce) {
      showPrimarySuccess(elements.countdownMessage);
    } else {
      clearMessage(elements.countdownMessage);
    }

    renderResult({
      container: elements.countdownResult,
      primaryText: state.lastResultText,
    });
  }
  function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function toDateTimeLocalValue(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${toDateInputValue(date)}T${hours}:${minutes}`;
  }

  function loadSample() {
    clearAll();

    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12,
    );

    switch (elements.toolSelector.value) {
      case "difference": {
        const earlier = addCalendarDays(today, -45);
        elements.dateStart.value = toDateInputValue(earlier);
        elements.dateEnd.value = toDateInputValue(today);
        calculateDifference({ announce: false });
        break;
      }
      case "age":
        elements.birthDate.value = "1990-06-15";
        calculateAge({ announce: false });
        break;
      case "timestamp":
        elements.timestampInput.value = String(Math.floor(Date.now() / 1000));
        convertTimestamp({ announce: false });
        break;
      case "dateadd":
        elements.baseDate.value = toDateInputValue(today);
        elements.daysToAdd.value = "30";
        calculateNewDate({ announce: false });
        break;
      case "countdown": {
        const future = new Date(Date.now() + 7 * DAY_MS);
        future.setSeconds(0, 0);
        elements.countdownDate.value = toDateTimeLocalValue(future);
        calculateCountdown({ announce: false });
        break;
      }
      default:
        return;
    }

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else {
      showToast("Sample loaded successfully.", "success");
    }
  }

  function switchTool() {
    const activeToolId = `${elements.toolSelector.value}Tool`;

    document.querySelectorAll(".tool-section").forEach((section) => {
      const isActive = section.id === activeToolId;

      section.classList.toggle("active", isActive);

      section.hidden = !isActive;

      section.setAttribute("aria-hidden", String(!isActive));
    });
  }

  function handleDataAction(action) {
    const actions = {
      "calculate-difference": calculateDifference,
      "calculate-age": calculateAge,
      "convert-timestamp": convertTimestamp,
      "current-timestamp": getCurrentTimestamp,
      "calculate-new-date": calculateNewDate,
      "calculate-countdown": calculateCountdown,
      "clear-all": clearAll,
    };

    actions[action]?.();
  }

  function registerEvents() {
    elements.toolSelector.addEventListener("change", switchTool);
    elements.sampleBtn.addEventListener("click", loadSample);

    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        handleDataAction(button.dataset.action);
      });
    });
  }

  function initialize() {
    const missingElements = getMissingElements();

    if (missingElements.length > 0) {
      console.error(
        "Date & Time Toolkit initialization stopped. " +
          `Missing elements: ${missingElements.join(", ")}`,
      );

      return;
    }

    [
      elements.differenceResult,
      elements.ageResult,
      elements.timestampResult,
      elements.dateaddResult,
      elements.countdownResult,
    ].forEach((box) => {
      box.hidden = true;
    });

    registerEvents();
    switchTool();
  }

  initialize();
})();
