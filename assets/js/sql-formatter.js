"use strict";

function initSqlFormatter() {
  const inputSql = document.getElementById("inputSql");
  const outputSql = document.getElementById("outputSql");

  const sqlDialect = document.getElementById("sqlDialect");
  const keywordCase = document.getElementById("keywordCase");
  const indentStyle = document.getElementById("indentStyle");

  const formatBtn = document.getElementById("formatBtn");
  const minifyBtn = document.getElementById("minifyBtn");
  const swapBtn = document.getElementById("swapBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const inputChars = document.getElementById("inputChars");
  const outputChars = document.getElementById("outputChars");
  const lineCount = document.getElementById("lineCount");
  const keywordCount = document.getElementById("keywordCount");
  const message = document.getElementById("message");

  const sampleButtons = Array.from(
    document.querySelectorAll("[data-sql-sample]"),
  );

  const required = [
    inputSql,
    outputSql,
    sqlDialect,
    keywordCase,
    indentStyle,
    formatBtn,
    minifyBtn,
    swapBtn,
    sampleBtn,
    clearBtn,
    copyBtn,
    downloadBtn,
    inputChars,
    outputChars,
    lineCount,
    keywordCount,
    message,
  ];

  if (required.some((element) => !element)) {
    console.error("SQL Formatter: HTML and JS do not match.");
    return;
  }

  let lastOperation = "query";

  const samples = {
    select:
      "select id, name, email from users where active = 1 order by name asc limit 20;",
    join: "select users.id, users.name, orders.total from users inner join orders on users.id = orders.user_id where orders.total > 100 order by orders.total desc limit 10;",
    insert:
      "insert into users (name, email, active) values ('Mario Rossi', 'mario@example.com', 1);",
    update:
      "update users set active = 0, updated_at = now() where last_login < '2025-01-01';",
  };

  const fallbackMajorKeywords = [
    "WITH RECURSIVE",
    "INSERT INTO",
    "DELETE FROM",
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
    "UNION ALL",
    "LEFT OUTER JOIN",
    "RIGHT OUTER JOIN",
    "FULL OUTER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "INNER JOIN",
    "FULL JOIN",
    "CROSS JOIN",
    "GROUP BY",
    "ORDER BY",
    "PARTITION BY",
    "ON CONFLICT",
    "RETURNING",
    "SELECT",
    "FROM",
    "WHERE",
    "HAVING",
    "QUALIFY",
    "WINDOW",
    "JOIN",
    "LIMIT",
    "OFFSET",
    "FETCH",
    "VALUES",
    "UPDATE",
    "DELETE",
    "INSERT",
    "SET",
    "MERGE",
    "USING",
    "WHEN MATCHED",
    "WHEN NOT MATCHED",
    "UNION",
    "INTERSECT",
    "EXCEPT",
  ];

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

  function isIdentifierStart(character) {
    return /[A-Za-z_]/.test(character ?? "");
  }

  function isIdentifierPart(character) {
    return /[A-Za-z0-9_$]/.test(character ?? "");
  }

  function readQuotedToken(sql, startIndex, quote, type) {
    let value = quote;
    let index = startIndex + 1;

    while (index < sql.length) {
      const character = sql[index];
      const next = sql[index + 1];

      value += character;

      if (character === "\\" && quote !== "[") {
        if (next !== undefined) {
          value += next;
          index += 2;
          continue;
        }
      }

      if (quote === "[") {
        if (character === "]") {
          if (next === "]") {
            value += next;
            index += 2;
            continue;
          }

          return { type, value, nextIndex: index + 1 };
        }
      } else if (character === quote) {
        if (next === quote) {
          value += next;
          index += 2;
          continue;
        }

        return { type, value, nextIndex: index + 1 };
      }

      index += 1;
    }

    return { type, value, nextIndex: sql.length };
  }

  function readDollarQuotedToken(sql, startIndex) {
    const opening = sql.slice(startIndex).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);

    if (!opening) {
      return null;
    }

    const delimiter = opening[0];
    const contentStart = startIndex + delimiter.length;
    const end = sql.indexOf(delimiter, contentStart);

    if (end === -1) {
      return {
        type: "string",
        value: sql.slice(startIndex),
        nextIndex: sql.length,
      };
    }

    return {
      type: "string",
      value: sql.slice(startIndex, end + delimiter.length),
      nextIndex: end + delimiter.length,
    };
  }

  function tokenizeSql(sql) {
    const tokens = [];
    let textBuffer = "";

    const mysqlLikeDialect = ["mysql", "mariadb", "tidb"].includes(
      sqlDialect.value,
    );

    function flushText() {
      if (!textBuffer) {
        return;
      }

      tokens.push({ type: "text", value: textBuffer });
      textBuffer = "";
    }

    let index = 0;

    while (index < sql.length) {
      const character = sql[index];
      const next = sql[index + 1];

      if (character === "'" || character === '"' || character === "`") {
        flushText();
        const type = character === "'" ? "string" : "identifier";
        const token = readQuotedToken(sql, index, character, type);
        tokens.push(token);
        index = token.nextIndex;
        continue;
      }

      if (character === "[") {
        flushText();
        const token = readQuotedToken(sql, index, "[", "identifier");
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

      const dashCommentAllowed =
        character === "-" &&
        next === "-" &&
        (!mysqlLikeDialect ||
          sql[index + 2] === undefined ||
          /\s/.test(sql[index + 2]));

      if (dashCommentAllowed) {
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
        index = end;
        continue;
      }

      if (character === "#" && mysqlLikeDialect) {
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
        index = end;
        continue;
      }

      if (character === "/" && next === "*") {
        flushText();
        const closing = sql.indexOf("*/", index + 2);
        const end = closing === -1 ? sql.length : closing + 2;
        const value = sql.slice(index, end);

        tokens.push({
          type: "comment",
          value,
          semantic: /^\/\*[+!]/.test(value),
        });
        index = end;
        continue;
      }

      textBuffer += character;
      index += 1;
    }

    flushText();
    return tokens;
  }

  function applyFallbackKeywordCase(value) {
    const selectedCase = keywordCase.value;

    if (selectedCase === "preserve") {
      return value;
    }

    return selectedCase === "lower" ? value.toLowerCase() : value.toUpperCase();
  }

  function formatFallbackTextSegment(segment) {
    let formatted = segment;

    const keywordPattern = fallbackMajorKeywords
      .slice()
      .sort((a, b) => b.length - a.length)
      .map((keyword) =>
        keyword
          .split(" ")
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("\\s+"),
      )
      .join("|");

    const regex = new RegExp(`\\b(?:${keywordPattern})\\b`, "gi");

    formatted = formatted.replace(regex, (match) => {
      return `\n${applyFallbackKeywordCase(match)}`;
    });

    return formatted;
  }

  function fallbackFormatSql(sql) {
    const tokens = tokenizeSql(sql);

    return tokens
      .map((token) => {
        if (token.type === "text") {
          return formatFallbackTextSegment(token.value);
        }

        return token.value;
      })
      .join("")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getFormatterOptions() {
    const tabSetting = indentStyle.value;

    return {
      language: sqlDialect.value,
      keywordCase: keywordCase.value,
      tabWidth: tabSetting === "4" ? 4 : 2,
      useTabs: tabSetting === "tab",
      linesBetweenQueries: 1,
    };
  }

  function formatSqlText(sql) {
    const formatter = window.sqlFormatter;

    if (formatter && typeof formatter.format === "function") {
      return {
        output: formatter.format(sql, getFormatterOptions()).trim(),
        usedFallback: false,
      };
    }

    return {
      output: fallbackFormatSql(sql),
      usedFallback: true,
    };
  }

  function normalizeMinifiedText(segment) {
    return segment
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*/g, ",")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      .replace(/\s*;\s*/g, ";");
  }

  function minifySqlText(sql) {
    const tokens = tokenizeSql(sql);

    const pieces = tokens.map((token) => {
      if (token.type === "comment") {
        return token.semantic ? ` ${token.value} ` : " ";
      }

      if (token.type === "text") {
        return normalizeMinifiedText(token.value);
      }

      return token.value;
    });

    let compact = "";

    pieces.forEach((piece) => {
      if (!piece) {
        return;
      }

      if (/\s$/.test(compact) && /^\s/.test(piece)) {
        compact += piece.replace(/^\s+/, "");
      } else {
        compact += piece;
      }
    });

    return compact.trim();
  }

  function countKeywords(sql) {
    const plainText = tokenizeSql(sql)
      .filter((token) => token.type === "text")
      .map((token) => token.value)
      .join(" ");

    const keywordPattern =
      /\b(WITH(?:\s+RECURSIVE)?|SELECT|FROM|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY|PARTITION\s+BY|HAVING|QUALIFY|WINDOW|LIMIT|OFFSET|FETCH|INSERT\s+INTO|INSERT|UPDATE|DELETE(?:\s+FROM)?|SET|VALUES|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|MERGE|USING|RETURNING|UNION(?:\s+ALL)?|INTERSECT|EXCEPT)\b/gi;

    return (plainText.match(keywordPattern) || []).length;
  }

  function updateStats(input, output) {
    inputChars.textContent = String(Array.from(input).length);
    outputChars.textContent = String(Array.from(output).length);
    lineCount.textContent = String(output ? output.split(/\r?\n/).length : 0);
    keywordCount.textContent = String(countKeywords(output));
  }

  function resetOutput() {
    outputSql.value = "";
    updateStats(inputSql.value, "");

    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function invalidateResult() {
    if (outputSql.value) {
      resetOutput();
    } else {
      updateStats(inputSql.value, "");
    }

    setInlineMessage("");
  }

  function announceActionSuccess(text = "Action completed successfully.") {
    setInlineMessage(text, "success");

    if (typeof window.showMessage === "function") {
      window.showMessage(text, "success");
    }
  }

  function formatSql({ announce = true } = {}) {
    const sql = inputSql.value;

    if (!sql.trim()) {
      resetOutput();
      notify("Please enter SQL code.", "error");
      inputSql.focus();
      return false;
    }

    try {
      const result = formatSqlText(sql);

      outputSql.value = result.output;
      lastOperation = "formatted";

      updateStats(sql, result.output);

      copyBtn.disabled = false;
      downloadBtn.disabled = false;

      if (announce) {
        announceActionSuccess(
          result.usedFallback
            ? "SQL formatted with the basic local fallback."
            : "SQL formatted successfully.",
        );
      }

      return true;
    } catch (error) {
      console.error(error);
      resetOutput();

      const detail =
        error instanceof Error && error.message
          ? error.message.split("\n")[0].trim()
          : "Unable to format SQL.";

      notify(
        `Unable to format SQL. Check the selected dialect and query syntax. ${detail}`.trim(),
        "error",
      );
      return false;
    }
  }

  function minifySql() {
    const sql = inputSql.value;

    if (!sql.trim()) {
      resetOutput();
      notify("Please enter SQL code.", "error");
      inputSql.focus();
      return false;
    }

    const minified = minifySqlText(sql);

    outputSql.value = minified;
    lastOperation = "minified";

    updateStats(sql, minified);

    copyBtn.disabled = false;
    downloadBtn.disabled = false;

    announceActionSuccess("SQL minified successfully.");
    return true;
  }

  function swapSql() {
    if (!outputSql.value) {
      notify("Nothing to swap.", "error");
      return;
    }

    inputSql.value = outputSql.value;
    resetOutput();

    notify("Output moved to input.", "success");
    inputSql.focus();
  }

  async function copyOutput() {
    if (!outputSql.value) {
      notify("Nothing to copy.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(outputSql.value, "SQL copied.");
  }

  function downloadOutput() {
    if (!outputSql.value) {
      notify("Nothing to download.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      `xavert-sql-${lastOperation}.sql`,
      outputSql.value,
      "text/plain;charset=utf-8",
      "Download started.",
    );
  }

  function clearAll() {
    inputSql.value = "";
    sqlDialect.value = "sql";
    keywordCase.value = "upper";
    indentStyle.value = "2";
    lastOperation = "query";

    resetOutput();
    setInlineMessage("");
    inputSql.focus();
  }

  function loadSample(type = "join") {
    const sample = samples[type] ?? samples.join;

    inputSql.value = sample;
    resetOutput();
    setInlineMessage("");

    const formatted = formatSql({ announce: false });

    if (!formatted) {
      return;
    }

    setInlineMessage("Sample loaded successfully.", "success");

    if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }

    inputSql.focus();
  }

  sampleBtn.addEventListener("click", () => {
    loadSample("join");
  });

  sampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      loadSample(button.dataset.sqlSample ?? "join");
    });
  });

  inputSql.addEventListener("input", invalidateResult);
  sqlDialect.addEventListener("change", invalidateResult);
  keywordCase.addEventListener("change", invalidateResult);
  indentStyle.addEventListener("change", invalidateResult);

  formatBtn.addEventListener("click", () => {
    formatSql();
  });

  minifyBtn.addEventListener("click", minifySql);
  swapBtn.addEventListener("click", swapSql);
  clearBtn.addEventListener("click", clearAll);

  copyBtn.addEventListener("click", () => {
    void copyOutput();
  });

  downloadBtn.addEventListener("click", downloadOutput);

  resetOutput();
}

initSqlFormatter();
