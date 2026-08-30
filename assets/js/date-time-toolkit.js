"use strict";

(() => {
  if (document.body.dataset.tool !== "date-time-toolkit") {
    return;
  }

  const state = {
    lastResultText: "",
    lastTimeZoneInstant: null,
    defaultFromTimeZone: "UTC",
    defaultToTimeZone: "UTC",
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

    timezoneTool: document.getElementById("timezoneTool"),
    timezoneDateTime: document.getElementById("timezoneDateTime"),
    timezoneFrom: document.getElementById("timezoneFrom"),
    timezoneTo: document.getElementById("timezoneTo"),
    timezoneMessage: document.getElementById("timezoneMessage"),
    timezoneResult: document.getElementById("timezoneResult"),

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
      elements.timezoneDateTime,
      elements.baseDate,
      elements.daysToAdd,
      elements.countdownDate,
    ];

    const messageElements = [
      elements.differenceMessage,
      elements.ageMessage,
      elements.timestampMessage,
      elements.timezoneMessage,
      elements.dateaddMessage,
      elements.countdownMessage,
    ];

    const resultElements = [
      elements.differenceResult,
      elements.ageResult,
      elements.timestampResult,
      elements.timezoneResult,
      elements.dateaddResult,
      elements.countdownResult,
    ];

    inputElements.forEach((input) => {
      input.value = "";
    });

    if (elements.timezoneFrom.options.length > 0) {
      elements.timezoneFrom.value = state.defaultFromTimeZone;
      elements.timezoneTo.value = state.defaultToTimeZone;
    }

    messageElements.forEach(clearMessage);

    resultElements.forEach((box) => {
      box.replaceChildren();
      box.hidden = true;
    });

    state.lastResultText = "";
    state.lastTimeZoneInstant = null;
  }

  const DAY_MS = 86400000;

  const FALLBACK_TIME_ZONES = Object.freeze([
    "UTC",
    "Africa/Cairo",
    "Africa/Johannesburg",
    "America/Anchorage",
    "America/Argentina/Buenos_Aires",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/New_York",
    "America/Sao_Paulo",
    "Asia/Bangkok",
    "Asia/Dubai",
    "Asia/Hong_Kong",
    "Asia/Jakarta",
    "Asia/Kolkata",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Adelaide",
    "Australia/Brisbane",
    "Australia/Melbourne",
    "Australia/Perth",
    "Australia/Sydney",
    "Europe/Amsterdam",
    "Europe/Athens",
    "Europe/Berlin",
    "Europe/Lisbon",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Paris",
    "Europe/Rome",
    "Europe/Warsaw",
    "Pacific/Auckland",
    "Pacific/Honolulu",
  ]);

  function getSupportedTimeZones() {
    let zones = [];

    if (typeof Intl.supportedValuesOf === "function") {
      try {
        zones = Intl.supportedValuesOf("timeZone");
      } catch {
        zones = [];
      }
    }

    const combined = new Set(["UTC", ...zones, ...FALLBACK_TIME_ZONES]);

    return Array.from(combined).filter(isValidTimeZone).sort((a, b) => {
      if (a === "UTC") {
        return -1;
      }

      if (b === "UTC") {
        return 1;
      }

      return a.localeCompare(b);
    });
  }

  function isValidTimeZone(timeZone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone }).format(new Date(0));
      return true;
    } catch {
      return false;
    }
  }

  function addTimeZoneOptions(select, zones) {
    select.replaceChildren();

    zones.forEach((timeZone) => {
      const option = document.createElement("option");
      option.value = timeZone;
      option.textContent = timeZone === "UTC" ? "UTC" : timeZone.replaceAll("_", " ");
      select.append(option);
    });
  }

  function initializeTimeZones() {
    const zones = getSupportedTimeZones();

    addTimeZoneOptions(elements.timezoneFrom, zones);
    addTimeZoneOptions(elements.timezoneTo, zones);

    const browserTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    state.defaultFromTimeZone = zones.includes(browserTimeZone)
      ? browserTimeZone
      : "UTC";

    state.defaultToTimeZone =
      state.defaultFromTimeZone === "UTC" && zones.includes("Europe/London")
        ? "Europe/London"
        : "UTC";

    elements.timezoneFrom.value = state.defaultFromTimeZone;
    elements.timezoneTo.value = state.defaultToTimeZone;
  }

  function getZonedParts(date, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    const values = {};

    formatter.formatToParts(date).forEach((part) => {
      if (part.type !== "literal") {
        values[part.type] = Number(part.value);
      }
    });

    return {
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.hour,
      minute: values.minute,
      second: values.second,
    };
  }

  function createUtcTimestamp({ year, month, day, hour = 0, minute = 0, second = 0 }) {
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, second, 0);
    return date.getTime();
  }

  function getTimeZoneOffsetMinutes(date, timeZone) {
    const parts = getZonedParts(date, timeZone);
    const localAsUtc = createUtcTimestamp(parts);
    const instant = Math.floor(date.getTime() / 1000) * 1000;

    return Math.round((localAsUtc - instant) / 60000);
  }

  function parseDateTimeLocal(value) {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
      return null;
    }

    const parts = {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: 0,
    };

    if (
      parts.month < 1 ||
      parts.month > 12 ||
      parts.day < 1 ||
      parts.day > daysInMonth(parts.year, parts.month - 1) ||
      parts.hour < 0 ||
      parts.hour > 23 ||
      parts.minute < 0 ||
      parts.minute > 59
    ) {
      return null;
    }

    return parts;
  }

  function zonedPartsMatch(first, second) {
    return (
      first.year === second.year &&
      first.month === second.month &&
      first.day === second.day &&
      first.hour === second.hour &&
      first.minute === second.minute
    );
  }

  function findInstantsForZonedLocal(parts, timeZone) {
    const naiveUtc = createUtcTimestamp(parts);
    const sampleHours = [-48, -36, -24, -12, 0, 12, 24, 36, 48];
    const offsets = new Set();

    sampleHours.forEach((hours) => {
      const sampleDate = new Date(naiveUtc + hours * 60 * 60 * 1000);
      offsets.add(getTimeZoneOffsetMinutes(sampleDate, timeZone));
    });

    const matches = new Set();

    offsets.forEach((offsetMinutes) => {
      const candidateTime = naiveUtc - offsetMinutes * 60000;
      const candidate = new Date(candidateTime);

      if (zonedPartsMatch(getZonedParts(candidate, timeZone), parts)) {
        matches.add(candidateTime);
      }
    });

    return Array.from(matches).sort((a, b) => a - b);
  }

  function padDateTimePart(value) {
    return String(value).padStart(2, "0");
  }

  function toDateTimeLocalValueInZone(date, timeZone) {
    const parts = getZonedParts(date, timeZone);

    return (
      `${String(parts.year).padStart(4, "0")}-` +
      `${padDateTimePart(parts.month)}-${padDateTimePart(parts.day)}T` +
      `${padDateTimePart(parts.hour)}:${padDateTimePart(parts.minute)}`
    );
  }

  function formatOffset(minutes) {
    const sign = minutes >= 0 ? "+" : "-";
    const absoluteMinutes = Math.abs(minutes);
    const hours = Math.floor(absoluteMinutes / 60);
    const remainingMinutes = absoluteMinutes % 60;

    return `UTC${sign}${padDateTimePart(hours)}:${padDateTimePart(remainingMinutes)}`;
  }

  function formatZonedDateTime(date, timeZone) {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }

  function describeTimeDifference(minutes) {
    if (minutes === 0) {
      return "Same UTC offset";
    }

    const absoluteMinutes = Math.abs(minutes);
    const hours = Math.floor(absoluteMinutes / 60);
    const remainingMinutes = absoluteMinutes % 60;
    const parts = [];

    if (hours > 0) {
      parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    }

    if (remainingMinutes > 0) {
      parts.push(
        `${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`,
      );
    }

    return `${parts.join(" ")} ${minutes > 0 ? "ahead" : "behind"}`;
  }

  function describeCalendarDayChange(sourceParts, targetParts) {
    const sourceDay = createUtcTimestamp({
      year: sourceParts.year,
      month: sourceParts.month,
      day: sourceParts.day,
    });
    const targetDay = createUtcTimestamp({
      year: targetParts.year,
      month: targetParts.month,
      day: targetParts.day,
    });
    const difference = Math.round((targetDay - sourceDay) / DAY_MS);

    if (difference === 0) {
      return "Same calendar day";
    }

    if (difference === 1) {
      return "Next calendar day";
    }

    if (difference === -1) {
      return "Previous calendar day";
    }

    return difference > 0
      ? `${difference} calendar days later`
      : `${Math.abs(difference)} calendar days earlier`;
  }

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

  function renderTimeZoneConversion(instant, { announce = true, ambiguous = false } = {}) {
    const fromTimeZone = elements.timezoneFrom.value;
    const toTimeZone = elements.timezoneTo.value;
    const sourceParts = getZonedParts(instant, fromTimeZone);
    const targetParts = getZonedParts(instant, toTimeZone);
    const sourceOffset = getTimeZoneOffsetMinutes(instant, fromTimeZone);
    const targetOffset = getTimeZoneOffsetMinutes(instant, toTimeZone);
    const sourceText = formatZonedDateTime(instant, fromTimeZone);
    const targetText = formatZonedDateTime(instant, toTimeZone);
    const details = [
      {
        label: "Source",
        value: sourceText,
      },
      {
        label: "From Zone",
        value: `${fromTimeZone} (${formatOffset(sourceOffset)})`,
      },
      {
        label: "To Zone",
        value: `${toTimeZone} (${formatOffset(targetOffset)})`,
      },
      {
        label: "Time Difference",
        value: describeTimeDifference(targetOffset - sourceOffset),
      },
      {
        label: "Calendar Day",
        value: describeCalendarDayChange(sourceParts, targetParts),
      },
      {
        label: "UTC",
        value: instant.toISOString(),
      },
    ];

    if (ambiguous) {
      details.push({
        label: "DST Note",
        value: "Ambiguous source time; the earlier occurrence was used.",
      });
    }

    state.lastTimeZoneInstant = instant.getTime();
    state.lastResultText = targetText;

    if (announce) {
      showPrimarySuccess(elements.timezoneMessage);
    } else {
      clearMessage(elements.timezoneMessage);
    }

    renderResult({
      container: elements.timezoneResult,
      primaryText: targetText,
      details,
      copyLabel: "Copy Converted Time",
      copyValue:
        `${targetText} • ${toTimeZone} (${formatOffset(targetOffset)})` +
        ` • UTC: ${instant.toISOString()}`,
    });
  }

  function convertTimeZone({ announce = true, instantOverride = null } = {}) {
    const fromTimeZone = elements.timezoneFrom.value;
    const toTimeZone = elements.timezoneTo.value;

    if (!fromTimeZone || !toTimeZone) {
      setMessage(
        elements.timezoneMessage,
        "Please select both time zones.",
        "error",
      );
      showToast("Please select both time zones.", "error");
      return;
    }

    if (!isValidTimeZone(fromTimeZone) || !isValidTimeZone(toTimeZone)) {
      setMessage(elements.timezoneMessage, "Invalid time zone.", "error");
      showToast("Invalid time zone.", "error");
      return;
    }

    if (instantOverride instanceof Date) {
      if (Number.isNaN(instantOverride.getTime())) {
        setMessage(elements.timezoneMessage, "Invalid date and time.", "error");
        showToast("Invalid date and time.", "error");
        return;
      }

      renderTimeZoneConversion(instantOverride, { announce });
      return;
    }

    const parts = parseDateTimeLocal(elements.timezoneDateTime.value);

    if (!parts) {
      setMessage(
        elements.timezoneMessage,
        "Please enter a valid date and time.",
        "error",
      );
      showToast("Please enter a valid date and time.", "error");
      return;
    }

    const matches = findInstantsForZonedLocal(parts, fromTimeZone);

    if (matches.length === 0) {
      setMessage(
        elements.timezoneMessage,
        "That local time does not exist in the selected source zone because of a daylight-saving transition.",
        "error",
      );
      showToast("The selected local time does not exist in that time zone.", "error");
      return;
    }

    const instant = new Date(matches[0]);

    renderTimeZoneConversion(instant, {
      announce,
      ambiguous: matches.length > 1,
    });
  }

  function useCurrentWorldTime() {
    const fromTimeZone = elements.timezoneFrom.value;

    if (!isValidTimeZone(fromTimeZone)) {
      setMessage(elements.timezoneMessage, "Invalid source time zone.", "error");
      showToast("Invalid source time zone.", "error");
      return;
    }

    const now = new Date();
    elements.timezoneDateTime.value = toDateTimeLocalValueInZone(
      now,
      fromTimeZone,
    );

    renderTimeZoneConversion(now);
  }

  function swapTimeZones() {
    const previousFrom = elements.timezoneFrom.value;
    const previousTo = elements.timezoneTo.value;
    const previousInstant = state.lastTimeZoneInstant;

    elements.timezoneFrom.value = previousTo;
    elements.timezoneTo.value = previousFrom;

    clearMessage(elements.timezoneMessage);

    if (Number.isFinite(previousInstant)) {
      const instant = new Date(previousInstant);
      elements.timezoneDateTime.value = toDateTimeLocalValueInZone(
        instant,
        elements.timezoneFrom.value,
      );
      renderTimeZoneConversion(instant, { announce: false });
      return;
    }

    elements.timezoneResult.replaceChildren();
    elements.timezoneResult.hidden = true;
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
      case "timezone": {
        const sampleFrom = Array.from(elements.timezoneFrom.options).some(
          (option) => option.value === "Europe/Rome",
        )
          ? "Europe/Rome"
          : state.defaultFromTimeZone;
        const sampleTo = Array.from(elements.timezoneTo.options).some(
          (option) => option.value === "America/New_York",
        )
          ? "America/New_York"
          : state.defaultToTimeZone;

        elements.timezoneFrom.value = sampleFrom;
        elements.timezoneTo.value = sampleTo;
        elements.timezoneDateTime.value = "2026-01-15T12:00";
        convertTimeZone({ announce: false });
        break;
      }
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
      "convert-timezone": convertTimeZone,
      "current-world-time": useCurrentWorldTime,
      "swap-timezones": swapTimeZones,
      "calculate-new-date": calculateNewDate,
      "calculate-countdown": calculateCountdown,
      "clear-all": clearAll,
    };

    actions[action]?.();
  }

  function registerEvents() {
    elements.toolSelector.addEventListener("change", switchTool);
    elements.sampleBtn.addEventListener("click", loadSample);

    [
      elements.timezoneDateTime,
      elements.timezoneFrom,
      elements.timezoneTo,
    ].forEach((element) => {
      element.addEventListener("input", () => {
        state.lastTimeZoneInstant = null;
      });

      element.addEventListener("change", () => {
        state.lastTimeZoneInstant = null;
      });
    });

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
      elements.timezoneResult,
      elements.dateaddResult,
      elements.countdownResult,
    ].forEach((box) => {
      box.hidden = true;
    });

    initializeTimeZones();
    registerEvents();
    switchTool();
  }

  initialize();
})();
