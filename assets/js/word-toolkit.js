"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const elements = {
    dropZone: $("dropZone"),
    docxInput: $("docxInput"),
    fileInfo: $("fileInfo"),
    processBtn: $("processBtn"),
    replaceBtn: $("replaceBtn"),
    clearBtn: $("clearBtn"),
    progressWrap: $("progressWrap"),
    progressLabel: $("progressLabel"),
    progressBar: $("progressBar"),
    message: $("message"),
    resultSection: $("resultSection"),
    wordsStat: $("wordsStat"),
    charsStat: $("charsStat"),
    paragraphsStat: $("paragraphsStat"),
    tablesStat: $("tablesStat"),
    imagesStat: $("imagesStat"),
    linksStat: $("linksStat"),
    previewTab: $("previewTab"),
    textTab: $("textTab"),
    htmlTab: $("htmlTab"),
    markdownTab: $("markdownTab"),
    infoTab: $("infoTab"),
    assetsTab: $("assetsTab"),
    privacyTab: $("privacyTab"),
    previewPanel: $("previewPanel"),
    textPanel: $("textPanel"),
    htmlPanel: $("htmlPanel"),
    markdownPanel: $("markdownPanel"),
    infoPanel: $("infoPanel"),
    assetsPanel: $("assetsPanel"),
    privacyPanel: $("privacyPanel"),
    previewOutput: $("previewOutput"),
    textOutput: $("textOutput"),
    htmlOutput: $("htmlOutput"),
    markdownOutput: $("markdownOutput"),
    metadataGrid: $("metadataGrid"),
    structureGrid: $("structureGrid"),
    linkList: $("linkList"),
    mediaList: $("mediaList"),
    privacySummary: $("privacySummary"),
    warningSummary: $("warningSummary"),
    copyTextBtn: $("copyTextBtn"),
    copyHtmlBtn: $("copyHtmlBtn"),
    copyMarkdownBtn: $("copyMarkdownBtn"),
    downloadTxtBtn: $("downloadTxtBtn"),
    downloadHtmlBtn: $("downloadHtmlBtn"),
    downloadMarkdownBtn: $("downloadMarkdownBtn"),
    downloadImagesBtn: $("downloadImagesBtn"),
    downloadCleanDocxBtn: $("downloadCleanDocxBtn"),
  };

  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error("Word Toolkit initialization failed. Missing elements:", missing);
    return;
  }

  const state = {
    file: null,
    zip: null,
    plainText: "",
    sanitizedHtml: "",
    markdown: "",
    metadata: {},
    structure: {},
    links: [],
    imageEntries: [],
    warnings: [],
    isProcessing: false,
    operationToken: 0,
  };

  const tabs = [
    [elements.previewTab, elements.previewPanel],
    [elements.textTab, elements.textPanel],
    [elements.htmlTab, elements.htmlPanel],
    [elements.markdownTab, elements.markdownPanel],
    [elements.infoTab, elements.infoPanel],
    [elements.assetsTab, elements.assetsPanel],
    [elements.privacyTab, elements.privacyPanel],
  ];

  function setInlineMessage(text = "", type = "info") {
    const safeType = ["success", "error", "info"].includes(type) ? type : "info";

    elements.message.textContent = text;
    elements.message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      elements.message.classList.add(`message-${safeType}`);
    }
  }

  function notify(text, type = "info") {
    setInlineMessage(text, type);

    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
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
    const exponent = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** exponent;

    return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
  }

  function getMaxFileSize() {
    const memory = Number(navigator.deviceMemory || 0);
    const mobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      Math.min(window.innerWidth, window.innerHeight) < 700;

    if (memory > 0 && memory <= 2) {
      return 12 * 1024 * 1024;
    }

    if (mobile || (memory > 0 && memory <= 4)) {
      return 20 * 1024 * 1024;
    }

    return 40 * 1024 * 1024;
  }

  function getMaxExpandedDocxSize() {
    const memory = Number(navigator.deviceMemory || 0);
    const mobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      Math.min(window.innerWidth, window.innerHeight) < 700;

    if (memory > 0 && memory <= 2) {
      return 80 * 1024 * 1024;
    }

    if (mobile || (memory > 0 && memory <= 4)) {
      return 140 * 1024 * 1024;
    }

    return 280 * 1024 * 1024;
  }

  function estimateExpandedZipSize(zip) {
    return Object.values(zip.files).reduce((total, entry) => {
      if (entry.dir) return total;
      const size = Number(entry?._data?.uncompressedSize || 0);
      return Number.isFinite(size) && size > 0 ? total + size : total;
    }, 0);
  }

  function showProgress(label, percent = null) {
    elements.progressWrap.hidden = false;
    elements.progressLabel.textContent = label;

    if (Number.isFinite(percent)) {
      elements.progressBar.value = Math.max(0, Math.min(100, percent));
    } else {
      elements.progressBar.removeAttribute("value");
    }
  }

  function hideProgress() {
    elements.progressWrap.hidden = true;
    elements.progressBar.removeAttribute("value");
  }

  function setProcessing(processing) {
    state.isProcessing = processing;
    elements.processBtn.disabled = processing || !state.file;
    elements.replaceBtn.disabled = processing;
    elements.docxInput.disabled = processing;
    elements.copyTextBtn.disabled = processing || !state.plainText;
    elements.copyHtmlBtn.disabled = processing || !state.sanitizedHtml;
    elements.copyMarkdownBtn.disabled = processing || !state.markdown;
    elements.downloadTxtBtn.disabled = processing || !state.plainText;
    elements.downloadHtmlBtn.disabled = processing || !state.sanitizedHtml;
    elements.downloadMarkdownBtn.disabled = processing || !state.markdown;
    elements.downloadImagesBtn.disabled =
      processing || state.imageEntries.length === 0;
    elements.downloadCleanDocxBtn.disabled = processing || !state.zip;
  }

  function selectTab(selectedButton, focus = false) {
    tabs.forEach(([button, panel]) => {
      const active = button === selectedButton;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
    });

    if (focus) {
      selectedButton.focus();
    }
  }

  function resetOutputs() {
    state.zip = null;
    state.plainText = "";
    state.sanitizedHtml = "";
    state.markdown = "";
    state.metadata = {};
    state.structure = {};
    state.links = [];
    state.imageEntries = [];
    state.warnings = [];

    elements.resultSection.hidden = true;
    elements.previewOutput.replaceChildren();
    elements.textOutput.value = "";
    elements.htmlOutput.value = "";
    elements.markdownOutput.value = "";
    elements.metadataGrid.replaceChildren();
    elements.structureGrid.replaceChildren();
    elements.linkList.replaceChildren();
    elements.mediaList.replaceChildren();
    elements.privacySummary.textContent =
      "Process a DOCX file to inspect its document properties.";
    elements.warningSummary.textContent = "";

    [
      elements.wordsStat,
      elements.charsStat,
      elements.paragraphsStat,
      elements.tablesStat,
      elements.imagesStat,
      elements.linksStat,
    ].forEach((element) => {
      element.textContent = "0";
    });

    elements.downloadImagesBtn.disabled = true;
    elements.downloadCleanDocxBtn.disabled = true;
    selectTab(elements.previewTab);
  }

  function invalidateResult(message = "") {
    if (!elements.resultSection.hidden) {
      resetOutputs();
    }

    clearSuccessFeedback();

    if (message) {
      setInlineMessage(message, "info");
    }
  }

  function isDocxFile(file) {
    if (!file) {
      return false;
    }

    const nameValid = file.name.toLowerCase().endsWith(".docx");
    const mime = file.type.toLowerCase();
    const mimeValid =
      !mime ||
      mime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/octet-stream" ||
      mime === "application/zip";

    return nameValid && mimeValid;
  }

  function setSelectedFile(file) {
    if (!file) {
      return;
    }

    if (!isDocxFile(file)) {
      notify("Select a valid .docx file.", "error");
      elements.docxInput.value = "";
      return;
    }

    const maxSize = getMaxFileSize();

    if (file.size === 0) {
      notify("The selected DOCX file is empty.", "error");
      elements.docxInput.value = "";
      return;
    }

    if (file.size > maxSize) {
      notify(
        `This device is limited to DOCX files up to ${formatBytes(maxSize)} for safer browser processing.`,
        "error",
      );
      elements.docxInput.value = "";
      return;
    }

    state.operationToken += 1;
    state.file = file;
    resetOutputs();
    clearSuccessFeedback();
    elements.fileInfo.textContent =
      `${file.name} · ${formatBytes(file.size)} · Ready to process`;
    elements.processBtn.disabled = false;
    setInlineMessage("Document selected. Run Process Document.", "info");
  }

  function getXmlText(xmlDocument, localName) {
    const direct = xmlDocument.getElementsByTagName(localName)[0];

    if (direct) {
      return direct.textContent?.trim() || "";
    }

    const all = Array.from(xmlDocument.getElementsByTagName("*"));
    const match = all.find(
      (element) =>
        element.localName === localName ||
        element.nodeName.split(":").pop() === localName,
    );

    return match?.textContent?.trim() || "";
  }

  function parseXml(xmlText) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(xmlText, "application/xml");

    if (documentNode.getElementsByTagName("parsererror").length) {
      throw new Error("The DOCX contains malformed XML.");
    }

    return documentNode;
  }

  function countElementsByLocalName(xmlDocument, localName) {
    return Array.from(xmlDocument.getElementsByTagName("*")).filter(
      (element) =>
        element.localName === localName ||
        element.nodeName.split(":").pop() === localName,
    ).length;
  }

  async function readMetadata(zip) {
    const metadata = {
      "File Name": state.file?.name || "—",
      "File Size": state.file ? formatBytes(state.file.size) : "—",
      Title: "—",
      Subject: "—",
      Author: "—",
      "Last Modified By": "—",
      Keywords: "—",
      Description: "—",
      Created: "—",
      Modified: "—",
      Revision: "—",
      Category: "—",
      "Content Status": "—",
      Application: "—",
      "App Version": "—",
      Company: "—",
      Manager: "—",
      Template: "—",
      Pages: "—",
      "Saved Words": "—",
      "Editing Time": "—",
    };

    const coreEntry = zip.file("docProps/core.xml");

    if (coreEntry) {
      try {
        const coreXml = parseXml(await coreEntry.async("text"));

        const values = {
          Title: getXmlText(coreXml, "title"),
          Subject: getXmlText(coreXml, "subject"),
          Author: getXmlText(coreXml, "creator"),
          "Last Modified By": getXmlText(coreXml, "lastModifiedBy"),
          Keywords: getXmlText(coreXml, "keywords"),
          Description: getXmlText(coreXml, "description"),
          Created: getXmlText(coreXml, "created"),
          Modified: getXmlText(coreXml, "modified"),
          Revision: getXmlText(coreXml, "revision"),
          Category: getXmlText(coreXml, "category"),
          "Content Status": getXmlText(coreXml, "contentStatus"),
        };

        Object.entries(values).forEach(([key, value]) => {
          if (value) {
            metadata[key] = value;
          }
        });
      } catch (error) {
        state.warnings.push("Core document metadata could not be read.");
        console.warn("Word Toolkit metadata warning:", error);
      }
    }

    const appEntry = zip.file("docProps/app.xml");

    if (appEntry) {
      try {
        const appXml = parseXml(await appEntry.async("text"));
        const appValues = {
          Application: getXmlText(appXml, "Application"),
          "App Version": getXmlText(appXml, "AppVersion"),
          Company: getXmlText(appXml, "Company"),
          Manager: getXmlText(appXml, "Manager"),
          Template: getXmlText(appXml, "Template"),
          Pages: getXmlText(appXml, "Pages"),
          "Saved Words": getXmlText(appXml, "Words"),
          "Editing Time": getXmlText(appXml, "TotalTime"),
        };

        Object.entries(appValues).forEach(([key, value]) => {
          if (value) {
            metadata[key] = key === "Editing Time" ? `${value} min` : value;
          }
        });
      } catch (error) {
        state.warnings.push("Application metadata could not be read.");
        console.warn("Word Toolkit app metadata warning:", error);
      }
    }

    return metadata;
  }

  function sanitizeConvertedHtml(html) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<main>${html}</main>`, "text/html");
    const root = parsed.body.firstElementChild;

    if (!root) {
      return "";
    }

    const allowedTags = new Set([
      "A",
      "B",
      "BLOCKQUOTE",
      "BR",
      "CODE",
      "DEL",
      "EM",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "HR",
      "I",
      "IMG",
      "LI",
      "OL",
      "P",
      "PRE",
      "S",
      "STRONG",
      "SUB",
      "SUP",
      "TABLE",
      "TBODY",
      "TD",
      "TFOOT",
      "TH",
      "THEAD",
      "TR",
      "U",
      "UL",
    ]);

    const dangerousTags = new Set([
      "SCRIPT",
      "STYLE",
      "IFRAME",
      "OBJECT",
      "EMBED",
      "FORM",
      "INPUT",
      "BUTTON",
      "TEXTAREA",
      "SELECT",
      "OPTION",
      "META",
      "LINK",
      "BASE",
      "SVG",
      "MATH",
    ]);

    Array.from(root.querySelectorAll("*")).forEach((element) => {
      if (dangerousTags.has(element.tagName)) {
        element.remove();
        return;
      }

      if (!allowedTags.has(element.tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();

        if (name.startsWith("on") || name === "style" || name === "srcset") {
          element.removeAttribute(attribute.name);
          return;
        }

        if (element.tagName === "A") {
          if (!["href", "title"].includes(name)) {
            element.removeAttribute(attribute.name);
          }
          return;
        }

        if (element.tagName === "IMG") {
          if (!["src", "alt", "title", "width", "height"].includes(name)) {
            element.removeAttribute(attribute.name);
          }
          return;
        }

        if (
          !(
            (element.tagName === "TD" || element.tagName === "TH") &&
            ["colspan", "rowspan"].includes(name)
          )
        ) {
          element.removeAttribute(attribute.name);
        }
      });

      if (element.tagName === "A") {
        const href = element.getAttribute("href") || "";

        if (
          href &&
          !href.startsWith("#") &&
          !/^https?:/i.test(href) &&
          !/^mailto:/i.test(href) &&
          !/^tel:/i.test(href)
        ) {
          element.removeAttribute("href");
        }

        if (element.hasAttribute("href")) {
          element.setAttribute("rel", "noopener noreferrer");
        }
      }

      if (element.tagName === "IMG") {
        const src = element.getAttribute("src") || "";

        if (!/^data:image\/(?:png|jpeg|jpg|gif|webp|bmp);base64,/i.test(src)) {
          element.removeAttribute("src");
        }

        element.setAttribute("loading", "lazy");
        element.setAttribute("decoding", "async");
      }
    });

    return root.innerHTML.trim();
  }

  function normalizeText(value) {
    return value
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function escapeMarkdownText(value) {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/([*_`])/g, "\\$1");
  }

  function htmlToMarkdown(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<main>${html}</main>`, "text/html");
    const root = doc.body.firstElementChild;

    if (!root) {
      return "";
    }

    function renderChildren(node, context = {}) {
      return Array.from(node.childNodes)
        .map((child) => renderNode(child, context))
        .join("");
    }

    function renderList(element, ordered, depth) {
      const lines = [];
      const items = Array.from(element.children).filter(
        (child) => child.tagName === "LI",
      );

      items.forEach((item, index) => {
        const marker = ordered ? `${index + 1}. ` : "- ";
        const nestedLists = Array.from(item.children).filter(
          (child) => child.tagName === "UL" || child.tagName === "OL",
        );
        const clone = item.cloneNode(true);

        Array.from(clone.children).forEach((child) => {
          if (child.tagName === "UL" || child.tagName === "OL") {
            child.remove();
          }
        });

        const body = renderChildren(clone, { listDepth: depth })
          .replace(/\s+/g, " ")
          .trim();

        lines.push(`${"  ".repeat(depth)}${marker}${body}`);

        nestedLists.forEach((nested) => {
          lines.push(renderList(nested, nested.tagName === "OL", depth + 1));
        });
      });

      return lines.join("\n");
    }

    function renderTable(table) {
      const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
        Array.from(row.children)
          .filter((cell) => cell.tagName === "TH" || cell.tagName === "TD")
          .map((cell) =>
            renderChildren(cell)
              .replace(/\|/g, "\\|")
              .replace(/\s+/g, " ")
              .trim(),
          ),
      );

      if (!rows.length || !rows[0].length) {
        return "";
      }

      const width = Math.max(...rows.map((row) => row.length));
      const normalized = rows.map((row) => [
        ...row,
        ...Array(Math.max(0, width - row.length)).fill(""),
      ]);

      const header = normalized[0];
      const separator = Array(width).fill("---");
      const body = normalized.slice(1);

      return [
        `| ${header.join(" | ")} |`,
        `| ${separator.join(" | ")} |`,
        ...body.map((row) => `| ${row.join(" | ")} |`),
      ].join("\n");
    }

    function renderNode(node, context = {}) {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeMarkdownText(node.nodeValue || "");
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const tag = node.tagName;
      const children = renderChildren(node, context);

      switch (tag) {
        case "H1":
        case "H2":
        case "H3":
        case "H4":
        case "H5":
        case "H6":
          return `${"#".repeat(Number(tag.slice(1)))} ${children.trim()}\n\n`;
        case "P":
          return `${children.trim()}\n\n`;
        case "STRONG":
        case "B":
          return `**${children.trim()}**`;
        case "EM":
        case "I":
          return `*${children.trim()}*`;
        case "DEL":
        case "S":
          return `~~${children.trim()}~~`;
        case "CODE":
          if (node.parentElement?.tagName === "PRE") {
            return node.textContent || "";
          }
          return `\`${(node.textContent || "").replace(/`/g, "\\`")}\``;
        case "PRE":
          return `\`\`\`\n${(node.textContent || "").trimEnd()}\n\`\`\`\n\n`;
        case "BR":
          return "  \n";
        case "HR":
          return "---\n\n";
        case "A": {
          const href = node.getAttribute("href");
          const label = children.trim() || href || "";
          return href ? `[${label}](${href})` : label;
        }
        case "IMG": {
          const alt = escapeMarkdownText(node.getAttribute("alt") || "Image");
          return `[Embedded image: ${alt}]`;
        }
        case "UL":
          return `${renderList(node, false, context.listDepth || 0)}\n\n`;
        case "OL":
          return `${renderList(node, true, context.listDepth || 0)}\n\n`;
        case "LI":
          return children;
        case "BLOCKQUOTE":
          return (
            children
              .trim()
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n") + "\n\n"
          );
        case "TABLE":
          return `${renderTable(node)}\n\n`;
        case "U":
        case "SUB":
        case "SUP":
        case "TD":
        case "TH":
        case "TR":
        case "TBODY":
        case "THEAD":
        case "TFOOT":
          return children;
        default:
          return children;
      }
    }

    return normalizeText(renderChildren(root));
  }

  function countWords(text) {
    const normalized = text.trim();

    if (!normalized) {
      return 0;
    }

    if (typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
      let count = 0;

      for (const segment of segmenter.segment(normalized)) {
        if (segment.isWordLike) {
          count += 1;
        }
      }

      return count;
    }

    const matches = normalized.match(/\S+/gu);
    return matches ? matches.length : 0;
  }

  function renderMetadata(metadata) {
    elements.metadataGrid.replaceChildren();

    Object.entries(metadata).forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "word-metadata-item";

      const labelElement = document.createElement("span");
      labelElement.className = "word-metadata-label";
      labelElement.textContent = label;

      const valueElement = document.createElement("span");
      valueElement.className = "word-metadata-value";
      valueElement.textContent = value || "—";

      item.append(labelElement, valueElement);
      elements.metadataGrid.append(item);
    });
  }

  function renderKeyValueGrid(container, values) {
    container.replaceChildren();

    Object.entries(values).forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "word-metadata-item";

      const labelElement = document.createElement("span");
      labelElement.className = "word-metadata-label";
      labelElement.textContent = label;

      const valueElement = document.createElement("span");
      valueElement.className = "word-metadata-value";
      valueElement.textContent = String(value ?? "—");

      item.append(labelElement, valueElement);
      container.append(item);
    });
  }

  function getAttributeByLocalName(element, localName) {
    const attribute = Array.from(element.attributes || []).find(
      (item) => item.localName === localName || item.name.split(":").pop() === localName,
    );

    return attribute?.value || "";
  }

  function countNoteEntries(xmlDocument, elementName) {
    return Array.from(xmlDocument.getElementsByTagName("*")).filter((element) => {
      if (
        element.localName !== elementName &&
        element.nodeName.split(":").pop() !== elementName
      ) {
        return false;
      }

      const id = Number(getAttributeByLocalName(element, "id"));
      return !Number.isFinite(id) || id >= 0;
    }).length;
  }

  async function inspectDocument(zip, documentXml) {
    const headerCount = Object.keys(zip.files).filter(
      (path) => /^word\/header\d+\.xml$/i.test(path) && !zip.files[path].dir,
    ).length;
    const footerCount = Object.keys(zip.files).filter(
      (path) => /^word\/footer\d+\.xml$/i.test(path) && !zip.files[path].dir,
    ).length;
    const embeddedObjectCount = Object.keys(zip.files).filter(
      (path) => path.startsWith("word/embeddings/") && !zip.files[path].dir,
    ).length;

    let footnoteCount = 0;
    let endnoteCount = 0;
    let commentCount = 0;
    let customPropertyCount = 0;

    const footnotesEntry = zip.file("word/footnotes.xml");
    if (footnotesEntry) {
      try {
        footnoteCount = countNoteEntries(
          parseXml(await footnotesEntry.async("text")),
          "footnote",
        );
      } catch (error) {
        state.warnings.push("Footnote structure could not be inspected.");
        console.warn("Word Toolkit footnote inspection warning:", error);
      }
    }

    const endnotesEntry = zip.file("word/endnotes.xml");
    if (endnotesEntry) {
      try {
        endnoteCount = countNoteEntries(
          parseXml(await endnotesEntry.async("text")),
          "endnote",
        );
      } catch (error) {
        state.warnings.push("Endnote structure could not be inspected.");
        console.warn("Word Toolkit endnote inspection warning:", error);
      }
    }

    const commentsEntry = zip.file("word/comments.xml");
    if (commentsEntry) {
      try {
        commentCount = countElementsByLocalName(
          parseXml(await commentsEntry.async("text")),
          "comment",
        );
      } catch (error) {
        state.warnings.push("Comment structure could not be inspected.");
        console.warn("Word Toolkit comment inspection warning:", error);
      }
    }

    const customEntry = zip.file("docProps/custom.xml");
    if (customEntry) {
      try {
        customPropertyCount = countElementsByLocalName(
          parseXml(await customEntry.async("text")),
          "property",
        );
      } catch (error) {
        state.warnings.push("Custom properties could not be inspected.");
        console.warn("Word Toolkit custom property warning:", error);
      }
    }

    const trackedNames = new Set(["ins", "del", "moveFrom", "moveTo"]);
    const trackedChanges = Array.from(documentXml.getElementsByTagName("*")).filter(
      (element) => trackedNames.has(element.localName || element.nodeName.split(":").pop()),
    ).length;

    const fieldCount = Array.from(documentXml.getElementsByTagName("*")).filter(
      (element) => {
        const name = element.localName || element.nodeName.split(":").pop();
        return name === "fldSimple" || name === "instrText";
      },
    ).length;

    const structure = {
      Sections: countElementsByLocalName(documentXml, "sectPr"),
      Headers: headerCount,
      Footers: footerCount,
      Footnotes: footnoteCount,
      Endnotes: endnoteCount,
      Comments: commentCount,
      "Tracked Changes": trackedChanges,
      Fields: fieldCount,
      "Custom Properties": customPropertyCount,
      "Embedded Objects": embeddedObjectCount,
    };

    const links = [];
    const relationshipEntry = zip.file("word/_rels/document.xml.rels");
    const relationshipMap = new Map();

    if (relationshipEntry) {
      try {
        const relXml = parseXml(await relationshipEntry.async("text"));
        Array.from(relXml.getElementsByTagName("*")).forEach((relationship) => {
          const name = relationship.localName || relationship.nodeName.split(":").pop();
          if (name !== "Relationship") return;

          const id = relationship.getAttribute("Id") || "";
          const type = relationship.getAttribute("Type") || "";
          const target = relationship.getAttribute("Target") || "";
          const targetMode = relationship.getAttribute("TargetMode") || "";

          if (id) relationshipMap.set(id, { type, target, targetMode });
        });
      } catch (error) {
        state.warnings.push("Hyperlink relationships could not be inspected.");
        console.warn("Word Toolkit relationship warning:", error);
      }
    }

    Array.from(documentXml.getElementsByTagName("*")).forEach((element) => {
      const name = element.localName || element.nodeName.split(":").pop();
      if (name !== "hyperlink") return;

      const relationId = getAttributeByLocalName(element, "id");
      const anchor = getAttributeByLocalName(element, "anchor");
      const relationship = relationId ? relationshipMap.get(relationId) : null;
      const label = (element.textContent || "").replace(/\s+/g, " ").trim();

      if (relationship?.target && /\/hyperlink$/i.test(relationship.type)) {
        links.push({
          label: label || relationship.target,
          target: relationship.target,
          external: relationship.targetMode.toLowerCase() === "external" || /^(https?:|mailto:|tel:)/i.test(relationship.target),
        });
      } else if (anchor) {
        links.push({ label: label || anchor, target: `#${anchor}`, external: false });
      }
    });

    Array.from(documentXml.getElementsByTagName("*")).forEach((element) => {
      const name = element.localName || element.nodeName.split(":").pop();
      if (name !== "instrText" && name !== "fldSimple") return;

      const instruction =
        name === "fldSimple"
          ? getAttributeByLocalName(element, "instr")
          : element.textContent || "";
      const match = instruction.match(
        /\bHYPERLINK\s+(?:\\l\s+)?(?:"([^"]+)"|'([^']+)'|([^\s\\]+))/i,
      );

      const target = match?.[1] || match?.[2] || match?.[3] || "";
      if (!target) return;

      const normalizedTarget = /\\l\s+/i.test(instruction)
        ? `#${target}`
        : target;
      links.push({
        label: target,
        target: normalizedTarget,
        external: /^(https?:|mailto:|tel:)/i.test(normalizedTarget),
      });
    });

    relationshipMap.forEach((relationship) => {
      if (!relationship.target || !/\/hyperlink$/i.test(relationship.type)) return;
      if (links.some((link) => link.target === relationship.target)) return;
      links.push({
        label: relationship.target,
        target: relationship.target,
        external: relationship.targetMode.toLowerCase() === "external" || /^(https?:|mailto:|tel:)/i.test(relationship.target),
      });
    });

    const uniqueLinks = Array.from(
      new Map(links.map((link) => [`${link.target}\u0000${link.label}`, link])).values(),
    );

    return { structure, links: uniqueLinks };
  }

  function renderLinks(links) {
    elements.linkList.replaceChildren();

    if (!links.length) {
      const empty = document.createElement("div");
      empty.className = "word-empty";
      empty.textContent = "No hyperlinks were detected in the main document body.";
      elements.linkList.append(empty);
      return;
    }

    links.forEach((link) => {
      const row = document.createElement("div");
      row.className = "word-item-row";
      const main = document.createElement("div");
      main.className = "word-item-main";
      const title = document.createElement("span");
      title.className = "word-item-title";
      title.textContent = link.label || link.target;
      const meta = document.createElement("span");
      meta.className = "word-item-meta";
      meta.textContent = link.target;
      main.append(title, meta);
      row.append(main);

      if (link.external && /^(https?:|mailto:|tel:)/i.test(link.target)) {
        const anchor = document.createElement("a");
        anchor.className = "word-item-action";
        anchor.href = link.target;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.textContent = "Open";
        row.append(anchor);
      }

      elements.linkList.append(row);
    });
  }

  function getMediaMimeType(path) {
    const extension = path.split(".").pop()?.toLowerCase() || "";
    return ({
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      tif: "image/tiff",
      tiff: "image/tiff",
      svg: "image/svg+xml",
      emf: "image/emf",
      wmf: "image/wmf",
    })[extension] || "application/octet-stream";
  }

  function renderMedia(entries) {
    elements.mediaList.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "word-empty";
      empty.textContent = "No embedded media files were found.";
      elements.mediaList.append(empty);
      return;
    }

    entries.forEach((path, index) => {
      const row = document.createElement("div");
      row.className = "word-item-row";
      const main = document.createElement("div");
      main.className = "word-item-main";
      const title = document.createElement("span");
      title.className = "word-item-title";
      title.textContent = path.split("/").pop() || `Media ${index + 1}`;
      const meta = document.createElement("span");
      meta.className = "word-item-meta";
      meta.textContent = getMediaMimeType(path);
      const button = document.createElement("button");
      button.className = "word-item-action";
      button.type = "button";
      button.dataset.mediaPath = path;
      button.textContent = "Download";
      main.append(title, meta);
      row.append(main, button);
      elements.mediaList.append(row);
    });
  }

  function buildPrivacySummary(metadata, structure) {
    const detected = [];
    const checks = [
      ["Author", metadata.Author],
      ["Last Modified By", metadata["Last Modified By"]],
      ["Company", metadata.Company],
      ["Manager", metadata.Manager],
      ["Template", metadata.Template],
      ["Title", metadata.Title],
      ["Keywords", metadata.Keywords],
    ];

    checks.forEach(([label, value]) => {
      if (value && value !== "—") detected.push(label);
    });

    if (Number(structure["Custom Properties"] || 0) > 0) {
      detected.push("Custom Properties");
    }

    const contentWarnings = [];
    if (Number(structure.Comments || 0) > 0) contentWarnings.push("comments");
    if (Number(structure["Tracked Changes"] || 0) > 0) contentWarnings.push("tracked changes");

    let message = detected.length
      ? `Metadata detected: ${detected.join(", ")}. The cleaner can remove common package properties from a new DOCX copy.`
      : "No common identifying package properties were detected, but a cleaned copy can still normalize document metadata.";

    if (contentWarnings.length) {
      message += ` This document also contains ${contentWarnings.join(" and ")}; those are document content and are not removed automatically.`;
    }

    return message;
  }

  async function downloadSingleMedia(path) {
    const entry = state.zip?.file(path);
    if (!entry) {
      notify("The selected media file is no longer available.", "error");
      return;
    }

    try {
      const bytes = await entry.async("uint8array");
      const blob = new Blob([bytes], { type: getMediaMimeType(path) });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = path.split("/").pop() || "media-file";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      if (typeof window.showDownloadSuccess === "function") {
        window.showDownloadSuccess();
      } else {
        notify("Media download started.", "success");
      }
    } catch (error) {
      console.error("Word Toolkit media download failed:", error);
      notify("The media file could not be downloaded.", "error");
    }
  }

  function createEmptyCorePropertiesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"></cp:coreProperties>`;
  }

  function createEmptyCustomPropertiesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"></Properties>`;
  }

  function sanitizeAppPropertiesXml(xmlText) {
    const documentNode = parseXml(xmlText);
    const fieldsToClear = new Set(["Company", "Manager", "HyperlinkBase", "Template"]);

    Array.from(documentNode.getElementsByTagName("*")).forEach((element) => {
      const name = element.localName || element.nodeName.split(":").pop();
      if (fieldsToClear.has(name)) {
        element.textContent = "";
      } else if (name === "TotalTime") {
        element.textContent = "0";
      }
    });

    return new XMLSerializer().serializeToString(documentNode);
  }

  async function downloadMetadataCleanedDocx() {
    if (!state.file || !state.zip || state.isProcessing) {
      notify("Process a DOCX file before creating a cleaned copy.", "error");
      return;
    }

    try {
      setProcessing(true);
      showProgress("Creating metadata-cleaned DOCX…", 25);
      const cleanZip = await window.JSZip.loadAsync(await state.file.arrayBuffer());

      if (cleanZip.file("docProps/core.xml")) {
        cleanZip.file("docProps/core.xml", createEmptyCorePropertiesXml());
      }

      if (cleanZip.file("docProps/custom.xml")) {
        cleanZip.file("docProps/custom.xml", createEmptyCustomPropertiesXml());
      }

      const appEntry = cleanZip.file("docProps/app.xml");
      if (appEntry) {
        cleanZip.file(
          "docProps/app.xml",
          sanitizeAppPropertiesXml(await appEntry.async("text")),
        );
      }

      showProgress("Compressing cleaned DOCX…", 70);
      const blob = await cleanZip.generateAsync({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${getDownloadBaseName()}-metadata-cleaned.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      if (typeof window.showDownloadSuccess === "function") {
        window.showDownloadSuccess();
      } else {
        notify("Metadata-cleaned DOCX download started.", "success");
      }
    } catch (error) {
      console.error("Word Toolkit metadata cleaning failed:", error);
      notify("The metadata-cleaned DOCX could not be created.", "error");
    } finally {
      hideProgress();
      setProcessing(false);
    }
  }

  function buildHtmlDocument(bodyHtml) {
    const title = (state.metadata.Title || state.file?.name || "DOCX Document")
      .replace(/[<>&"]/g, "");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body{max-width:900px;margin:40px auto;padding:0 20px;font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.65}
img{max-width:100%;height:auto}
table{width:100%;border-collapse:collapse;margin:1em 0}
th,td{border:1px solid #d1d5db;padding:8px 10px;text-align:left;vertical-align:top}
blockquote{border-left:3px solid #d1d5db;padding-left:14px;color:#475569}
pre{overflow:auto;padding:14px;background:#f8fafc;border-radius:10px;white-space:pre-wrap}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  }

  function getDownloadBaseName() {
    return (state.file?.name || "document")
      .replace(/\.docx$/i, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";
  }

  async function processDocument() {
    if (!state.file || state.isProcessing) {
      return;
    }

    if (typeof window.JSZip !== "function") {
      notify("The DOCX reader library could not be loaded.", "error");
      return;
    }

    if (
      !window.mammoth ||
      typeof window.mammoth.convertToHtml !== "function" ||
      typeof window.mammoth.extractRawText !== "function"
    ) {
      notify(
        "The Word conversion library could not be loaded. Check your connection and reload the page.",
        "error",
      );
      return;
    }

    const token = ++state.operationToken;
    resetOutputs();
    setProcessing(true);
    clearSuccessFeedback();

    try {
      showProgress("Reading DOCX file…", 10);
      const arrayBuffer = await state.file.arrayBuffer();

      if (token !== state.operationToken) {
        return;
      }

      showProgress("Inspecting Word document structure…", 28);
      const zip = await window.JSZip.loadAsync(arrayBuffer);
      const expandedSize = estimateExpandedZipSize(zip);
      const expandedLimit = getMaxExpandedDocxSize();

      if (expandedSize > expandedLimit) {
        throw new Error(
          `This DOCX expands to about ${formatBytes(expandedSize)}, which exceeds the ${formatBytes(expandedLimit)} safe processing limit for this device.`,
        );
      }

      if (!zip.file("[Content_Types].xml") || !zip.file("word/document.xml")) {
        throw new Error("This file does not contain a valid Word DOCX document.");
      }

      const documentXmlText = await zip.file("word/document.xml").async("text");
      const documentXml = parseXml(documentXmlText);

      if (token !== state.operationToken) {
        return;
      }

      showProgress("Converting document content…", 48);

      const htmlResult = await window.mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: window.mammoth.images.dataUri,
          includeDefaultStyleMap: true,
          includeEmbeddedStyleMap: true,
          ignoreEmptyParagraphs: false,
        },
      );

      if (token !== state.operationToken) {
        return;
      }

      showProgress("Extracting document text…", 58);
      const textResult = await window.mammoth.extractRawText({ arrayBuffer });
      const [metadata, inspection] = await Promise.all([
        readMetadata(zip),
        inspectDocument(zip, documentXml),
      ]);

      if (token !== state.operationToken) {
        return;
      }

      showProgress("Preparing safe browser preview…", 72);

      const sanitizedHtml = sanitizeConvertedHtml(htmlResult.value || "");
      const plainText = normalizeText(textResult.value || "");
      const markdown = htmlToMarkdown(sanitizedHtml);

      const imageEntries = Object.keys(zip.files)
        .filter(
          (path) =>
            path.startsWith("word/media/") &&
            !zip.files[path].dir &&
            path.split("/").pop(),
        )
        .sort((a, b) => a.localeCompare(b));

      const paragraphCount = countElementsByLocalName(documentXml, "p");
      const tableCount = countElementsByLocalName(documentXml, "tbl");
      const hyperlinkCount = inspection.links.length;

      state.zip = zip;
      state.plainText = plainText;
      state.sanitizedHtml = sanitizedHtml;
      state.markdown = markdown;
      state.metadata = metadata;
      state.structure = inspection.structure;
      state.links = inspection.links;
      state.imageEntries = imageEntries;
      state.warnings = [
        ...(htmlResult.messages || []).map((message) => message.message || String(message)),
        ...(textResult.messages || []).map((message) => message.message || String(message)),
        ...state.warnings,
      ].filter(Boolean);

      showProgress("Building results…", 92);

      elements.previewOutput.innerHTML =
        sanitizedHtml || "<p>No visible document content was extracted.</p>";
      elements.textOutput.value = plainText;
      elements.htmlOutput.value = sanitizedHtml;
      elements.markdownOutput.value = markdown;

      elements.wordsStat.textContent = new Intl.NumberFormat("en-US").format(
        countWords(plainText),
      );
      elements.charsStat.textContent = new Intl.NumberFormat("en-US").format(
        plainText.length,
      );
      elements.paragraphsStat.textContent = new Intl.NumberFormat("en-US").format(
        paragraphCount,
      );
      elements.tablesStat.textContent = new Intl.NumberFormat("en-US").format(
        tableCount,
      );
      elements.imagesStat.textContent = new Intl.NumberFormat("en-US").format(
        imageEntries.length,
      );
      elements.linksStat.textContent = new Intl.NumberFormat("en-US").format(
        hyperlinkCount,
      );

      renderMetadata(metadata);
      renderKeyValueGrid(elements.structureGrid, inspection.structure);
      renderLinks(inspection.links);
      renderMedia(imageEntries);
      elements.privacySummary.textContent = buildPrivacySummary(
        metadata,
        inspection.structure,
      );

      const uniqueWarnings = [...new Set(state.warnings)];
      elements.warningSummary.textContent = uniqueWarnings.length
        ? `${uniqueWarnings.length} conversion note${uniqueWarnings.length === 1 ? "" : "s"} detected. The document was still processed; unsupported Word-specific layout may be simplified.`
        : "No conversion warnings were reported.";

      elements.resultSection.hidden = false;
      setProcessing(false);
      elements.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
      notify("DOCX processed successfully.", "success");
    } catch (error) {
      console.error("Word Toolkit processing failed:", error);

      if (token === state.operationToken) {
        resetOutputs();
        setProcessing(false);
        notify(
          error instanceof Error && error.message
            ? error.message
            : "The DOCX file could not be processed.",
          "error",
        );
      }
    } finally {
      if (token === state.operationToken) {
        hideProgress();
        setProcessing(false);
      }
    }
  }

  async function downloadImages() {
    if (!state.zip || !state.imageEntries.length) {
      notify("This document does not contain extractable embedded images.", "error");
      return;
    }

    try {
      const outputZip = new window.JSZip();

      for (const entryPath of state.imageEntries) {
        const entry = state.zip.file(entryPath);

        if (!entry) {
          continue;
        }

        const fileName = entryPath.split("/").pop() || "image";
        outputZip.file(`images/${fileName}`, await entry.async("uint8array"));
      }

      const blob = await outputZip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${getDownloadBaseName()}-images.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      if (typeof window.showDownloadSuccess === "function") {
        window.showDownloadSuccess();
      } else {
        notify("Images ZIP download started.", "success");
      }
    } catch (error) {
      console.error("Word Toolkit image extraction failed:", error);
      notify("The embedded images could not be exported.", "error");
    }
  }

  async function copyContent(content, successMessage, emptyMessage) {
    if (!content) {
      notify(emptyMessage, "error");
      return;
    }

    if (typeof window.xavertCopyText === "function") {
      await window.xavertCopyText(content, successMessage);
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      notify(successMessage, "success");
    } catch {
      notify("Copy failed. Select and copy the content manually.", "error");
    }
  }

  function copyText() {
    return copyContent(
      state.plainText,
      "Extracted text copied.",
      "There is no extracted text to copy.",
    );
  }

  function copyHtml() {
    return copyContent(
      state.sanitizedHtml,
      "HTML copied.",
      "There is no converted HTML to copy.",
    );
  }

  function copyMarkdown() {
    return copyContent(
      state.markdown,
      "Markdown copied.",
      "There is no converted Markdown to copy.",
    );
  }

  function downloadTextFile(name, content, type, successMessage) {
    if (!content) {
      notify("There is no processed content to download.", "error");
      return;
    }

    if (typeof window.downloadFile === "function") {
      window.downloadFile(name, content, type, successMessage);
      return;
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    notify(successMessage, "success");
  }

  function clearTool() {
    state.operationToken += 1;
    state.file = null;
    elements.docxInput.value = "";
    elements.fileInfo.textContent = "No document selected.";
    elements.processBtn.disabled = true;
    hideProgress();
    resetOutputs();
    setInlineMessage("", "info");
    setProcessing(false);
    elements.dropZone.focus();
  }

  elements.dropZone.addEventListener("click", () => {
    if (!state.isProcessing) {
      elements.docxInput.click();
    }
  });

  elements.dropZone.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !state.isProcessing) {
      event.preventDefault();
      elements.docxInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();

      if (!state.isProcessing) {
        elements.dropZone.classList.add("dragover");
      }
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, () => {
      elements.dropZone.classList.remove("dragover");
    });
  });

  elements.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();

    if (state.isProcessing) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      setSelectedFile(file);
    }
  });

  elements.docxInput.addEventListener("change", () => {
    const file = elements.docxInput.files?.[0];

    if (file) {
      setSelectedFile(file);
    }
  });

  elements.processBtn.addEventListener("click", processDocument);
  elements.replaceBtn.addEventListener("click", () => {
    if (!state.isProcessing) {
      elements.docxInput.click();
    }
  });
  elements.clearBtn.addEventListener("click", clearTool);

  tabs.forEach(([button], index) => {
    button.addEventListener("click", () => selectTab(button));
    button.addEventListener("keydown", (event) => {
      let targetIndex = index;

      if (event.key === "ArrowRight") {
        targetIndex = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        targetIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        targetIndex = 0;
      } else if (event.key === "End") {
        targetIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      selectTab(tabs[targetIndex][0], true);
    });
  });

  elements.copyTextBtn.addEventListener("click", copyText);
  elements.copyHtmlBtn.addEventListener("click", copyHtml);
  elements.copyMarkdownBtn.addEventListener("click", copyMarkdown);

  elements.downloadTxtBtn.addEventListener("click", () => {
    downloadTextFile(
      `${getDownloadBaseName()}.txt`,
      state.plainText,
      "text/plain;charset=utf-8",
      "TXT download started.",
    );
  });

  elements.downloadHtmlBtn.addEventListener("click", () => {
    downloadTextFile(
      `${getDownloadBaseName()}.html`,
      buildHtmlDocument(state.sanitizedHtml),
      "text/html;charset=utf-8",
      "HTML download started.",
    );
  });

  elements.downloadMarkdownBtn.addEventListener("click", () => {
    downloadTextFile(
      `${getDownloadBaseName()}.md`,
      state.markdown,
      "text/markdown;charset=utf-8",
      "Markdown download started.",
    );
  });

  elements.downloadImagesBtn.addEventListener("click", downloadImages);
  elements.downloadCleanDocxBtn.addEventListener(
    "click",
    downloadMetadataCleanedDocx,
  );

  elements.mediaList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-media-path]");
    if (button?.dataset.mediaPath) {
      void downloadSingleMedia(button.dataset.mediaPath);
    }
  });

  resetOutputs();
  setProcessing(false);
});
