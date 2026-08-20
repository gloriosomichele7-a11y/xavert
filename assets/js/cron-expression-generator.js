// =====================================
// XAVERT Cron Expression Generator
// =====================================

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "cron-expression-generator") {
    return;
  }

  const $ = (id) => document.getElementById(id);

  const elements = {
    preset: $("cron-preset"),

    minute: $("cron-minute"),
    hour: $("cron-hour"),
    day: $("cron-day"),
    month: $("cron-month"),
    weekday: $("cron-weekday"),

    minuteError: $("minute-error"),
    hourError: $("hour-error"),
    dayError: $("day-error"),
    monthError: $("month-error"),
    weekdayError: $("weekday-error"),

    generateButton: $("generate-cron"),
    resetButton: $("reset-cron"),
    copyButton: $("copy-cron"),
    downloadButton: $("download-cron"),

    output: $("cron-output"),
    validationStatus: $("cron-validation-status"),

    fieldCount: $("cron-field-count"),
    format: $("cron-format"),
    status: $("cron-status"),

    description: $("cron-description"),
    nextRun: $("next-run"),
  };

  const requiredElements = {
    preset: elements.preset,
    minute: elements.minute,
    hour: elements.hour,
    day: elements.day,
    month: elements.month,
    weekday: elements.weekday,
    minuteError: elements.minuteError,
    hourError: elements.hourError,
    dayError: elements.dayError,
    monthError: elements.monthError,
    weekdayError: elements.weekdayError,
    generateButton: elements.generateButton,
    resetButton: elements.resetButton,
    copyButton: elements.copyButton,
    downloadButton: elements.downloadButton,
    output: elements.output,
    validationStatus: elements.validationStatus,
    fieldCount: elements.fieldCount,
    format: elements.format,
    status: elements.status,
    description: elements.description,
    nextRun: elements.nextRun,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length > 0) {
    console.error(
      "Cron Expression Generator initialization failed. Missing elements:",
      missingElements,
    );

    return;
  }

  const MONTH_ALIASES = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AUG: 8,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DEC: 12,
  };

  const WEEKDAY_ALIASES = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
  };

  const WEEKDAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const MONTH_NAMES = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const fieldDefinitions = {
    minute: {
      label: "Minute",
      minimum: 0,
      maximum: 59,
    },

    hour: {
      label: "Hour",
      minimum: 0,
      maximum: 23,
    },

    day: {
      label: "Day of month",
      minimum: 1,
      maximum: 31,
    },

    month: {
      label: "Month",
      minimum: 1,
      maximum: 12,
      aliases: MONTH_ALIASES,
    },

    weekday: {
      label: "Day of week",
      minimum: 0,
      maximum: 7,
      aliases: WEEKDAY_ALIASES,
      normalize: (value) => (value === 7 ? 0 : value),
    },
  };

  const fieldElements = {
    minute: {
      input: elements.minute,
      error: elements.minuteError,
    },

    hour: {
      input: elements.hour,
      error: elements.hourError,
    },

    day: {
      input: elements.day,
      error: elements.dayError,
    },

    month: {
      input: elements.month,
      error: elements.monthError,
    },

    weekday: {
      input: elements.weekday,
      error: elements.weekdayError,
    },
  };

  const presets = {
    custom: null,

    "every-minute": {
      minute: "*",
      hour: "*",
      day: "*",
      month: "*",
      weekday: "*",
    },

    "every-five-minutes": {
      minute: "*/5",
      hour: "*",
      day: "*",
      month: "*",
      weekday: "*",
    },

    "every-ten-minutes": {
      minute: "*/10",
      hour: "*",
      day: "*",
      month: "*",
      weekday: "*",
    },

    "every-fifteen-minutes": {
      minute: "*/15",
      hour: "*",
      day: "*",
      month: "*",
      weekday: "*",
    },

    "every-thirty-minutes": {
      minute: "*/30",
      hour: "*",
      day: "*",
      month: "*",
      weekday: "*",
    },

    hourly: {
      minute: "0",
      hour: "*",
      day: "*",
      month: "*",
      weekday: "*",
    },

    daily: {
      minute: "0",
      hour: "0",
      day: "*",
      month: "*",
      weekday: "*",
    },

    "daily-morning": {
      minute: "0",
      hour: "8",
      day: "*",
      month: "*",
      weekday: "*",
    },

    "monday-morning": {
      minute: "0",
      hour: "8",
      day: "*",
      month: "*",
      weekday: "1",
    },

    weekdays: {
      minute: "0",
      hour: "9",
      day: "*",
      month: "*",
      weekday: "1-5",
    },

    weekends: {
      minute: "0",
      hour: "9",
      day: "*",
      month: "*",
      weekday: "0,6",
    },

    weekly: {
      minute: "0",
      hour: "0",
      day: "*",
      month: "*",
      weekday: "0",
    },

    monthly: {
      minute: "0",
      hour: "0",
      day: "1",
      month: "*",
      weekday: "*",
    },

    yearly: {
      minute: "0",
      hour: "0",
      day: "1",
      month: "1",
      weekday: "*",
    },
  };

  let inputTimer = null;

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------
  function normalizeInput(value) {
    return String(value).trim().replace(/\s+/g, "").toUpperCase();
  }

  function normalizeFieldValue(value, definition) {
    return typeof definition.normalize === "function"
      ? definition.normalize(value)
      : value;
  }

  function resolveValue(rawValue, definition) {
    const normalizedValue = rawValue.toUpperCase();

    if (
      definition.aliases &&
      Object.prototype.hasOwnProperty.call(definition.aliases, normalizedValue)
    ) {
      return definition.aliases[normalizedValue];
    }

    if (!/^\d+$/.test(normalizedValue)) {
      return null;
    }

    return Number(normalizedValue);
  }

  function validateNumber(value, definition) {
    return (
      Number.isInteger(value) &&
      value >= definition.minimum &&
      value <= definition.maximum
    );
  }

  function addValue(values, value, definition) {
    values.add(normalizeFieldValue(value, definition));
  }

  function addRange(values, start, end, step, definition) {
    for (let value = start; value <= end; value += step) {
      addValue(values, value, definition);
    }
  }

  function parseSegment(segment, definition) {
    const slashParts = segment.split("/");

    if (slashParts.length > 2) {
      throw new Error(
        `${definition.label} contains an invalid step expression.`,
      );
    }

    const basePart = slashParts[0];
    const hasStep = slashParts.length === 2;

    let step = 1;

    if (hasStep) {
      if (!/^\d+$/.test(slashParts[1])) {
        throw new Error(`${definition.label} step must be a whole number.`);
      }

      step = Number(slashParts[1]);

      const fieldSize = definition.maximum - definition.minimum + 1;

      if (step < 1 || step > fieldSize) {
        throw new Error(
          `${definition.label} step must be between 1 and ${fieldSize}.`,
        );
      }
    }

    let rangeStart;
    let rangeEnd;

    if (basePart === "*") {
      rangeStart = definition.minimum;
      rangeEnd = definition.maximum;
    } else if (basePart.includes("-")) {
      const rangeParts = basePart.split("-");

      if (rangeParts.length !== 2) {
        throw new Error(`${definition.label} contains an invalid range.`);
      }

      rangeStart = resolveValue(rangeParts[0], definition);

      rangeEnd = resolveValue(rangeParts[1], definition);

      if (
        rangeStart === null ||
        rangeEnd === null ||
        !validateNumber(rangeStart, definition) ||
        !validateNumber(rangeEnd, definition)
      ) {
        throw new Error(
          `${definition.label} range must stay between ${definition.minimum} and ${definition.maximum}.`,
        );
      }

      if (rangeStart > rangeEnd) {
        throw new Error(
          `${definition.label} range must start with the lower value.`,
        );
      }
    } else {
      rangeStart = resolveValue(basePart, definition);

      if (rangeStart === null || !validateNumber(rangeStart, definition)) {
        throw new Error(
          `${definition.label} must stay between ${definition.minimum} and ${definition.maximum}.`,
        );
      }

      rangeEnd = hasStep ? definition.maximum : rangeStart;
    }

    return {
      start: rangeStart,
      end: rangeEnd,
      step,
    };
  }

  function parseField(rawValue, definition) {
    const expression = normalizeInput(rawValue);

    if (!expression) {
      throw new Error(`${definition.label} is required.`);
    }

    const segments = expression.split(",");

    if (segments.length === 0 || segments.some((segment) => !segment)) {
      throw new Error(`${definition.label} contains an incomplete list.`);
    }

    const values = new Set();

    segments.forEach((segment) => {
      const parsedSegment = parseSegment(segment, definition);

      addRange(
        values,
        parsedSegment.start,
        parsedSegment.end,
        parsedSegment.step,
        definition,
      );
    });

    if (values.size === 0) {
      throw new Error(`${definition.label} does not select any values.`);
    }

    const completeRange = new Set();

    for (
      let value = definition.minimum;
      value <= definition.maximum;
      value += 1
    ) {
      addValue(completeRange, value, definition);
    }

    const unrestricted =
      values.size === completeRange.size &&
      [...completeRange].every((value) => values.has(value));

    return {
      expression,
      values,
      unrestricted,
    };
  }

  function clearFieldError(fieldName) {
    const field = fieldElements[fieldName];

    field.input.removeAttribute("aria-invalid");

    if (field.error) {
      field.error.hidden = true;
      field.error.textContent = "";
    }
  }

  function showFieldError(fieldName, message) {
    const field = fieldElements[fieldName];

    field.input.setAttribute("aria-invalid", "true");

    if (field.error) {
      field.error.textContent = message;
      field.error.hidden = false;
    }
  }

  function clearAllFieldErrors() {
    Object.keys(fieldElements).forEach(clearFieldError);
  }

  function readExpression() {
    return {
      minute: elements.minute.value,
      hour: elements.hour.value,
      day: elements.day.value,
      month: elements.month.value,
      weekday: elements.weekday.value,
    };
  }

  function parseExpression() {
    const rawFields = readExpression();
    const parsedFields = {};
    const errors = {};

    Object.keys(fieldDefinitions).forEach((fieldName) => {
      try {
        parsedFields[fieldName] = parseField(
          rawFields[fieldName],
          fieldDefinitions[fieldName],
        );
      } catch (error) {
        errors[fieldName] =
          error instanceof Error
            ? error.message
            : `Invalid ${fieldName} value.`;
      }
    });

    return {
      parsedFields,
      errors,
      valid: Object.keys(errors).length === 0,
    };
  }

  function createExpression(parsedFields) {
    return [
      parsedFields.minute.expression,
      parsedFields.hour.expression,
      parsedFields.day.expression,
      parsedFields.month.expression,
      parsedFields.weekday.expression,
    ].join(" ");
  }

  function setResultAvailability(enabled) {
    elements.copyButton.disabled = !enabled;
    elements.downloadButton.disabled = !enabled;
  }

  function renderValidationState(message, valid) {
    elements.validationStatus.textContent = message;
    elements.validationStatus.className = `message ${
      valid ? "message-success" : "message-error"
    }`;

    elements.status.textContent = valid ? "Valid" : "Invalid";
  }

  function clearResult() {
    elements.output.value = "";
    elements.fieldCount.textContent = "0";
    elements.format.textContent = "—";
    elements.status.textContent = "—";

    elements.description.textContent =
      "The schedule description will appear here.";

    elements.nextRun.textContent = "—";

    setResultAvailability(false);
  }

  function setInvalidResult(errors) {
    clearResult();

    Object.entries(errors).forEach(([fieldName, message]) => {
      showFieldError(fieldName, message);
    });

    const errorCount = Object.keys(errors).length;

    renderValidationState(
      errorCount === 1
        ? "The expression contains one invalid field."
        : `The expression contains ${errorCount} invalid fields.`,
      false,
    );
  }

  function sortedValues(values) {
    return [...values].sort((first, second) => first - second);
  }

  function padNumber(value) {
    return String(value).padStart(2, "0");
  }

  function formatTime(hour, minute) {
    return `${padNumber(hour)}:${padNumber(minute)}`;
  }

  function joinNaturalLanguage(items) {
    if (items.length === 0) {
      return "";
    }

    if (items.length === 1) {
      return items[0];
    }

    if (items.length === 2) {
      return `${items[0]} and ${items[1]}`;
    }

    return `${items.slice(0, -1).join(", ")}, ` + `and ${items.at(-1)}`;
  }

  function describeTime(parsedFields) {
    const minutes = sortedValues(parsedFields.minute.values);

    const hours = sortedValues(parsedFields.hour.values);

    if (parsedFields.minute.unrestricted && parsedFields.hour.unrestricted) {
      return "every minute";
    }

    if (minutes.length === 1 && parsedFields.hour.unrestricted) {
      return minutes[0] === 0
        ? "at the start of every hour"
        : `at minute ${minutes[0]} of every hour`;
    }

    if (minutes.length === 1 && hours.length === 1) {
      return `at ${formatTime(hours[0], minutes[0])}`;
    }

    if (minutes.length === 1 && hours.length <= 6) {
      return `at ${joinNaturalLanguage(
        hours.map((hour) => formatTime(hour, minutes[0])),
      )}`;
    }

    if (hours.length === 1 && parsedFields.minute.unrestricted) {
      return `every minute during the ` + `${padNumber(hours[0])}:00 hour`;
    }

    return (
      `when the minute field matches ` +
      `"${parsedFields.minute.expression}" ` +
      `and the hour field matches ` +
      `"${parsedFields.hour.expression}"`
    );
  }

  function describeDay(parsedFields) {
    const days = sortedValues(parsedFields.day.values);

    const weekdays = sortedValues(parsedFields.weekday.values);

    if (parsedFields.day.unrestricted && parsedFields.weekday.unrestricted) {
      return "every day";
    }

    if (parsedFields.day.unrestricted && !parsedFields.weekday.unrestricted) {
      return `on ${joinNaturalLanguage(
        weekdays.map((weekday) => WEEKDAY_NAMES[weekday]),
      )}`;
    }

    if (!parsedFields.day.unrestricted && parsedFields.weekday.unrestricted) {
      if (days.length === 1) {
        return `on day ${days[0]} ` + `of the month`;
      }

      if (days.length <= 8) {
        return `on days ${joinNaturalLanguage(days.map(String))} of the month`;
      }

      return (
        `when the day-of-month field ` +
        `matches "${parsedFields.day.expression}"`
      );
    }

    const dayDescription =
      days.length <= 8
        ? `days ${joinNaturalLanguage(days.map(String))} of the month`
        : `day-of-month field ` + `"${parsedFields.day.expression}"`;

    const weekdayDescription = joinNaturalLanguage(
      weekdays.map((weekday) => WEEKDAY_NAMES[weekday]),
    );

    return (
      `when either ${dayDescription} ` + `or ${weekdayDescription} matches`
    );
  }

  function describeMonth(parsedFields) {
    if (parsedFields.month.unrestricted) {
      return "throughout the year";
    }

    const months = sortedValues(parsedFields.month.values);

    if (months.length <= 6) {
      return `in ${joinNaturalLanguage(
        months.map((month) => MONTH_NAMES[month]),
      )}`;
    }

    return (
      `when the month field matches ` + `"${parsedFields.month.expression}"`
    );
  }

  function describeCommonExpression(expression) {
    const descriptions = {
      "* * * * *": "Runs every minute.",

      "*/5 * * * *": "Runs every 5 minutes.",

      "*/10 * * * *": "Runs every 10 minutes.",

      "*/15 * * * *": "Runs every 15 minutes.",

      "*/30 * * * *": "Runs every 30 minutes.",

      "0 * * * *": "Runs at the start of every hour.",

      "0 0 * * *": "Runs every day at 00:00.",

      "0 8 * * *": "Runs every day at 08:00.",

      "0 9 * * 1-5": "Runs Monday through Friday at 09:00.",

      "0 9 * * 0,6": "Runs every Saturday and Sunday at 09:00.",

      "0 0 * * 0": "Runs every Sunday at 00:00.",

      "0 0 1 * *": "Runs on the first day of every month at 00:00.",

      "0 0 1 1 *": "Runs every year on January 1 at 00:00.",

      "0 8 * * 1": "Runs every Monday at 08:00.",
    };

    return descriptions[expression] ?? null;
  }

  function describeExpression(expression, parsedFields) {
    const commonDescription = describeCommonExpression(expression);

    if (commonDescription) {
      return commonDescription;
    }

    return (
      `Runs ${describeTime(parsedFields)}, ` +
      `${describeDay(parsedFields)}, ` +
      `${describeMonth(parsedFields)}.`
    );
  }

  function fieldMatches(parsedField, value) {
    return parsedField.values.has(value);
  }

  function dayMatches(date, parsedFields) {
    const dayOfMonthMatches = fieldMatches(parsedFields.day, date.getDate());

    const weekdayMatches = fieldMatches(parsedFields.weekday, date.getDay());

    if (parsedFields.day.unrestricted && parsedFields.weekday.unrestricted) {
      return true;
    }

    if (parsedFields.day.unrestricted) {
      return weekdayMatches;
    }

    if (parsedFields.weekday.unrestricted) {
      return dayOfMonthMatches;
    }

    return dayOfMonthMatches || weekdayMatches;
  }

  function getNextExecution(parsedFields, startDate = new Date()) {
    const minutes = sortedValues(parsedFields.minute.values);

    const hours = sortedValues(parsedFields.hour.values);

    const searchStart = new Date(startDate);

    searchStart.setSeconds(0, 0);

    searchStart.setMinutes(searchStart.getMinutes() + 1);

    const finalDate = new Date(searchStart);

    finalDate.setFullYear(finalDate.getFullYear() + 12);

    const currentDay = new Date(searchStart);

    currentDay.setHours(0, 0, 0, 0);

    while (currentDay <= finalDate) {
      const monthMatches = fieldMatches(
        parsedFields.month,
        currentDay.getMonth() + 1,
      );

      if (monthMatches && dayMatches(currentDay, parsedFields)) {
        for (const hour of hours) {
          for (const minute of minutes) {
            const candidate = new Date(currentDay);

            candidate.setHours(hour, minute, 0, 0);

            if (candidate >= searchStart && candidate <= finalDate) {
              return candidate;
            }
          }
        }
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    return null;
  }

  function formatNextExecution(date) {
    if (!(date instanceof Date)) {
      return "No matching execution found " + "within the next 12 years.";
    }

    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }

  function generateCron({ announce = false } = {}) {
    clearAllFieldErrors();

    const result = parseExpression();

    if (!result.valid) {
      setInvalidResult(result.errors);

      if (announce) {
        showMessage("Please correct the invalid cron fields.", "error");
      }

      return false;
    }

    const expression = createExpression(result.parsedFields);

    const description = describeExpression(expression, result.parsedFields);

    const nextExecution = getNextExecution(result.parsedFields);

    elements.output.value = expression;

    elements.fieldCount.textContent = "5";

    elements.format.textContent = "5-field";

    elements.description.textContent = description;

    elements.nextRun.textContent = formatNextExecution(nextExecution);

    renderValidationState("Valid five-field cron expression.", true);

    setResultAvailability(true);

    if (announce) {
      elements.validationStatus.textContent = "Action completed successfully.";
      elements.validationStatus.className = "message message-success";

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else {
        showMessage("Action completed successfully.", "success");
      }
    }

    return true;
  }

  function applyValues(values) {
    elements.minute.value = values.minute;

    elements.hour.value = values.hour;

    elements.day.value = values.day;

    elements.month.value = values.month;

    elements.weekday.value = values.weekday;
  }

  function applyPreset() {
    const preset = presets[elements.preset.value];

    if (!preset) {
      return;
    }

    applyValues(preset);
    generateCron();
  }

  function selectMatchingPreset() {
    const currentValues = Object.fromEntries(
      Object.entries(fieldElements).map(([fieldName, field]) => [
        fieldName,
        normalizeInput(field.input.value),
      ]),
    );

    const match = Object.entries(presets).find(([presetName, values]) => {
      if (presetName === "custom" || !values) {
        return false;
      }

      return Object.keys(values).every(
        (fieldName) =>
          normalizeInput(values[fieldName]) === currentValues[fieldName],
      );
    });

    elements.preset.value = match?.[0] ?? "custom";
  }

  function scheduleGeneration() {
    window.clearTimeout(inputTimer);

    inputTimer = window.setTimeout(() => {
      selectMatchingPreset();
      generateCron();
    }, 250);
  }

  function resetGenerator() {
    window.clearTimeout(inputTimer);

    elements.preset.value = "custom";

    applyValues({
      minute: "0",
      hour: "0",
      day: "*",
      month: "*",
      weekday: "*",
    });

    clearAllFieldErrors();
    clearResult();

    elements.validationStatus.textContent =
      "Enter or select a schedule to generate an expression.";
    elements.validationStatus.className = "message message-info";

    elements.minute.focus();
  }

  async function copyExpression() {
    const expression = elements.output.value.trim();

    await xavertCopyText(expression);
  }

  function downloadExpression() {
    const expression = elements.output.value.trim();

    if (!expression) {
      showMessage("Nothing to download.", "error");

      return;
    }

    const content = [
      "XAVERT Cron Expression",
      "======================",
      "",
      `Expression: ${expression}`,
      `Description: ${elements.description.textContent}`,
      `Next execution: ${elements.nextRun.textContent}`,
      "",
      "Format:",
      "minute hour day-of-month month day-of-week",
      "",
      "Generated locally with XAVERT.",
    ].join("\n");

    downloadFile(
      "xavert-cron-expression.txt",
      content,
      "text/plain;charset=utf-8",
    );
  }

  elements.preset.addEventListener("change", applyPreset);

  Object.values(fieldElements).forEach(({ input }) => {
    input.addEventListener("input", scheduleGeneration);

    input.addEventListener("blur", () => {
      input.value = normalizeInput(input.value);

      selectMatchingPreset();
      generateCron();
    });
  });

  elements.generateButton.addEventListener("click", () => {
    generateCron({
      announce: true,
    });
  });

  elements.resetButton.addEventListener("click", resetGenerator);

  elements.copyButton.addEventListener("click", copyExpression);

  elements.downloadButton.addEventListener("click", downloadExpression);

  clearResult();

  elements.validationStatus.textContent =
    "Enter or select a schedule to generate an expression.";
  elements.validationStatus.className = "message message-info";
});
