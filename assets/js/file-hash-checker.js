"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "file-hash-checker") {
    return;
  }

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const fileInfo = document.getElementById("fileInfo");
  const hashProgressWrap = document.getElementById("hashProgressWrap");
  const hashProgress = document.getElementById("hashProgress");
  const hashProgressLabel = document.getElementById("hashProgressLabel");
  const hashAlgorithm = document.getElementById("hashAlgorithm");
  const expectedHash = document.getElementById("expectedHash");
  const generateBtn = document.getElementById("generateBtn");
  const clearBtn = document.getElementById("clearBtn");
  const resultBox = document.getElementById("resultBox");
  const algorithmStat = document.getElementById("algorithmStat");
  const fileSizeStat = document.getElementById("fileSizeStat");
  const hashLengthStat = document.getElementById("hashLengthStat");
  const verificationStat = document.getElementById("verificationStat");
  const resultFileName = document.getElementById("resultFileName");
  const generatedAt = document.getElementById("generatedAt");
  const hashLowercase = document.getElementById("hashLowercase");
  const hashUppercase = document.getElementById("hashUppercase");
  const copyLowerBtn = document.getElementById("copyLowerBtn");
  const copyUpperBtn = document.getElementById("copyUpperBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const message = document.getElementById("message");

  const requiredElements = {
    dropZone,
    fileInput,
    fileInfo,
    hashProgressWrap,
    hashProgress,
    hashProgressLabel,
    hashAlgorithm,
    expectedHash,
    generateBtn,
    clearBtn,
    resultBox,
    algorithmStat,
    fileSizeStat,
    hashLengthStat,
    verificationStat,
    resultFileName,
    generatedAt,
    hashLowercase,
    hashUppercase,
    copyLowerBtn,
    copyUpperBtn,
    downloadBtn,
    message,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error("File Hash Checker initialization failed.", missingElements);
    return;
  }

  const HASH_LENGTHS = {
    "SHA-1": 40,
    "SHA-256": 64,
    "SHA-384": 96,
    "SHA-512": 128,
  };

  let selectedFile = null;
  let currentHash = "";
  let currentReport = "";
  let generationToken = 0;
  let activeReader = null;
  let largeFileConfirmationKey = "";

  const MIB = 1024 ** 2;
  const deviceMemory = Number(navigator.deviceMemory);
  const memoryTier = Number.isFinite(deviceMemory) && deviceMemory > 0
    ? deviceMemory
    : null;

  const LARGE_FILE_WARNING_BYTES =
    memoryTier !== null && memoryTier <= 2
      ? 64 * MIB
      : memoryTier !== null && memoryTier <= 4
        ? 128 * MIB
        : memoryTier !== null && memoryTier >= 8
          ? 256 * MIB
          : 128 * MIB;

  const LARGE_FILE_HARD_LIMIT_BYTES =
    memoryTier !== null && memoryTier <= 2
      ? 192 * MIB
      : memoryTier !== null && memoryTier <= 4
        ? 384 * MIB
        : memoryTier !== null && memoryTier >= 8
          ? 768 * MIB
          : 384 * MIB;

  const hasWebCrypto =
    window.isSecureContext &&
    window.crypto?.subtle &&
    typeof window.crypto.subtle.digest === "function";

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

  function setProgress(value = 0, label = "", visible = true) {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

    hashProgress.value = safeValue;
    hashProgressLabel.textContent = label || "Preparing file...";
    hashProgressWrap.hidden = !visible;
  }

  function hideProgress() {
    hashProgress.value = 0;
    hashProgressLabel.textContent = "Preparing file...";
    hashProgressWrap.hidden = true;
  }

  function abortActiveReader() {
    if (activeReader && activeReader.readyState === FileReader.LOADING) {
      activeReader.abort();
    }

    activeReader = null;
  }

  function cancelGeneration() {
    generationToken += 1;
    abortActiveReader();
    generateBtn.disabled = false;
    generateBtn.removeAttribute("aria-busy");
    hideProgress();
  }

  function getLargeFileKey(file, algorithm) {
    return [file.name, file.size, file.lastModified, algorithm].join(":");
  }

  function readFileWithProgress(file, token, algorithm) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      activeReader = reader;

      reader.onprogress = (event) => {
        if (token !== generationToken || !event.lengthComputable) {
          return;
        }

        const readPercent = Math.round((event.loaded / event.total) * 100);
        const displayPercent = Math.min(80, Math.round(readPercent * 0.8));

        setProgress(
          displayPercent,
          `Reading file... ${readPercent}%`,
          true,
        );
      };

      reader.onload = () => {
        if (activeReader === reader) {
          activeReader = null;
        }

        if (token !== generationToken) {
          reject(new DOMException("Hash generation cancelled.", "AbortError"));
          return;
        }

        setProgress(85, `Computing ${algorithm} digest...`, true);
        resolve(reader.result);
      };

      reader.onerror = () => {
        if (activeReader === reader) {
          activeReader = null;
        }

        reject(reader.error || new Error("Unable to read the selected file."));
      };

      reader.onabort = () => {
        if (activeReader === reader) {
          activeReader = null;
        }

        reject(new DOMException("Hash generation cancelled.", "AbortError"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "0 B";
    }

    if (bytes === 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );

    const value = bytes / 1024 ** index;
    const decimals = index === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;

    return `${value.toFixed(decimals)} ${units[index]}`;
  }

  function normalizeExpectedHash(value) {
    return value.trim().replace(/\s+/g, "").toLowerCase();
  }

  function isHex(value) {
    return /^[0-9a-f]+$/i.test(value);
  }

  function getExpectedHashError() {
    const value = normalizeExpectedHash(expectedHash.value);

    if (!value) {
      return "";
    }

    const requiredLength = HASH_LENGTHS[hashAlgorithm.value];

    if (!isHex(value)) {
      return "Expected checksum must contain hexadecimal characters only.";
    }

    if (value.length !== requiredLength) {
      return `${hashAlgorithm.value} checksums must contain exactly ${requiredLength} hexadecimal characters.`;
    }

    return "";
  }

  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function getVerificationState(hash) {
    const expected = normalizeExpectedHash(expectedHash.value);

    if (!expected) {
      return {
        label: "Not checked",
        matches: null,
      };
    }

    const error = getExpectedHashError();

    if (error) {
      return {
        label: "Invalid",
        matches: false,
        error,
      };
    }

    const matches = expected === hash.toLowerCase();

    return {
      label: matches ? "Match" : "No match",
      matches,
    };
  }

  function createReport(file, algorithm, hash, timestamp, verification) {
    const lines = [
      "XAVERT File Hash Checker",
      "========================",
      "",
      `File: ${file.name}`,
      `Size: ${formatFileSize(file.size)} (${file.size} bytes)`,
      `Algorithm: ${algorithm}`,
      `Generated: ${timestamp}`,
      `Hash length: ${hash.length} characters`,
      `Verification: ${verification.label}`,
      "",
      "Hash Lowercase:",
      hash,
      "",
      "Hash Uppercase:",
      hash.toUpperCase(),
    ];

    if (expectedHash.value.trim()) {
      lines.push(
        "",
        "Expected Hash:",
        normalizeExpectedHash(expectedHash.value),
      );
    }

    return lines.join("\n");
  }

  function resetResult() {
    currentHash = "";
    currentReport = "";

    resultBox.hidden = true;

    algorithmStat.textContent = "—";
    fileSizeStat.textContent = "0 B";
    hashLengthStat.textContent = "0";
    verificationStat.textContent = "—";

    resultFileName.textContent = "";
    generatedAt.textContent = "";
    hashLowercase.textContent = "";
    hashUppercase.textContent = "";

    copyLowerBtn.disabled = true;
    copyUpperBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function invalidateResult() {
    if (!currentHash && resultBox.hidden) {
      return;
    }

    resetResult();

    notify("Configuration changed. Generate the hash again.", "info", false);
  }

  function updateVerification() {
    if (!currentHash || !selectedFile || resultBox.hidden) {
      setInlineMessage("");
      return;
    }

    const verification = getVerificationState(currentHash);
    verificationStat.textContent = verification.label;

    currentReport = createReport(
      selectedFile,
      hashAlgorithm.value,
      currentHash,
      generatedAt.textContent,
      verification,
    );

    if (verification.error) {
      setInlineMessage(verification.error, "error");
      return;
    }

    if (verification.matches === true) {
      setInlineMessage("Checksum matches the generated hash.", "success");
      return;
    }

    if (verification.matches === false) {
      setInlineMessage("Checksum does not match the generated hash.", "error");
      return;
    }

    setInlineMessage("");
  }

  function updateFileInfo() {
    if (!selectedFile) {
      fileInfo.textContent = "No file selected";
      return;
    }

    fileInfo.textContent = `${selectedFile.name} • ${formatFileSize(selectedFile.size)}`;
  }

  function setSelectedFile(file) {
    cancelGeneration();
    selectedFile = file || null;
    largeFileConfirmationKey = "";

    updateFileInfo();
    resetResult();

    setInlineMessage("");
  }

  async function generateHash(options = {}) {
    const announce = options.announce !== false;

    if (!hasWebCrypto) {
      notify(
        "Secure hashing is unavailable in this browser context.",
        "error",
        announce,
      );
      return false;
    }

    if (!selectedFile) {
      notify("Select a file first.", "error", announce);
      dropZone.focus();
      return false;
    }

    const expectedError = getExpectedHashError();

    if (expectedError) {
      notify(expectedError, "error", announce);
      expectedHash.focus();
      return false;
    }

    const file = selectedFile;
    const algorithm = hashAlgorithm.value;
    const confirmationKey = getLargeFileKey(file, algorithm);

    if (file.size > LARGE_FILE_HARD_LIMIT_BYTES) {
      largeFileConfirmationKey = "";
      notify(
        `This ${formatFileSize(file.size)} file is too large for safe in-browser hashing on this device. Use a desktop hashing utility for files above ${formatFileSize(LARGE_FILE_HARD_LIMIT_BYTES)}.`,
        "error",
        announce,
      );
      return false;
    }

    if (
      file.size > LARGE_FILE_WARNING_BYTES &&
      largeFileConfirmationKey !== confirmationKey
    ) {
      largeFileConfirmationKey = confirmationKey;
      notify(
        `Large file detected (${formatFileSize(file.size)}). Browser Web Crypto must load the file into memory. Click Generate Hash again to continue.`,
        "info",
        announce,
      );
      return false;
    }

    largeFileConfirmationKey = "";

    const token = ++generationToken;
    let buffer = null;

    generateBtn.disabled = true;
    generateBtn.setAttribute("aria-busy", "true");
    setProgress(0, `Preparing ${formatFileSize(file.size)} file...`, true);

    notify(`Generating ${algorithm} hash...`, "info", false);

    try {
      buffer = await readFileWithProgress(file, token, algorithm);

      if (token !== generationToken) {
        return false;
      }

      const digest = await window.crypto.subtle.digest(algorithm, buffer);
      buffer = null;

      if (token !== generationToken) {
        return false;
      }

      setProgress(100, `${algorithm} hash completed.`, true);

      const hash = bufferToHex(digest);
      const timestamp = new Date().toLocaleString();
      const verification = getVerificationState(hash);

      currentHash = hash;
      currentReport = createReport(
        file,
        algorithm,
        hash,
        timestamp,
        verification,
      );

      algorithmStat.textContent = algorithm;
      fileSizeStat.textContent = formatFileSize(file.size);
      hashLengthStat.textContent = String(hash.length);
      verificationStat.textContent = verification.label;

      resultFileName.textContent = file.name;
      generatedAt.textContent = timestamp;
      hashLowercase.textContent = hash;
      hashUppercase.textContent = hash.toUpperCase();

      copyLowerBtn.disabled = false;
      copyUpperBtn.disabled = false;
      downloadBtn.disabled = false;
      resultBox.hidden = false;

      if (verification.matches === false) {
        notify("Hash generated. Checksum does not match.", "error", announce);
      } else if (announce) {
        setInlineMessage("Action completed successfully.", "success");

        if (typeof window.showActionSuccess === "function") {
          window.showActionSuccess();
        } else if (typeof window.showMessage === "function") {
          window.showMessage("Action completed successfully.", "success");
        }
      } else if (verification.matches === true) {
        setInlineMessage("Checksum matches the generated hash.", "success");
      } else {
        setInlineMessage("");
      }

      window.setTimeout(() => {
        if (token === generationToken) {
          hideProgress();
        }
      }, 600);

      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        return false;
      }

      console.error("Hash generation failed:", error);

      resetResult();
      hideProgress();
      notify("Unable to generate the file hash.", "error", announce);

      return false;
    } finally {
      buffer = null;

      if (token === generationToken) {
        generateBtn.disabled = false;
        generateBtn.removeAttribute("aria-busy");
      }
    }
  }

  function clearTool() {
    cancelGeneration();
    selectedFile = null;
    largeFileConfirmationKey = "";

    fileInput.value = "";
    expectedHash.value = "";
    hashAlgorithm.value = "SHA-256";
    dropZone.classList.remove("dragover");

    updateFileInfo();
    resetResult();
    dropZone.focus();
  }

  async function copyHash(uppercase = false) {
    if (!currentHash) {
      notify("Generate a hash first.", "error");
      return;
    }

    const value = uppercase ? currentHash.toUpperCase() : currentHash;

    await window.xavertCopyText(value);
  }

  function downloadReport() {
    if (!currentReport) {
      notify("Generate a hash first.", "error");
      return;
    }

    window.downloadFile(
      "xavert-file-hash-report.txt",
      currentReport,
      "text/plain;charset=utf-8",
    );
  }

  function openFilePicker() {
    fileInput.click();
  }

  dropZone.addEventListener("click", openFilePicker);

  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    const files = event.dataTransfer?.files;

    if (!files?.length) {
      return;
    }

    if (files.length !== 1) {
      notify("Drop exactly one file.", "error");
      return;
    }

    setSelectedFile(files[0]);
  });

  fileInput.addEventListener("change", () => {
    setSelectedFile(fileInput.files?.[0] || null);
    fileInput.value = "";
  });

  hashAlgorithm.addEventListener("change", () => {
    cancelGeneration();
    largeFileConfirmationKey = "";
    invalidateResult();
  });
  expectedHash.addEventListener("input", () => {
    if (currentHash) {
      updateVerification();
    } else {
      setInlineMessage("");
    }
  });

  generateBtn.addEventListener("click", () => {
    void generateHash();
  });

  clearBtn.addEventListener("click", clearTool);

  copyLowerBtn.addEventListener("click", () => {
    void copyHash(false);
  });

  copyUpperBtn.addEventListener("click", () => {
    void copyHash(true);
  });

  downloadBtn.addEventListener("click", downloadReport);

  window.addEventListener("pagehide", abortActiveReader);

  resetResult();
  hideProgress();

  if (!hasWebCrypto) {
    generateBtn.disabled = true;

    notify(
      "Secure hashing requires a secure browser context with Web Crypto support.",
      "error",
      false,
    );
  }
});
