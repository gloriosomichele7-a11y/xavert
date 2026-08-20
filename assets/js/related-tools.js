// =====================================
// XAVERT Related Tools
// =====================================

"use strict";

(() => {
  const TOOL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  // ---------------------------
  // Known Tool Metadata
  // ---------------------------

  const TOOL_CATALOG = Object.freeze({
    "qr-generator": Object.freeze({
      title: "QR Generator",
      description: "Create customizable QR codes directly in your browser.",
    }),

    "barcode-generator": Object.freeze({
      title: "Barcode Generator",
      description: "Generate downloadable barcodes directly in your browser.",
    }),

    "pdf-toolkit": Object.freeze({
      title: "PDF Toolkit",
      description:
        "Work with PDF files using practical browser-based utilities.",
    }),

    "image-toolkit": Object.freeze({
      title: "Image Toolkit",
      description:
        "Convert, resize and optimize images directly in your browser.",
    }),

    "data-converter": Object.freeze({
      title: "Data Converter",
      description: "Convert structured data between useful formats.",
    }),

    "text-toolkit": Object.freeze({
      title: "Text Toolkit",
      description:
        "Clean, transform and analyze text with practical utilities.",
    }),

    "password-toolkit": Object.freeze({
      title: "Password Toolkit",
      description: "Generate and evaluate strong passwords locally.",
    }),

    "unit-converter": Object.freeze({
      title: "Unit Converter",
      description: "Convert common measurement units quickly and accurately.",
    }),

    "color-toolkit": Object.freeze({
      title: "Color Toolkit",
      description: "Convert and inspect digital color values.",
    }),

    "color-palette-extractor": Object.freeze({
      title: "Color Palette Extractor",
      description:
        "Extract dominant colors from images and export ready-to-use palettes.",
    }),

    "date-time-toolkit": Object.freeze({
      title: "Date & Time Toolkit",
      description: "Calculate and convert dates, times and durations.",
    }),

    "file-hash-checker": Object.freeze({
      title: "File Hash Checker",
      description: "Calculate file hashes locally for integrity verification.",
    }),

    "hash-generator": Object.freeze({
      title: "Hash Generator",
      description: "Generate text hashes locally using MD5 and SHA algorithms.",
    }),

    "htaccess-generator": Object.freeze({
      title: "HTACCESS Generator",
      description:
        "Generate common Apache .htaccess rules directly in your browser.",
    }),

    "html-entity-encoder-decoder": Object.freeze({
      title: "HTML Entity Encoder / Decoder",
      description: "Encode and decode HTML entities directly in your browser.",
    }),
    "env-generator": Object.freeze({
      title: ".ENV Generator",
      description:
        "Generate .env files and secure keys directly in your browser.",
    }),

    "csv-viewer-editor": Object.freeze({
      title: "CSV Viewer & Editor",
      description:
        "Inspect, edit and export CSV data directly in your browser.",
    }),

    "uuid-generator": Object.freeze({
      title: "UUID Generator",
      description: "Generate UUID v4 and UUID v7 identifiers instantly.",
    }),

    "base64-toolkit": Object.freeze({
      title: "Base64 Toolkit",
      description: "Encode and decode Base64 text directly in your browser.",
    }),

    "regex-tester": Object.freeze({
      title: "Regex Tester",
      description: "Test regular expressions and inspect matches in real time.",
    }),

    "cron-expression-generator": Object.freeze({
      title: "Cron Expression Generator",
      description: "Build, validate and understand standard cron schedules.",
    }),

    "css-minifier": Object.freeze({
      title: "CSS Minifier",
      description:
        "Minify, beautify and validate CSS directly in your browser.",
    }),

    "text-diff-checker": Object.freeze({
      title: "Text Diff Checker",
      description: "Compare two text versions and identify their differences.",
      path: "diff-checker.html",
    }),

    "json-toolkit": Object.freeze({
      title: "JSON Toolkit",
      description: "Format, validate and process JSON data in your browser.",
    }),

    "html-minifier": Object.freeze({
      title: "HTML Minifier & Beautifier",
      description: "Minify and beautify HTML directly in your browser.",
    }),

    "http-header-analyzer": Object.freeze({
      title: "HTTP Header Analyzer",
      description:
        "Analyze HTTP response headers, security policies, caching rules and server information.",
    }),

    "jwt-decoder": Object.freeze({
      title: "JWT Decoder",
      description:
        "Decode and inspect JSON Web Tokens directly in your browser.",
    }),

    "jwt-generator": Object.freeze({
      title: "JWT Generator",
      description: "Generate HS256 JSON Web Tokens directly in your browser.",
    }),

    "lorem-ipsum-generator": Object.freeze({
      title: "Lorem Ipsum Generator",
      description:
        "Generate customizable placeholder text directly in your browser.",
    }),

    "markdown-editor": Object.freeze({
      title: "Markdown Editor",
      description: "Write and preview Markdown directly in your browser.",
    }),

    "meta-tag-generator": Object.freeze({
      title: "Meta Tag Generator",
      description: "Create common SEO meta tags for web pages.",
    }),

    "open-graph-generator": Object.freeze({
      title: "Open Graph Generator",
      description: "Generate Open Graph metadata for social sharing.",
    }),

    "robots-generator": Object.freeze({
      title: "Robots.txt Generator",
      description: "Create robots.txt directives for search engine crawlers.",
    }),

    "sitemap-generator": Object.freeze({
      title: "Sitemap Generator",
      description:
        "Generate XML sitemaps for websites directly in your browser.",
    }),

    "sql-formatter": Object.freeze({
      title: "SQL Formatter",
      description: "Format and beautify SQL queries directly in your browser.",
    }),

    "sql-minifier": Object.freeze({
      title: "SQL Minifier",
      description: "Minify SQL while preserving quoted content.",
    }),

    "url-toolkit": Object.freeze({
      title: "URL Toolkit",
      description:
        "Encode, decode, parse and build URLs directly in your browser.",
    }),

    "user-agent-parser": Object.freeze({
      title: "User-Agent Parser",
      description:
        "Analyze browser, operating system, device and bot information from User-Agent strings.",
    }),

    "unix-timestamp-converter": Object.freeze({
      title: "Unix Timestamp Converter",
      description:
        "Convert Unix timestamps and readable dates directly in your browser.",
    }),

    "word-character-counter": Object.freeze({
      title: "Word & Character Counter",
      description:
        "Count words, characters, sentences, paragraphs and reading time.",
    }),

    "case-converter": Object.freeze({
      title: "Case Converter",
      description:
        "Convert text between uppercase, lowercase and programming case styles.",
    }),

    "xml-formatter-validator": Object.freeze({
      title: "XML Formatter & Validator",
      description: "Format, minify and validate XML directly in your browser.",
    }),

    "xml-json-converter": Object.freeze({
      title: "XML \u2194 JSON Converter",
      description:
        "Convert XML and JSON in both directions directly in your browser.",
    }),

    "yaml-json-converter": Object.freeze({
      title: "YAML \u2194 JSON Converter",
      description:
        "Convert and validate YAML and JSON directly in your browser.",
    }),
  });
  // ---------------------------
  // Existing Tool Fallback Mapping
  // ---------------------------

  const RELATED_TOOL_FALLBACKS = Object.freeze({
    "base64-toolkit": Object.freeze([
      "text-toolkit",
      "json-toolkit",
      "data-converter",
      "file-hash-checker",
      "hash-generator",
    ]),

    "json-toolkit": Object.freeze([
      "data-converter",
      "base64-toolkit",
      "regex-tester",
      "text-diff-checker",
    ]),

    "regex-tester": Object.freeze([
      "text-toolkit",
      "text-diff-checker",
      "json-toolkit",
      "base64-toolkit",
      "htaccess-generator",
    ]),

    "text-diff-checker": Object.freeze([
      "text-toolkit",
      "regex-tester",
      "json-toolkit",
      "data-converter",
    ]),

    "text-toolkit": Object.freeze([
      "text-diff-checker",
      "regex-tester",
      "base64-toolkit",
      "json-toolkit",
      "hash-generator",
      "html-entity-encoder-decoder",
    ]),

    "data-converter": Object.freeze([
      "json-toolkit",
      "base64-toolkit",
      "text-toolkit",
      "unit-converter",
      "csv-viewer-editor",
    ]),

    "file-hash-checker": Object.freeze([
      "hash-generator",
      "base64-toolkit",
      "password-toolkit",
      "uuid-generator",
      "data-converter",
    ]),

    "hash-generator": Object.freeze([
      "file-hash-checker",
      "base64-toolkit",
      "password-toolkit",
      "uuid-generator",
      "text-toolkit",
    ]),

    "htaccess-generator": Object.freeze([
      "env-generator",
      "regex-tester",
      "text-toolkit",
      "base64-toolkit",
      "hash-generator",
    ]),

    "html-entity-encoder-decoder": Object.freeze([
      "base64-toolkit",
      "json-toolkit",
      "url-toolkit",
      "text-toolkit",
      "regex-tester",
    ]),

    "password-toolkit": Object.freeze([
      "file-hash-checker",
      "hash-generator",
      "uuid-generator",
      "base64-toolkit",
      "text-toolkit",
    ]),

    "uuid-generator": Object.freeze([
      "password-toolkit",
      "file-hash-checker",
      "hash-generator",
      "json-toolkit",
      "base64-toolkit",
    ]),

    "qr-generator": Object.freeze([
      "barcode-generator",
      "image-toolkit",
      "text-toolkit",
      "data-converter",
    ]),

    "barcode-generator": Object.freeze([
      "qr-generator",
      "image-toolkit",
      "data-converter",
      "text-toolkit",
    ]),

    "image-toolkit": Object.freeze([
      "color-palette-extractor",
      "color-toolkit",
      "qr-generator",
      "pdf-toolkit",
    ]),

    "color-toolkit": Object.freeze([
      "color-palette-extractor",
      "image-toolkit",
      "qr-generator",
      "barcode-generator",
    ]),

    "color-palette-extractor": Object.freeze([
      "color-toolkit",
      "image-toolkit",
      "qr-generator",
      "barcode-generator",
    ]),

    "pdf-toolkit": Object.freeze([
      "image-toolkit",
      "text-toolkit",
      "file-hash-checker",
      "data-converter",
    ]),

    "unit-converter": Object.freeze([
      "date-time-toolkit",
      "unix-timestamp-converter",
      "data-converter",
      "color-toolkit",
      "text-toolkit",
    ]),

    "date-time-toolkit": Object.freeze([
      "unix-timestamp-converter",
      "unit-converter",
      "data-converter",
      "uuid-generator",
      "text-toolkit",
    ]),

    "unix-timestamp-converter": Object.freeze([
      "date-time-toolkit",
      "unit-converter",
      "uuid-generator",
      "text-toolkit",
    ]),

    "word-character-counter": Object.freeze([
      "text-toolkit",
      "case-converter",
      "text-diff-checker",
      "regex-tester",
    ]),

    "case-converter": Object.freeze([
      "text-toolkit",
      "word-character-counter",
      "text-diff-checker",
      "regex-tester",
    ]),

    "env-generator": Object.freeze([
      "password-toolkit",
      "file-hash-checker",
      "hash-generator",
      "htaccess-generator",
      "base64-toolkit",
      "uuid-generator",
    ]),

    "cron-expression-generator": Object.freeze([
      "date-time-toolkit",
      "regex-tester",
      "text-toolkit",
      "json-toolkit",
    ]),

    "csv-viewer-editor": Object.freeze([
      "data-converter",
      "json-toolkit",
      "text-toolkit",
      "regex-tester",
    ]),

    "css-minifier": Object.freeze([
      "json-toolkit",
      "regex-tester",
      "data-converter",
      "text-toolkit",
    ]),
  });

  // ---------------------------
  // Metadata Helpers
  // ---------------------------

  const ACRONYMS = new Map([
    ["api", "API"],
    ["base64", "Base64"],
    ["csv", "CSV"],
    ["css", "CSS"],
    ["env", "ENV"],
    ["html", "HTML"],
    ["htaccess", "HTACCESS"],
    ["json", "JSON"],
    ["pdf", "PDF"],
    ["qr", "QR"],
    ["regex", "Regex"],
    ["url", "URL"],
    ["uuid", "UUID"],
    ["xml", "XML"],
    ["xlsx", "XLSX"],
  ]);

  function isValidToolId(toolId) {
    return typeof toolId === "string" && TOOL_ID_PATTERN.test(toolId);
  }

  function titleFromToolId(toolId) {
    return toolId
      .split("-")
      .filter(Boolean)
      .map((part) => {
        const known = ACRONYMS.get(part.toLowerCase());

        if (known) {
          return known;
        }

        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  function getToolMetadata(toolId) {
    const known = TOOL_CATALOG[toolId];

    if (known) {
      return {
        title: known.title,
        description: known.description,
        path: known.path ?? `${toolId}.html`,
      };
    }

    const title = titleFromToolId(toolId);

    return {
      title,
      description: `Open the XAVERT ${title} tool.`,
      path: `${toolId}.html`,
    };
  }

  function parseRelatedTools(body, currentTool) {
    const declared = body.dataset.relatedTools
      ?.split(",")
      .map((toolId) => toolId.trim())
      .filter(Boolean);

    const source = declared?.length
      ? declared
      : (RELATED_TOOL_FALLBACKS[currentTool] ?? []);

    return [...new Set(source)].filter(
      (toolId) => toolId !== currentTool && isValidToolId(toolId),
    );
  }

  // ---------------------------
  // Rendering
  // ---------------------------

  function hideRelatedSection(container, section) {
    container.replaceChildren();

    if (section) {
      section.hidden = true;
    }
  }

  function createRelatedCard(toolId) {
    const metadata = getToolMetadata(toolId);

    const link = document.createElement("a");

    const titleElement = document.createElement("span");

    const descriptionElement = document.createElement("span");

    link.className = "related-tool-card";

    link.href = metadata.path;

    titleElement.className = "related-tool-title";

    titleElement.textContent = metadata.title;

    descriptionElement.className = "related-tool-description";

    descriptionElement.textContent = metadata.description;

    link.append(titleElement, descriptionElement);

    return link;
  }

  function renderRelatedTools() {
    const container = document.getElementById("related-tools");

    if (!container) {
      return;
    }

    const section = container.closest("section");

    const currentTool = document.body.dataset.tool ?? "";

    if (!isValidToolId(currentTool)) {
      hideRelatedSection(container, section);

      return;
    }

    const relatedIds = parseRelatedTools(document.body, currentTool);

    if (!relatedIds.length) {
      hideRelatedSection(container, section);

      return;
    }

    const navigation = document.createElement("nav");

    navigation.className = "related-tools-grid";

    navigation.setAttribute("aria-label", "Related tools");

    relatedIds.forEach((toolId) => {
      navigation.append(createRelatedCard(toolId));
    });

    container.replaceChildren(navigation);

    if (section) {
      section.hidden = false;
    }
  }

  function init() {
    renderRelatedTools();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
