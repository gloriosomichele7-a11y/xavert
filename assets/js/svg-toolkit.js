"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const elements = {
    dropZone: $("dropZone"),
    svgFileInput: $("svgFileInput"),
    fileInfo: $("fileInfo"),
    pasteBtn: $("pasteBtn"),
    sampleBtn: $("sampleBtn"),
    sourceInput: $("sourceInput"),
    sourceCount: $("sourceCount"),
    optimizationLevel: $("optimizationLevel"),
    precisionSelect: $("precisionSelect"),
    previewBackground: $("previewBackground"),
    sanitizeCheck: $("sanitizeCheck"),
    preserveAccessibilityCheck: $("preserveAccessibilityCheck"),
    preserveIdsCheck: $("preserveIdsCheck"),
    removeMetadataCheck: $("removeMetadataCheck"),
    removeCommentsCheck: $("removeCommentsCheck"),
    blockExternalCheck: $("blockExternalCheck"),
    processBtn: $("processBtn"),
    clearBtn: $("clearBtn"),
    message: $("message"),
    resultSection: $("resultSection"),
    originalSizeStat: $("originalSizeStat"),
    outputSizeStat: $("outputSizeStat"),
    savingsStat: $("savingsStat"),
    elementsStat: $("elementsStat"),
    pathsStat: $("pathsStat"),
    colorsStat: $("colorsStat"),
    previewFrame: $("previewFrame"),
    previewImage: $("previewImage"),
    previewEmpty: $("previewEmpty"),
    zoomRange: $("zoomRange"),
    zoomValue: $("zoomValue"),
    analysisList: $("analysisList"),
    removedUnsafeStat: $("removedUnsafeStat"),
    externalRefsStat: $("externalRefsStat"),
    warningsStat: $("warningsStat"),
    warningList: $("warningList"),
    colorGrid: $("colorGrid"),
    outputText: $("outputText"),
    outputCount: $("outputCount"),
    copySvgBtn: $("copySvgBtn"),
    downloadSvgBtn: $("downloadSvgBtn"),
    copyDataUriBtn: $("copyDataUriBtn"),
    replaceSourceBtn: $("replaceSourceBtn"),
    pngWidth: $("pngWidth"),
    pngHeight: $("pngHeight"),
    pngBackground: $("pngBackground"),
    customBackgroundWrap: $("customBackgroundWrap"),
    customBackground: $("customBackground"),
    lockAspectCheck: $("lockAspectCheck"),
    downloadPngBtn: $("downloadPngBtn"),
    pngNote: $("pngNote"),
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error("SVG Toolkit initialization failed:", missing);
    return;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";
  const SVGO_URL =
    "https://cdn.jsdelivr.net/npm/svgo@4.1.0/dist/svgo.browser.js";

  const state = {
    fileName: "graphic.svg",
    processedSvg: "",
    sanitizedSvg: "",
    sourceBytes: 0,
    outputBytes: 0,
    stats: null,
    colors: [],
    warnings: [],
    removedUnsafe: 0,
    blockedExternal: 0,
    previewUrl: "",
    aspectRatio: 1,
    intrinsicWidth: 512,
    intrinsicHeight: 512,
    svgoPromise: null,
    svgoStatus: "idle",
    operationToken: 0,
    syncingDimensions: false,
  };

  const prohibitedTags = new Set([
    "script",
    "foreignobject",
    "iframe",
    "object",
    "embed",
    "audio",
    "video",
  ]);

  const metadataTags = new Set(["metadata"]);
  const colorAttributes = new Set([
    "fill",
    "stroke",
    "color",
    "stop-color",
    "flood-color",
    "lighting-color",
  ]);
  const structuralPaintValues = new Set([
    "none",
    "currentcolor",
    "inherit",
    "transparent",
    "context-fill",
    "context-stroke",
  ]);

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

  function showSampleSuccess(text) {
    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess(text);
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

  function utf8Size(text) {
    return new TextEncoder().encode(String(text || "")).byteLength;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB"];
    const power = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** power;

    return `${value >= 10 || power === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[power]}`;
  }

  function escapeXmlText(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function parseLength(value) {
    if (value == null || value === "") {
      return null;
    }

    const match = String(value).trim().match(
      /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:px)?$/i,
    );

    if (!match) {
      return null;
    }

    const number = Number(match[1]);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function parseViewBox(value) {
    if (!value) {
      return null;
    }

    const numbers = String(value)
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (
      numbers.length !== 4 ||
      numbers.some((number) => !Number.isFinite(number)) ||
      numbers[2] <= 0 ||
      numbers[3] <= 0
    ) {
      return null;
    }

    return {
      minX: numbers[0],
      minY: numbers[1],
      width: numbers[2],
      height: numbers[3],
    };
  }

  function parseSvgDocument(svgText) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(svgText, "image/svg+xml");
    const parserError = documentNode.querySelector("parsererror");

    if (parserError) {
      throw new Error("The SVG contains invalid XML markup.");
    }

    const root = documentNode.documentElement;

    if (
      !root ||
      root.localName.toLowerCase() !== "svg" ||
      root.namespaceURI !== SVG_NS
    ) {
      throw new Error("The source must contain a valid <svg> root element.");
    }

    return documentNode;
  }

  function stripXmlDeclaration(text) {
    return String(text || "").replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, "");
  }

  function countPotentialUnsafe(source) {
    const tagMatches =
      source.match(
        /<(?:script|foreignObject|iframe|object|embed|audio|video)\b/gi,
      ) || [];
    const eventMatches = source.match(/\son[a-z0-9_-]+\s*=/gi) || [];
    const jsMatches =
      source.match(
        /(?:href|xlink:href|src)\s*=\s*["']?\s*javascript:/gi,
      ) || [];

    return tagMatches.length + eventMatches.length + jsMatches.length;
  }

  function isSafeRasterDataUri(value) {
    return /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(
      String(value || "").trim(),
    );
  }

  function isFragmentReference(value) {
    return /^#[A-Za-z_][\w:.-]*$/.test(String(value || "").trim());
  }

  function isUnsafeUrl(value) {
    const url = String(value || "").trim();

    if (!url) {
      return false;
    }

    if (isFragmentReference(url) || isSafeRasterDataUri(url)) {
      return false;
    }

    if (
      /^data:/i.test(url) ||
      /^javascript:/i.test(url) ||
      /^vbscript:/i.test(url) ||
      /^https?:/i.test(url) ||
      /^\/\//.test(url) ||
      /^file:/i.test(url) ||
      /^ftp:/i.test(url) ||
      /^blob:/i.test(url)
    ) {
      return true;
    }

    // Relative paths can still trigger browser network requests.
    return !url.startsWith("#");
  }

  function sanitizeCssValue(value, report) {
    let text = String(value || "");

    if (
      /(?:javascript\s*:|vbscript\s*:|expression\s*\(|-moz-binding)/i.test(
        text,
      )
    ) {
      report.blockedExternal += 1;
      return "";
    }

    text = text.replace(
      /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
      (full, quote, target) => {
        const trimmed = String(target || "").trim();

        if (isFragmentReference(trimmed) || isSafeRasterDataUri(trimmed)) {
          return `url(${quote || ""}${trimmed}${quote || ""})`;
        }

        report.blockedExternal += 1;
        return "none";
      },
    );

    return text;
  }

  function postHardenSvg(svgText, settings, initialUnsafeCount = 0) {
    const documentNode = parseSvgDocument(svgText);
    const root = documentNode.documentElement;
    const report = {
      removedUnsafe: initialUnsafeCount,
      blockedExternal: 0,
    };

    root.setAttribute("xmlns", SVG_NS);

    if (root.querySelector("[xlink\\:href]")) {
      root.setAttribute("xmlns:xlink", XLINK_NS);
    }

    Array.from(root.querySelectorAll("*")).forEach((node) => {
      const tag = node.localName.toLowerCase();

      if (prohibitedTags.has(tag)) {
        node.remove();
        report.removedUnsafe += 1;
        return;
      }

      if (settings.removeMetadata && metadataTags.has(tag)) {
        node.remove();
        return;
      }

      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;

        if (name.startsWith("on")) {
          node.removeAttribute(attribute.name);
          report.removedUnsafe += 1;
          return;
        }

        if (
          name === "href" ||
          name === "xlink:href" ||
          name === "src"
        ) {
          if (isUnsafeUrl(value)) {
            node.removeAttribute(attribute.name);
            report.blockedExternal += 1;
          }
          return;
        }

        if (name === "style") {
          const cleaned = sanitizeCssValue(value, report);

          if (cleaned.trim()) {
            node.setAttribute(attribute.name, cleaned);
          } else {
            node.removeAttribute(attribute.name);
          }
        }
      });

      if (tag === "style") {
        const sourceCss = node.textContent || "";
        let cleanedCss = sourceCss.replace(/@import[^;]+;?/gi, () => {
          report.blockedExternal += 1;
          return "";
        });
        cleanedCss = sanitizeCssValue(cleanedCss, report);
        node.textContent = cleanedCss;
      }
    });

    if (!settings.preserveAccessibility) {
      root.querySelectorAll("title, desc").forEach((node) => node.remove());
    }

    if (settings.removeComments) {
      const walker = documentNode.createTreeWalker(
        root,
        NodeFilter.SHOW_COMMENT,
      );
      const comments = [];
      let current;

      while ((current = walker.nextNode())) {
        comments.push(current);
      }

      comments.forEach((comment) => comment.remove());
    }

    return {
      svg: new XMLSerializer().serializeToString(root),
      report,
    };
  }

  function sanitizeSvg(rawSvg, settings) {
    if (
      !window.DOMPurify ||
      typeof window.DOMPurify.sanitize !== "function"
    ) {
      throw new Error(
        "The SVG sanitizer could not be loaded. Check your connection and reload the page.",
      );
    }

    const rawUnsafeCount = countPotentialUnsafe(rawSvg);

    if (Array.isArray(window.DOMPurify.removed)) {
      window.DOMPurify.removed.length = 0;
    }

    const clean = window.DOMPurify.sanitize(stripXmlDeclaration(rawSvg), {
      USE_PROFILES: { svg: true, svgFilters: true },
      NAMESPACE: SVG_NS,
      SAFE_FOR_XML: true,
      ALLOW_DATA_ATTR: true,
      FORBID_TAGS: [
        "script",
        "foreignObject",
        "iframe",
        "object",
        "embed",
        "audio",
        "video",
      ],
      RETURN_TRUSTED_TYPE: false,
    });

    const purifyRemoved = Array.isArray(window.DOMPurify.removed)
      ? window.DOMPurify.removed.length
      : 0;

    const hardened = postHardenSvg(
      String(clean),
      settings,
      Math.max(rawUnsafeCount, purifyRemoved),
    );

    return hardened;
  }

  function basicMinify(svgText, settings) {
    let output = String(svgText || "");

    if (settings.removeComments) {
      output = output.replace(/<!--[\s\S]*?-->/g, "");
    }

    // Only collapse whitespace that exists purely between XML tags.
    // Never collapse arbitrary whitespace inside text nodes or attribute values.
    return output.replace(/>\s+</g, "><").trim();
  }

  function getSvgoPlugins(settings) {
    const precision = Number(settings.precision) || 3;

    const overrides = {
      cleanupIds: settings.preserveIds ? false : undefined,
      removeComments: settings.removeComments ? undefined : false,
      removeMetadata: settings.removeMetadata ? undefined : false,
      removeEditorsNSData: settings.removeMetadata ? undefined : false,
      removeDesc: settings.preserveAccessibility ? false : undefined,
      cleanupNumericValues: { floatPrecision: precision },
      convertPathData:
        settings.level === "safe"
          ? false
          : { floatPrecision: precision },
    };

    if (settings.level === "safe") {
      Object.assign(overrides, {
        removeUnknownsAndDefaults: false,
        removeHiddenElems: false,
        removeUselessStrokeAndFill: false,
        convertShapeToPath: false,
        convertTransform: false,
        collapseGroups: false,
        moveElemsAttrsToGroup: false,
        moveGroupAttrsToElems: false,
        mergePaths: false,
      });
    }

    const plugins = [
      {
        name: "preset-default",
        params: { overrides },
      },
    ];

    if (settings.level !== "safe") {
      plugins.push("sortAttrs");
    }

    if (settings.level === "maximum") {
      plugins.push("convertStyleToAttrs", "reusePaths");
    }

    return plugins;
  }

  async function loadSvgo() {
    if (state.svgoStatus === "failed") {
      return null;
    }

    if (!state.svgoPromise) {
      state.svgoStatus = "loading";
      state.svgoPromise = import(SVGO_URL)
        .then((module) => {
          if (typeof module.optimize !== "function") {
            throw new Error("SVGO optimize() is unavailable.");
          }

          state.svgoStatus = "ready";
          return module;
        })
        .catch((error) => {
          console.warn("SVGO browser module unavailable:", error);
          state.svgoStatus = "failed";
          return null;
        });
    }

    return state.svgoPromise;
  }

  async function optimizeSvg(svgText, settings) {
    const svgo = await loadSvgo();

    if (!svgo) {
      return {
        svg: basicMinify(svgText, settings),
        engine: "Built-in safe minifier",
        fallback: true,
      };
    }

    try {
      const result = svgo.optimize(svgText, {
        multipass: settings.level !== "safe",
        plugins: getSvgoPlugins(settings),
        js2svg: {
          pretty: false,
          indent: 2,
        },
      });

      return {
        svg: String(result.data || svgText),
        engine: "SVGO 4.1.0",
        fallback: false,
      };
    } catch (error) {
      console.warn("SVGO optimization failed; using fallback:", error);

      return {
        svg: basicMinify(svgText, settings),
        engine: "Built-in safe minifier",
        fallback: true,
      };
    }
  }

  function getSettings() {
    return {
      level: elements.optimizationLevel.value,
      precision: Number(elements.precisionSelect.value) || 3,
      preserveAccessibility: elements.preserveAccessibilityCheck.checked,
      preserveIds: elements.preserveIdsCheck.checked,
      removeMetadata: elements.removeMetadataCheck.checked,
      removeComments: elements.removeCommentsCheck.checked,
    };
  }

  function countElementsByName(root, name) {
    return root.querySelectorAll(name).length;
  }

  function hasExternalReference(root) {
    let count = 0;

    root.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();

        if (
          name === "href" ||
          name === "xlink:href" ||
          name === "src"
        ) {
          if (isUnsafeUrl(attribute.value)) {
            count += 1;
          }
        }

        if (
          name === "style" &&
          /url\(\s*['"]?(?!#|data:image\/(?:png|jpe?g|gif|webp|avif);base64,)/i.test(
            attribute.value,
          )
        ) {
          count += 1;
        }
      });
    });

    return count;
  }

  function analyzeStructure(svgText) {
    const documentNode = parseSvgDocument(svgText);
    const root = documentNode.documentElement;
    const all = Array.from(root.querySelectorAll("*"));
    const viewBox = parseViewBox(root.getAttribute("viewBox"));
    const width = parseLength(root.getAttribute("width"));
    const height = parseLength(root.getAttribute("height"));
    const effectiveWidth = width || viewBox?.width || 512;
    const effectiveHeight = height || viewBox?.height || 512;

    const stats = {
      elements: all.length + 1,
      paths: countElementsByName(root, "path"),
      groups: countElementsByName(root, "g"),
      text: countElementsByName(root, "text"),
      gradients:
        countElementsByName(root, "linearGradient") +
        countElementsByName(root, "radialGradient"),
      filters: countElementsByName(root, "filter"),
      masks: countElementsByName(root, "mask"),
      clipPaths: countElementsByName(root, "clipPath"),
      symbols: countElementsByName(root, "symbol"),
      images: countElementsByName(root, "image"),
      uses: countElementsByName(root, "use"),
      ids: root.querySelectorAll("[id]").length,
      viewBox,
      width,
      height,
      externalRefs: hasExternalReference(root),
      hasTitle: Boolean(root.querySelector(":scope > title")),
      hasDesc: Boolean(root.querySelector(":scope > desc")),
    };

    state.aspectRatio =
      effectiveHeight > 0 ? effectiveWidth / effectiveHeight : 1;
    state.intrinsicWidth = effectiveWidth;
    state.intrinsicHeight = effectiveHeight;

    return stats;
  }

  function extractPaintValuesFromCss(text) {
    const values = [];
    const regex =
      /(?:^|[;{])\s*(fill|stroke|color|stop-color|flood-color|lighting-color)\s*:\s*([^;}]+)/gi;
    let match;

    while ((match = regex.exec(String(text || "")))) {
      values.push(match[2].trim());
    }

    return values;
  }

  function normalizeColorCandidate(value) {
    const text = String(value || "").trim();

    if (
      !text ||
      structuralPaintValues.has(text.toLowerCase()) ||
      /^url\(/i.test(text) ||
      /^var\(/i.test(text)
    ) {
      return null;
    }

    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = text;

    if (!probe.style.color) {
      return null;
    }

    return {
      key: probe.style.color.toLowerCase(),
      display: text,
    };
  }

  function extractColors(svgText) {
    const documentNode = parseSvgDocument(svgText);
    const root = documentNode.documentElement;
    const counts = new Map();

    function add(value) {
      const normalized = normalizeColorCandidate(value);

      if (!normalized) {
        return;
      }

      const current = counts.get(normalized.key);

      if (current) {
        current.count += 1;
      } else {
        counts.set(normalized.key, {
          key: normalized.key,
          display: normalized.display,
          count: 1,
        });
      }
    }

    [root, ...root.querySelectorAll("*")].forEach((node) => {
      colorAttributes.forEach((attribute) => {
        if (node.hasAttribute?.(attribute)) {
          add(node.getAttribute(attribute));
        }
      });

      if (node.hasAttribute?.("style")) {
        extractPaintValuesFromCss(node.getAttribute("style")).forEach(add);
      }

      if (node.localName?.toLowerCase() === "style") {
        extractPaintValuesFromCss(node.textContent).forEach(add);
      }
    });

    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.display.localeCompare(b.display),
    );
  }

  function buildWarnings(stats, optimization) {
    const warnings = [];

    if (!stats.viewBox) {
      warnings.push(
        "No valid viewBox was found. Responsive scaling and PNG sizing may be less predictable.",
      );
    }

    if (!stats.hasTitle) {
      warnings.push(
        "The SVG has no direct <title> element for an accessible graphic name.",
      );
    }

    if (!stats.hasDesc) {
      warnings.push(
        "The SVG has no direct <desc> element for a longer accessible description.",
      );
    }

    if (stats.images > 0) {
      warnings.push(
        `The SVG contains ${stats.images} image element${stats.images === 1 ? "" : "s"}. Embedded raster images can increase file size.`,
      );
    }

    if (stats.filters > 0) {
      warnings.push(
        `The SVG uses ${stats.filters} filter${stats.filters === 1 ? "" : "s"}. Complex filters can render differently across browsers or at very large PNG sizes.`,
      );
    }

    if (optimization.fallback) {
      warnings.push(
        "SVGO could not be loaded, so only the built-in conservative minifier was applied.",
      );
    }

    return warnings;
  }

  function renderAnalysis(stats, engine) {
    const entries = [
      ["Optimizer", engine],
      [
        "Dimensions",
        stats.width && stats.height
          ? `${stats.width} × ${stats.height}`
          : `${state.intrinsicWidth} × ${state.intrinsicHeight} derived`,
      ],
      [
        "viewBox",
        stats.viewBox
          ? `${stats.viewBox.minX} ${stats.viewBox.minY} ${stats.viewBox.width} ${stats.viewBox.height}`
          : "Not found",
      ],
      ["Groups", stats.groups],
      ["Gradients", stats.gradients],
      ["Filters", stats.filters],
      ["Masks / Clip Paths", `${stats.masks} / ${stats.clipPaths}`],
      ["Symbols / Uses", `${stats.symbols} / ${stats.uses}`],
      ["Text Elements", stats.text],
      ["Images", stats.images],
      ["IDs", stats.ids],
      [
        "Accessibility",
        `${stats.hasTitle ? "Title" : "No title"} · ${stats.hasDesc ? "Description" : "No description"}`,
      ],
    ];

    elements.analysisList.replaceChildren();

    entries.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "svg-analysis-item";

      const labelNode = document.createElement("span");
      labelNode.className = "svg-analysis-label";
      labelNode.textContent = label;

      const valueNode = document.createElement("span");
      valueNode.className = "svg-analysis-value";
      valueNode.textContent = String(value);

      row.append(labelNode, valueNode);
      elements.analysisList.appendChild(row);
    });
  }

  function renderWarnings(warnings) {
    elements.warningList.replaceChildren();
    elements.warningsStat.textContent =
      new Intl.NumberFormat("en-US").format(warnings.length);

    warnings.forEach((warning) => {
      const item = document.createElement("div");
      item.className = "svg-warning-item";
      item.textContent = warning;
      elements.warningList.appendChild(item);
    });
  }

  function renderColors(colors) {
    elements.colorGrid.replaceChildren();

    if (!colors.length) {
      const empty = document.createElement("p");
      empty.className = "svg-note";
      empty.textContent =
        "No direct CSS color values were detected. The SVG may use gradients, currentColor, variables or inherited paint.";
      elements.colorGrid.appendChild(empty);
      return;
    }

    colors.forEach((color) => {
      const item = document.createElement("div");
      item.className = "svg-color-item";

      const swatch = document.createElement("div");
      swatch.className = "svg-color-swatch";

      const fill = document.createElement("div");
      fill.className = "svg-color-fill";
      fill.style.backgroundColor = color.display;
      swatch.appendChild(fill);

      const info = document.createElement("div");
      info.className = "svg-color-info";

      const value = document.createElement("button");
      value.type = "button";
      value.className = "svg-color-value";
      value.style.border = "0";
      value.style.padding = "0";
      value.style.background = "transparent";
      value.style.cursor = "pointer";
      value.textContent = color.display;
      value.title = `Copy ${color.display}`;
      value.addEventListener("click", () => {
        void copyText(color.display, "Color copied.");
      });

      const count = document.createElement("span");
      count.className = "svg-color-count";
      count.textContent =
        `${color.count} occurrence${color.count === 1 ? "" : "s"}`;

      info.append(value, count);
      item.append(swatch, info);
      elements.colorGrid.appendChild(item);
    });
  }

  function revokePreview() {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = "";
    }

    elements.previewImage.removeAttribute("src");
  }

  async function renderPreview(svgText) {
    revokePreview();

    const blob = new Blob([svgText], {
      type: "image/svg+xml;charset=utf-8",
    });
    state.previewUrl = URL.createObjectURL(blob);

    await new Promise((resolve, reject) => {
      elements.previewImage.onload = resolve;
      elements.previewImage.onerror = () =>
        reject(new Error("The processed SVG could not be rendered."));
      elements.previewImage.src = state.previewUrl;
    });

    elements.previewImage.hidden = false;
    elements.previewEmpty.hidden = true;
    applyZoom();
  }

  function applyPreviewBackground() {
    elements.previewFrame.classList.remove(
      "svg-preview-checker",
      "svg-preview-light",
      "svg-preview-dark",
    );
    elements.previewFrame.classList.add(
      `svg-preview-${elements.previewBackground.value}`,
    );
  }

  function applyZoom() {
    const zoom = Number(elements.zoomRange.value) || 100;
    elements.zoomValue.value = `${zoom}%`;
    elements.previewImage.style.width = `${zoom}%`;
    elements.previewImage.style.maxWidth = zoom <= 100 ? "100%" : "none";
  }

  function updateSourceCount() {
    elements.sourceCount.textContent = formatBytes(
      utf8Size(elements.sourceInput.value),
    );
  }

  function updatePngDimensionsFromStats() {
    const width = Math.max(1, Math.round(state.intrinsicWidth || 512));
    const height = Math.max(1, Math.round(state.intrinsicHeight || 512));

    state.syncingDimensions = true;
    elements.pngWidth.value = String(Math.min(12000, width));
    elements.pngHeight.value = String(Math.min(12000, height));
    state.syncingDimensions = false;

    elements.pngNote.textContent =
      `PNG base size: ${width} × ${height}px. Maximum export dimension is 12,000px per side.`;
  }

  async function processSvg() {
    const rawSvg = elements.sourceInput.value.trim();

    if (!rawSvg) {
      notify("Load or paste SVG markup before processing.", "error");
      return;
    }

    if (utf8Size(rawSvg) > 8 * 1024 * 1024) {
      notify(
        "SVG source is limited to 8 MB for safer browser processing.",
        "error",
      );
      return;
    }

    const token = ++state.operationToken;
    elements.processBtn.disabled = true;
    clearSuccessFeedback();

    try {
      parseSvgDocument(rawSvg);

      const settings = getSettings();
      const sanitized = sanitizeSvg(rawSvg, settings);

      if (token !== state.operationToken) {
        return;
      }

      // Always reparse after sanitization before optimization.
      parseSvgDocument(sanitized.svg);

      const optimization = await optimizeSvg(sanitized.svg, settings);

      if (token !== state.operationToken) {
        return;
      }

      // Optimizer output is sanitized again because post-processing a sanitized
      // document must never be trusted blindly.
      const finalSanitized = sanitizeSvg(optimization.svg, settings);
      const finalSvg = finalSanitized.svg;
      const stats = analyzeStructure(finalSvg);
      const colors = extractColors(finalSvg);
      const warnings = buildWarnings(stats, optimization);

      state.sanitizedSvg = sanitized.svg;
      state.processedSvg = finalSvg;
      state.sourceBytes = utf8Size(rawSvg);
      state.outputBytes = utf8Size(finalSvg);
      state.stats = stats;
      state.colors = colors;
      state.warnings = warnings;
      state.removedUnsafe =
        sanitized.report.removedUnsafe + finalSanitized.report.removedUnsafe;
      state.blockedExternal =
        sanitized.report.blockedExternal + finalSanitized.report.blockedExternal;

      elements.outputText.value = finalSvg;
      elements.outputCount.textContent = formatBytes(state.outputBytes);
      elements.originalSizeStat.textContent = formatBytes(state.sourceBytes);
      elements.outputSizeStat.textContent = formatBytes(state.outputBytes);

      const change =
        state.sourceBytes > 0
          ? ((state.sourceBytes - state.outputBytes) / state.sourceBytes) * 100
          : 0;

      elements.savingsStat.textContent =
        `${change >= 0 ? "" : "+"}${Math.abs(change).toFixed(1)}%` +
        (change >= 0 ? " smaller" : " larger");

      elements.elementsStat.textContent =
        new Intl.NumberFormat("en-US").format(stats.elements);
      elements.pathsStat.textContent =
        new Intl.NumberFormat("en-US").format(stats.paths);
      elements.colorsStat.textContent =
        new Intl.NumberFormat("en-US").format(colors.length);

      elements.removedUnsafeStat.textContent =
        new Intl.NumberFormat("en-US").format(state.removedUnsafe);
      elements.externalRefsStat.textContent =
        new Intl.NumberFormat("en-US").format(state.blockedExternal);

      renderAnalysis(stats, optimization.engine);
      renderWarnings(warnings);
      renderColors(colors);
      updatePngDimensionsFromStats();
      applyPreviewBackground();
      await renderPreview(finalSvg);

      elements.resultSection.hidden = false;
      elements.processBtn.disabled = false;

      showActionSuccess(
        optimization.fallback
          ? "SVG processed safely. SVGO was unavailable, so conservative optimization was used."
          : "SVG sanitized and optimized successfully.",
      );

      elements.resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      console.error("SVG processing failed:", error);

      if (token === state.operationToken) {
        elements.processBtn.disabled = false;
        notify(
          error instanceof Error && error.message
            ? error.message
            : "The SVG could not be processed.",
          "error",
        );
      }
    }
  }

  async function readSvgFile(file) {
    if (!file) {
      return;
    }

    const validType =
      file.type === "image/svg+xml" || /\.svg$/i.test(file.name || "");

    if (!validType) {
      notify("Select an SVG file.", "error");
      elements.svgFileInput.value = "";
      return;
    }

    if (file.size <= 0) {
      notify("The selected SVG file is empty.", "error");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notify("SVG files are limited to 8 MB.", "error");
      return;
    }

    try {
      const text = await file.text();
      parseSvgDocument(text);

      state.fileName = file.name || "graphic.svg";
      elements.sourceInput.value = text;
      elements.fileInfo.textContent =
        `${state.fileName} · ${formatBytes(file.size)}`;
      invalidateResult();
      updateSourceCount();
      setInlineMessage("SVG loaded. Review settings and process it.", "info");
    } catch (error) {
      console.error("SVG file read failed:", error);
      notify(
        error instanceof Error ? error.message : "The SVG file could not be read.",
        "error",
      );
    }
  }

  async function pasteSvg() {
    if (!navigator.clipboard?.readText) {
      notify(
        "Clipboard reading is unavailable. Paste SVG markup directly into the source editor.",
        "info",
      );
      return;
    }

    try {
      const text = await navigator.clipboard.readText();

      if (!text.trim()) {
        notify("The clipboard does not contain text.", "error");
        return;
      }

      parseSvgDocument(text);
      state.fileName = "clipboard.svg";
      elements.sourceInput.value = text;
      elements.fileInfo.textContent = "SVG loaded from clipboard.";
      invalidateResult();
      updateSourceCount();
      showActionSuccess("SVG pasted from clipboard.");
    } catch (error) {
      console.warn("SVG clipboard read failed:", error);
      notify(
        "Clipboard SVG could not be read. Paste it directly into the source editor.",
        "error",
      );
    }
  }

  function loadSample() {
    const sample = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <title>XAVERT SVG Toolkit Sample</title>
  <desc>Sample vector artwork with gradients, shapes, text and reusable symbols.</desc>
  <defs>
    <linearGradient id="sampleGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#dc2626"/>
      <stop offset="1" stop-color="#7f1d1d"/>
    </linearGradient>
    <symbol id="spark" viewBox="0 0 24 24">
      <path fill="#ffffff" d="M12 1l2.5 7.5L22 11l-7.5 2.5L12 21l-2.5-7.5L2 11l7.5-2.5z"/>
    </symbol>
  </defs>
  <rect width="640" height="360" rx="30" fill="#f8fafc"/>
  <circle cx="180" cy="180" r="110" fill="url(#sampleGradient)"/>
  <use href="#spark" x="130" y="130" width="100" height="100"/>
  <g fill="#111827">
    <text x="330" y="155" font-family="Arial, sans-serif" font-size="42" font-weight="700">SVG Toolkit</text>
    <text x="330" y="205" font-family="Arial, sans-serif" font-size="22">Sanitize · Optimize · Export</text>
  </g>
  <path d="M330 235h220" stroke="#dc2626" stroke-width="8" stroke-linecap="round"/>
</svg>`;

    state.fileName = "xavert-svg-sample.svg";
    elements.sourceInput.value = sample;
    elements.fileInfo.textContent = "Built-in SVG sample loaded.";
    invalidateResult();
    updateSourceCount();
    showSampleSuccess("Sample SVG loaded.");
  }

  function invalidateResult() {
    state.operationToken += 1;
    state.processedSvg = "";
    state.sanitizedSvg = "";
    state.stats = null;
    state.colors = [];
    state.warnings = [];
    state.sourceBytes = 0;
    state.outputBytes = 0;
    elements.resultSection.hidden = true;
    elements.outputText.value = "";
    revokePreview();
    clearSuccessFeedback();
  }

  async function copyText(text, successMessage) {
    if (!text) {
      notify("There is nothing to copy.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showCopySuccess(successMessage);
    } catch {
      notify("Clipboard access failed.", "error");
    }
  }

  function safeBaseName() {
    return (
      (state.fileName || "graphic.svg")
        .replace(/\.svg$/i, "")
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "graphic"
    );
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

  function downloadSvg() {
    if (!state.processedSvg) {
      notify("Process an SVG first.", "error");
      return;
    }

    downloadBlob(
      new Blob([state.processedSvg], {
        type: "image/svg+xml;charset=utf-8",
      }),
      `${safeBaseName()}-optimized.svg`,
    );
    showDownloadSuccess("SVG download started.");
  }

  function svgDataUri(svgText) {
    return (
      "data:image/svg+xml," +
      encodeURIComponent(svgText)
        .replace(/%0A/g, "")
        .replace(/%20/g, " ")
        .replace(/%3D/g, "=")
        .replace(/%3A/g, ":")
        .replace(/%2F/g, "/")
    );
  }

  function replaceSource() {
    if (!state.processedSvg) {
      return;
    }

    elements.sourceInput.value = state.processedSvg;
    state.fileName = `${safeBaseName()}-optimized.svg`;
    updateSourceCount();
    invalidateResult();
    showActionSuccess("Processed SVG moved into the source editor.");
  }

  function syncPngDimension(changed) {
    if (
      state.syncingDimensions ||
      !elements.lockAspectCheck.checked ||
      !Number.isFinite(state.aspectRatio) ||
      state.aspectRatio <= 0
    ) {
      return;
    }

    state.syncingDimensions = true;

    if (changed === "width") {
      const width = Math.max(1, Number(elements.pngWidth.value) || 1);
      elements.pngHeight.value = String(
        Math.max(1, Math.min(12000, Math.round(width / state.aspectRatio))),
      );
    } else {
      const height = Math.max(1, Number(elements.pngHeight.value) || 1);
      elements.pngWidth.value = String(
        Math.max(1, Math.min(12000, Math.round(height * state.aspectRatio))),
      );
    }

    state.syncingDimensions = false;
  }

  async function svgToPngBlob(svgText, width, height, background) {
    const safeWidth = Math.max(1, Math.min(12000, Math.round(width)));
    const safeHeight = Math.max(1, Math.min(12000, Math.round(height)));
    const pixels = safeWidth * safeHeight;

    if (pixels > 45_000_000) {
      throw new Error(
        "PNG export is limited to 45 megapixels to reduce browser memory failures.",
      );
    }

    const blob = new Blob([svgText], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    try {
      const image = new Image();
      image.decoding = "async";

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () =>
          reject(new Error("The SVG could not be rendered for PNG export."));
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = safeWidth;
      canvas.height = safeHeight;
      const context = canvas.getContext("2d", { alpha: background === null });

      if (!context) {
        throw new Error("Canvas export is unavailable.");
      }

      if (background !== null) {
        context.fillStyle = background;
        context.fillRect(0, 0, safeWidth, safeHeight);
      }

      context.drawImage(image, 0, 0, safeWidth, safeHeight);

      const pngBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );

      if (!pngBlob) {
        throw new Error("PNG encoding failed.");
      }

      return pngBlob;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function downloadPng() {
    if (!state.processedSvg) {
      notify("Process an SVG first.", "error");
      return;
    }

    const width = Number(elements.pngWidth.value);
    const height = Number(elements.pngHeight.value);

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 1 ||
      height < 1 ||
      width > 12000 ||
      height > 12000
    ) {
      notify("Enter valid PNG dimensions between 1 and 12,000 pixels.", "error");
      return;
    }

    let background = null;

    if (elements.pngBackground.value === "white") {
      background = "#ffffff";
    } else if (elements.pngBackground.value === "custom") {
      background = elements.customBackground.value || "#ffffff";
    }

    elements.downloadPngBtn.disabled = true;

    try {
      const blob = await svgToPngBlob(
        state.processedSvg,
        width,
        height,
        background,
      );
      downloadBlob(blob, `${safeBaseName()}-${Math.round(width)}x${Math.round(height)}.png`);
      showDownloadSuccess("PNG download started.");
    } catch (error) {
      console.error("PNG export failed:", error);
      notify(
        error instanceof Error ? error.message : "PNG export failed.",
        "error",
      );
    } finally {
      elements.downloadPngBtn.disabled = false;
    }
  }

  function clearTool() {
    state.operationToken += 1;
    state.fileName = "graphic.svg";
    state.processedSvg = "";
    state.sanitizedSvg = "";
    state.sourceBytes = 0;
    state.outputBytes = 0;
    state.stats = null;
    state.colors = [];
    state.warnings = [];
    state.removedUnsafe = 0;
    state.blockedExternal = 0;
    state.aspectRatio = 1;
    state.intrinsicWidth = 512;
    state.intrinsicHeight = 512;

    elements.svgFileInput.value = "";
    elements.fileInfo.textContent = "No SVG file selected.";
    elements.sourceInput.value = "";
    elements.sourceCount.textContent = "0 B";
    elements.resultSection.hidden = true;
    elements.outputText.value = "";
    elements.outputCount.textContent = "0 B";
    elements.zoomRange.value = "100";
    elements.zoomValue.value = "100%";
    elements.pngWidth.value = "";
    elements.pngHeight.value = "";
    elements.pngBackground.value = "transparent";
    elements.customBackgroundWrap.hidden = true;
    setInlineMessage("", "info");
    revokePreview();
    elements.previewImage.hidden = true;
    elements.previewEmpty.hidden = false;
    elements.dropZone.focus();
  }

  elements.svgFileInput.addEventListener("change", () => {
    const file = elements.svgFileInput.files?.[0];

    if (file) {
      void readSvgFile(file);
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
      void readSvgFile(file);
    }
  });

  elements.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.svgFileInput.click();
    }
  });

  elements.pasteBtn.addEventListener("click", pasteSvg);
  elements.sampleBtn.addEventListener("click", loadSample);
  elements.processBtn.addEventListener("click", processSvg);
  elements.clearBtn.addEventListener("click", clearTool);

  elements.sourceInput.addEventListener("input", () => {
    updateSourceCount();
    invalidateResult();
  });

  [
    elements.optimizationLevel,
    elements.precisionSelect,
    elements.preserveAccessibilityCheck,
    elements.preserveIdsCheck,
    elements.removeMetadataCheck,
    elements.removeCommentsCheck,
  ].forEach((control) => {
    control.addEventListener("change", () => {
      if (state.processedSvg) {
        invalidateResult();
      }
    });
  });

  elements.previewBackground.addEventListener(
    "change",
    applyPreviewBackground,
  );

  elements.zoomRange.addEventListener("input", applyZoom);

  elements.copySvgBtn.addEventListener("click", () => {
    void copyText(state.processedSvg, "SVG copied.");
  });

  elements.downloadSvgBtn.addEventListener("click", downloadSvg);

  elements.copyDataUriBtn.addEventListener("click", () => {
    if (!state.processedSvg) {
      notify("Process an SVG first.", "error");
      return;
    }

    void copyText(svgDataUri(state.processedSvg), "SVG data URI copied.");
  });

  elements.replaceSourceBtn.addEventListener("click", replaceSource);

  elements.pngWidth.addEventListener("input", () => {
    syncPngDimension("width");
  });

  elements.pngHeight.addEventListener("input", () => {
    syncPngDimension("height");
  });

  elements.pngBackground.addEventListener("change", () => {
    elements.customBackgroundWrap.hidden =
      elements.pngBackground.value !== "custom";
  });

  elements.downloadPngBtn.addEventListener("click", () => {
    void downloadPng();
  });

  window.addEventListener(
    "pagehide",
    () => {
      revokePreview();
    },
    { once: true },
  );

  applyPreviewBackground();
  updateSourceCount();
});
