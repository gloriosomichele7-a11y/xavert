const toolSelector = document.getElementById("toolSelector");
const colorFormat = document.getElementById("colorFormat");
const colorInput = document.getElementById("colorInput");
const colorInputHint = document.getElementById("colorInputHint");

const foregroundColorInput =
  document.getElementById("foregroundColor");

const backgroundColorInput =
  document.getElementById("backgroundColor");

let converterHistory = [];
let generatorHistory = [];
let savedPalettes = [];
let currentPalette = [];

document.addEventListener("DOMContentLoaded", () => {
  const storedPalettes = localStorage.getItem("xavertColorPalettes");

  if (storedPalettes) {
    try {
      const parsedPalettes = JSON.parse(storedPalettes);

      if (Array.isArray(parsedPalettes)) {
        savedPalettes = parsedPalettes
          .filter(palette =>
            Array.isArray(palette) &&
            palette.length > 0 &&
            palette.every(color =>
              typeof color === "string" &&
              /^#[A-Fa-f0-9]{6}$/.test(color)
            )
          )
          .slice(0, 10)
          .map(palette =>
            palette.map(color => color.toUpperCase())
          );

        renderSavedPalettes();
      }
    } catch {
      savedPalettes = [];
      localStorage.removeItem("xavertColorPalettes");
    }
  }

  if (typeof loadRelatedTools === "function") {
    loadRelatedTools("color-toolkit");
  }
});

toolSelector.addEventListener("change", () => {
  document.querySelectorAll(".tool-section").forEach(section => {
    section.classList.remove("active");
  });

  const selectedTool =
    document.getElementById(`${toolSelector.value}Tool`);

  if (selectedTool) {
    selectedTool.classList.add("active");
  }
});

colorInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    convertColor();
  }
});

colorFormat.addEventListener("change", () => {
  const formatSettings = {
    hex: {
      placeholder: "#FF5733",
      hint: "Example: #FF5733"
    },
    rgb: {
      placeholder: "rgb(255, 87, 51)",
      hint: "Example: rgb(255, 87, 51)"
    },
    hsl: {
      placeholder: "hsl(11, 100%, 60%)",
      hint: "Example: hsl(11, 100%, 60%)"
    }
  };

  const settings = formatSettings[colorFormat.value];

  colorInput.value = "";
  colorInput.placeholder = settings.placeholder;
  colorInputHint.textContent = settings.hint;

  setMessage("converterMessage");

  const result = document.getElementById("converterResult");

  result.innerHTML = "";
  result.style.display = "none";

  document.getElementById(
    "converterPreview"
  ).style.background = "#ffffff";

  colorInput.focus();
});

foregroundColorInput.addEventListener(
  "input",
  checkContrast
);

backgroundColorInput.addEventListener(
  "input",
  checkContrast
);

document.addEventListener("keydown", event => {
  if (!(event.ctrlKey && event.key === "Enter")) {
    return;
  }

  event.preventDefault();

  const actions = {
    converter: convertColor,
    generator: generateRandomColor,
    contrast: checkContrast,
    palette: generatePalette
  };

  actions[toolSelector.value]?.();
});

function setMessage(id, text = "", type = "") {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent = text;
  element.className =
    type ? `message ${type}` : "message";
}

function copyText(text) {
  if (!text) {
    showMessage("Nothing to copy.", "error");
    return;
  }

  if (typeof xavertCopyText === "function") {
    xavertCopyText(text, "Copied.");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      showMessage("Copied.", "success");
    })
    .catch(() => {
      showMessage("Copy failed.", "error");
    });
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("'", "&#39;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function hexToRgb(hex) {
  let normalized = hex.replace("#", "");

  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map(character => character + character)
      .join("");
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map(value =>
      Math.round(value)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")
    .toUpperCase()}`;
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const difference = max - min;

    saturation =
      lightness > 0.5
        ? difference / (2 - max - min)
        : difference / (max + min);

    if (max === red) {
      hue =
        (green - blue) / difference +
        (green < blue ? 6 : 0);
    } else if (max === green) {
      hue =
        (blue - red) / difference + 2;
    } else {
      hue =
        (red - green) / difference + 4;
    }

    hue /= 6;
  }

  return {
    h: Math.round(hue * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100)
  };
}

function hslToHex(h, s, l) {
  const normalizedHue =
    ((h % 360) + 360) % 360;

  const saturation =
    Math.max(0, Math.min(100, s)) / 100;

  const lightness =
    Math.max(0, Math.min(100, l)) / 100;

  const chroma =
    (1 - Math.abs(2 * lightness - 1)) *
    saturation;

  const hueSection = normalizedHue / 60;

  const secondary =
    chroma *
    (1 - Math.abs((hueSection % 2) - 1));

  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection >= 0 && hueSection < 1) {
    red = chroma;
    green = secondary;
  } else if (hueSection < 2) {
    red = secondary;
    green = chroma;
  } else if (hueSection < 3) {
    green = chroma;
    blue = secondary;
  } else if (hueSection < 4) {
    green = secondary;
    blue = chroma;
  } else if (hueSection < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return rgbToHex(
    (red + match) * 255,
    (green + match) * 255,
    (blue + match) * 255
  );
}

function parseRgbInput(value) {
  const match = value.match(
    /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  );

  if (!match) {
    return null;
  }

  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);

  if (
    red > 255 ||
    green > 255 ||
    blue > 255
  ) {
    return null;
  }

  return {
    r: red,
    g: green,
    b: blue
  };
}

function parseHslInput(value) {
  const match = value.match(
    /^hsl\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i
  );

  if (!match) {
    return null;
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]);
  const lightness = Number(match[3]);

  if (
    saturation < 0 ||
    saturation > 100 ||
    lightness < 0 ||
    lightness > 100
  ) {
    return null;
  }

  return {
    h: ((hue % 360) + 360) % 360,
    s: saturation,
    l: lightness
  };
}

function updateColorHistory(hex, historyType) {
  const history =
    historyType === "generator"
      ? generatorHistory
      : converterHistory;

  history.unshift(hex);

  const uniqueHistory =
    [...new Set(history)].slice(0, 15);

  if (historyType === "generator") {
    generatorHistory = uniqueHistory;
  } else {
    converterHistory = uniqueHistory;
  }

  const colors = uniqueHistory
    .map((color, index) => {
      const safeColor = escapeAttribute(color);

      return `
        <div style="
          display:flex;
          align-items:center;
          gap:8px;
          margin-top:10px;
        ">
          <span>${index + 1}.</span>

          <span
            aria-hidden="true"
            style="
              display:inline-block;
              width:18px;
              height:18px;
              background:${safeColor};
              border:1px solid #d1d5db;
              border-radius:4px;
            ">
          </span>

          <span>${safeColor}</span>

          <button
            class="btn small-button"
            type="button"
            onclick="copyText('${safeColor}')">
            Copy
          </button>
        </div>
      `;
    })
    .join("");

  return `
    <div style="margin-top:20px;">
      <strong>Color History</strong>

      ${colors}

      <button
        class="btn small-button"
        type="button"
        onclick="clearColorHistory('${historyType}')">
        Clear History
      </button>
    </div>
  `;
}

function clearColorHistory(historyType) {
  if (historyType === "generator") {
    generatorHistory = [];
  } else {
    converterHistory = [];
  }

  const activeResult = document.querySelector(
    ".tool-section.active .result-box"
  );

  if (!activeResult) {
    return;
  }

  const history = activeResult.querySelector(
    "[data-color-history]"
  );

  if (history) {
    history.remove();
  }

  showMessage(
    "Color history cleared.",
    "success"
  );
}

function convertColor() {
  const inputValue = colorInput.value.trim();
  const selectedFormat = colorFormat.value;

  if (!inputValue) {
    setMessage(
      "converterMessage",
      "Please enter a color value.",
      "error"
    );

    showMessage(
      "Please enter a color value.",
      "error"
    );

    return;
  }

  let rgb = null;
  let normalizedHex = "";

  if (selectedFormat === "hex") {
    let hex = inputValue;

    if (!hex.startsWith("#")) {
      hex = `#${hex}`;
    }

    if (
      !/^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(
        hex
      )
    ) {
      setMessage(
        "converterMessage",
        "Invalid HEX color.",
        "error"
      );

      showMessage(
        "Invalid HEX color.",
        "error"
      );

      return;
    }

    rgb = hexToRgb(hex);

    normalizedHex = rgbToHex(
      rgb.r,
      rgb.g,
      rgb.b
    );
  }

  if (selectedFormat === "rgb") {
    rgb = parseRgbInput(inputValue);

    if (!rgb) {
      setMessage(
        "converterMessage",
        "Invalid RGB color. Use rgb(255, 87, 51).",
        "error"
      );

      showMessage(
        "Invalid RGB color.",
        "error"
      );

      return;
    }

    normalizedHex = rgbToHex(
      rgb.r,
      rgb.g,
      rgb.b
    );
  }

  if (selectedFormat === "hsl") {
    const parsedHsl =
      parseHslInput(inputValue);

    if (!parsedHsl) {
      setMessage(
        "converterMessage",
        "Invalid HSL color. Use hsl(11, 100%, 60%).",
        "error"
      );

      showMessage(
        "Invalid HSL color.",
        "error"
      );

      return;
    }

    normalizedHex = hslToHex(
      parsedHsl.h,
      parsedHsl.s,
      parsedHsl.l
    );

    rgb = hexToRgb(normalizedHex);
  }

  const hsl = rgbToHsl(
    rgb.r,
    rgb.g,
    rgb.b
  );

  const rgbText =
    `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  const hslText =
    `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const result =
    document.getElementById("converterResult");

  const preview =
    document.getElementById("converterPreview");

  preview.style.background = normalizedHex;
  result.style.display = "block";

  result.innerHTML = `
    HEX: <strong>${normalizedHex}</strong><br>
    RGB: <strong>${rgbText}</strong><br>
    HSL: <strong>${hslText}</strong>

    <div class="button-group">
      <button
        class="btn small-button"
        type="button"
        onclick="copyText('${normalizedHex}')">
        Copy HEX
      </button>

      <button
        class="btn small-button"
        type="button"
        onclick="copyText('${rgbText}')">
        Copy RGB
      </button>

      <button
        class="btn small-button"
        type="button"
        onclick="copyText('${hslText}')">
        Copy HSL
      </button>
    </div>

    <div data-color-history>
      ${updateColorHistory(
        normalizedHex,
        "converter"
      )}
    </div>
  `;

  setMessage(
    "converterMessage",
    "Conversion completed.",
    "success"
  );

  showMessage(
    "Color converted.",
    "success"
  );
}

function generateRandomColor() {
  const red =
    Math.floor(Math.random() * 256);

  const green =
    Math.floor(Math.random() * 256);

  const blue =
    Math.floor(Math.random() * 256);

  const hex = rgbToHex(
    red,
    green,
    blue
  );

  const hsl = rgbToHsl(
    red,
    green,
    blue
  );

  const rgbText =
    `rgb(${red}, ${green}, ${blue})`;

  const hslText =
    `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const result =
    document.getElementById("generatorResult");

  const preview =
    document.getElementById("generatorPreview");

  preview.style.background = hex;
  result.style.display = "block";

  result.innerHTML = `
    HEX: <strong>${hex}</strong><br>
    RGB: <strong>${rgbText}</strong><br>
    HSL: <strong>${hslText}</strong>

    <div class="button-group">
      <button
        class="btn small-button"
        type="button"
        onclick="copyText('${hex}')">
        Copy HEX
      </button>

      <button
        class="btn small-button"
        type="button"
        onclick="copyText('${rgbText}')">
        Copy RGB
      </button>

      <button
        class="btn small-button"
        type="button"
        onclick="copyText('${hslText}')">
        Copy HSL
      </button>
    </div>

    <div data-color-history>
      ${updateColorHistory(
        hex,
        "generator"
      )}
    </div>
  `;

  setMessage(
    "generatorMessage",
    "Color generated successfully.",
    "success"
  );

  showMessage(
    "Color generated.",
    "success"
  );
}

function generatePalette() {
  const base =
    document.getElementById("paletteColor").value;

  const rgb = hexToRgb(base);

  const hsl = rgbToHsl(
    rgb.r,
    rgb.g,
    rgb.b
  );

  currentPalette = [
    base.toUpperCase(),

    hslToHex(
      hsl.h - 30,
      hsl.s,
      hsl.l
    ),

    hslToHex(
      hsl.h + 30,
      hsl.s,
      hsl.l
    ),

    hslToHex(
      hsl.h + 180,
      hsl.s,
      hsl.l
    ),

    hslToHex(
      hsl.h,
      Math.max(hsl.s - 10, 0),
      Math.min(hsl.l + 25, 90)
    )
  ];

  const result =
    document.getElementById("paletteResult");

  result.style.display = "block";

  const paletteItems = currentPalette
    .map(color => `
      <div style="
        margin:10px 0;
        padding:12px;
        border:1px solid #d1d5db;
        border-radius:10px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      ">
        <div
          aria-hidden="true"
          style="
            width:40px;
            height:40px;
            flex-shrink:0;
            border-radius:8px;
            background:${color};
            border:1px solid #d1d5db;
          ">
        </div>

        <strong>${color}</strong>

        <button
          class="btn small-button"
          type="button"
          onclick="copyText('${color}')">
          Copy
        </button>
      </div>
    `)
    .join("");

  result.innerHTML = `
    ${paletteItems}

    <div class="button-group">
      <button
        class="btn"
        type="button"
        onclick="savePalette(currentPalette)">
        Save Palette
      </button>

      <button
        class="btn"
        type="button"
        onclick="downloadPalette()">
        Download Palette
      </button>
    </div>
  `;

  setMessage(
    "paletteMessage",
    "Palette generated successfully.",
    "success"
  );

  showMessage(
    "Palette generated.",
    "success"
  );
}

function savePalette(palette) {
  if (
    !Array.isArray(palette) ||
    palette.length === 0
  ) {
    showMessage(
      "Generate a palette first.",
      "error"
    );

    return;
  }

  const normalizedPalette = palette.map(color =>
    String(color).toUpperCase()
  );

  const paletteAlreadySaved =
    savedPalettes.some(savedPalette =>
      Array.isArray(savedPalette) &&
      savedPalette.length ===
        normalizedPalette.length &&
      savedPalette.every(
        (color, index) =>
          String(color).toUpperCase() ===
          normalizedPalette[index]
      )
    );

  if (paletteAlreadySaved) {
    setMessage(
      "paletteMessage",
      "This palette is already saved.",
      "error"
    );

    showMessage(
      "Palette already saved.",
      "error"
    );

    return;
  }

  savedPalettes.unshift(normalizedPalette);

  savedPalettes =
    savedPalettes.slice(0, 10);

  localStorage.setItem(
    "xavertColorPalettes",
    JSON.stringify(savedPalettes)
  );

  renderSavedPalettes();

  setMessage(
    "paletteMessage",
    "Palette saved successfully.",
    "success"
  );

  showMessage(
    "Palette saved.",
    "success"
  );
}

function deleteSavedPalette(index) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= savedPalettes.length
  ) {
    return;
  }

  savedPalettes.splice(index, 1);

  localStorage.setItem(
    "xavertColorPalettes",
    JSON.stringify(savedPalettes)
  );

  renderSavedPalettes();

  setMessage(
    "paletteMessage",
    "Saved palette deleted.",
    "success"
  );

  showMessage(
    "Palette deleted.",
    "success"
  );
}

function renderSavedPalettes() {
  const container =
    document.getElementById("savedPalettes");

  if (savedPalettes.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  container.innerHTML = `
    <strong>Saved Palettes</strong>

    ${savedPalettes
      .map((palette, index) => `
        <div style="
          margin-top:15px;
          padding:10px;
          border:1px solid #d1d5db;
          border-radius:10px;
        ">
          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
          ">
            <strong>
              Palette ${index + 1}
            </strong>

            <button
              class="btn small-button"
              type="button"
              onclick="deleteSavedPalette(${index})">
              Delete
            </button>
          </div>

          <div
            class="button-group"
            aria-label="
              Colors in saved palette ${index + 1}
            ">

            ${palette
              .map(color => `
                <button
                  type="button"
                  title="Copy ${color}"
                  aria-label="Copy color ${color}"
                  onclick="copyText('${color}')"
                  style="
                    width:36px;
                    height:36px;
                    padding:0;
                    margin:0;
                    background:${color};
                    border:1px solid #d1d5db;
                    border-radius:6px;
                    cursor:pointer;
                  ">
                </button>
              `)
              .join("")}

          </div>
        </div>
      `)
      .join("")}
  `;
}

function downloadPalette() {
  if (currentPalette.length === 0) {
    showMessage(
      "Generate a palette first.",
      "error"
    );

    return;
  }

  const blob = new Blob(
    [currentPalette.join("\n")],
    {
      type: "text/plain;charset=utf-8"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "xavert-color-palette.txt";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

  showMessage(
    "Palette downloaded.",
    "success"
  );
}

function luminance(r, g, b) {
  const values = [r, g, b].map(value => {
    const normalized = value / 255;

    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow(
          (normalized + 0.055) / 1.055,
          2.4
        );
  });

  return (
    0.2126 * values[0] +
    0.7152 * values[1] +
    0.0722 * values[2]
  );
}

function swapContrastColors() {
  const previousForeground =
    foregroundColorInput.value;

  foregroundColorInput.value =
    backgroundColorInput.value;

  backgroundColorInput.value =
    previousForeground;

  checkContrast();
}

function checkContrast() {
  const foreground =
    foregroundColorInput.value;

  const background =
    backgroundColorInput.value;

  const foregroundRgb =
    hexToRgb(foreground);

  const backgroundRgb =
    hexToRgb(background);

  const foregroundLuminance =
    luminance(
      foregroundRgb.r,
      foregroundRgb.g,
      foregroundRgb.b
    );

  const backgroundLuminance =
    luminance(
      backgroundRgb.r,
      backgroundRgb.g,
      backgroundRgb.b
    );

  const ratio =
    (
      Math.max(
        foregroundLuminance,
        backgroundLuminance
      ) + 0.05
    ) /
    (
      Math.min(
        foregroundLuminance,
        backgroundLuminance
      ) + 0.05
    );

  const normalAA = ratio >= 4.5;
  const normalAAA = ratio >= 7;
  const largeAA = ratio >= 3;
  const largeAAA = ratio >= 4.5;

  const formatStatus = passed =>
    passed ? "Pass ✓" : "Fail ✕";

  const preview =
    document.getElementById(
      "contrastPreview"
    );

  const result =
    document.getElementById(
      "contrastResult"
    );

  preview.style.display = "block";
  preview.style.color = foreground;
  preview.style.background = background;
  preview.textContent =
    "Sample Text Preview";

  result.style.display = "block";

  result.innerHTML = `
    Contrast Ratio:
    <strong>${ratio.toFixed(2)}:1</strong>

    <div style="
      margin-top:14px;
      line-height:1.8;
    ">
      Normal text — WCAG AA:
      <strong>
        ${formatStatus(normalAA)}
      </strong><br>

      Normal text — WCAG AAA:
      <strong>
        ${formatStatus(normalAAA)}
      </strong><br>

      Large text — WCAG AA:
      <strong>
        ${formatStatus(largeAA)}
      </strong><br>

      Large text — WCAG AAA:
      <strong>
        ${formatStatus(largeAAA)}
      </strong>
    </div>
  `;

  setMessage(
    "contrastMessage",
    normalAA
      ? "The selected colors meet WCAG AA for normal text."
      : "The selected colors do not meet WCAG AA for normal text.",
    normalAA ? "success" : "error"
  );

  showMessage(
    "Contrast analysis completed.",
    "success"
  );
}

function clearCurrentTool() {
  const activeTool =
    toolSelector.value;

  if (activeTool === "converter") {
    colorInput.value = "";
    converterHistory = [];

    setMessage("converterMessage");

    const result =
      document.getElementById(
        "converterResult"
      );

    result.innerHTML = "";
    result.style.display = "none";

    document.getElementById(
      "converterPreview"
    ).style.background = "#ffffff";

    colorInput.focus();
  }

  if (activeTool === "generator") {
    generatorHistory = [];

    setMessage("generatorMessage");

    const result =
      document.getElementById(
        "generatorResult"
      );

    result.innerHTML = "";
    result.style.display = "none";

    document.getElementById(
      "generatorPreview"
    ).style.background = "#ffffff";
  }

  if (activeTool === "contrast") {
    foregroundColorInput.value =
      "#000000";

    backgroundColorInput.value =
      "#ffffff";

    setMessage("contrastMessage");

    const result =
      document.getElementById(
        "contrastResult"
      );

    result.innerHTML = "";
    result.style.display = "none";

    const preview =
      document.getElementById(
        "contrastPreview"
      );

    preview.style.display = "none";
    preview.style.color = "";
    preview.style.background = "";
  }

  if (activeTool === "palette") {
    document.getElementById(
      "paletteColor"
    ).value = "#FF5733";

    currentPalette = [];

    setMessage("paletteMessage");

    const result =
      document.getElementById(
        "paletteResult"
      );

    result.innerHTML = "";
    result.style.display = "none";
  }

  showMessage(
    "Cleared.",
    "success"
  );
}
