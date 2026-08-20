"use strict";

function initXmlJsonConverter() {
  const inputData = document.getElementById("inputData");
  const outputData = document.getElementById("outputData");

  const xmlToJsonBtn = document.getElementById("xmlToJsonBtn");
  const jsonToXmlBtn = document.getElementById("jsonToXmlBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const formatBtn = document.getElementById("formatBtn");
  const minifyBtn = document.getElementById("minifyBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearBtn = document.getElementById("clearBtn");

  const inputChars = document.getElementById("inputChars");
  const outputChars = document.getElementById("outputChars");
  const lineCount = document.getElementById("lineCount");
  const statusText = document.getElementById("statusText");
  const message = document.getElementById("message");

  const required = [
    inputData,
    outputData,
    xmlToJsonBtn,
    jsonToXmlBtn,
    sampleBtn,
    formatBtn,
    minifyBtn,
    copyBtn,
    downloadBtn,
    clearBtn,
    inputChars,
    outputChars,
    lineCount,
    statusText,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("XML ↔ JSON Converter: HTML and JS do not match.");
    return;
  }

  let outputType = "";

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

  function updateStats() {
    inputChars.textContent = String(Array.from(inputData.value).length);

    outputChars.textContent = String(Array.from(outputData.value).length);

    lineCount.textContent = String(
      outputData.value ? outputData.value.split(/\r?\n/).length : 0,
    );
  }

  function parseXml(xml) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(xml, "application/xml");

    const parserError = documentNode.querySelector("parsererror");

    if (parserError) {
      throw new Error("Invalid XML.");
    }

    return documentNode;
  }

  function xmlNodeToObject(node) {
    const object = {};

    if (node.attributes?.length) {
      object["@attributes"] = {};

      Array.from(node.attributes).forEach((attribute) => {
        object["@attributes"][attribute.name] = attribute.value;
      });
    }

    const comments = Array.from(node.childNodes)
      .filter((child) => child.nodeType === Node.COMMENT_NODE)
      .map((child) => (child.nodeValue ?? "").trim())
      .filter(Boolean);

    if (comments.length) {
      object["@comments"] = comments;
    }

    const elementChildren = Array.from(node.children);

    const text = Array.from(node.childNodes)
      .filter(
        (child) =>
          child.nodeType === Node.TEXT_NODE ||
          child.nodeType === Node.CDATA_SECTION_NODE,
      )
      .map((child) => child.nodeValue ?? "")
      .join("")
      .trim();

    if (!elementChildren.length) {
      if (!Object.keys(object).length) {
        return text;
      }

      if (text) {
        object["#text"] = text;
      }

      return object;
    }

    if (text) {
      object["#text"] = text;
    }

    elementChildren.forEach((child) => {
      const value = xmlNodeToObject(child);

      if (Object.prototype.hasOwnProperty.call(object, child.nodeName)) {
        if (!Array.isArray(object[child.nodeName])) {
          object[child.nodeName] = [object[child.nodeName]];
        }

        object[child.nodeName].push(value);
      } else {
        object[child.nodeName] = value;
      }
    });

    return object;
  }

  function escapeXmlText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeXmlAttribute(value) {
    return escapeXmlText(value).replace(/"/g, "&quot;");
  }

  function objectToXml(name, value) {
    if (!name || !/^[A-Za-z_][\w.:-]*$/.test(name)) {
      throw new Error(`Invalid XML element name: ${name || "(empty)"}`);
    }

    if (Array.isArray(value)) {
      return value.map((item) => objectToXml(name, item)).join("");
    }

    if (value === null || value === undefined) {
      return `<${name}/>`;
    }

    if (typeof value !== "object") {
      return `<${name}>${escapeXmlText(value)}</${name}>`;
    }

    let attributes = "";

    const attributeMap = value["@attributes"];

    if (
      attributeMap &&
      typeof attributeMap === "object" &&
      !Array.isArray(attributeMap)
    ) {
      Object.entries(attributeMap).forEach(([attribute, attributeValue]) => {
        if (!/^[A-Za-z_][\w.:-]*$/.test(attribute)) {
          throw new Error(`Invalid XML attribute name: ${attribute}`);
        }

        attributes += ` ${attribute}="${escapeXmlAttribute(attributeValue)}"`;
      });
    }

    const childKeys = Object.keys(value).filter(
      (key) => key !== "@attributes" && key !== "@comments" && key !== "#text",
    );

    const comments = Array.isArray(value["@comments"])
      ? value["@comments"]
      : [];

    const text =
      value["#text"] === undefined ? "" : escapeXmlText(value["#text"]);

    if (!childKeys.length && !comments.length && !text) {
      return `<${name}${attributes}/>`;
    }

    let xml = `<${name}${attributes}>`;

    comments.forEach((comment) => {
      const safeComment = String(comment).replace(/--/g, "—");
      xml += `<!--${safeComment}-->`;
    });

    xml += text;

    childKeys.forEach((key) => {
      xml += objectToXml(key, value[key]);
    });

    xml += `</${name}>`;

    return xml;
  }

  function serializeXmlPretty(xml) {
    const documentNode = parseXml(xml);

    function serializeNode(node, level = 0) {
      const indent = "  ".repeat(level);

      if (node.nodeType === Node.DOCUMENT_NODE) {
        return Array.from(node.childNodes)
          .map((child) => serializeNode(child, level))
          .filter(Boolean)
          .join("\n");
      }

      if (node.nodeType === Node.COMMENT_NODE) {
        return `${indent}<!--${node.nodeValue ?? ""}-->`;
      }

      if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
        return `${indent}<?${node.target} ${node.data}?>`.trimEnd();
      }

      if (node.nodeType === Node.CDATA_SECTION_NODE) {
        return `${indent}<![CDATA[${node.nodeValue ?? ""}]]>`;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue ?? "";

        return text.trim() ? `${indent}${escapeXmlText(text.trim())}` : "";
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

      const children = Array.from(node.childNodes).filter((child) => {
        if (child.nodeType !== Node.TEXT_NODE) {
          return true;
        }

        return Boolean((child.nodeValue ?? "").trim());
      });

      if (!children.length) {
        return `${indent}<${node.tagName}${attributes}/>`;
      }

      if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
        return (
          `${indent}<${node.tagName}${attributes}>` +
          `${escapeXmlText(children[0].nodeValue ?? "")}` +
          `</${node.tagName}>`
        );
      }

      const content = children
        .map((child) => serializeNode(child, level + 1))
        .filter(Boolean)
        .join("\n");

      return (
        `${indent}<${node.tagName}${attributes}>\n` +
        `${content}\n` +
        `${indent}</${node.tagName}>`
      );
    }

    return serializeNode(documentNode);
  }

  function minifyXml(xml) {
    const documentNode = parseXml(xml);
    const clone = documentNode.cloneNode(true);

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);

    const removable = [];
    let current = walker.nextNode();

    while (current) {
      if (!(current.nodeValue ?? "").trim()) {
        removable.push(current);
      }

      current = walker.nextNode();
    }

    removable.forEach((node) => {
      node.parentNode?.removeChild(node);
    });

    return new XMLSerializer().serializeToString(clone);
  }

  function resetOutput() {
    outputData.value = "";
    outputType = "";
    statusText.textContent = "Ready";

    copyBtn.disabled = true;
    downloadBtn.disabled = true;

    updateStats();
  }

  function xmlToJson({ announce = true } = {}) {
    const input = inputData.value.trim();

    if (!input) {
      resetOutput();
      notify("Please enter XML.", "error");
      inputData.focus();
      return false;
    }

    try {
      const documentNode = parseXml(input);
      const root = documentNode.documentElement;

      const result = {
        [root.nodeName]: xmlNodeToObject(root),
      };

      outputData.value = JSON.stringify(result, null, 2);
      outputType = "json";
      statusText.textContent = "XML → JSON";

      copyBtn.disabled = false;
      downloadBtn.disabled = false;

      updateStats();

      if (announce) {
        announceActionSuccess();
      }

      return true;
    } catch {
      resetOutput();
      statusText.textContent = "Error";
      notify("Invalid XML.", "error");
      return false;
    }
  }

  function jsonToXml() {
    const input = inputData.value.trim();

    if (!input) {
      resetOutput();
      notify("Please enter JSON.", "error");
      inputData.focus();
      return;
    }

    try {
      const json = JSON.parse(input);
      const keys = Object.keys(json);

      if (
        !json ||
        typeof json !== "object" ||
        Array.isArray(json) ||
        keys.length !== 1
      ) {
        throw new Error("JSON must contain exactly one root property.");
      }

      outputData.value = objectToXml(keys[0], json[keys[0]]);
      outputType = "xml";
      statusText.textContent = "JSON → XML";

      copyBtn.disabled = false;
      downloadBtn.disabled = false;

      updateStats();
      announceActionSuccess();

      return true;
    } catch (error) {
      resetOutput();
      statusText.textContent = "Error";

      notify(error instanceof Error ? error.message : "Invalid JSON.", "error");
      return false;
    }
  }

  function formatOutput() {
    if (!outputData.value.trim()) {
      notify("Nothing to format.", "error");
      return;
    }

    try {
      if (outputType === "json") {
        outputData.value = JSON.stringify(
          JSON.parse(outputData.value),
          null,
          2,
        );
      } else if (outputType === "xml") {
        outputData.value = serializeXmlPretty(outputData.value);
      } else {
        throw new Error();
      }

      updateStats();
      announceActionSuccess();
    } catch {
      notify("Unable to format output.", "error");
    }
  }

  function minifyOutput() {
    if (!outputData.value.trim()) {
      notify("Nothing to minify.", "error");
      return;
    }

    try {
      if (outputType === "json") {
        outputData.value = JSON.stringify(JSON.parse(outputData.value));
      } else if (outputType === "xml") {
        outputData.value = minifyXml(outputData.value);
      } else {
        throw new Error();
      }

      updateStats();
      announceActionSuccess();
    } catch {
      notify("Unable to minify output.", "error");
    }
  }

  async function copyOutput() {
    if (!outputData.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(outputData.value);
  }

  function downloadOutput() {
    if (!outputData.value) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    if (outputType === "json") {
      window.downloadFile(
        "xavert-data.json",
        outputData.value,
        "application/json;charset=utf-8",
      );
      return;
    }

    if (outputType === "xml") {
      window.downloadFile(
        "xavert-data.xml",
        outputData.value,
        "application/xml;charset=utf-8",
      );
      return;
    }

    notify("Unknown output format.", "error");
  }

  function invalidateOutput() {
    if (outputData.value) {
      resetOutput();
    } else {
      updateStats();
    }

    clearPersistentMessage();
  }

  function loadSample() {
    inputData.value = [
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

    const converted = xmlToJson({ announce: false });

    if (!converted) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    inputData.focus();
  }

  function clearTool() {
    inputData.value = "";
    resetOutput();
    clearPersistentMessage();
    inputData.focus();
  }

  inputData.addEventListener("input", invalidateOutput);

  xmlToJsonBtn.addEventListener("click", () => {
    xmlToJson();
  });

  jsonToXmlBtn.addEventListener("click", jsonToXml);

  sampleBtn.addEventListener("click", loadSample);

  formatBtn.addEventListener("click", formatOutput);

  minifyBtn.addEventListener("click", minifyOutput);

  copyBtn.addEventListener("click", () => {
    void copyOutput();
  });

  downloadBtn.addEventListener("click", downloadOutput);

  clearBtn.addEventListener("click", clearTool);

  resetOutput();
}

initXmlJsonConverter();
