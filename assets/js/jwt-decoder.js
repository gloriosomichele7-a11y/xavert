"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "jwt-decoder") {
    return;
  }

  const jwtInput = document.getElementById("jwtInput");

  const decodeBtn = document.getElementById("decodeBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const copyTokenBtn = document.getElementById("copyTokenBtn");
  const clearBtn = document.getElementById("clearBtn");

  const statsGrid = document.getElementById("statsGrid");
  const algValue = document.getElementById("algValue");
  const expValue = document.getElementById("expValue");
  const iatValue = document.getElementById("iatValue");
  const statusValue = document.getElementById("statusValue");
  const lengthValue = document.getElementById("lengthValue");

  const decodedGrid = document.getElementById("decodedGrid");
  const headerOutput = document.getElementById("headerOutput");
  const payloadOutput = document.getElementById("payloadOutput");

  const copyHeaderBtn = document.getElementById("copyHeaderBtn");
  const copyPayloadBtn = document.getElementById("copyPayloadBtn");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const message = document.getElementById("message");

  const requiredElements = {
    jwtInput,
    decodeBtn,
    sampleBtn,
    copyTokenBtn,
    clearBtn,
    statsGrid,
    algValue,
    expValue,
    iatValue,
    statusValue,
    lengthValue,
    decodedGrid,
    headerOutput,
    payloadOutput,
    copyHeaderBtn,
    copyPayloadBtn,
    copyAllBtn,
    downloadBtn,
    message,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error("JWT Decoder initialization failed.", missingElements);
    return;
  }

  const textDecoder = new TextDecoder("utf-8", {
    fatal: true,
  });

  let decodedHeader = null;
  let decodedPayload = null;
  let decodedAvailable = false;

  function setInlineMessage(text = "", type = "info") {
    const allowedTypes = ["success", "error", "info"];
    const safeType = allowedTypes.includes(type) ? type : "info";

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

  function notify(text = "", type = "info", useToast = true) {
    setInlineMessage(text, type);

    if (text && useToast && typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function base64UrlToBytes(value) {
    if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error("Invalid Base64URL segment.");
    }

    let base64 = value.replace(/-/g, "+").replace(/_/g, "/");

    const remainder = base64.length % 4;

    if (remainder === 1) {
      throw new Error("Invalid Base64URL length.");
    }

    if (remainder) {
      base64 += "=".repeat(4 - remainder);
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  function decodeJsonSegment(segment, label) {
    try {
      const text = textDecoder.decode(base64UrlToBytes(segment));

      const value = JSON.parse(text);

      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${label} must decode to a JSON object.`);
      }

      return value;
    } catch (error) {
      throw new Error(`Invalid JWT ${label.toLowerCase()}.`);
    }
  }

  function isNumericDate(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function formatNumericDate(value) {
    if (!isNumericDate(value)) {
      return "—";
    }

    const date = new Date(value * 1000);

    if (Number.isNaN(date.getTime())) {
      return "Invalid";
    }

    return date.toLocaleString();
  }

  function getTokenStatus(payload) {
    const now = Date.now() / 1000;

    if (isNumericDate(payload.nbf) && now < payload.nbf) {
      return {
        label: "Not Yet Valid",
        className: "jwt-status-not-yet-valid",
      };
    }

    if (isNumericDate(payload.exp) && now >= payload.exp) {
      return {
        label: "Expired",
        className: "jwt-status-expired",
      };
    }

    if (isNumericDate(payload.exp) || isNumericDate(payload.nbf)) {
      return {
        label: "Time Valid",
        className: "jwt-status-valid",
      };
    }

    return {
      label: "Unknown",
      className: "jwt-status-unknown",
    };
  }

  function resetStatusClass() {
    statusValue.classList.remove(
      "jwt-status-valid",
      "jwt-status-expired",
      "jwt-status-not-yet-valid",
      "jwt-status-unknown",
    );
  }

  function resetDecodedResult() {
    decodedHeader = null;
    decodedPayload = null;
    decodedAvailable = false;

    headerOutput.value = "";
    payloadOutput.value = "";

    algValue.textContent = "—";
    expValue.textContent = "—";
    iatValue.textContent = "—";
    statusValue.textContent = "—";
    lengthValue.textContent = "0";

    resetStatusClass();

    statsGrid.hidden = true;
    decodedGrid.hidden = true;

    copyHeaderBtn.disabled = true;
    copyPayloadBtn.disabled = true;
    copyAllBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function invalidateDecodedResult() {
    if (decodedAvailable) {
      resetDecodedResult();
    }

    setInlineMessage("");
  }

  function decodeJwt({ announce = true } = {}) {
    const token = jwtInput.value.trim();

    if (!token) {
      resetDecodedResult();
      notify("Please enter a JWT token.", "error");
      jwtInput.focus();
      return false;
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
      resetDecodedResult();

      notify("Invalid JWT format. Expected three segments.", "error");

      jwtInput.focus();
      return false;
    }

    try {
      const header = decodeJsonSegment(parts[0], "Header");

      const payload = decodeJsonSegment(parts[1], "Payload");

      const status = getTokenStatus(payload);

      decodedHeader = header;
      decodedPayload = payload;
      decodedAvailable = true;

      headerOutput.value = JSON.stringify(header, null, 2);

      payloadOutput.value = JSON.stringify(payload, null, 2);

      algValue.textContent = typeof header.alg === "string" ? header.alg : "—";

      expValue.textContent = formatNumericDate(payload.exp);

      iatValue.textContent = formatNumericDate(payload.iat);

      statusValue.textContent = status.label;

      resetStatusClass();
      statusValue.classList.add(status.className);

      lengthValue.textContent = String(Array.from(token).length);

      statsGrid.hidden = false;
      decodedGrid.hidden = false;

      copyHeaderBtn.disabled = false;
      copyPayloadBtn.disabled = false;
      copyAllBtn.disabled = false;
      downloadBtn.disabled = false;

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
      console.error("JWT decode failed:", error);

      resetDecodedResult();

      notify(
        error instanceof Error ? error.message : "Unable to decode JWT.",
        "error",
      );

      return false;
    }
  }

  function loadSampleJwt() {
    jwtInput.value =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlhBVkVSVCBVc2VyIiwiaWF0IjoxNzEwMDAwMDAwLCJleHAiOjQxMDI0NDQ4MDB9." +
      "sample-signature";

    resetDecodedResult();

    const decoded = decodeJwt({ announce: false });

    if (!decoded) {
      return;
    }

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    jwtInput.focus();
  }

  async function copyToken() {
    const token = jwtInput.value.trim();

    if (!token) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(token);
  }

  async function copyHeader() {
    if (!decodedAvailable || !headerOutput.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(headerOutput.value);
  }

  async function copyPayload() {
    if (!decodedAvailable || !payloadOutput.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(payloadOutput.value);
  }

  async function copyAll() {
    if (!decodedAvailable) {
      notify("Nothing to copy.", "error");
      return;
    }

    const output = [
      "HEADER",
      "",
      headerOutput.value,
      "",
      "PAYLOAD",
      "",
      payloadOutput.value,
    ].join("\n");

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(output);
  }

  function downloadDecodedJwt() {
    if (!decodedAvailable) {
      notify("Nothing to download.", "error");
      return;
    }

    const data = {
      header: decodedHeader,
      payload: decodedPayload,
      signatureVerified: false,
    };

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-decoded-jwt.json",
      JSON.stringify(data, null, 2),
      "application/json;charset=utf-8",
    );
  }

  function clearAll() {
    jwtInput.value = "";

    resetDecodedResult();
    setInlineMessage("");
    jwtInput.focus();
  }

  decodeBtn.addEventListener("click", decodeJwt);
  sampleBtn.addEventListener("click", loadSampleJwt);

  copyTokenBtn.addEventListener("click", () => {
    void copyToken();
  });

  clearBtn.addEventListener("click", clearAll);

  copyHeaderBtn.addEventListener("click", () => {
    void copyHeader();
  });

  copyPayloadBtn.addEventListener("click", () => {
    void copyPayload();
  });

  copyAllBtn.addEventListener("click", () => {
    void copyAll();
  });

  downloadBtn.addEventListener("click", downloadDecodedJwt);

  jwtInput.addEventListener("input", invalidateDecodedResult);

  resetDecodedResult();
});
