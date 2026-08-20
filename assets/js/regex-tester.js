"use strict";

function initRegexTester() {
  const pattern = document.getElementById("pattern");
  const inputText = document.getElementById("inputText");
  const flagG = document.getElementById("flagG");
  const flagI = document.getElementById("flagI");
  const flagM = document.getElementById("flagM");
  const testBtn = document.getElementById("testBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const copyMatchesBtn = document.getElementById("copyMatchesBtn");
  const downloadMatchesBtn = document.getElementById("downloadMatchesBtn");
  const clearBtn = document.getElementById("clearBtn");
  const resultBox = document.getElementById("resultBox");
  const preview = document.getElementById("preview");
  const matches = document.getElementById("matches");
  const message = document.getElementById("message");
  const matchCountStat = document.getElementById("matchCountStat");
  const patternLengthStat = document.getElementById("patternLengthStat");
  const textLengthStat = document.getElementById("textLengthStat");
  const flagsStat = document.getElementById("flagsStat");

  const presetButtons = Array.from(
    document.querySelectorAll("[data-regex-preset]"),
  );

  const required = [
    pattern,
    inputText,
    flagG,
    flagI,
    flagM,
    testBtn,
    sampleBtn,
    copyMatchesBtn,
    downloadMatchesBtn,
    clearBtn,
    resultBox,
    preview,
    matches,
    message,
    matchCountStat,
    patternLengthStat,
    textLengthStat,
    flagsStat,
  ];

  if (required.some((element) => !element)) {
    console.error("Regex Tester: HTML and JS do not match.");
    return;
  }

  let currentMatches = [];

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

  function getFlags() {
    let flags = "";

    if (flagG.checked) flags += "g";
    if (flagI.checked) flags += "i";
    if (flagM.checked) flags += "m";

    return flags;
  }

  function resetResult() {
    currentMatches = [];
    resultBox.hidden = true;
    preview.textContent = "Matches will appear here.";
    matches.replaceChildren();

    const item = document.createElement("li");
    item.textContent = "No matches yet.";
    matches.append(item);

    matchCountStat.textContent = "0";
    patternLengthStat.textContent = "0";
    textLengthStat.textContent = "0";
    flagsStat.textContent = "—";

    copyMatchesBtn.disabled = true;
    downloadMatchesBtn.disabled = true;
  }

  function collectMatches(regex, text, globalMode) {
    const found = [];

    if (globalMode) {
      let match;

      while ((match = regex.exec(text)) !== null) {
        found.push({
          value: match[0],
          index: match.index,
        });

        if (match[0] === "") {
          regex.lastIndex += 1;
        }
      }

      return found;
    }

    const match = regex.exec(text);

    if (match) {
      found.push({
        value: match[0],
        index: match.index,
      });
    }

    return found;
  }

  function renderPreview(text, found) {
    preview.replaceChildren();

    if (!found.length) {
      preview.textContent = text;
      return;
    }

    let cursor = 0;

    found.forEach(({ index, value }) => {
      if (index > cursor) {
        preview.append(document.createTextNode(text.slice(cursor, index)));
      }

      const mark = document.createElement("mark");
      mark.textContent = value;
      preview.append(mark);

      cursor = index + value.length;
    });

    if (cursor < text.length) {
      preview.append(document.createTextNode(text.slice(cursor)));
    }
  }

  function renderMatchList(found) {
    matches.replaceChildren();

    if (!found.length) {
      const item = document.createElement("li");
      item.textContent = "No matches found.";
      matches.append(item);
      return;
    }

    found.forEach((match, index) => {
      const item = document.createElement("li");
      item.textContent = `${index + 1}. ${match.value}`;
      matches.append(item);
    });
  }

  function testRegex({ announce = true } = {}) {
    const regexValue = pattern.value;
    const textValue = inputText.value;
    const flags = getFlags();

    if (!regexValue) {
      resetResult();
      notify("Please enter a regular expression.", "error");
      return false;
    }

    if (!textValue) {
      resetResult();
      notify("Please enter text to test.", "error");
      return false;
    }

    try {
      const regex = new RegExp(regexValue, flags);
      const found = collectMatches(regex, textValue, flags.includes("g"));

      currentMatches = found.map((item) => item.value);

      renderPreview(textValue, found);
      renderMatchList(found);

      matchCountStat.textContent = String(found.length);
      patternLengthStat.textContent = String(Array.from(regexValue).length);
      textLengthStat.textContent = String(Array.from(textValue).length);
      flagsStat.textContent = flags || "—";

      resultBox.hidden = false;
      copyMatchesBtn.disabled = !found.length;
      downloadMatchesBtn.disabled = !found.length;

      if (!found.length) {
        setInlineMessage("No matches found.", "info");
        return true;
      }

      if (announce) {
        setInlineMessage("Action completed successfully.", "success");

        if (typeof window.showActionSuccess === "function") {
          window.showActionSuccess();
        } else if (typeof window.showMessage === "function") {
          window.showMessage("Action completed successfully.", "success");
        }
      } else {
        setInlineMessage("");
      }

      return true;
    } catch (error) {
      resetResult();

      notify(
        `Invalid regular expression: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      );

      return false;
    }
  }

  function loadSample() {
    pattern.value = "\\d+";
    inputText.value =
      "Order 12345 was created on 2026-01-15.\n" +
      "Invoice 9876 contains 3 products.\n" +
      "Total amount: 250 euros.";
    flagG.checked = true;
    flagI.checked = false;
    flagM.checked = false;

    resetResult();
    setInlineMessage("");

    const tested = testRegex({ announce: false });

    if (!tested) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    pattern.focus();
  }

  async function copyMatches() {
    if (!currentMatches.length) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(currentMatches.join("\n"));
  }

  function downloadMatches() {
    if (!currentMatches.length) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-regex-matches.txt",
      currentMatches.join("\n"),
      "text/plain;charset=utf-8",
    );
  }

  function clearAll() {
    pattern.value = "";
    inputText.value = "";
    flagG.checked = true;
    flagI.checked = false;
    flagM.checked = false;

    resetResult();
    setInlineMessage("");
    pattern.focus();
  }

  function loadPreset(value) {
    pattern.value = value;

    if (!inputText.value.trim()) {
      inputText.value =
        "Contact us at support@xavert.com or visit https://xavert.com.\n" +
        "Order 12345 was created on 2026-01-15.\n" +
        "The quick brown fox jumps over 42 lazy dogs.";
    }

    testRegex();
  }

  function invalidateResult() {
    if (!resultBox.hidden) {
      resetResult();
    }

    setInlineMessage("");
  }

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      loadPreset(button.dataset.regexPreset ?? "");
    });
  });

  testBtn.addEventListener("click", () => {
    testRegex();
  });

  sampleBtn.addEventListener("click", loadSample);

  copyMatchesBtn.addEventListener("click", () => {
    void copyMatches();
  });

  downloadMatchesBtn.addEventListener("click", downloadMatches);
  clearBtn.addEventListener("click", clearAll);

  pattern.addEventListener("input", invalidateResult);
  inputText.addEventListener("input", invalidateResult);

  [flagG, flagI, flagM].forEach((flag) => {
    flag.addEventListener("change", invalidateResult);
  });

  resetResult();
}

initRegexTester();
