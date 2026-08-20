"use strict";

function initPasswordToolkit() {
  const toolSelector = document.getElementById("toolSelector");

  const panels = {
    generator: document.getElementById("generatorTool"),
    checker: document.getElementById("checkerTool"),
    passphrase: document.getElementById("passphraseTool"),
    hash: document.getElementById("hashTool"),
  };

  const passwordLength = document.getElementById("passwordLength");
  const passwordQuantity = document.getElementById("passwordQuantity");
  const includeUppercase = document.getElementById("includeUppercase");
  const includeLowercase = document.getElementById("includeLowercase");
  const includeNumbers = document.getElementById("includeNumbers");
  const includeSymbols = document.getElementById("includeSymbols");
  const excludeSimilar = document.getElementById("excludeSimilar");
  const pronounceablePassword = document.getElementById(
    "pronounceablePassword",
  );

  const generatePasswordBtn = document.getElementById("generatePasswordBtn");
  const clearGeneratorBtn = document.getElementById("clearGeneratorBtn");
  const generatorResult = document.getElementById("generatorResult");
  const generatedPasswords = document.getElementById("generatedPasswords");
  const passwordHistoryBox = document.getElementById("passwordHistoryBox");
  const passwordHistoryList = document.getElementById("passwordHistoryList");
  const copyGeneratedBtn = document.getElementById("copyGeneratedBtn");
  const copyHistoryBtn = document.getElementById("copyHistoryBtn");
  const downloadPasswordsBtn = document.getElementById("downloadPasswordsBtn");
  const downloadPasswordsCsvBtn = document.getElementById(
    "downloadPasswordsCsvBtn",
  );
  const generatorMessage = document.getElementById("generatorMessage");

  const checkPasswordInput = document.getElementById("checkPasswordInput");
  const showPasswordToggle = document.getElementById("showPasswordToggle");
  const checkStrengthBtn = document.getElementById("checkStrengthBtn");
  const clearCheckerBtn = document.getElementById("clearCheckerBtn");
  const strengthFill = document.getElementById("strengthFill");
  const checkerResult = document.getElementById("checkerResult");
  const strengthLevel = document.getElementById("strengthLevel");
  const strengthScore = document.getElementById("strengthScore");
  const entropyBits = document.getElementById("entropyBits");
  const checkerMessage = document.getElementById("checkerMessage");

  const wordCount = document.getElementById("wordCount");
  const wordSeparator = document.getElementById("wordSeparator");
  const generatePassphraseBtn = document.getElementById(
    "generatePassphraseBtn",
  );
  const clearPassphraseBtn = document.getElementById("clearPassphraseBtn");
  const passphraseResult = document.getElementById("passphraseResult");
  const copyPassphraseBtn = document.getElementById("copyPassphraseBtn");
  const passphraseMessage = document.getElementById("passphraseMessage");

  const hashAlgorithm = document.getElementById("hashAlgorithm");
  const hashInput = document.getElementById("hashInput");
  const generateHashBtn = document.getElementById("generateHashBtn");
  const clearHashBtn = document.getElementById("clearHashBtn");
  const hashResult = document.getElementById("hashResult");
  const copyHashBtn = document.getElementById("copyHashBtn");
  const hashMessage = document.getElementById("hashMessage");

  const required = [
    toolSelector,
    ...Object.values(panels),
    passwordLength,
    passwordQuantity,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    excludeSimilar,
    pronounceablePassword,
    generatePasswordBtn,
    clearGeneratorBtn,
    generatorResult,
    generatedPasswords,
    passwordHistoryBox,
    passwordHistoryList,
    copyGeneratedBtn,
    copyHistoryBtn,
    downloadPasswordsBtn,
    downloadPasswordsCsvBtn,
    generatorMessage,
    checkPasswordInput,
    showPasswordToggle,
    checkStrengthBtn,
    clearCheckerBtn,
    strengthFill,
    checkerResult,
    strengthLevel,
    strengthScore,
    entropyBits,
    checkerMessage,
    wordCount,
    wordSeparator,
    generatePassphraseBtn,
    clearPassphraseBtn,
    passphraseResult,
    copyPassphraseBtn,
    passphraseMessage,
    hashAlgorithm,
    hashInput,
    generateHashBtn,
    clearHashBtn,
    hashResult,
    copyHashBtn,
    hashMessage,
  ];

  if (required.some((element) => !element)) {
    console.error("Password Toolkit: HTML and JS do not match.");
    return;
  }

  const cryptoApi = window.crypto;
  const encoder = new TextEncoder();

  let currentGeneratedPasswords = [];
  let passwordHistory = [];
  let currentPassphrase = "";
  let currentHash = "";

  function setMessage(element, text = "", type = "info") {
    const safeType = ["success", "error", "info"].includes(type)
      ? type
      : "info";

    element.textContent = text;
    element.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );

    if (text) {
      element.classList.add(`message-${safeType}`);
    }
  }

  function notify(element, text, type = "info") {
    setMessage(element, text, type);

    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function getSecureRandomIndex(max) {
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error("Invalid random range.");
    }

    if (!cryptoApi?.getRandomValues) {
      throw new Error("Secure random generation is unavailable.");
    }

    const limit = Math.floor(0x100000000 / max) * max;
    const values = new Uint32Array(1);

    do {
      cryptoApi.getRandomValues(values);
    } while (values[0] >= limit);

    return values[0] % max;
  }

  function pickRandom(source) {
    return source[getSecureRandomIndex(source.length)];
  }

  function shuffleSecure(items) {
    const copy = items.slice();

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = getSecureRandomIndex(index + 1);
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }

    return copy;
  }

  function switchTool() {
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== toolSelector.value;
    });

    setMessage(generatorMessage);
    setMessage(checkerMessage);
    setMessage(passphraseMessage);
    setMessage(hashMessage);
  }

  function renderPasswordList(container, passwords) {
    container.replaceChildren();

    passwords.forEach((password, index) => {
      const item = document.createElement("div");

      item.className = "password-result-item";
      item.textContent = `${index + 1}. ${password}`;

      container.append(item);
    });
  }

  function generatePronounceable(length, numbersEnabled) {
    const vowels = "aeiou";
    const consonants = "bcdfghjklmnpqrstvwxyz";

    let baseLength = length;

    if (numbersEnabled && length >= 3) {
      baseLength = length - 3;
    }

    let result = "";

    for (let index = 0; index < baseLength; index += 1) {
      result += index % 2 === 0 ? pickRandom(consonants) : pickRandom(vowels);
    }

    if (numbersEnabled && length >= 3) {
      result += String(100 + getSecureRandomIndex(900));
    }

    return result.slice(0, length);
  }

  function generatePasswords() {
    const length = Number(passwordLength.value);
    const quantity = Number(passwordQuantity.value);

    if (!Number.isInteger(length) || length < 6 || length > 128) {
      notify(
        generatorMessage,
        "Password length must be between 6 and 128.",
        "error",
      );
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      notify(generatorMessage, "Quantity must be between 1 and 100.", "error");
      return;
    }

    const similarPattern = /[OIl01]/g;

    const sets = [];

    if (includeUppercase.checked) {
      sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ".replace(similarPattern, ""));
    }

    if (includeLowercase.checked) {
      sets.push("abcdefghijklmnopqrstuvwxyz".replace(similarPattern, ""));
    }

    if (includeNumbers.checked) {
      sets.push("0123456789".replace(similarPattern, ""));
    }

    if (includeSymbols.checked) {
      sets.push("!@#$%^&*()_-+=<>?/{}[]");
    }

    if (!excludeSimilar.checked) {
      sets.length = 0;

      if (includeUppercase.checked) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      if (includeLowercase.checked) sets.push("abcdefghijklmnopqrstuvwxyz");
      if (includeNumbers.checked) sets.push("0123456789");
      if (includeSymbols.checked) sets.push("!@#$%^&*()_-+=<>?/{}[]");
    }

    if (sets.length === 0) {
      notify(generatorMessage, "Select at least one character type.", "error");
      return;
    }

    if (!pronounceablePassword.checked && length < sets.length) {
      notify(
        generatorMessage,
        `Password length must be at least ${sets.length} characters for the selected options.`,
        "error",
      );
      return;
    }

    const allCharacters = sets.join("");
    const results = [];

    try {
      for (let count = 0; count < quantity; count += 1) {
        if (pronounceablePassword.checked) {
          results.push(generatePronounceable(length, includeNumbers.checked));
          continue;
        }

        const characters = sets.map(pickRandom);

        while (characters.length < length) {
          characters.push(pickRandom(allCharacters));
        }

        results.push(shuffleSecure(characters).join(""));
      }
    } catch (error) {
      notify(
        generatorMessage,
        error instanceof Error ? error.message : "Password generation failed.",
        "error",
      );
      return;
    }

    currentGeneratedPasswords = results;

    passwordHistory = [...results, ...passwordHistory].slice(0, 20);

    renderPasswordList(generatedPasswords, currentGeneratedPasswords);

    renderPasswordList(passwordHistoryList, passwordHistory);

    generatorResult.hidden = false;
    passwordHistoryBox.hidden = false;

    copyGeneratedBtn.disabled = false;
    copyHistoryBtn.disabled = false;
    downloadPasswordsBtn.disabled = false;
    downloadPasswordsCsvBtn.disabled = false;

    notify(
      generatorMessage,
      quantity === 1
        ? "Password generated successfully."
        : `${quantity} passwords generated successfully.`,
      "success",
    );
  }

  function clearGenerator() {
    passwordLength.value = "16";
    passwordQuantity.value = "1";
    includeUppercase.checked = true;
    includeLowercase.checked = true;
    includeNumbers.checked = true;
    includeSymbols.checked = true;
    excludeSimilar.checked = false;
    pronounceablePassword.checked = false;

    currentGeneratedPasswords = [];
    passwordHistory = [];

    generatedPasswords.replaceChildren();
    passwordHistoryList.replaceChildren();

    generatorResult.hidden = true;
    passwordHistoryBox.hidden = true;

    copyGeneratedBtn.disabled = true;
    copyHistoryBtn.disabled = true;
    downloadPasswordsBtn.disabled = true;
    downloadPasswordsCsvBtn.disabled = true;

    setMessage(generatorMessage);
    passwordLength.focus();
  }

  async function copyTextValue(text, messageElement) {
    if (!text) {
      notify(messageElement, "Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify(messageElement, "Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(text);
  }

  function downloadPasswordsTxt() {
    if (!passwordHistory.length) {
      notify(generatorMessage, "Generate passwords first.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify(generatorMessage, "Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-passwords.txt",
      passwordHistory.join("\n"),
      "text/plain;charset=utf-8",
    );
  }

  function downloadPasswordsCsv() {
    if (!passwordHistory.length) {
      notify(generatorMessage, "Generate passwords first.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify(generatorMessage, "Download utility is unavailable.", "error");
      return;
    }

    const csv = [
      "Index,Password",
      ...passwordHistory.map(
        (password, index) => `${index + 1},"${password.replace(/"/g, '""')}"`,
      ),
    ].join("\n");

    window.downloadFile("xavert-passwords.csv", csv, "text/csv;charset=utf-8");
  }

  function togglePasswordVisibility() {
    checkPasswordInput.type = showPasswordToggle.checked ? "text" : "password";
  }

  function checkPasswordStrength() {
    const password = checkPasswordInput.value;

    if (!password) {
      checkerResult.hidden = true;

      notify(checkerMessage, "Please enter a password.", "error");

      checkPasswordInput.focus();
      return;
    }

    let charsetSize = 0;

    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^A-Za-z0-9]/.test(password)) charsetSize += 32;

    const entropy = Math.round(password.length * Math.log2(charsetSize || 1));

    let score = 0;

    if (password.length >= 8) score += 15;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;

    const commonPasswords = new Set([
      "password",
      "123456",
      "12345678",
      "qwerty",
      "admin",
      "welcome",
      "letmein",
    ]);

    if (commonPasswords.has(password.toLowerCase())) {
      score = 5;
    }

    score = Math.min(score, 100);

    let level = "Very Weak";

    if (score >= 85) level = "Strong";
    else if (score >= 65) level = "Good";
    else if (score >= 40) level = "Moderate";
    else if (score >= 20) level = "Weak";

    strengthFill.style.width = `${score}%`;

    strengthLevel.textContent = level;
    strengthScore.textContent = `${score}/100`;
    entropyBits.textContent = String(entropy);

    checkerResult.hidden = false;

    notify(checkerMessage, "Analysis completed.", "success");
  }

  function clearChecker() {
    checkPasswordInput.value = "";
    checkPasswordInput.type = "password";
    showPasswordToggle.checked = false;

    strengthFill.style.width = "0%";
    strengthLevel.textContent = "—";
    strengthScore.textContent = "0/100";
    entropyBits.textContent = "0";

    checkerResult.hidden = true;
    setMessage(checkerMessage);

    checkPasswordInput.focus();
  }

  function generatePassphrase() {
    const words = [
      "river",
      "stone",
      "forest",
      "cloud",
      "ocean",
      "mountain",
      "tiger",
      "falcon",
      "planet",
      "shadow",
      "silver",
      "rocket",
      "dragon",
      "winter",
      "summer",
      "thunder",
      "crystal",
      "sunset",
      "galaxy",
      "anchor",
      "bridge",
      "castle",
      "comet",
      "storm",
    ];

    const count = Number(wordCount.value);

    if (!Number.isInteger(count) || count < 3 || count > 10) {
      notify(
        passphraseMessage,
        "Word count must be between 3 and 10.",
        "error",
      );
      return;
    }

    const separator = wordSeparator.value;

    try {
      currentPassphrase = Array.from({ length: count }, () =>
        pickRandom(words),
      ).join(separator);
    } catch (error) {
      notify(
        passphraseMessage,
        error instanceof Error
          ? error.message
          : "Passphrase generation failed.",
        "error",
      );
      return;
    }

    passphraseResult.textContent = currentPassphrase;
    passphraseResult.hidden = false;
    copyPassphraseBtn.disabled = false;

    notify(passphraseMessage, "Passphrase generated successfully.", "success");
  }

  function clearPassphrase() {
    wordCount.value = "4";
    wordSeparator.value = "-";
    currentPassphrase = "";

    passphraseResult.textContent = "";
    passphraseResult.hidden = true;
    copyPassphraseBtn.disabled = true;

    setMessage(passphraseMessage);
    wordCount.focus();
  }

  async function generateHash() {
    const text = hashInput.value;

    if (!text) {
      hashResult.hidden = true;

      notify(hashMessage, "Please enter text.", "error");

      hashInput.focus();
      return;
    }

    if (!cryptoApi?.subtle) {
      notify(
        hashMessage,
        "Web Crypto is unavailable in this browser context.",
        "error",
      );
      return;
    }

    generateHashBtn.disabled = true;

    try {
      const buffer = encoder.encode(text);

      const hashBuffer = await cryptoApi.subtle.digest(
        hashAlgorithm.value,
        buffer,
      );

      currentHash = Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      hashResult.textContent = currentHash;
      hashResult.hidden = false;
      copyHashBtn.disabled = false;

      notify(hashMessage, `${hashAlgorithm.value} hash generated.`, "success");
    } catch (error) {
      currentHash = "";
      hashResult.textContent = "";
      hashResult.hidden = true;
      copyHashBtn.disabled = true;

      notify(
        hashMessage,
        error instanceof Error ? error.message : "Hash generation failed.",
        "error",
      );
    } finally {
      generateHashBtn.disabled = false;
    }
  }

  function clearHash() {
    hashInput.value = "";
    hashAlgorithm.value = "SHA-256";
    currentHash = "";

    hashResult.textContent = "";
    hashResult.hidden = true;
    copyHashBtn.disabled = true;

    setMessage(hashMessage);
    hashInput.focus();
  }

  function invalidateGenerator() {
    if (currentGeneratedPasswords.length || passwordHistory.length) {
      currentGeneratedPasswords = [];
      generatedPasswords.replaceChildren();
      generatorResult.hidden = true;
      copyGeneratedBtn.disabled = true;
      downloadPasswordsBtn.disabled = true;
      downloadPasswordsCsvBtn.disabled = true;
    }

    setMessage(generatorMessage);
  }

  function invalidateChecker() {
    strengthFill.style.width = "0%";
    strengthLevel.textContent = "—";
    strengthScore.textContent = "0/100";
    entropyBits.textContent = "0";
    checkerResult.hidden = true;
    setMessage(checkerMessage);
  }

  function invalidatePassphrase() {
    currentPassphrase = "";
    passphraseResult.textContent = "";
    passphraseResult.hidden = true;
    copyPassphraseBtn.disabled = true;
    setMessage(passphraseMessage);
  }

  function invalidateHash() {
    currentHash = "";
    hashResult.textContent = "";
    hashResult.hidden = true;
    copyHashBtn.disabled = true;
    setMessage(hashMessage);
  }

  toolSelector.addEventListener("change", switchTool);

  [
    passwordLength,
    passwordQuantity,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    excludeSimilar,
    pronounceablePassword,
  ].forEach((element) => {
    element.addEventListener(
      element.type === "checkbox" ? "change" : "input",
      invalidateGenerator,
    );
  });

  checkPasswordInput.addEventListener("input", invalidateChecker);

  wordCount.addEventListener("input", invalidatePassphrase);
  wordSeparator.addEventListener("input", invalidatePassphrase);

  hashAlgorithm.addEventListener("change", invalidateHash);
  hashInput.addEventListener("input", invalidateHash);

  generatePasswordBtn.addEventListener("click", generatePasswords);
  clearGeneratorBtn.addEventListener("click", clearGenerator);

  copyGeneratedBtn.addEventListener("click", () => {
    void copyTextValue(currentGeneratedPasswords.join("\n"), generatorMessage);
  });

  copyHistoryBtn.addEventListener("click", () => {
    void copyTextValue(passwordHistory.join("\n"), generatorMessage);
  });

  downloadPasswordsBtn.addEventListener("click", downloadPasswordsTxt);
  downloadPasswordsCsvBtn.addEventListener("click", downloadPasswordsCsv);

  showPasswordToggle.addEventListener("change", togglePasswordVisibility);
  checkStrengthBtn.addEventListener("click", checkPasswordStrength);
  clearCheckerBtn.addEventListener("click", clearChecker);

  generatePassphraseBtn.addEventListener("click", generatePassphrase);
  clearPassphraseBtn.addEventListener("click", clearPassphrase);

  copyPassphraseBtn.addEventListener("click", () => {
    void copyTextValue(currentPassphrase, passphraseMessage);
  });

  generateHashBtn.addEventListener("click", () => {
    void generateHash();
  });

  clearHashBtn.addEventListener("click", clearHash);

  copyHashBtn.addEventListener("click", () => {
    void copyTextValue(currentHash, hashMessage);
  });

  copyGeneratedBtn.disabled = true;
  copyHistoryBtn.disabled = true;
  downloadPasswordsBtn.disabled = true;
  downloadPasswordsCsvBtn.disabled = true;
  copyPassphraseBtn.disabled = true;
  copyHashBtn.disabled = true;

  switchTool();
}

initPasswordToolkit();
