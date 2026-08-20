"use strict";

function initUnitConverter() {
  const category = document.getElementById("category");
  const favoriteConversion = document.getElementById("favoriteConversion");
  const inputValue = document.getElementById("inputValue");
  const fromUnit = document.getElementById("fromUnit");
  const toUnit = document.getElementById("toUnit");

  const convertBtn = document.getElementById("convertBtn");
  const swapBtn = document.getElementById("swapBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  const message = document.getElementById("message");
  const resultBox = document.getElementById("resultBox");
  const resultSource = document.getElementById("resultSource");
  const resultTarget = document.getElementById("resultTarget");
  const historyList = document.getElementById("historyList");

  const required = [
    category,
    favoriteConversion,
    inputValue,
    fromUnit,
    toUnit,
    convertBtn,
    swapBtn,
    copyBtn,
    clearBtn,
    clearHistoryBtn,
    message,
    resultBox,
    resultSource,
    resultTarget,
    historyList,
  ];

  if (required.some((element) => !element)) {
    console.error("Unit Converter: HTML and JS do not match.");
    return;
  }

  const units = {
    length: {
      meter: 1,
      kilometer: 1000,
      centimeter: 0.01,
      millimeter: 0.001,
      mile: 1609.344,
      yard: 0.9144,
      foot: 0.3048,
      inch: 0.0254,
    },
    weight: {
      kilogram: 1,
      gram: 0.001,
      milligram: 0.000001,
      tonne: 1000,
      pound: 0.45359237,
      ounce: 0.0283495231,
    },
    area: {
      "square meter": 1,
      "square kilometer": 1000000,
      "square centimeter": 0.0001,
      "square millimeter": 0.000001,
      "square mile": 2589988.110336,
      "square yard": 0.83612736,
      "square foot": 0.09290304,
      acre: 4046.8564224,
      hectare: 10000,
    },
    volume: {
      liter: 1,
      milliliter: 0.001,
      "cubic meter": 1000,
      "cubic centimeter": 0.001,
      gallon: 3.785411784,
      quart: 0.946352946,
      pint: 0.473176473,
      cup: 0.2365882365,
      "fluid ounce": 0.0295735296,
    },
    speed: {
      "meter per second": 1,
      "kilometer per hour": 0.2777777778,
      "mile per hour": 0.44704,
      knot: 0.514444444,
      "foot per second": 0.3048,
    },
  };

  const temperatureUnits = ["celsius", "fahrenheit", "kelvin"];

  let lastResultText = "";
  let conversionHistory = [];

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

  function clearToolMessage() {
    clearPersistentMessage();
  }

  function formatUnitName(unit) {
    return unit
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function populateUnits() {
    fromUnit.replaceChildren();
    toUnit.replaceChildren();

    const list =
      category.value === "temperature"
        ? temperatureUnits
        : Object.keys(units[category.value] ?? {});

    list.forEach((unit) => {
      const fromOption = document.createElement("option");
      const toOption = document.createElement("option");

      fromOption.value = unit;
      fromOption.textContent = formatUnitName(unit);

      toOption.value = unit;
      toOption.textContent = formatUnitName(unit);

      fromUnit.append(fromOption);
      toUnit.append(toOption);
    });

    if (list.length > 1) {
      toUnit.value = list[1];
    }
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) {
      return "Invalid result";
    }

    const absolute = Math.abs(value);

    if (absolute !== 0 && (absolute >= 1e9 || absolute < 1e-6)) {
      return value.toExponential(6);
    }

    return Number(value.toFixed(8)).toString();
  }

  function convertTemperature(value, from, to) {
    if (from === to) {
      return value;
    }

    let celsius = value;

    if (from === "fahrenheit") {
      celsius = (value - 32) * (5 / 9);
    } else if (from === "kelvin") {
      celsius = value - 273.15;
    }

    if (to === "fahrenheit") {
      return (celsius * 9) / 5 + 32;
    }

    if (to === "kelvin") {
      return celsius + 273.15;
    }

    return celsius;
  }

  function validateTemperature(value, from) {
    if (from === "kelvin" && value < 0) {
      return "Kelvin cannot be below 0.";
    }

    if (from === "celsius" && value < -273.15) {
      return "Celsius cannot be below absolute zero.";
    }

    if (from === "fahrenheit" && value < -459.67) {
      return "Fahrenheit cannot be below absolute zero.";
    }

    return "";
  }

  function renderHistory() {
    historyList.replaceChildren();

    if (!conversionHistory.length) {
      const item = document.createElement("li");
      item.textContent = "No conversion history yet.";
      historyList.append(item);
      return;
    }

    conversionHistory.forEach((entry, index) => {
      const item = document.createElement("li");
      item.textContent = `${index + 1}. ${entry}`;
      historyList.append(item);
    });
  }

  function invalidateResult() {
    lastResultText = "";
    resultSource.textContent = "";
    resultTarget.textContent = "";
    resultBox.hidden = true;
    copyBtn.disabled = true;

    clearPersistentMessage();
  }

  function convertUnits() {
    const value = Number(inputValue.value);

    if (inputValue.value.trim() === "" || !Number.isFinite(value)) {
      invalidateResult();
      notify("Please enter a valid number.", "error");
      inputValue.focus();
      return;
    }

    const from = fromUnit.value;
    const to = toUnit.value;

    if (!from || !to) {
      invalidateResult();
      notify("Please select valid units.", "error");
      return;
    }

    if (category.value === "temperature") {
      const temperatureError = validateTemperature(value, from);

      if (temperatureError) {
        invalidateResult();
        notify(temperatureError, "error");
        return;
      }
    }

    let result;

    if (category.value === "temperature") {
      result = convertTemperature(value, from, to);
    } else {
      const categoryUnits = units[category.value];

      if (
        !categoryUnits ||
        !(from in categoryUnits) ||
        !(to in categoryUnits)
      ) {
        invalidateResult();
        notify("Invalid unit configuration.", "error");
        return;
      }

      const base = value * categoryUnits[from];
      result = base / categoryUnits[to];
    }

    const sourceText = `${formatNumber(value)} ${formatUnitName(from)}`;

    const targetText = `${formatNumber(result)} ${formatUnitName(to)}`;

    lastResultText = `${sourceText} → ${targetText}`;

    resultSource.textContent = sourceText;
    resultTarget.textContent = targetText;

    conversionHistory.unshift(lastResultText);
    conversionHistory = conversionHistory.slice(0, 15);

    renderHistory();

    resultBox.hidden = false;
    copyBtn.disabled = false;

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else {
      notify("Action completed successfully.", "success");
    }
  }

  function swapUnits() {
    const previousFrom = fromUnit.value;

    fromUnit.value = toUnit.value;
    toUnit.value = previousFrom;

    invalidateResult();

    if (typeof window.showMessage === "function") {
      window.showMessage("Units swapped.", "success");
    }
  }

  function applyFavoriteConversion() {
    if (!favoriteConversion.value) {
      return;
    }

    const [favoriteCategory, favoriteFrom, favoriteTo] =
      favoriteConversion.value.split("|");

    if (!favoriteCategory || !favoriteFrom || !favoriteTo) {
      return;
    }

    category.value = favoriteCategory;
    populateUnits();

    fromUnit.value = favoriteFrom;
    toUnit.value = favoriteTo;

    invalidateResult();

    if (typeof window.showMessage === "function") {
      window.showMessage("Favorite conversion loaded.", "success");
    }
  }

  async function copyResult() {
    if (!lastResultText) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(lastResultText);
  }

  function clearHistory() {
    conversionHistory = [];
    renderHistory();

    if (typeof window.showMessage === "function") {
      window.showMessage("History cleared.", "success");
    }
  }

  function clearConverter() {
    category.value = "length";
    favoriteConversion.value = "";
    inputValue.value = "";

    populateUnits();

    conversionHistory = [];
    lastResultText = "";

    resultSource.textContent = "";
    resultTarget.textContent = "";
    resultBox.hidden = true;

    copyBtn.disabled = true;

    renderHistory();
    clearToolMessage();

    inputValue.focus();
  }

  category.addEventListener("change", () => {
    favoriteConversion.value = "";
    populateUnits();
    invalidateResult();
  });

  favoriteConversion.addEventListener("change", applyFavoriteConversion);

  inputValue.addEventListener("input", invalidateResult);

  fromUnit.addEventListener("change", () => {
    favoriteConversion.value = "";
    invalidateResult();
  });

  toUnit.addEventListener("change", () => {
    favoriteConversion.value = "";
    invalidateResult();
  });

  convertBtn.addEventListener("click", convertUnits);

  swapBtn.addEventListener("click", swapUnits);

  copyBtn.addEventListener("click", () => {
    void copyResult();
  });

  clearBtn.addEventListener("click", clearConverter);

  clearHistoryBtn.addEventListener("click", clearHistory);

  copyBtn.disabled = true;

  populateUnits();
  renderHistory();
}

initUnitConverter();
