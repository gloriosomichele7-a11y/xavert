"use strict";

function initXmlFormatterValidator() {
  const xmlInput = document.getElementById("xmlInput");

  const formatBtn = document.getElementById("formatBtn");
  const minifyBtn = document.getElementById("minifyBtn");
  const validateBtn = document.getElementById("validateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearBtn = document.getElementById("clearBtn");

  const outputBox = document.getElementById("outputBox");
  const result = document.getElementById("result");
  const message = document.getElementById("message");

  const lineCount = document.getElementById("lineCount");
  const charCount = document.getElementById("charCount");
  const sizeCount = document.getElementById("sizeCount");
  const statusCount = document.getElementById("statusCount");

  const required = [
    xmlInput,
    formatBtn,
    minifyBtn,
    validateBtn,
    sampleBtn,
    copyBtn,
    downloadBtn,
    clearBtn,
    outputBox,
    result,
    message,
    lineCount,
    charCount,
    sizeCount,
    statusCount,
  ];

  if (required.some((element) => !element)) {
    console.error("XML Formatter & Validator: HTML and JS do not match.");
    return;
  }

  const serializer = new XMLSerializer();

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

  function parseXml(xml) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(xml, "application/xml");

    const parserError = documentNode.querySelector("parsererror");

    if (parserError) {
      return {
        valid: false,
        documentNode: null,
        error: parserError.textContent.replace(/\s+/g, " ").trim(),
      };
    }

    return {
      valid: true,
      documentNode,
      error: "",
    };
  }

  function escapeXmlText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeXmlAttribute(value) {
    return escapeXmlText(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function serializeNodePretty(node, level = 0) {
    const indent = "  ".repeat(level);

    if (node.nodeType === Node.DOCUMENT_NODE) {
      return Array.from(node.childNodes)
        .map((child) => serializeNodePretty(child, level))
        .filter(Boolean)
        .join("\n");
    }

    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      return `${indent}<?${node.target} ${node.data}?>`.trimEnd();
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      return `${indent}<!--${node.data}-->`;
    }

    if (node.nodeType === Node.CDATA_SECTION_NODE) {
      return `${indent}<![CDATA[${node.data}]]>`;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue ?? "";

      if (!text.trim()) {
        return "";
      }

      return `${indent}${escapeXmlText(text.trim())}`;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const attributes = Array.from(node.attributes)
      .map(
        (attribute) =>
          ` ${attribute.name}="${escapeXmlAttribute(attribute.value)}"`,
      )
      .join("");

    const children = Array.from(node.childNodes);
    const meaningfulChildren = children.filter((child) => {
      if (child.nodeType !== Node.TEXT_NODE) {
        return true;
      }

      return Boolean((child.nodeValue ?? "").trim());
    });

    if (!meaningfulChildren.length) {
      return `${indent}<${node.tagName}${attributes}/>`;
    }

    const inlineTextOnly =
      meaningfulChildren.length === 1 &&
      meaningfulChildren[0].nodeType === Node.TEXT_NODE;

    if (inlineTextOnly) {
      const text = meaningfulChildren[0].nodeValue ?? "";

      return (
        `${indent}<${node.tagName}${attributes}>` +
        `${escapeXmlText(text)}` +
        `</${node.tagName}>`
      );
    }

    const content = meaningfulChildren
      .map((child) => serializeNodePretty(child, level + 1))
      .filter(Boolean)
      .join("\n");

    return (
      `${indent}<${node.tagName}${attributes}>\n` +
      `${content}\n` +
      `${indent}</${node.tagName}>`
    );
  }

  function minifyDocument(documentNode) {
    const clone = documentNode.cloneNode(true);

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);

    const remove = [];
    let current = walker.nextNode();

    while (current) {
      if (!(current.nodeValue ?? "").trim()) {
        remove.push(current);
      }

      current = walker.nextNode();
    }

    remove.forEach((node) => {
      node.parentNode?.removeChild(node);
    });

    return serializer.serializeToString(clone);
  }

  function updateStats(text, isValid) {
    const lines = text ? text.split(/\r?\n/).length : 0;

    lineCount.textContent = String(lines);
    charCount.textContent = String(Array.from(text).length);
    sizeCount.textContent = String(new TextEncoder().encode(text).length);

    statusCount.textContent = isValid ? "OK" : "Error";

    statusCount.classList.toggle("xml-status-ok", isValid);
    statusCount.classList.toggle("xml-status-error", !isValid);
  }

  function resetOutput() {
    result.value = "";
    outputBox.hidden = true;

    lineCount.textContent = "0";
    charCount.textContent = "0";
    sizeCount.textContent = "0";
    statusCount.textContent = "—";

    statusCount.classList.remove("xml-status-ok", "xml-status-error");

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function renderOutput(text, isValid) {
    result.value = text;
    outputBox.hidden = false;

    updateStats(text, isValid);

    copyBtn.disabled = !text;
    downloadBtn.disabled = !text;
  }

  function getParsedInput() {
    const xml = xmlInput.value.trim();

    if (!xml) {
      resetOutput();
      notify("Paste XML first.", "error");
      xmlInput.focus();
      return null;
    }

    const parsed = parseXml(xml);

    if (!parsed.valid) {
      renderOutput(parsed.error, false);
      notify("Invalid XML detected.", "error");
      return null;
    }

    return parsed;
  }

  function handleFormat({ announce = true } = {}) {
    const parsed = getParsedInput();

    if (!parsed) {
      return false;
    }

    const formatted = serializeNodePretty(parsed.documentNode);

    renderOutput(formatted, true);

    if (announce) {
      announceActionSuccess();
    }

    return true;
  }

  function handleMinify() {
    const parsed = getParsedInput();

    if (!parsed) {
      return false;
    }

    const minified = minifyDocument(parsed.documentNode);

    renderOutput(minified, true);
    announceActionSuccess();

    return true;
  }

  function handleValidate() {
    const xml = xmlInput.value.trim();

    if (!xml) {
      resetOutput();
      notify("Paste XML first.", "error");
      xmlInput.focus();
      return false;
    }

    const parsed = parseXml(xml);

    if (parsed.valid) {
      renderOutput("Valid XML.", true);
      announceActionSuccess();
      return true;
    }

    renderOutput(parsed.error, false);
    notify("Invalid XML detected.", "error");

    return false;
  }

  function loadSample() {
    xmlInput.value = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<catalog>",
      '  <book id="1">',
      "    <title>XAVERT Guide</title>",
      "    <author>Example Author</author>",
      "  </book>",
      '  <book id="2">',
      "    <title>Browser Tools</title>",
      "    <author>Example Author</author>",
      "  </book>",
      "</catalog>",
    ].join("\n");

    resetOutput();
    clearPersistentMessage();

    const formatted = handleFormat({ announce: false });

    if (!formatted) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    xmlInput.focus();
  }

  async function copyResult() {
    if (!result.value.trim()) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(result.value);
  }

  function downloadResult() {
    if (!result.value.trim()) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-xml-result.xml",
      result.value,
      "application/xml;charset=utf-8",
    );
  }

  function invalidateResult() {
    if (!outputBox.hidden) {
      resetOutput();
    }

    clearPersistentMessage();
  }

  function clearTool() {
    xmlInput.value = "";

    resetOutput();
    clearPersistentMessage();
    xmlInput.focus();
  }

  xmlInput.addEventListener("input", invalidateResult);

  formatBtn.addEventListener("click", () => {
    handleFormat();
  });

  minifyBtn.addEventListener("click", handleMinify);
  validateBtn.addEventListener("click", handleValidate);
  sampleBtn.addEventListener("click", loadSample);

  copyBtn.addEventListener("click", () => {
    void copyResult();
  });

  downloadBtn.addEventListener("click", downloadResult);
  clearBtn.addEventListener("click", clearTool);

  resetOutput();
}

initXmlFormatterValidator();
