"use strict";

function initTextToolkit() {
  const toolSelector = document.getElementById("toolSelector");
  const message = document.getElementById("message");

  const panels = {
    counter: document.getElementById("counterTool"),
    case: document.getElementById("caseTool"),
    spaces: document.getElementById("spacesTool"),
    duplicates: document.getElementById("duplicatesTool"),
    sort: document.getElementById("sortTool"),
    findreplace: document.getElementById("findreplaceTool"),
    slug: document.getElementById("slugTool"),
    url: document.getElementById("urlTool"),
    base64: document.getElementById("base64Tool"),
  };

  if (
    !toolSelector ||
    !message ||
    Object.values(panels).some((panel) => !panel)
  ) {
    console.error("Text Toolkit: HTML and JS do not match.");
    return;
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  function byId(id) {
    return document.getElementById(id);
  }

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

  function clearWithToast() {
    clearPersistentMessage();
    /* Shared Core handles the standard Clear toast. */
  }

  function switchTool() {
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== toolSelector.value;
    });

    clearPersistentMessage();
  }

  function invalidateOutput(outputId, resultId = null) {
    const output = outputId ? byId(outputId) : null;
    const result = resultId ? byId(resultId) : null;

    if (output) {
      output.value = "";
    }

    if (result) {
      result.hidden = true;
    }
  }

  function countText() {
    const text = byId("counterInput").value;

    if (!text.trim()) {
      byId("counterResult").hidden = true;
      notify("Please enter text.", "error");
      byId("counterInput").focus();
      return;
    }

    const words = text.trim().split(/\s+/).length;
    const characters = Array.from(text).length;
    const noSpaces = Array.from(text.replace(/\s/g, "")).length;
    const lines = text.split(/\r?\n/).length;
    const paragraphs = text.trim().split(/\n\s*\n/).length;
    const sentences = (text.match(/[.!?]+(?=\s|$)/g) || []).length;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    byId("counterWords").textContent = String(words);
    byId("counterCharacters").textContent = String(characters);
    byId("counterNoSpaces").textContent = String(noSpaces);
    byId("counterSentences").textContent = String(sentences);
    byId("counterParagraphs").textContent = String(paragraphs);
    byId("counterLines").textContent = String(lines);
    byId("counterReading").textContent = `${readingTime} min`;

    byId("counterResult").hidden = false;

    notify("Analysis completed.", "success");
  }

  function convertCase() {
    const text = byId("caseInput").value;
    const mode = byId("caseMode").value;

    if (!text) {
      notify("Please enter text.", "error");
      byId("caseInput").focus();
      return;
    }

    let output = text;

    if (mode === "upper") {
      output = text.toUpperCase();
    } else if (mode === "lower") {
      output = text.toLowerCase();
    } else if (mode === "title") {
      output = text
        .toLowerCase()
        .replace(/\b[\p{L}\p{N}]/gu, (char) => char.toUpperCase());
    } else if (mode === "sentence") {
      output = text
        .toLowerCase()
        .replace(/(^\s*[\p{L}\p{N}]|[.!?]\s+[\p{L}\p{N}])/gu, (part) =>
          part.toUpperCase(),
        );
    } else if (mode === "alternating") {
      let letterIndex = 0;

      output = Array.from(text)
        .map((char) => {
          if (!/\p{L}/u.test(char)) {
            return char;
          }

          const result =
            letterIndex % 2 === 0 ? char.toLowerCase() : char.toUpperCase();

          letterIndex += 1;
          return result;
        })
        .join("");
    }

    byId("caseOutput").value = output;
    notify("Text converted successfully.", "success");
  }

  function removeExtraSpaces() {
    const text = byId("spacesInput").value;

    if (!text) {
      notify("Please enter text.", "error");
      byId("spacesInput").focus();
      return;
    }

    byId("spacesOutput").value = text
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    notify("Text cleaned successfully.", "success");
  }

  function removeDuplicateLines() {
    const text = byId("duplicatesInput").value;

    if (!text) {
      notify("Please enter text.", "error");
      byId("duplicatesInput").focus();
      return;
    }

    const seen = new Set();
    const unique = [];

    text.split(/\r?\n/).forEach((line) => {
      if (!seen.has(line)) {
        seen.add(line);
        unique.push(line);
      }
    });

    byId("duplicatesOutput").value = unique.join("\n");
    notify("Duplicate lines removed successfully.", "success");
  }

  function sortLines() {
    const text = byId("sortInput").value;

    if (!text) {
      notify("Please enter text.", "error");
      byId("sortInput").focus();
      return;
    }

    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });

    const lines = text.split(/\r?\n/).sort((a, b) => collator.compare(a, b));

    if (byId("sortMode").value === "za") {
      lines.reverse();
    }

    byId("sortOutput").value = lines.join("\n");
    notify("Lines sorted successfully.", "success");
  }

  function findAndReplace() {
    const text = byId("findReplaceInput").value;
    const find = byId("findText").value;
    const replacement = byId("replaceText").value;

    if (!text) {
      notify("Please enter text.", "error");
      byId("findReplaceInput").focus();
      return;
    }

    if (!find) {
      notify("Please enter text to find.", "error");
      byId("findText").focus();
      return;
    }

    byId("findReplaceOutput").value = text.split(find).join(replacement);

    notify("Text replaced successfully.", "success");
  }

  function textToSlug() {
    const text = byId("slugInput").value;

    if (!text.trim()) {
      notify("Please enter text.", "error");
      byId("slugInput").focus();
      return;
    }

    byId("slugOutput").value = text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    notify("Slug generated successfully.", "success");
  }

  function processUrl() {
    const text = byId("urlInput").value;

    if (!text) {
      notify("Please enter text.", "error");
      byId("urlInput").focus();
      return;
    }

    try {
      byId("urlOutput").value =
        byId("urlMode").value === "encode"
          ? encodeURIComponent(text)
          : decodeURIComponent(text);

      notify("URL processed successfully.", "success");
    } catch {
      byId("urlOutput").value = "";
      notify("Invalid encoded URL.", "error");
    }
  }

  function bytesToBase64(bytes) {
    let binary = "";

    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary);
  }

  function base64ToBytes(value) {
    const normalized = value.replace(/\s+/g, "");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  function processBase64() {
    const text = byId("base64Input").value;

    if (!text) {
      notify("Please enter text.", "error");
      byId("base64Input").focus();
      return;
    }

    try {
      if (byId("base64Mode").value === "encode") {
        byId("base64Output").value = bytesToBase64(encoder.encode(text));
      } else {
        byId("base64Output").value = decoder.decode(base64ToBytes(text));
      }

      notify("Base64 processed successfully.", "success");
    } catch {
      byId("base64Output").value = "";
      notify("Invalid Base64 string.", "error");
    }
  }

  const operations = {
    counter: countText,
    case: convertCase,
    spaces: removeExtraSpaces,
    duplicates: removeDuplicateLines,
    sort: sortLines,
    findreplace: findAndReplace,
    slug: textToSlug,
    url: processUrl,
    base64: processBase64,
  };

  [
    ["counterBtn", countText],
    ["caseBtn", convertCase],
    ["spacesBtn", removeExtraSpaces],
    ["duplicatesBtn", removeDuplicateLines],
    ["sortBtn", sortLines],
    ["findReplaceBtn", findAndReplace],
    ["slugBtn", textToSlug],
    ["urlBtn", processUrl],
    ["base64Btn", processBase64],
  ].forEach(([id, handler]) => {
    byId(id).addEventListener("click", handler);
  });

  const clearConfigs = [
    ["counterClearBtn", ["counterInput"], null, "counterResult"],
    ["caseClearBtn", ["caseInput"], "caseOutput"],
    ["spacesClearBtn", ["spacesInput"], "spacesOutput"],
    ["duplicatesClearBtn", ["duplicatesInput"], "duplicatesOutput"],
    ["sortClearBtn", ["sortInput"], "sortOutput"],
    [
      "findReplaceClearBtn",
      ["findReplaceInput", "findText", "replaceText"],
      "findReplaceOutput",
    ],
    ["slugClearBtn", ["slugInput"], "slugOutput"],
    ["urlClearBtn", ["urlInput"], "urlOutput"],
    ["base64ClearBtn", ["base64Input"], "base64Output"],
  ];

  clearConfigs.forEach(([buttonId, inputIds, outputId, resultId]) => {
    byId(buttonId).addEventListener("click", () => {
      inputIds.forEach((id) => {
        byId(id).value = "";
      });

      if (outputId) {
        byId(outputId).value = "";
      }

      if (resultId) {
        byId(resultId).hidden = true;
      }

      if (buttonId === "caseClearBtn") byId("caseMode").value = "upper";
      if (buttonId === "sortClearBtn") byId("sortMode").value = "az";
      if (buttonId === "urlClearBtn") byId("urlMode").value = "encode";
      if (buttonId === "base64ClearBtn") byId("base64Mode").value = "encode";

      clearWithToast();
      byId(inputIds[0]).focus();
    });
  });

  [
    ["counterInput", null, "counterResult"],
    ["caseInput", "caseOutput"],
    ["caseMode", "caseOutput"],
    ["spacesInput", "spacesOutput"],
    ["duplicatesInput", "duplicatesOutput"],
    ["sortInput", "sortOutput"],
    ["sortMode", "sortOutput"],
    ["findReplaceInput", "findReplaceOutput"],
    ["findText", "findReplaceOutput"],
    ["replaceText", "findReplaceOutput"],
    ["slugInput", "slugOutput"],
    ["urlInput", "urlOutput"],
    ["urlMode", "urlOutput"],
    ["base64Input", "base64Output"],
    ["base64Mode", "base64Output"],
  ].forEach(([id, outputId, resultId]) => {
    const element = byId(id);
    const eventName = element instanceof HTMLSelectElement ? "change" : "input";

    element.addEventListener(eventName, () => {
      invalidateOutput(outputId, resultId);
      clearPersistentMessage();
    });
  });

  const sampleActions = [
    ["counterSampleBtn", countText],
    ["caseSampleBtn", convertCase],
    ["spacesSampleBtn", removeExtraSpaces],
    ["duplicatesSampleBtn", removeDuplicateLines],
    ["sortSampleBtn", sortLines],
    ["findReplaceSampleBtn", findAndReplace],
    ["urlSampleBtn", processUrl],
    ["base64SampleBtn", processBase64],
  ];

  sampleActions.forEach(([buttonId, handler]) => {
    const button = byId(buttonId);

    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      window.setTimeout(() => {
        handler();
      }, 0);
    });
  });

  toolSelector.addEventListener("change", switchTool);

  switchTool();
}

initTextToolkit();
