"use strict";

function initSqlMinifier() {
  const inputSql = document.getElementById("inputSql");
  const outputSql = document.getElementById("outputSql");
  const sqlDialect = document.getElementById("sqlDialect");
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
  const commentsRemoved = document.getElementById("commentsRemoved");
  const message = document.getElementById("message");

  const required = [
    inputSql,
    outputSql,
    sqlDialect,
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
    commentsRemoved,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("SQL Minifier: HTML and JS do not match.");
    return;
  }

  let lastCommentsRemoved = 0;

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

  function announceSuccess(text) {
    setInlineMessage(text, "success");

    if (typeof window.showMessage === "function") {
      window.showMessage(text, "success");
    }
  }

  function isMysqlLikeDialect() {
    return ["mysql", "mariadb"].includes(sqlDialect.value);
  }

  function isPostgresqlLikeDialect() {
    return ["postgresql", "snowflake"].includes(sqlDialect.value);
  }

  function isBackslashEscapedString(sql, startIndex, quote) {
    if (quote === "`") {
      return true;
    }

    if (isMysqlLikeDialect()) {
      return true;
    }

    if (quote !== "'" || !isPostgresqlLikeDialect()) {
      return false;
    }

    const prefix = sql[startIndex - 1];
    const beforePrefix = sql[startIndex - 2];

    return (
      (prefix === "E" || prefix === "e") &&
      (beforePrefix === undefined || !/[A-Za-z0-9_$]/.test(beforePrefix))
    );
  }

  function readQuotedToken(sql, startIndex, quote, type) {
    let value = quote;
    let index = startIndex + 1;
    const allowBackslashEscape = isBackslashEscapedString(
      sql,
      startIndex,
      quote,
    );

    while (index < sql.length) {
      const character = sql[index];
      const next = sql[index + 1];

      value += character;

      if (allowBackslashEscape && character === "\\" && next !== undefined) {
        value += next;
        index += 2;
        continue;
      }

      if (character === quote) {
        if (next === quote) {
          value += next;
          index += 2;
          continue;
        }

        return {
          type,
          value,
          nextIndex: index + 1,
        };
      }

      index += 1;
    }

    throw new Error(
      quote === "'" ? "Unclosed SQL string." : "Unclosed quoted identifier.",
    );
  }

  function readBracketToken(sql, startIndex) {
    let value = "[";
    let index = startIndex + 1;

    while (index < sql.length) {
      const character = sql[index];
      const next = sql[index + 1];

      value += character;

      if (character === "]") {
        if (next === "]") {
          value += next;
          index += 2;
          continue;
        }

        return {
          type: "identifier",
          value,
          nextIndex: index + 1,
        };
      }

      index += 1;
    }

    throw new Error("Unclosed bracketed identifier.");
  }

  function readDollarQuotedToken(sql, startIndex) {
    const opening = sql
      .slice(startIndex)
      .match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);

    if (!opening) {
      return null;
    }

    const delimiter = opening[0];
    const contentStart = startIndex + delimiter.length;
    const end = sql.indexOf(delimiter, contentStart);

    if (end === -1) {
      throw new Error("Unclosed dollar-quoted SQL string.");
    }

    return {
      type: "string",
      value: sql.slice(startIndex, end + delimiter.length),
      nextIndex: end + delimiter.length,
    };
  }

  function readOracleQuotedToken(sql, startIndex) {
    if (
      !["Q", "q"].includes(sql[startIndex]) ||
      sql[startIndex + 1] !== "'" ||
      sql[startIndex + 2] === undefined
    ) {
      return null;
    }

    const openingDelimiter = sql[startIndex + 2];
    const closingDelimiter =
      {
        "[": "]",
        "{": "}",
        "(": ")",
        "<": ">",
      }[openingDelimiter] ?? openingDelimiter;

    let index = startIndex + 3;

    while (index < sql.length - 1) {
      if (sql[index] === closingDelimiter && sql[index + 1] === "'") {
        return {
          type: "string",
          value: sql.slice(startIndex, index + 2),
          nextIndex: index + 2,
        };
      }

      index += 1;
    }

    throw new Error("Unclosed Oracle q-quoted SQL string.");
  }

  function isDashCommentStart(sql, index) {
    if (sql[index] !== "-" || sql[index + 1] !== "-") {
      return false;
    }

    if (!isMysqlLikeDialect()) {
      return true;
    }

    const after = sql[index + 2];

    return (
      after === undefined ||
      /\s/.test(after) ||
      (after.charCodeAt(0) >= 0 && after.charCodeAt(0) <= 31)
    );
  }

  function isSemanticBlockComment(value) {
    return /^\/\*(?:[+!]|M!)/i.test(value);
  }

  function tokenizeSql(sql) {
    const tokens = [];
    let textBuffer = "";
    let removedComments = 0;
    let preservedComments = 0;

    function flushText() {
      if (!textBuffer) {
        return;
      }

      tokens.push({
        type: "text",
        value: textBuffer,
      });

      textBuffer = "";
    }

    let index = 0;

    while (index < sql.length) {
      const character = sql[index];
      const next = sql[index + 1];

      const oracleQuoted = readOracleQuotedToken(sql, index);

      if (oracleQuoted) {
        flushText();
        tokens.push(oracleQuoted);
        index = oracleQuoted.nextIndex;
        continue;
      }

      if (character === "'" || character === '"' || character === "`") {
        flushText();

        const type = character === "'" ? "string" : "identifier";
        const token = readQuotedToken(sql, index, character, type);

        tokens.push(token);
        index = token.nextIndex;
        continue;
      }

      if (
        character === "[" &&
        ["tsql", "sqlite"].includes(sqlDialect.value)
      ) {
        flushText();
        const token = readBracketToken(sql, index);
        tokens.push(token);
        index = token.nextIndex;
        continue;
      }

      if (character === "$") {
        const token = readDollarQuotedToken(sql, index);

        if (token) {
          flushText();
          tokens.push(token);
          index = token.nextIndex;
          continue;
        }
      }

      if (isDashCommentStart(sql, index)) {
        flushText();
        let end = index + 2;

        while (end < sql.length && sql[end] !== "\n" && sql[end] !== "\r") {
          end += 1;
        }

        tokens.push({
          type: "comment",
          value: sql.slice(index, end),
          semantic: false,
        });

        removedComments += 1;
        index = end;
        continue;
      }

      if (character === "#" && isMysqlLikeDialect()) {
        flushText();
        let end = index + 1;

        while (end < sql.length && sql[end] !== "\n" && sql[end] !== "\r") {
          end += 1;
        }

        tokens.push({
          type: "comment",
          value: sql.slice(index, end),
          semantic: false,
        });

        removedComments += 1;
        index = end;
        continue;
      }

      if (character === "/" && next === "*") {
        flushText();

        const closing = sql.indexOf("*/", index + 2);

        if (closing === -1) {
          throw new Error("Unclosed SQL block comment.");
        }

        const end = closing + 2;
        const value = sql.slice(index, end);
        const semantic = isSemanticBlockComment(value);

        tokens.push({
          type: "comment",
          value,
          semantic,
        });

        if (semantic) {
          preservedComments += 1;
        } else {
          removedComments += 1;
        }

        index = end;
        continue;
      }

      textBuffer += character;
      index += 1;
    }

    flushText();

    return {
      tokens,
      removedComments,
      preservedComments,
    };
  }

  function normalizeTextSegment(text, mode) {
    let result = text.replace(/\s+/g, " ");

    result = result
      .replace(/\s*;\s*/g, ";")
      .replace(/\s*\.\s*/g, ".")
      .replace(/\s*\(\s*/g, "(")
      .replace(/\s*\)\s*/g, ")")
      .replace(/\s*(<=>|>=|<=|<>|!=|:=)\s*/g, "$1")
      .replace(/\s*=\s*/g, "=")
      .replace(/\s*([<>])\s*/g, "$1");

    if (mode === "max") {
      result = result.replace(/\s*,\s*/g, ",");
    } else {
      result = result.replace(/\s*,\s*/g, ", ");
    }

    return result;
  }

  function appendPiece(target, piece) {
    if (!piece) {
      return target;
    }

    if (/\s$/.test(target) && /^\s/.test(piece)) {
      return target + piece.replace(/^\s+/, "");
    }

    return target + piece;
  }

  function minifySql(sql) {
    const mode = compressionMode.value;
    const tokenized = tokenizeSql(sql);
    let output = "";

    tokenized.tokens.forEach((token) => {
      let piece = "";

      if (token.type === "comment") {
        piece = token.semantic ? ` ${token.value} ` : " ";
      } else if (token.type === "text") {
        piece = normalizeTextSegment(token.value, mode);
      } else {
        piece = token.value;
      }

      output = appendPiece(output, piece);
    });

    return {
      output: output.trim(),
      removedComments: tokenized.removedComments,
      preservedComments: tokenized.preservedComments,
    };
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
    commentsRemoved.textContent = String(lastCommentsRemoved);
  }

  function resetOutput() {
    outputSql.value = "";
    lastCommentsRemoved = 0;

    updateStats();

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function invalidateResult() {
    if (outputSql.value) {
      resetOutput();
    } else {
      lastCommentsRemoved = 0;
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

    try {
      const result = minifySql(sql);

      if (!result.output) {
        resetOutput();
        notify("The SQL contains no executable content after minification.", "error");
        return false;
      }

      outputSql.value = result.output;
      lastCommentsRemoved = result.removedComments;

      updateStats();

      copyBtn.disabled = false;
      downloadBtn.disabled = false;

      if (announce) {
        announceSuccess("SQL minified successfully.");
      }

      return true;
    } catch (error) {
      console.error(error);
      resetOutput();

      notify(
        error instanceof Error ? error.message : "Unable to minify SQL.",
        "error",
      );

      return false;
    }
  }

  function loadSample() {
    inputSql.value = [
      "-- Ordinary comment: removed",
      "SELECT",
      "    u.id,",
      "    u.name,",
      "    'Text with -- inside the string' AS note",
      "FROM users AS u",
      "/* ordinary block comment: removed */",
      "WHERE u.status = 'active'",
      "  AND u.deleted_at IS NULL",
      "ORDER BY u.created_at DESC;",
    ].join("\n");

    sqlDialect.value = "standard";
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
    sqlDialect.value = "standard";
    compressionMode.value = "safe";

    resetOutput();
    setInlineMessage("");
    inputSql.focus();
  }

  inputSql.addEventListener("input", invalidateResult);
  sqlDialect.addEventListener("change", invalidateResult);
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
