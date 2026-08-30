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
      meter: { factor: 1, label: "Meter (m)" },
      kilometer: { factor: 1000, label: "Kilometer (km)" },
      centimeter: { factor: 0.01, label: "Centimeter (cm)" },
      millimeter: { factor: 0.001, label: "Millimeter (mm)" },
      micrometer: { factor: 0.000001, label: "Micrometer (µm)" },
      nanometer: { factor: 0.000000001, label: "Nanometer (nm)" },
      mile: { factor: 1609.344, label: "Mile (mi)" },
      yard: { factor: 0.9144, label: "Yard (yd)" },
      foot: { factor: 0.3048, label: "Foot (ft)" },
      inch: { factor: 0.0254, label: "Inch (in)" },
      "nautical mile": { factor: 1852, label: "Nautical Mile (nmi)" },
    },
    weight: {
      kilogram: { factor: 1, label: "Kilogram (kg)" },
      gram: { factor: 0.001, label: "Gram (g)" },
      milligram: { factor: 0.000001, label: "Milligram (mg)" },
      microgram: { factor: 0.000000001, label: "Microgram (µg)" },
      tonne: { factor: 1000, label: "Metric Tonne (t)" },
      pound: { factor: 0.45359237, label: "Pound (lb)" },
      ounce: { factor: 0.028349523125, label: "Ounce (oz)" },
      stone: { factor: 6.35029318, label: "Stone (st)" },
      "short ton": { factor: 907.18474, label: "US Short Ton" },
      "long ton": { factor: 1016.0469088, label: "Imperial Long Ton" },
      carat: { factor: 0.0002, label: "Carat (ct)" },
    },
    area: {
      "square meter": { factor: 1, label: "Square Meter (m²)" },
      "square kilometer": { factor: 1000000, label: "Square Kilometer (km²)" },
      "square centimeter": { factor: 0.0001, label: "Square Centimeter (cm²)" },
      "square millimeter": { factor: 0.000001, label: "Square Millimeter (mm²)" },
      "square mile": { factor: 2589988.110336, label: "Square Mile (mi²)" },
      "square yard": { factor: 0.83612736, label: "Square Yard (yd²)" },
      "square foot": { factor: 0.09290304, label: "Square Foot (ft²)" },
      "square inch": { factor: 0.00064516, label: "Square Inch (in²)" },
      acre: { factor: 4046.8564224, label: "Acre" },
      hectare: { factor: 10000, label: "Hectare (ha)" },
    },
    volume: {
      liter: { factor: 1, label: "Liter (L)" },
      milliliter: { factor: 0.001, label: "Milliliter (mL)" },
      "cubic meter": { factor: 1000, label: "Cubic Meter (m³)" },
      "cubic centimeter": { factor: 0.001, label: "Cubic Centimeter (cm³)" },
      "cubic inch": { factor: 0.016387064, label: "Cubic Inch (in³)" },
      "cubic foot": { factor: 28.316846592, label: "Cubic Foot (ft³)" },
      gallon: { factor: 3.785411784, label: "US Gallon (gal)" },
      "imperial gallon": { factor: 4.54609, label: "Imperial Gallon" },
      quart: { factor: 0.946352946, label: "US Quart (qt)" },
      pint: { factor: 0.473176473, label: "US Pint (pt)" },
      cup: { factor: 0.2365882365, label: "US Cup" },
      "fluid ounce": { factor: 0.0295735295625, label: "US Fluid Ounce (fl oz)" },
      tablespoon: { factor: 0.01478676478125, label: "US Tablespoon (tbsp)" },
      teaspoon: { factor: 0.00492892159375, label: "US Teaspoon (tsp)" },
    },
    speed: {
      "meter per second": { factor: 1, label: "Meter per Second (m/s)" },
      "kilometer per hour": { factor: 0.2777777777777778, label: "Kilometer per Hour (km/h)" },
      "mile per hour": { factor: 0.44704, label: "Mile per Hour (mph)" },
      knot: { factor: 0.5144444444444445, label: "Knot (kn)" },
      "foot per second": { factor: 0.3048, label: "Foot per Second (ft/s)" },
      "kilometer per second": { factor: 1000, label: "Kilometer per Second (km/s)" },
    },
    pressure: {
      pascal: { factor: 1, label: "Pascal (Pa)" },
      kilopascal: { factor: 1000, label: "Kilopascal (kPa)" },
      megapascal: { factor: 1000000, label: "Megapascal (MPa)" },
      bar: { factor: 100000, label: "Bar" },
      millibar: { factor: 100, label: "Millibar (mbar)" },
      atmosphere: { factor: 101325, label: "Standard Atmosphere (atm)" },
      psi: { factor: 6894.757293168, label: "Pound per Square Inch (psi)" },
      torr: { factor: 133.32236842105263, label: "Torr" },
      mmhg: { factor: 133.322387415, label: "Millimeter of Mercury (mmHg)" },
    },
    energy: {
      joule: { factor: 1, label: "Joule (J)" },
      kilojoule: { factor: 1000, label: "Kilojoule (kJ)" },
      megajoule: { factor: 1000000, label: "Megajoule (MJ)" },
      calorie: { factor: 4.184, label: "Calorie (cal)" },
      kilocalorie: { factor: 4184, label: "Kilocalorie (kcal)" },
      "watt hour": { factor: 3600, label: "Watt-hour (Wh)" },
      "kilowatt hour": { factor: 3600000, label: "Kilowatt-hour (kWh)" },
      btu: { factor: 1055.05585262, label: "British Thermal Unit (BTU)" },
      electronvolt: { factor: 1.602176634e-19, label: "Electronvolt (eV)" },
    },
    power: {
      watt: { factor: 1, label: "Watt (W)" },
      kilowatt: { factor: 1000, label: "Kilowatt (kW)" },
      megawatt: { factor: 1000000, label: "Megawatt (MW)" },
      horsepower: { factor: 745.6998715822702, label: "Mechanical Horsepower (hp)" },
      "metric horsepower": { factor: 735.49875, label: "Metric Horsepower (PS)" },
      "btu per hour": { factor: 0.2930710701722222, label: "BTU per Hour (BTU/h)" },
    },
    "data-storage": {
      bit: { factor: 0.125, label: "Bit (bit)" },
      byte: { factor: 1, label: "Byte (B)" },
      kilobit: { factor: 125, label: "Kilobit (kb)" },
      megabit: { factor: 125000, label: "Megabit (Mb)" },
      gigabit: { factor: 125000000, label: "Gigabit (Gb)" },
      terabit: { factor: 125000000000, label: "Terabit (Tb)" },
      kilobyte: { factor: 1000, label: "Kilobyte (KB)" },
      megabyte: { factor: 1000000, label: "Megabyte (MB)" },
      gigabyte: { factor: 1000000000, label: "Gigabyte (GB)" },
      terabyte: { factor: 1000000000000, label: "Terabyte (TB)" },
      kibibyte: { factor: 1024, label: "Kibibyte (KiB)" },
      mebibyte: { factor: 1048576, label: "Mebibyte (MiB)" },
      gibibyte: { factor: 1073741824, label: "Gibibyte (GiB)" },
      tebibyte: { factor: 1099511627776, label: "Tebibyte (TiB)" },
    },
    angle: {
      degree: { factor: 1, label: "Degree (°)" },
      radian: { factor: 180 / Math.PI, label: "Radian (rad)" },
      gradian: { factor: 0.9, label: "Gradian (gon)" },
      turn: { factor: 360, label: "Turn" },
      arcminute: { factor: 1 / 60, label: "Arcminute (′)" },
      arcsecond: { factor: 1 / 3600, label: "Arcsecond (″)" },
    },
    frequency: {
      hertz: { factor: 1, label: "Hertz (Hz)" },
      kilohertz: { factor: 1000, label: "Kilohertz (kHz)" },
      megahertz: { factor: 1000000, label: "Megahertz (MHz)" },
      gigahertz: { factor: 1000000000, label: "Gigahertz (GHz)" },
      rpm: { factor: 1 / 60, label: "Revolutions per Minute (RPM)" },
      bpm: { factor: 1 / 60, label: "Beats per Minute (BPM)" },
    },
    force: {
      newton: { factor: 1, label: "Newton (N)" },
      kilonewton: { factor: 1000, label: "Kilonewton (kN)" },
      dyne: { factor: 0.00001, label: "Dyne (dyn)" },
      "pound-force": { factor: 4.4482216152605, label: "Pound-force (lbf)" },
      "kilogram-force": { factor: 9.80665, label: "Kilogram-force (kgf)" },
    },
  };

  const temperatureUnits = {
    celsius: { label: "Celsius (°C)" },
    fahrenheit: { label: "Fahrenheit (°F)" },
    kelvin: { label: "Kelvin (K)" },
  };

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

  function getUnitDefinition(categoryName, unit) {
    if (categoryName === "temperature") {
      return temperatureUnits[unit] ?? null;
    }

    return units[categoryName]?.[unit] ?? null;
  }

  function getUnitLabel(categoryName, unit) {
    return getUnitDefinition(categoryName, unit)?.label ?? formatUnitName(unit);
  }

  function populateUnits() {
    fromUnit.replaceChildren();
    toUnit.replaceChildren();

    const definitions =
      category.value === "temperature"
        ? temperatureUnits
        : units[category.value] ?? {};

    const list = Object.keys(definitions);

    list.forEach((unit) => {
      const fromOption = document.createElement("option");
      const toOption = document.createElement("option");
      const label = getUnitLabel(category.value, unit);

      fromOption.value = unit;
      fromOption.textContent = label;

      toOption.value = unit;
      toOption.textContent = label;

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

    if (Object.is(value, -0)) {
      return "0";
    }

    const absolute = Math.abs(value);

    if (absolute !== 0 && (absolute >= 1e12 || absolute < 1e-8)) {
      return value.toExponential(8);
    }

    return Number(value.toPrecision(12)).toString();
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
      const fromDefinition = categoryUnits?.[from];
      const toDefinition = categoryUnits?.[to];

      if (!fromDefinition || !toDefinition) {
        invalidateResult();
        notify("Invalid unit configuration.", "error");
        return;
      }

      const base = value * fromDefinition.factor;
      result = base / toDefinition.factor;
    }

    const sourceText = `${formatNumber(value)} ${getUnitLabel(category.value, from)}`;

    const targetText = `${formatNumber(result)} ${getUnitLabel(category.value, to)}`;

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
