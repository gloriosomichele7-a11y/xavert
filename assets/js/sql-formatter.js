"use strict";

function initSqlFormatter() {
  const inputSql = document.getElementById("inputSql");
  const outputSql = document.getElementById("outputSql");

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

  const majorKeywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "LEFT JOIN",
    "RIGHT JOIN",
    "INNER JOIN",
    "FULL JOIN",
    "OUTER JOIN",
    "JOIN",
    "LIMIT",
    "VALUES",
    "INSERT INTO",
    "UPDATE",
    "DELETE FROM",
    "DELETE",
    "SET",
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
    "UNION ALL",
    "UNION",
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

  function tokenizeSql(sql) {
    const tokens = [];
    let buffer = "";
    let quote = null;

    function flush() {
      if (buffer) {
        tokens.push({
          type: quote ? "string" : "text",
          value: buffer,
        });
        buffer = "";
      }
    }

    for (let index = 0; index < sql.length; index += 1) {
      const char = sql[index];
      const next = sql[index + 1];

      if (quote) {
        buffer += char;

        if (char === quote) {
          if (next === quote) {
            buffer += next;
            index += 1;
          } else {
            flush();
            quote = null;
          }
        }

        continue;
      }

      if (char === "'" || char === '"' || char === "`") {
        flush();
        quote = char;
        buffer = char;
        continue;
      }

      buffer += char;
    }

    flush();

    return tokens;
  }

  function formatTextSegment(segment) {
    let formatted = segment;

    const orderedKeywords = majorKeywords
      .slice()
      .sort((a, b) => b.length - a.length);

    orderedKeywords.forEach((keyword) => {
      const keywordPattern = keyword
        .split(" ")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s+");

      const regex = new RegExp(`\\b${keywordPattern}\\b`, "gi");

      formatted = formatted.replace(
        regex,
        (match) => `\n${match.toUpperCase()}`,
      );
    });

    return formatted;
  }

  function formatSqlText(sql) {
    const tokens = tokenizeSql(sql);

    return tokens
      .map((token) =>
        token.type === "string" ? token.value : formatTextSegment(token.value),
      )
      .join("")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  function minifySqlText(sql) {
    const tokens = tokenizeSql(sql);

    return tokens
      .map((token) => {
        if (token.type === "string") {
          return token.value;
        }

        return token.value
          .replace(/--[^\n\r]*/g, " ")
          .replace(/\/\*[\s\S]*?\*\//g, " ")
          .replace(/\s+/g, " ")
          .replace(/\s*([(),=<>+\-*/])\s*/g, "$1");
      })
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  }

  function countKeywords(sql) {
    const plainText = tokenizeSql(sql)
      .filter((token) => token.type === "text")
      .map((token) => token.value)
      .join(" ");

    const keywordPattern =
      /\b(SELECT|FROM|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|INSERT\s+INTO|UPDATE|DELETE(?:\s+FROM)?|SET|VALUES|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|UNION(?:\s+ALL)?)\b/gi;

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

  function announceActionSuccess() {
    setInlineMessage("Action completed successfully.", "success");

    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Action completed successfully.", "success");
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

    const formatted = formatSqlText(sql);

    outputSql.value = formatted;
    lastOperation = "formatted";

    updateStats(sql, formatted);

    copyBtn.disabled = false;
    downloadBtn.disabled = false;

    if (announce) {
      announceActionSuccess();
    }

    return true;
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

    announceActionSuccess();

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

    await window.xavertCopyText(outputSql.value);
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
    );
  }

  function clearAll() {
    inputSql.value = "";
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

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
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
