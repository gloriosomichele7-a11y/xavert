"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.tool !== "hash-generator") {
    return;
  }

  const inputText = document.getElementById("inputText");
  const hashAlgorithm = document.getElementById("hashAlgorithm");
  const outputFormat = document.getElementById("outputFormat");

  const generateBtn = document.getElementById("generateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");

  const resultBox = document.getElementById("resultBox");
  const hashOutput = document.getElementById("hashOutput");

  const charCount = document.getElementById("charCount");
  const byteCount = document.getElementById("byteCount");
  const algorithmCount = document.getElementById("algorithmCount");
  const hashLength = document.getElementById("hashLength");

  const copyBtn = document.getElementById("copyBtn");
  const downloadTxtBtn = document.getElementById("downloadTxtBtn");
  const downloadJsonBtn = document.getElementById("downloadJsonBtn");

  const message = document.getElementById("message");

  const requiredElements = {
    inputText,
    hashAlgorithm,
    outputFormat,
    generateBtn,
    sampleBtn,
    clearBtn,
    resultBox,
    hashOutput,
    charCount,
    byteCount,
    algorithmCount,
    hashLength,
    copyBtn,
    downloadTxtBtn,
    downloadJsonBtn,
    message,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error("Hash Generator initialization failed.", missingElements);
    return;
  }

  const textEncoder = new TextEncoder();

  const SHA_ALGORITHMS = {
    sha1: {
      label: "SHA-1",
      cryptoName: "SHA-1",
    },
    sha256: {
      label: "SHA-256",
      cryptoName: "SHA-256",
    },
    sha384: {
      label: "SHA-384",
      cryptoName: "SHA-384",
    },
    sha512: {
      label: "SHA-512",
      cryptoName: "SHA-512",
    },
  };

  let currentResults = {};
  let currentPlainText = "";
  let currentJsonText = "";
  let resultAvailable = false;
  let generationToken = 0;

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

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function cryptoHash(encoded, algorithm) {
    if (!hasWebCrypto) {
      throw new Error("Web Crypto is unavailable in this browser context.");
    }

    const digest = await window.crypto.subtle.digest(algorithm, encoded);

    return bytesToHex(digest);
  }

  function addUnsigned(x, y) {
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const result = (x & 0x3fffffff) + (y & 0x3fffffff);

    if (x4 & y4) {
      return result ^ 0x80000000 ^ x8 ^ y8;
    }

    if (x4 | y4) {
      if (result & 0x40000000) {
        return result ^ 0xc0000000 ^ x8 ^ y8;
      }

      return result ^ 0x40000000 ^ x8 ^ y8;
    }

    return result ^ x8 ^ y8;
  }

  function rotateLeft(value, shift) {
    return (value << shift) | (value >>> (32 - shift));
  }

  function md5F(x, y, z) {
    return (x & y) | (~x & z);
  }

  function md5G(x, y, z) {
    return (x & z) | (y & ~z);
  }

  function md5H(x, y, z) {
    return x ^ y ^ z;
  }

  function md5I(x, y, z) {
    return y ^ (x | ~z);
  }

  function md5Transform(fn, a, b, c, d, x, s, ac) {
    const value = addUnsigned(a, addUnsigned(addUnsigned(fn(b, c, d), x), ac));

    return addUnsigned(rotateLeft(value, s), b);
  }

  function md5WordToHex(value) {
    let output = "";

    for (let index = 0; index < 4; index += 1) {
      const byte = (value >>> (index * 8)) & 255;

      output += byte.toString(16).padStart(2, "0");
    }

    return output;
  }

  function md5BytesToWords(bytes) {
    const messageLength = bytes.length;
    const numberOfWords = (((messageLength + 8) >>> 6) + 1) * 16;

    const words = new Array(numberOfWords).fill(0);

    for (let index = 0; index < messageLength; index += 1) {
      words[index >>> 2] |= bytes[index] << ((index % 4) * 8);
    }

    words[messageLength >>> 2] |= 0x80 << ((messageLength % 4) * 8);

    const bitLengthLow = (messageLength << 3) >>> 0;

    const bitLengthHigh = Math.floor(messageLength / 0x20000000);

    words[numberOfWords - 2] = bitLengthLow;
    words[numberOfWords - 1] = bitLengthHigh;

    return words;
  }

  function md5Hash(bytes) {
    const x = md5BytesToWords(bytes);

    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
      const aa = a;
      const bb = b;
      const cc = c;
      const dd = d;

      a = md5Transform(md5F, a, b, c, d, x[k + 0], 7, 0xd76aa478);
      d = md5Transform(md5F, d, a, b, c, x[k + 1], 12, 0xe8c7b756);
      c = md5Transform(md5F, c, d, a, b, x[k + 2], 17, 0x242070db);
      b = md5Transform(md5F, b, c, d, a, x[k + 3], 22, 0xc1bdceee);
      a = md5Transform(md5F, a, b, c, d, x[k + 4], 7, 0xf57c0faf);
      d = md5Transform(md5F, d, a, b, c, x[k + 5], 12, 0x4787c62a);
      c = md5Transform(md5F, c, d, a, b, x[k + 6], 17, 0xa8304613);
      b = md5Transform(md5F, b, c, d, a, x[k + 7], 22, 0xfd469501);
      a = md5Transform(md5F, a, b, c, d, x[k + 8], 7, 0x698098d8);
      d = md5Transform(md5F, d, a, b, c, x[k + 9], 12, 0x8b44f7af);
      c = md5Transform(md5F, c, d, a, b, x[k + 10], 17, 0xffff5bb1);
      b = md5Transform(md5F, b, c, d, a, x[k + 11], 22, 0x895cd7be);
      a = md5Transform(md5F, a, b, c, d, x[k + 12], 7, 0x6b901122);
      d = md5Transform(md5F, d, a, b, c, x[k + 13], 12, 0xfd987193);
      c = md5Transform(md5F, c, d, a, b, x[k + 14], 17, 0xa679438e);
      b = md5Transform(md5F, b, c, d, a, x[k + 15], 22, 0x49b40821);

      a = md5Transform(md5G, a, b, c, d, x[k + 1], 5, 0xf61e2562);
      d = md5Transform(md5G, d, a, b, c, x[k + 6], 9, 0xc040b340);
      c = md5Transform(md5G, c, d, a, b, x[k + 11], 14, 0x265e5a51);
      b = md5Transform(md5G, b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
      a = md5Transform(md5G, a, b, c, d, x[k + 5], 5, 0xd62f105d);
      d = md5Transform(md5G, d, a, b, c, x[k + 10], 9, 0x02441453);
      c = md5Transform(md5G, c, d, a, b, x[k + 15], 14, 0xd8a1e681);
      b = md5Transform(md5G, b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
      a = md5Transform(md5G, a, b, c, d, x[k + 9], 5, 0x21e1cde6);
      d = md5Transform(md5G, d, a, b, c, x[k + 14], 9, 0xc33707d6);
      c = md5Transform(md5G, c, d, a, b, x[k + 3], 14, 0xf4d50d87);
      b = md5Transform(md5G, b, c, d, a, x[k + 8], 20, 0x455a14ed);
      a = md5Transform(md5G, a, b, c, d, x[k + 13], 5, 0xa9e3e905);
      d = md5Transform(md5G, d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
      c = md5Transform(md5G, c, d, a, b, x[k + 7], 14, 0x676f02d9);
      b = md5Transform(md5G, b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

      a = md5Transform(md5H, a, b, c, d, x[k + 5], 4, 0xfffa3942);
      d = md5Transform(md5H, d, a, b, c, x[k + 8], 11, 0x8771f681);
      c = md5Transform(md5H, c, d, a, b, x[k + 11], 16, 0x6d9d6122);
      b = md5Transform(md5H, b, c, d, a, x[k + 14], 23, 0xfde5380c);
      a = md5Transform(md5H, a, b, c, d, x[k + 1], 4, 0xa4beea44);
      d = md5Transform(md5H, d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
      c = md5Transform(md5H, c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
      b = md5Transform(md5H, b, c, d, a, x[k + 10], 23, 0xbebfbc70);
      a = md5Transform(md5H, a, b, c, d, x[k + 13], 4, 0x289b7ec6);
      d = md5Transform(md5H, d, a, b, c, x[k + 0], 11, 0xeaa127fa);
      c = md5Transform(md5H, c, d, a, b, x[k + 3], 16, 0xd4ef3085);
      b = md5Transform(md5H, b, c, d, a, x[k + 6], 23, 0x04881d05);
      a = md5Transform(md5H, a, b, c, d, x[k + 9], 4, 0xd9d4d039);
      d = md5Transform(md5H, d, a, b, c, x[k + 12], 11, 0xe6db99e5);
      c = md5Transform(md5H, c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
      b = md5Transform(md5H, b, c, d, a, x[k + 2], 23, 0xc4ac5665);

      a = md5Transform(md5I, a, b, c, d, x[k + 0], 6, 0xf4292244);
      d = md5Transform(md5I, d, a, b, c, x[k + 7], 10, 0x432aff97);
      c = md5Transform(md5I, c, d, a, b, x[k + 14], 15, 0xab9423a7);
      b = md5Transform(md5I, b, c, d, a, x[k + 5], 21, 0xfc93a039);
      a = md5Transform(md5I, a, b, c, d, x[k + 12], 6, 0x655b59c3);
      d = md5Transform(md5I, d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
      c = md5Transform(md5I, c, d, a, b, x[k + 10], 15, 0xffeff47d);
      b = md5Transform(md5I, b, c, d, a, x[k + 1], 21, 0x85845dd1);
      a = md5Transform(md5I, a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
      d = md5Transform(md5I, d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
      c = md5Transform(md5I, c, d, a, b, x[k + 6], 15, 0xa3014314);
      b = md5Transform(md5I, b, c, d, a, x[k + 13], 21, 0x4e0811a1);
      a = md5Transform(md5I, a, b, c, d, x[k + 4], 6, 0xf7537e82);
      d = md5Transform(md5I, d, a, b, c, x[k + 11], 10, 0xbd3af235);
      c = md5Transform(md5I, c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
      b = md5Transform(md5I, b, c, d, a, x[k + 9], 21, 0xeb86d391);

      a = addUnsigned(a, aa);
      b = addUnsigned(b, bb);
      c = addUnsigned(c, cc);
      d = addUnsigned(d, dd);
    }

    return (
      md5WordToHex(a) +
      md5WordToHex(b) +
      md5WordToHex(c) +
      md5WordToHex(d)
    ).toLowerCase();
  }

  function getRequestedAlgorithms() {
    const selected = hashAlgorithm.value;

    if (selected === "all") {
      return ["md5", "sha1", "sha256", "sha384", "sha512"];
    }

    return [selected];
  }

  function formatPlainResults(results) {
    return Object.entries(results)
      .map(([label, value]) => `${label}:\n${value}`)
      .join("\n\n");
  }

  function renderCurrentOutput() {
    hashOutput.textContent =
      outputFormat.value === "json" ? currentJsonText : currentPlainText;
  }

  function updateResultButtons() {
    copyBtn.disabled = !resultAvailable;
    downloadTxtBtn.disabled = !resultAvailable;
    downloadJsonBtn.disabled = !resultAvailable;
  }

  function resetResult() {
    generationToken += 1;

    currentResults = {};
    currentPlainText = "";
    currentJsonText = "";
    resultAvailable = false;

    resultBox.hidden = true;
    hashOutput.textContent = "";

    charCount.textContent = "0";
    byteCount.textContent = "0";
    algorithmCount.textContent = "0";
    hashLength.textContent = "0";

    updateResultButtons();
  }

  function invalidateResult() {
    if (!resultAvailable) {
      return;
    }

    resetResult();

    notify("Content changed. Generate the hash again.", "info", false);
  }

  async function generateHashes(options = {}) {
    const announce = options.announce !== false;
    const text = inputText.value;

    if (text.length === 0) {
      resetResult();
      notify("Enter some text first.", "error", announce);
      inputText.focus();
      return false;
    }

    const requested = getRequestedAlgorithms();
    const needsWebCrypto = requested.some((name) => name !== "md5");

    if (needsWebCrypto && !hasWebCrypto) {
      notify(
        "SHA hashing is unavailable in this browser context.",
        "error",
        announce,
      );
      return false;
    }

    const token = ++generationToken;
    const encoded = textEncoder.encode(text);

    generateBtn.disabled = true;
    generateBtn.setAttribute("aria-busy", "true");

    notify("Generating hash...", "info", false);

    try {
      const results = {};

      for (const name of requested) {
        if (token !== generationToken) {
          return false;
        }

        if (name === "md5") {
          results.MD5 = md5Hash(encoded);
          continue;
        }

        const config = SHA_ALGORITHMS[name];

        results[config.label] = await cryptoHash(encoded, config.cryptoName);
      }

      if (token !== generationToken) {
        return false;
      }

      currentResults = results;
      currentPlainText = formatPlainResults(results);
      currentJsonText = JSON.stringify(results, null, 2);
      resultAvailable = true;

      const characterCount = Array.from(text).length;
      const firstHash = Object.values(results)[0] || "";

      charCount.textContent = String(characterCount);
      byteCount.textContent = String(encoded.length);
      algorithmCount.textContent = String(Object.keys(results).length);
      hashLength.textContent =
        Object.keys(results).length === 1 ? String(firstHash.length) : "Mixed";

      renderCurrentOutput();
      resultBox.hidden = false;
      updateResultButtons();

      if (announce) {
        setInlineMessage("Action completed successfully.", "success");

        if (typeof window.showActionSuccess === "function") {
          window.showActionSuccess();
        } else if (typeof window.showMessage === "function") {
          window.showMessage("Action completed successfully.", "success");
        }
      }

      return true;
    } catch (error) {
      console.error("Hash generation failed:", error);

      resetResult();
      notify("Unable to generate the hash.", "error", announce);

      return false;
    } finally {
      if (token === generationToken) {
        generateBtn.disabled = false;
        generateBtn.removeAttribute("aria-busy");
      }
    }
  }

  async function loadSample() {
    inputText.value = "XAVERT";
    hashAlgorithm.value = "all";
    outputFormat.value = "plain";
    resetResult();

    const generated = await generateHashes({ announce: false });

    if (!generated) {
      return;
    }

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    inputText.focus();
  }

  async function copyResult() {
    if (!resultAvailable) {
      notify("Nothing to copy.", "error");
      return;
    }

    await window.xavertCopyText(hashOutput.textContent);
  }

  function downloadTxt() {
    if (!resultAvailable) {
      notify("Nothing to download.", "error");
      return;
    }

    window.downloadFile(
      "xavert-hash-result.txt",
      currentPlainText,
      "text/plain;charset=utf-8",
    );
  }

  function downloadJson() {
    if (!resultAvailable) {
      notify("Nothing to download.", "error");
      return;
    }

    window.downloadFile(
      "xavert-hash-result.json",
      currentJsonText,
      "application/json;charset=utf-8",
    );
  }

  function clearTool() {
    inputText.value = "";
    hashAlgorithm.value = "all";
    outputFormat.value = "plain";

    resetResult();
    setInlineMessage("");
    inputText.focus();
  }

  generateBtn.addEventListener("click", () => {
    void generateHashes();
  });

  sampleBtn.addEventListener("click", () => {
    void loadSample();
  });
  clearBtn.addEventListener("click", clearTool);

  copyBtn.addEventListener("click", () => {
    void copyResult();
  });

  downloadTxtBtn.addEventListener("click", downloadTxt);
  downloadJsonBtn.addEventListener("click", downloadJson);

  inputText.addEventListener("input", invalidateResult);
  hashAlgorithm.addEventListener("change", invalidateResult);

  outputFormat.addEventListener("change", () => {
    if (resultAvailable) {
      renderCurrentOutput();
    }
  });

  resetResult();
});
