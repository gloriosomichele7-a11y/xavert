"use strict";

function initJwtGenerator() {
  const jwtHeader = document.getElementById("jwtHeader");
  const jwtPayload = document.getElementById("jwtPayload");
  const jwtSecret = document.getElementById("jwtSecret");
  const generateBtn = document.getElementById("generateBtn");
  const formatBtn = document.getElementById("formatBtn");
  const clearBtn = document.getElementById("clearBtn");
  const outputBox = document.getElementById("outputBox");
  const jwtOutput = document.getElementById("jwtOutput");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const headerPart = document.getElementById("headerPart");
  const payloadPart = document.getElementById("payloadPart");
  const signaturePart = document.getElementById("signaturePart");
  const copyHeaderBtn = document.getElementById("copyHeaderBtn");
  const copyPayloadBtn = document.getElementById("copyPayloadBtn");
  const copySignatureBtn = document.getElementById("copySignatureBtn");
  const tokenLength = document.getElementById("tokenLength");
  const headerSize = document.getElementById("headerSize");
  const payloadSize = document.getElementById("payloadSize");
  const algorithmStat = document.getElementById("algorithmStat");
  const headerCounter = document.getElementById("headerCounter");
  const payloadCounter = document.getElementById("payloadCounter");
  const message = document.getElementById("message");

  const required = [
    jwtHeader,
    jwtPayload,
    jwtSecret,
    generateBtn,
    formatBtn,
    clearBtn,
    outputBox,
    jwtOutput,
    copyBtn,
    downloadBtn,
    headerPart,
    payloadPart,
    signaturePart,
    copyHeaderBtn,
    copyPayloadBtn,
    copySignatureBtn,
    tokenLength,
    headerSize,
    payloadSize,
    algorithmStat,
    headerCounter,
    payloadCounter,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("JWT Generator: HTML and JS do not match.");
    return;
  }

  const encoder = new TextEncoder();

  let tokenResult = "";
  let headerResult = "";
  let payloadResult = "";
  let signatureResult = "";
  let generationVersion = 0;

  function setMessage(text = "", type = "info") {
    message.textContent = text;
    message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      message.classList.add(`message-${type}`);
    }
  }

  function notify(text, type = "info") {
    setMessage(text, type);

    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function updateCounters() {
    headerCounter.textContent = `${Array.from(jwtHeader.value).length} characters`;

    payloadCounter.textContent = `${Array.from(jwtPayload.value).length} characters`;
  }

  function validateField(field) {
    field.classList.remove("jwt-valid", "jwt-invalid");

    if (!field.value.trim()) {
      return;
    }

    try {
      const value = JSON.parse(field.value);
      const valid =
        value !== null && typeof value === "object" && !Array.isArray(value);

      field.classList.add(valid ? "jwt-valid" : "jwt-invalid");
    } catch {
      field.classList.add("jwt-invalid");
    }
  }

  function resetResult() {
    tokenResult = "";
    headerResult = "";
    payloadResult = "";
    signatureResult = "";

    jwtOutput.textContent = "";
    headerPart.textContent = "—";
    payloadPart.textContent = "—";
    signaturePart.textContent = "—";

    tokenLength.textContent = "0";
    headerSize.textContent = "0";
    payloadSize.textContent = "0";
    algorithmStat.textContent = "HS256";

    outputBox.hidden = true;

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    copyHeaderBtn.disabled = true;
    copyPayloadBtn.disabled = true;
    copySignatureBtn.disabled = true;
  }

  // Refuse JSON numbers that JavaScript would silently round or turn into Infinity.
  function assertSafeJsonNumbers(text, label) {
    let insideString = false;
    let escaped = false;
    const numberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (insideString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          insideString = false;
        }
        continue;
      }
      if (character === '"') {
        insideString = true;
        continue;
      }
      if (character !== "-" && !/[0-9]/.test(character)) {
        continue;
      }
      numberPattern.lastIndex = index;
      const match = numberPattern.exec(text);
      if (!match) {
        continue;
      }
      const value = Number(match[0]);
      if (
        !Number.isFinite(value) ||
        (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
        (value === 0 && /[1-9]/.test(match[0].replace(/[eE][+-]?\d+$/, "")))
      ) {
        throw new Error(`${label} contains a number that cannot be safely represented. Quote large identifiers or use a smaller number.`);
      }
      index = numberPattern.lastIndex - 1;
    }
  }

  function parseObject(text, label) {
    assertSafeJsonNumbers(text, label);
    let value;

    try {
      value = JSON.parse(text);
    } catch {
      throw new Error(`Invalid ${label} JSON.`);
    }

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${label} must be a JSON object.`);
    }

    return value;
  }

  function bytesToBase64Url(bytes) {
    let binary = "";

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function encodeSegment(value) {
    return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
  }

  async function signHs256(unsignedToken, secret) {
    if (!window.crypto?.subtle) {
      throw new Error(
        "Web Crypto unavailable. Open the project with Live Server or HTTPS.",
      );
    }

    const key = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );

    const signature = await window.crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(unsignedToken),
    );

    return bytesToBase64Url(new Uint8Array(signature));
  }

  async function generateJwt() {
    try {
      if (!jwtHeader.value.trim()) {
        throw new Error("Header JSON is required.");
      }

      if (!jwtPayload.value.trim()) {
        throw new Error("Payload JSON is required.");
      }

      if (!jwtSecret.value) {
        throw new Error("Secret key is required.");
      }

      const header = parseObject(jwtHeader.value, "Header");

      const payload = parseObject(jwtPayload.value, "Payload");

      if (
        typeof header.alg !== "string" ||
        header.alg !== "HS256"
      ) {
        throw new Error('JWT header must contain "alg": "HS256".');
      }

      generateBtn.disabled = true;
      const currentVersion = generationVersion;

      headerResult = encodeSegment(header);
      payloadResult = encodeSegment(payload);

      const unsignedToken = `${headerResult}.${payloadResult}`;

      signatureResult = await signHs256(unsignedToken, jwtSecret.value);
      if (currentVersion !== generationVersion) {
        return;
      }

      tokenResult = `${unsignedToken}.${signatureResult}`;

      jwtOutput.textContent = tokenResult;
      headerPart.textContent = headerResult;
      payloadPart.textContent = payloadResult;
      signaturePart.textContent = signatureResult;

      tokenLength.textContent = String(tokenResult.length);

      headerSize.textContent = String(JSON.stringify(header).length);

      payloadSize.textContent = String(JSON.stringify(payload).length);

      outputBox.hidden = false;

      copyBtn.disabled = false;
      downloadBtn.disabled = false;
      copyHeaderBtn.disabled = false;
      copyPayloadBtn.disabled = false;
      copySignatureBtn.disabled = false;

      setMessage("Action completed successfully.", "success");

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    } catch (error) {
      resetResult();

      notify(
        error instanceof Error ? error.message : "JWT generation failed.",
        "error",
      );
    } finally {
      generateBtn.disabled = false;
    }
  }

  function formatJson() {
    try {
      const header = parseObject(jwtHeader.value, "Header");

      const payload = parseObject(jwtPayload.value, "Payload");

      jwtHeader.value = JSON.stringify(header, null, 2);

      jwtPayload.value = JSON.stringify(payload, null, 2);

      resetResult();
      updateCounters();
      validateField(jwtHeader);
      validateField(jwtPayload);

      notify("JSON formatted.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Invalid JSON.", "error");
    }
  }

  async function copyValue(value) {
    if (!value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(value);
  }

  function downloadToken() {
    if (!tokenResult) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-jwt.txt",
      tokenResult,
      "text/plain;charset=utf-8",
    );
  }

  function clearTool() {
    generationVersion += 1;
    jwtHeader.value = "";
    jwtPayload.value = "";
    jwtSecret.value = "";

    jwtHeader.classList.remove("jwt-valid", "jwt-invalid");

    jwtPayload.classList.remove("jwt-valid", "jwt-invalid");

    resetResult();
    updateCounters();
    setMessage("");
    jwtHeader.focus();
  }

  generateBtn.addEventListener("click", () => {
    void generateJwt();
  });

  formatBtn.addEventListener("click", formatJson);

  clearBtn.addEventListener("click", clearTool);

  copyBtn.addEventListener("click", () => {
    void copyValue(tokenResult);
  });

  downloadBtn.addEventListener("click", downloadToken);

  copyHeaderBtn.addEventListener("click", () => {
    void copyValue(headerResult);
  });

  copyPayloadBtn.addEventListener("click", () => {
    void copyValue(payloadResult);
  });

  copySignatureBtn.addEventListener("click", () => {
    void copyValue(signatureResult);
  });

  jwtHeader.addEventListener("input", () => {
    generationVersion += 1;
    resetResult();
    updateCounters();
    validateField(jwtHeader);
    setMessage("");
  });

  jwtPayload.addEventListener("input", () => {
    generationVersion += 1;
    resetResult();
    updateCounters();
    validateField(jwtPayload);
    setMessage("");
  });

  jwtSecret.addEventListener("input", () => {
    generationVersion += 1;
    resetResult();
    setMessage("");
  });

  resetResult();
  updateCounters();
  setMessage("");
}

initJwtGenerator();
