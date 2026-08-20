"use strict";

function initSqlMinifier() {
  const inputSql = document.getElementById("inputSql");
  const outputSql = document.getElementById("outputSql");
  const compressionMode = document.getElementById("compressionMode");

  const minifyBtn = document.getElementById("minifyBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const inputChars = document.getElementById("inputChars");
  const outputChars = document.getElementById("outputChars");
  const savedChars = document.getElementById("savedChars");
  const savedPercent = document.getElementById("savedPercent");
  const message = document.getElementById("message");

  const required = [
    inputSql,
    outputSql,
    compressionMode,
    minifyBtn,
    sampleBtn,
    clearBtn,
    copyBtn,
    downloadBtn,
    inputChars,
    outputChars,
    savedChars,
    savedPercent,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("SQL Minifier: HTML and JS do not match.");
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

  function tokenizeSql(sql) {
    const tokens = [];
    let buffer = "";
    let quote = null;
    let inLineComment = false;
    let inBlockComment = false;

    function flushText() {
      if (buffer) {
        tokens.push({
          type: "text",
          value: buffer,
        });
        buffer = "";
      }
    }

    for (let index = 0; index < sql.length; index += 1) {
      const char = sql[index];
      const next = sql[index + 1];

      if (inLineComment) {
        if (char === "\n") {
          inLineComment = false;
          buffer += " ";
        }

        continue;
      }

      if (inBlockComment) {
        if (char === "*" && next === "/") {
          inBlockComment = false;
          index += 1;
          buffer += " ";
        }

        continue;
      }

      if (quote) {
        buffer += char;

        if (char === quote) {
          if (next === quote) {
            buffer += next;
            index += 1;
          } else {
            tokens.push({
              type: "string",
              value: buffer,
            });

            buffer = "";
            quote = null;
          }
        }

        continue;
      }

      if (char === "'" || char === '"' || char === "`") {
        flushText();
        quote = char;
        buffer = char;
        continue;
      }

      if (char === "-" && next === "-") {
        flushText();
        inLineComment = true;
        index += 1;
        continue;
      }

      if (char === "/" && next === "*") {
        flushText();
        inBlockComment = true;
        index += 1;
        continue;
      }

      buffer += char;
    }

    if (quote) {
      tokens.push({
        type: "string",
        value: buffer,
      });
    } else {
      flushText();
    }

    return tokens;
  }

  function minifyTextSegment(text, mode) {
    let result = text.replace(/\s+/g, " ").trim();

    result = result
      .replace(/\s*\(\s*/g, "(")
      .replace(/\s*\)\s*/g, ")")
      .replace(/\s*(>=|<=|<>|!=|:=|\|\|)\s*/g, "$1")
      .replace(/\s*=\s*/g, "=");

    if (mode === "safe") {
      result = result.replace(/\s*,\s*/g, ", ");
    } else {
      result = result
        .replace(/\s*,\s*/g, ",")
        .replace(/\s*([+\-*/])\s*/g, "$1");
    }

    return result;
  }

  function minifySql(sql) {
    const mode = compressionMode.value;

    return tokenizeSql(sql)
      .map((token) =>
        token.type === "string"
          ? token.value
          : minifyTextSegment(token.value, mode),
      )
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  }

  function updateStats() {
    const input = inputSql.value;
    const output = outputSql.value;

    const inputLength = Array.from(input).length;
    const outputLength = Array.from(output).length;
    const saved = Math.max(inputLength - outputLength, 0);

    const percent =
      inputLength > 0 ? Math.round((saved / inputLength) * 100) : 0;

    inputChars.textContent = String(inputLength);
    outputChars.textContent = String(outputLength);
    savedChars.textContent = String(saved);
    savedPercent.textContent = `${percent}%`;
  }

  function resetOutput() {
    outputSql.value = "";

    updateStats();

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function invalidateResult() {
    if (outputSql.value) {
      resetOutput();
    } else {
      updateStats();
    }

    setInlineMessage("");
  }

  function handleMinify({ announce = true } = {}) {
    const sql = inputSql.value;

    if (!sql.trim()) {
      resetOutput();

      notify("Enter SQL first.", "error");

      inputSql.focus();
      return false;
    }

    const minified = minifySql(sql);

    outputSql.value = minified;

    updateStats();

    copyBtn.disabled = false;
    downloadBtn.disabled = false;

    if (announce) {
      setInlineMessage("Action completed successfully.", "success");

      if (typeof window.showActionSuccess === "function") {
        window.showActionSuccess();
      } else if (typeof window.showMessage === "function") {
        window.showMessage("Action completed successfully.", "success");
      }
    }

    return true;
  }

  function loadSample() {
    inputSql.value = [
      "-- Get active users",
      "SELECT",
      "    id,",
      "    name,",
      "    email",
      "FROM",
      "    users",
      "WHERE",
      "    status = 'active'",
      "    AND deleted_at IS NULL",
      "ORDER BY",
      "    created_at DESC;",
      "",
      "/* Count orders */",
      "SELECT",
      "    COUNT(*)",
      "FROM",
      "    orders",
      "WHERE",
      "    total >= 100;",
    ].join("\n");

    compressionMode.value = "safe";

    resetOutput();
    setInlineMessage("");

    const minified = handleMinify({ announce: false });

    if (!minified) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    inputSql.focus();
  }

  async function copyOutput() {
    if (!outputSql.value.trim()) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(outputSql.value);
  }

  function downloadOutput() {
    if (!outputSql.value.trim()) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      "xavert-minified.sql",
      outputSql.value,
      "text/plain;charset=utf-8",
    );
  }

  function clearTool() {
    inputSql.value = "";
    compressionMode.value = "safe";

    resetOutput();
    setInlineMessage("");
    inputSql.focus();
  }

  inputSql.addEventListener("input", invalidateResult);
  compressionMode.addEventListener("change", invalidateResult);

  minifyBtn.addEventListener("click", () => {
    handleMinify();
  });

  sampleBtn.addEventListener("click", loadSample);
  clearBtn.addEventListener("click", clearTool);

  copyBtn.addEventListener("click", () => {
    void copyOutput();
  });

  downloadBtn.addEventListener("click", downloadOutput);

  resetOutput();
}

initSqlMinifier();
