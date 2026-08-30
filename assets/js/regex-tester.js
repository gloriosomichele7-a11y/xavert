"use strict";

function initRegexTester() {
  const $ = (id) => document.getElementById(id);

  const elements = {
    pattern: $("pattern"),
    inputText: $("inputText"),
    flagG: $("flagG"),
    flagI: $("flagI"),
    flagM: $("flagM"),
    flagS: $("flagS"),
    flagU: $("flagU"),
    flagY: $("flagY"),
    flagV: $("flagV"),
    flagD: $("flagD"),
    autoRunCheck: $("autoRunCheck"),
    timeoutSelect: $("timeoutSelect"),
    maxMatchesSelect: $("maxMatchesSelect"),
    replacementInput: $("replacementInput"),
    splitLimit: $("splitLimit"),
    riskBox: $("riskBox"),
    riskTitle: $("riskTitle"),
    riskText: $("riskText"),
    testBtn: $("testBtn"),
    clearBtn: $("clearBtn"),
    message: $("message"),
    resultBox: $("resultBox"),
    matchCountStat: $("matchCountStat"),
    groupCountStat: $("groupCountStat"),
    namedGroupStat: $("namedGroupStat"),
    matchedCharsStat: $("matchedCharsStat"),
    executionStat: $("executionStat"),
    flagsStat: $("flagsStat"),
    preview: $("preview"),
    matches: $("matches"),
    replaceOutput: $("replaceOutput"),
    splitOutput: $("splitOutput"),
    snippetOutput: $("snippetOutput"),
    copyReplaceBtn: $("copyReplaceBtn"),
    copySnippetBtn: $("copySnippetBtn"),
    copyMatchesBtn: $("copyMatchesBtn"),
    downloadMatchesBtn: $("downloadMatchesBtn"),
    copyJsonBtn: $("copyJsonBtn"),
    downloadJsonBtn: $("downloadJsonBtn"),
  };

  const required = Object.values(elements);

  if (required.some((element) => !element)) {
    console.error("Regex Tester: HTML and JS do not match.");
    return;
  }

  const presetButtons = Array.from(
    document.querySelectorAll("[data-regex-preset]"),
  );

  const flagControls = [
    ["g", elements.flagG],
    ["i", elements.flagI],
    ["m", elements.flagM],
    ["s", elements.flagS],
    ["u", elements.flagU],
    ["y", elements.flagY],
    ["v", elements.flagV],
    ["d", elements.flagD],
  ];

  const state = {
    worker: null,
    timeoutId: 0,
    runToken: 0,
    autoRunTimer: 0,
    lastResult: null,
    lastPattern: "",
    lastFlags: "",
    lastText: "",
  };

  function clearInlineMessage() {
    elements.message.textContent = "";
    elements.message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );
  }

  function notify(text, type = "info") {
    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
      return;
    }

    const safeType = ["success", "error", "info"].includes(type)
      ? type
      : "info";

    elements.message.textContent = text;
    elements.message.classList.remove(
      "message-success",
      "message-error",
      "message-info",
    );
    elements.message.classList.add(`message-${safeType}`);
  }

  function showActionSuccess() {
    if (typeof window.showActionSuccess === "function") {
      window.showActionSuccess();
    } else {
      notify("Action completed successfully.", "success");
    }
  }

  function getFlags() {
    return flagControls
      .filter(([, control]) => control.checked && !control.disabled)
      .map(([flag]) => flag)
      .join("");
  }

  function detectFlagSupport(flag) {
    try {
      new RegExp("", flag);
      return true;
    } catch {
      return false;
    }
  }

  function configureFlagSupport() {
    flagControls.forEach(([flag, control]) => {
      if (!detectFlagSupport(flag)) {
        control.checked = false;
        control.disabled = true;

        const label = control.closest(".regex-flag");

        if (label) {
          label.title = `${flag} is not supported by this browser.`;
        }
      }
    });

    if (elements.flagV.checked && elements.flagU.checked) {
      elements.flagU.checked = false;
    }
  }

  function enforceUnicodeFlagExclusivity(changedControl) {
    if (changedControl === elements.flagU && elements.flagU.checked) {
      elements.flagV.checked = false;
    }

    if (changedControl === elements.flagV && elements.flagV.checked) {
      elements.flagU.checked = false;
    }
  }

  function terminateWorker() {
    if (state.worker) {
      state.worker.terminate();
      state.worker = null;
    }

    if (state.timeoutId) {
      window.clearTimeout(state.timeoutId);
      state.timeoutId = 0;
    }
  }

  function regexWorkerMain() {
    function advanceStringIndex(text, index, unicodeAware) {
      if (!unicodeAware) {
        return index + 1;
      }

      if (index + 1 >= text.length) {
        return index + 1;
      }

      const first = text.charCodeAt(index);

      if (first < 0xd800 || first > 0xdbff) {
        return index + 1;
      }

      const second = text.charCodeAt(index + 1);

      return second >= 0xdc00 && second <= 0xdfff ? index + 2 : index + 1;
    }

    self.onmessage = (event) => {
      const {
        pattern,
        flags,
        text,
        replacement,
        splitLimit,
        maxMatches,
      } = event.data;

      const started = performance.now();

      try {
        const regex = new RegExp(pattern, flags);
        const iterative = regex.global || regex.sticky;
        const matches = [];
        let capped = false;

        if (iterative) {
          let match;

          while ((match = regex.exec(text)) !== null) {
            const value = String(match[0]);

            matches.push({
              value,
              index: match.index,
              end: match.index + value.length,
              groups: Array.from(match)
                .slice(1)
                .map((group, index) => ({
                  index: index + 1,
                  value: group == null ? null : String(group),
                })),
              namedGroups: match.groups
                ? Object.fromEntries(
                    Object.entries(match.groups).map(([name, group]) => [
                      name,
                      group == null ? null : String(group),
                    ]),
                  )
                : {},
              indices: match.indices
                ? match.indices.map((range) =>
                    range ? [range[0], range[1]] : null,
                  )
                : null,
              namedIndices:
                match.indices && match.indices.groups
                  ? Object.fromEntries(
                      Object.entries(match.indices.groups).map(
                        ([name, range]) => [
                          name,
                          range ? [range[0], range[1]] : null,
                        ],
                      ),
                    )
                  : {},
            });

            if (matches.length >= maxMatches) {
              capped = true;
              break;
            }

            if (value === "") {
              if (regex.lastIndex >= text.length) {
                break;
              }

              regex.lastIndex = advanceStringIndex(
                text,
                regex.lastIndex,
                regex.unicode || Boolean(regex.unicodeSets),
              );
            }
          }
        } else {
          const match = regex.exec(text);

          if (match) {
            const value = String(match[0]);

            matches.push({
              value,
              index: match.index,
              end: match.index + value.length,
              groups: Array.from(match)
                .slice(1)
                .map((group, index) => ({
                  index: index + 1,
                  value: group == null ? null : String(group),
                })),
              namedGroups: match.groups
                ? Object.fromEntries(
                    Object.entries(match.groups).map(([name, group]) => [
                      name,
                      group == null ? null : String(group),
                    ]),
                  )
                : {},
              indices: match.indices
                ? match.indices.map((range) =>
                    range ? [range[0], range[1]] : null,
                  )
                : null,
              namedIndices:
                match.indices && match.indices.groups
                  ? Object.fromEntries(
                      Object.entries(match.indices.groups).map(
                        ([name, range]) => [
                          name,
                          range ? [range[0], range[1]] : null,
                        ],
                      ),
                    )
                  : {},
            });
          }
        }

        const replaceRegex = new RegExp(pattern, flags);
        const splitRegex = new RegExp(pattern, flags);
        const replaced = text.replace(replaceRegex, replacement);
        const split = text.split(splitRegex, splitLimit);

        self.postMessage({
          ok: true,
          elapsedMs: performance.now() - started,
          matches,
          replaced,
          split,
          capped,
        });
      } catch (error) {
        self.postMessage({
          ok: false,
          elapsedMs: performance.now() - started,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
  }

  function createWorker() {
    const source = `(${regexWorkerMain.toString()})();`;
    const blob = new Blob([source], {
      type: "text/javascript;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    try {
      return new Worker(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function analyzeRisk(pattern) {
    const reasons = [];
    let score = 0;

    if (
      /(\([^)]*[+*][^)]*\))[+*{]/.test(pattern) ||
      /(\[[^\]]+\][+*]){2,}/.test(pattern)
    ) {
      score += 3;
      reasons.push("Nested quantified constructs detected.");
    }

    if (/\((?:[^()|]+\|){1,}[^()|]+\)[+*{]/.test(pattern)) {
      score += 2;
      reasons.push("Quantified alternation may create ambiguous backtracking.");
    }

    if (
      /(\.\*){2,}|(\.\+){2,}/.test(pattern) ||
      /\.\*[+*{]|\.\+[+*{]/.test(pattern)
    ) {
      score += 3;
      reasons.push("Repeated wildcard quantifiers detected.");
    }

    if (/(?:\+|\*|\{\d+(?:,\d*)?\})\??(?:\+|\*|\{)/.test(pattern)) {
      score += 2;
      reasons.push("A quantified expression appears to be quantified again.");
    }

    if (pattern.length > 1000) {
      score += 1;
      reasons.push("The pattern is very long and should be reviewed carefully.");
    }

    let level = "low";

    if (score >= 4) {
      level = "high";
    } else if (score >= 2) {
      level = "medium";
    }

    return {
      level,
      text:
        reasons.length > 0
          ? reasons.join(" ")
          : "No common catastrophic-backtracking indicators detected.",
    };
  }

  function renderRisk() {
    const risk = analyzeRisk(elements.pattern.value);

    elements.riskBox.dataset.level = risk.level;
    elements.riskTitle.textContent =
      `Pattern Risk: ${risk.level.charAt(0).toUpperCase()}${risk.level.slice(1)}`;
    elements.riskText.textContent = risk.text;
  }

  function resetResult() {
    state.lastResult = null;
    state.lastPattern = "";
    state.lastFlags = "";
    state.lastText = "";

    elements.resultBox.hidden = true;
    elements.preview.replaceChildren();
    elements.matches.replaceChildren();
    elements.replaceOutput.value = "";
    elements.splitOutput.value = "";
    elements.snippetOutput.textContent = "";

    elements.matchCountStat.textContent = "0";
    elements.groupCountStat.textContent = "0";
    elements.namedGroupStat.textContent = "0";
    elements.matchedCharsStat.textContent = "0";
    elements.executionStat.textContent = "0ms";
    elements.flagsStat.textContent = "—";

    elements.copyReplaceBtn.disabled = true;
    elements.copySnippetBtn.disabled = true;
    elements.copyMatchesBtn.disabled = true;
    elements.downloadMatchesBtn.disabled = true;
    elements.copyJsonBtn.disabled = true;
    elements.downloadJsonBtn.disabled = true;
  }

  function createHighlightedFragment(text, matches) {
    const fragment = document.createDocumentFragment();

    if (!matches.length) {
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }

    const ordered = [...matches].sort(
      (a, b) => a.index - b.index || a.end - b.end,
    );

    let cursor = 0;

    ordered.forEach((match) => {
      if (match.index < cursor) {
        return;
      }

      fragment.appendChild(
        document.createTextNode(text.slice(cursor, match.index)),
      );

      if (match.end === match.index) {
        const zero = document.createElement("span");
        zero.className = "regex-zero-match";
        zero.title = `Zero-length match at ${match.index}`;
        zero.setAttribute("aria-label", `Zero-length match at ${match.index}`);
        fragment.appendChild(zero);
      } else {
        const mark = document.createElement("mark");
        mark.textContent = text.slice(match.index, match.end);
        mark.title = `Match at ${match.index}–${match.end}`;
        fragment.appendChild(mark);
      }

      cursor = Math.max(cursor, match.end);
    });

    fragment.appendChild(document.createTextNode(text.slice(cursor)));
    return fragment;
  }

  function renderPreview(matches) {
    elements.preview.replaceChildren(
      createHighlightedFragment(elements.inputText.value, matches),
    );
  }

  function renderMatchList(matches) {
    elements.matches.replaceChildren();

    if (!matches.length) {
      const item = document.createElement("li");
      item.className = "regex-empty";
      item.textContent = "No matches found.";
      elements.matches.appendChild(item);
      return;
    }

    const fragment = document.createDocumentFragment();

    matches.forEach((match, matchIndex) => {
      const item = document.createElement("li");
      item.className = "regex-match-card";

      const head = document.createElement("div");
      head.className = "regex-match-head";

      const value = document.createElement("span");
      value.className = "regex-match-value";
      value.textContent = match.value || "(empty match)";

      const position = document.createElement("span");
      position.className = "regex-match-index";
      position.textContent =
        `#${matchIndex + 1} · ${match.index}–${match.end}`;

      head.append(value, position);
      item.appendChild(head);

      const details = [];

      match.groups.forEach((group) => {
        details.push({
          label: `$${group.index}`,
          value: group.value,
          range: match.indices?.[group.index] || null,
        });
      });

      Object.entries(match.namedGroups || {}).forEach(([name, groupValue]) => {
        details.push({
          label: `$<${name}>`,
          value: groupValue,
          range: match.namedIndices?.[name] || null,
        });
      });

      if (details.length) {
        const groupList = document.createElement("div");
        groupList.className = "regex-group-list";

        details.forEach((detail) => {
          const groupItem = document.createElement("div");
          groupItem.className = "regex-group-item";

          const rangeText = detail.range
            ? ` · ${detail.range[0]}–${detail.range[1]}`
            : "";

          groupItem.textContent =
            `${detail.label}${rangeText}: ${
              detail.value == null ? "undefined" : JSON.stringify(detail.value)
            }`;

          groupList.appendChild(groupItem);
        });

        item.appendChild(groupList);
      }

      fragment.appendChild(item);
    });

    elements.matches.appendChild(fragment);
  }

  function getGroupStats(matches) {
    let numbered = 0;
    const named = new Set();

    matches.forEach((match) => {
      numbered = Math.max(numbered, match.groups.length);

      Object.keys(match.namedGroups || {}).forEach((name) => {
        named.add(name);
      });
    });

    return {
      numbered,
      named: named.size,
    };
  }

  function buildSnippet(pattern, flags, text) {
    const patternLiteral = JSON.stringify(pattern);
    const flagsLiteral = JSON.stringify(flags);
    const textLiteral = JSON.stringify(text);

    if (flags.includes("g")) {
      return `const regex = new RegExp(${patternLiteral}, ${flagsLiteral});
const text = ${textLiteral};

const matches = [...text.matchAll(regex)];

console.log(matches);`;
    }

    return `const regex = new RegExp(${patternLiteral}, ${flagsLiteral});
const text = ${textLiteral};

const match = regex.exec(text);

console.log(match);`;
  }

  function buildExportData() {
    return {
      tool: "XAVERT Regex Tester",
      engine: "JavaScript RegExp",
      pattern: state.lastPattern,
      flags: state.lastFlags,
      textLength: Array.from(state.lastText).length,
      timeoutMilliseconds: Number(elements.timeoutSelect.value),
      maximumMatches: Number(elements.maxMatchesSelect.value),
      elapsedMilliseconds: state.lastResult?.elapsedMs ?? null,
      capped: Boolean(state.lastResult?.capped),
      matches: state.lastResult?.matches || [],
      replacement: {
        expression: elements.replacementInput.value,
        output: state.lastResult?.replaced ?? "",
      },
      split: {
        limit: Number(elements.splitLimit.value),
        output: state.lastResult?.split || [],
      },
    };
  }

  function renderResult(result, pattern, flags, text) {
    const matches = result.matches || [];
    const groupStats = getGroupStats(matches);
    const matchedChars = matches.reduce(
      (total, match) => total + match.value.length,
      0,
    );

    state.lastResult = result;
    state.lastPattern = pattern;
    state.lastFlags = flags;
    state.lastText = text;

    elements.matchCountStat.textContent =
      new Intl.NumberFormat("en-US").format(matches.length);
    elements.groupCountStat.textContent =
      new Intl.NumberFormat("en-US").format(groupStats.numbered);
    elements.namedGroupStat.textContent =
      new Intl.NumberFormat("en-US").format(groupStats.named);
    elements.matchedCharsStat.textContent =
      new Intl.NumberFormat("en-US").format(matchedChars);
    elements.executionStat.textContent =
      `${result.elapsedMs.toFixed(result.elapsedMs < 10 ? 2 : 1)}ms`;
    elements.flagsStat.textContent = flags || "—";

    renderPreview(matches);
    renderMatchList(matches);

    elements.replaceOutput.value = result.replaced;
    elements.splitOutput.value = (result.split || [])
      .map((value, index) => `${index}: ${JSON.stringify(value)}`)
      .join("\n");

    elements.snippetOutput.textContent = buildSnippet(pattern, flags, text);

    elements.copyReplaceBtn.disabled = false;
    elements.copySnippetBtn.disabled = false;

    const hasMatches = matches.length > 0;

    elements.copyMatchesBtn.disabled = !hasMatches;
    elements.downloadMatchesBtn.disabled = !hasMatches;
    elements.copyJsonBtn.disabled = false;
    elements.downloadJsonBtn.disabled = false;

    elements.resultBox.hidden = false;
  }

  function runRegex({ automatic = false } = {}) {
    const pattern = elements.pattern.value;
    const text = elements.inputText.value;
    const flags = getFlags();
    const timeout = Number(elements.timeoutSelect.value) || 1000;
    const maxMatches = Number(elements.maxMatchesSelect.value) || 500;
    const splitLimit = Math.max(
      1,
      Math.min(1000, Number(elements.splitLimit.value) || 50),
    );

    renderRisk();

    if (!pattern) {
      terminateWorker();
      resetResult();

      if (!automatic) {
        notify("Please enter a regular expression.", "error");
      }

      return false;
    }

    if (pattern.length > 20000) {
      terminateWorker();
      resetResult();
      notify("Regex patterns are limited to 20,000 characters.", "error");
      return false;
    }

    if (text.length > 5_000_000) {
      terminateWorker();
      resetResult();
      notify(
        "Test text is limited to 5 million characters for safer browser processing.",
        "error",
      );
      return false;
    }

    terminateWorker();

    const token = ++state.runToken;
    const worker = createWorker();
    state.worker = worker;
    elements.testBtn.disabled = true;

    worker.onmessage = (event) => {
      if (token !== state.runToken) {
        return;
      }

      terminateWorker();
      elements.testBtn.disabled = false;

      const result = event.data;

      if (!result?.ok) {
        resetResult();

        if (automatic) {
          notify(result?.error || "Invalid regular expression.", "error");
        } else {
          notify(
            `Invalid regular expression: ${
              result?.error || "Unknown error"
            }`,
            "error",
          );
        }

        return;
      }

      renderResult(result, pattern, flags, text);

      if (!automatic) {
        showActionSuccess();
      }
    };

    worker.onerror = (event) => {
      if (token !== state.runToken) {
        return;
      }

      console.error("Regex Tester worker failed:", event);
      terminateWorker();
      elements.testBtn.disabled = false;
      resetResult();
      notify("Regex execution worker failed.", "error");
    };

    state.timeoutId = window.setTimeout(() => {
      if (token !== state.runToken) {
        return;
      }

      terminateWorker();
      elements.testBtn.disabled = false;
      resetResult();

      notify(
        `Regex execution exceeded ${timeout} ms and was terminated. ` +
          "The pattern may cause excessive backtracking on this input.",
        "error",
      );
    }, timeout);

    worker.postMessage({
      pattern,
      flags,
      text,
      replacement: elements.replacementInput.value,
      splitLimit,
      maxMatches,
    });

    return true;
  }

  function scheduleAutoRun() {
    renderRisk();

    if (state.autoRunTimer) {
      window.clearTimeout(state.autoRunTimer);
      state.autoRunTimer = 0;
    }

    if (!elements.autoRunCheck.checked) {
      resetResult();
      return;
    }

    state.autoRunTimer = window.setTimeout(() => {
      state.autoRunTimer = 0;
      runRegex({ automatic: true });
    }, 300);
  }

  function loadPreset(value) {
    elements.pattern.value = value;

    if (!elements.inputText.value.trim()) {
      elements.inputText.value =
        "Contact us at support@xavert.com or visit https://xavert.com.\n" +
        "Order 12345 was created on 2026-01-15.\n" +
        "The quick brown fox jumps over 42 lazy dogs.";
    }

    renderRisk();
    runRegex();
  }

  async function copyText(text) {
    if (!text) {
      notify("Nothing to copy.", "error");
      return false;
    }

    if (typeof window.xavertCopyText === "function") {
      return window.xavertCopyText(text);
    }

    try {
      await navigator.clipboard.writeText(text);

      if (typeof window.showCopySuccess === "function") {
        window.showCopySuccess();
      }

      return true;
    } catch {
      notify("Copy failed.", "error");
      return false;
    }
  }

  function downloadText(filename, content, mimeType) {
    if (typeof window.downloadFile === "function") {
      return window.downloadFile(filename, content, mimeType);
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (typeof window.showDownloadSuccess === "function") {
      window.showDownloadSuccess();
    }

    return true;
  }

  function getPlainMatches() {
    return (state.lastResult?.matches || [])
      .map((match) => match.value)
      .join("\n");
  }

  function copyMatches() {
    const content = getPlainMatches();

    if (!content) {
      notify("Nothing to copy.", "error");
      return;
    }

    void copyText(content);
  }

  function downloadMatches() {
    const content = getPlainMatches();

    if (!content) {
      notify("Nothing to download.", "error");
      return;
    }

    downloadText(
      "xavert-regex-matches.txt",
      content,
      "text/plain;charset=utf-8",
    );
  }

  function copyJson() {
    if (!state.lastResult) {
      notify("Test a regex before copying match data.", "error");
      return;
    }

    void copyText(JSON.stringify(buildExportData(), null, 2));
  }

  function downloadJson() {
    if (!state.lastResult) {
      notify("Test a regex before downloading match data.", "error");
      return;
    }

    downloadText(
      "xavert-regex-results.json",
      JSON.stringify(buildExportData(), null, 2),
      "application/json;charset=utf-8",
    );
  }

  function clearAll() {
    state.runToken += 1;
    terminateWorker();

    if (state.autoRunTimer) {
      window.clearTimeout(state.autoRunTimer);
      state.autoRunTimer = 0;
    }

    elements.pattern.value = "";
    elements.inputText.value = "";
    elements.replacementInput.value = "";
    elements.splitLimit.value = "50";
    elements.timeoutSelect.value = "1000";
    elements.maxMatchesSelect.value = "500";
    elements.autoRunCheck.checked = true;

    elements.flagG.checked = true;
    elements.flagI.checked = false;
    elements.flagM.checked = false;
    elements.flagS.checked = false;

    if (!elements.flagU.disabled) {
      elements.flagU.checked = true;
    }

    elements.flagY.checked = false;

    if (!elements.flagV.disabled) {
      elements.flagV.checked = false;
    }

    if (!elements.flagD.disabled) {
      elements.flagD.checked = false;
    }

    resetResult();
    clearInlineMessage();
    renderRisk();
    elements.testBtn.disabled = false;
    elements.pattern.focus();
  }

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      loadPreset(button.dataset.regexPreset || "");
    });
  });

  elements.testBtn.addEventListener("click", () => {
    runRegex();
  });

  elements.clearBtn.addEventListener("click", clearAll);

  elements.pattern.addEventListener("input", scheduleAutoRun);
  elements.inputText.addEventListener("input", scheduleAutoRun);
  elements.replacementInput.addEventListener("input", scheduleAutoRun);
  elements.splitLimit.addEventListener("input", scheduleAutoRun);

  [
    elements.timeoutSelect,
    elements.maxMatchesSelect,
    elements.autoRunCheck,
  ].forEach((control) => {
    control.addEventListener("change", scheduleAutoRun);
  });

  flagControls.forEach(([, control]) => {
    control.addEventListener("change", () => {
      enforceUnicodeFlagExclusivity(control);
      scheduleAutoRun();
    });
  });

  elements.copyReplaceBtn.addEventListener("click", () => {
    void copyText(elements.replaceOutput.value);
  });

  elements.copySnippetBtn.addEventListener("click", () => {
    void copyText(elements.snippetOutput.textContent);
  });

  elements.copyMatchesBtn.addEventListener("click", copyMatches);
  elements.downloadMatchesBtn.addEventListener("click", downloadMatches);
  elements.copyJsonBtn.addEventListener("click", copyJson);
  elements.downloadJsonBtn.addEventListener("click", downloadJson);

  window.addEventListener(
    "pagehide",
    () => {
      terminateWorker();

      if (state.autoRunTimer) {
        window.clearTimeout(state.autoRunTimer);
      }
    },
    { once: true },
  );

  configureFlagSupport();
  resetResult();
  renderRisk();
}

initRegexTester();
