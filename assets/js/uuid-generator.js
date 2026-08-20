"use strict";

function initUuidGenerator() {
  const uuidVersion = document.getElementById("uuidVersion");
  const quantity = document.getElementById("quantity");

  const generateBtn = document.getElementById("generateBtn");
  const generateSingleBtn = document.getElementById("generateSingleBtn");
  const clearBtn = document.getElementById("clearBtn");

  const resultBox = document.getElementById("resultBox");
  const uuidOutput = document.getElementById("uuidOutput");
  const uuidCount = document.getElementById("uuidCount");
  const uuidVersionInfo = document.getElementById("uuidVersionInfo");

  const copyBtn = document.getElementById("copyBtn");
  const downloadTxtBtn = document.getElementById("downloadTxtBtn");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  const downloadJsonBtn = document.getElementById("downloadJsonBtn");
  const message = document.getElementById("message");

  const required = [
    uuidVersion,
    quantity,
    generateBtn,
    generateSingleBtn,
    clearBtn,
    resultBox,
    uuidOutput,
    uuidCount,
    uuidVersionInfo,
    copyBtn,
    downloadTxtBtn,
    downloadCsvBtn,
    downloadJsonBtn,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("UUID Generator: HTML and JS do not match.");
    return;
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

  function getSecureRandomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  function bytesToUuid(bytes) {
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  function generateUuidV4() {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    const bytes = getSecureRandomBytes(16);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return bytesToUuid(bytes);
  }

  function generateUuidV7() {
    const bytes = getSecureRandomBytes(16);
    let timestamp = BigInt(Date.now());

    for (let index = 5; index >= 0; index -= 1) {
      bytes[index] = Number(timestamp & 0xffn);
      timestamp >>= 8n;
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return bytesToUuid(bytes);
  }

  function resetResult() {
    uuidOutput.value = "";
    uuidCount.textContent = "UUIDs: 0";
    uuidVersionInfo.textContent = "Version: —";
    resultBox.hidden = true;

    copyBtn.disabled = true;
    downloadTxtBtn.disabled = true;
    downloadCsvBtn.disabled = true;
    downloadJsonBtn.disabled = true;
  }

  function getUuidList() {
    return uuidOutput.value
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function announceActionSuccess() {
    setInlineMessage("Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
    }
  }

  function generateUuids(forceSingle = false) {
    const amount = forceSingle ? 1 : Number.parseInt(quantity.value, 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
      resetResult();

      notify("Please enter a value between 1 and 10000.", "error");

      quantity.focus();
      return false;
    }

    if (forceSingle) {
      quantity.value = "1";
    }

    const version = uuidVersion.value;
    const label = version.toUpperCase();

    const generator = version === "v7" ? generateUuidV7 : generateUuidV4;

    const generated = Array.from({ length: amount }, generator);

    uuidOutput.value = generated.join("\n");
    uuidCount.textContent = `UUIDs: ${generated.length}`;
    uuidVersionInfo.textContent = `Version: ${label}`;
    resultBox.hidden = false;

    copyBtn.disabled = false;
    downloadTxtBtn.disabled = false;
    downloadCsvBtn.disabled = false;
    downloadJsonBtn.disabled = false;

    announceActionSuccess();

    return true;
  }

  async function copyAll() {
    if (!uuidOutput.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(uuidOutput.value);
  }

  function downloadText() {
    const list = getUuidList();

    if (!list.length) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      `xavert-${uuidVersion.value}-uuids.txt`,
      `${list.join("\n")}\n`,
      "text/plain;charset=utf-8",
    );
  }

  function downloadCsv() {
    const list = getUuidList();

    if (!list.length) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      `xavert-${uuidVersion.value}-uuids.csv`,
      `uuid\n${list.join("\n")}\n`,
      "text/csv;charset=utf-8",
    );
  }

  function downloadJson() {
    const list = getUuidList();

    if (!list.length) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      `xavert-${uuidVersion.value}-uuids.json`,
      JSON.stringify(list, null, 2),
      "application/json;charset=utf-8",
    );
  }

  function invalidateResult() {
    if (!resultBox.hidden) {
      resetResult();
    }

    clearPersistentMessage();
  }

  function clearResults() {
    uuidVersion.value = "v4";
    quantity.value = "1";

    resetResult();
    clearPersistentMessage();
    quantity.focus();
  }

  uuidVersion.addEventListener("change", invalidateResult);
  quantity.addEventListener("input", invalidateResult);

  generateBtn.addEventListener("click", () => {
    generateUuids(false);
  });

  generateSingleBtn.addEventListener("click", () => {
    generateUuids(true);
  });

  copyBtn.addEventListener("click", () => {
    void copyAll();
  });

  downloadTxtBtn.addEventListener("click", downloadText);
  downloadCsvBtn.addEventListener("click", downloadCsv);
  downloadJsonBtn.addEventListener("click", downloadJson);

  clearBtn.addEventListener("click", clearResults);

  resetResult();
}

initUuidGenerator();
