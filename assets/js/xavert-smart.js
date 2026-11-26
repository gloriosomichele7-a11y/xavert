/* XAVERT Smart Start - homepage enhancement, no file contents leave the browser. */
"use strict";
(() => {
  const root = document.getElementById("xavert-smart-start");
  const saved = document.getElementById("xavert-my-tools");
  if (!root || !saved) return;

  const fileInput = document.getElementById("xsmart-file");
  const dropButton = document.getElementById("xsmart-drop");
  const textInput = document.getElementById("xsmart-text");
  const textButton = document.getElementById("xsmart-analyze");
  const result = document.getElementById("xsmart-result");
  const status = document.getElementById("xsmart-status");
  const favList = document.getElementById("xsmart-favorites");
  const recentList = document.getElementById("xsmart-recents");
  const favArea = document.getElementById("xsmart-fav-area");
  const recentArea = document.getElementById("xsmart-recent-area");
  const clearRecent = document.getElementById("xsmart-clear-recent");
  if (![fileInput, dropButton, textInput, textButton, result, status, favList, recentList, favArea, recentArea, clearRecent].every(Boolean)) return;

  const keyFavorites = "xavert-favs-v1";
  const keyRecents = "xavert-recent-v1";
  const toolMap = new Map(
    Array.from(document.querySelectorAll("#services a.card-link[href^='tools/']"))
      .map((link) => [link.getAttribute("href"), link.querySelector("h3")?.textContent?.trim() || "Tool"]),
  );
  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value)
        ? [...new Set(value.filter((url) => typeof url === "string" && toolMap.has(url)))].slice(0, 20)
        : [];
    } catch { return []; }
  }
  function setList(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); return true; }
    catch { return false; }
  }

  const fileTools = {
    pdf: ["tools/pdf-toolkit.html"],
    docx: ["tools/word-toolkit.html"],
    xlsx: ["tools/spreadsheet-toolkit.html", "tools/data-converter.html"],
    csv: ["tools/csv-viewer-editor.html", "tools/data-converter.html", "tools/spreadsheet-toolkit.html"],
    json: ["tools/json-toolkit.html", "tools/data-converter.html"],
    xml: ["tools/xml-formatter-validator.html", "tools/xml-json-converter.html"],
    yaml: ["tools/yaml-json-converter.html"],
    yml: ["tools/yaml-json-converter.html"],
    md: ["tools/markdown-editor.html"],
    txt: ["tools/text-toolkit.html", "tools/word-character-counter.html"],
    svg: ["tools/svg-toolkit.html", "tools/favicon-generator.html"],
    png: ["tools/image-toolkit.html", "tools/background-remover.html", "tools/color-palette-extractor.html"],
    jpg: ["tools/image-toolkit.html", "tools/background-remover.html", "tools/image-metadata-exif-cleaner.html"],
    jpeg: ["tools/image-toolkit.html", "tools/background-remover.html", "tools/image-metadata-exif-cleaner.html"],
    webp: ["tools/image-toolkit.html", "tools/background-remover.html"],
    gif: ["tools/image-toolkit.html"],
    css: ["tools/css-minifier.html"],
    js: ["tools/javascript-formatter-minifier.html"],
    html: ["tools/html-minifier.html"],
    htm: ["tools/html-minifier.html"],
    sql: ["tools/sql-formatter.html", "tools/sql-minifier.html"],
  };

  function toolLink(url, kind = "suggestion") {
    if (!toolMap.has(url)) return null;
    const link = document.createElement("a");
    link.className = kind === "saved" ? "xsmart-saved-link" : "xsmart-suggestion";
    link.href = url;
    link.textContent = toolMap.get(url);
    return link;
  }

  function showSuggestions(headline, urls, detail) {
    result.replaceChildren();
    const list = [...new Set(urls)].filter((url) => toolMap.has(url));
    const heading = document.createElement("strong");
    heading.textContent = headline;
    result.appendChild(heading);
    if (detail) {
      const note = document.createElement("p");
      note.textContent = detail;
      result.appendChild(note);
    }
    const links = document.createElement("div");
    links.className = "xsmart-suggestion-list";
    list.forEach((url) => links.appendChild(toolLink(url)));
    result.appendChild(links);
    result.hidden = false;
    status.textContent = list.length
      ? `${list.length} suggested ${list.length === 1 ? "tool" : "tools"}. Choose one to continue.`
      : "No matching tool found. Try the search field above.";
  }

  function handleFile(file) {
    if (!file) return;
    const filename = file.name || "Unnamed file";
    const extension = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
    const urls = fileTools[extension] || ["tools/file-hash-checker.html"];
    showSuggestions(
      `Suggestions for ${filename}`,
      urls,
      "Only the file name and type are checked here. The file is not uploaded or passed to the next tool; select it again there.",
    );
  }

  dropButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => handleFile(fileInput.files?.[0]));
  for (const name of ["dragenter", "dragover"]) {
    dropButton.addEventListener(name, (event) => {
      event.preventDefault();
      dropButton.classList.add("xsmart-dragging");
    });
  }
  for (const name of ["dragleave", "drop"]) {
    dropButton.addEventListener(name, (event) => {
      event.preventDefault();
      dropButton.classList.remove("xsmart-dragging");
    });
  }
  dropButton.addEventListener("drop", (event) => handleFile(event.dataTransfer?.files?.[0]));

  function classifyText(input) {
    const text = input.trim();
    if (!text) return null;
    try {
      JSON.parse(text);
      return { label: "JSON detected", urls: ["tools/json-toolkit.html", "tools/data-converter.html"] };
    } catch { /* Continue detecting other formats. */ }
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text))
      return { label: "JWT detected", urls: ["tools/jwt-decoder.html"] };
    if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(text))
      return { label: "HTML detected", urls: ["tools/html-minifier.html", "tools/html-entity-encoder-decoder.html"] };
    if (/^\s*(?:<\?xml\b|<[A-Za-z][\w:-]*(?:\s|>|\/))/i.test(text))
      return { label: "XML-like content detected", urls: ["tools/xml-formatter-validator.html", "tools/xml-json-converter.html"] };
    if (/\b(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]*\b(?:FROM|INTO|SET|WHERE)\b/i.test(text))
      return { label: "SQL detected", urls: ["tools/sql-formatter.html", "tools/sql-minifier.html"] };
    if (/^\s*(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=|export\s+(?:default|const|function)|import\s+.+\s+from\s+)/m.test(text))
      return { label: "JavaScript-like content detected", urls: ["tools/javascript-formatter-minifier.html"] };
    if (/\{[^}]*:[^}]*\}/m.test(text))
      return { label: "CSS-like content detected", urls: ["tools/css-minifier.html"] };
    if (/^[^,\r\n]+,[^,\r\n]+\r?\n/m.test(text))
      return { label: "CSV-like content detected", urls: ["tools/csv-viewer-editor.html", "tools/data-converter.html"] };
    if (/^[\w-]+:\s+.+$/m.test(text) && /\n/.test(text))
      return { label: "YAML-like content detected", urls: ["tools/yaml-json-converter.html"] };
    return { label: "Text detected", urls: ["tools/text-toolkit.html", "tools/word-character-counter.html"] };
  }

  textButton.addEventListener("click", () => {
    const recognized = classifyText(textInput.value);
    if (!recognized) {
      status.textContent = "Paste some text first.";
      result.hidden = true;
      textInput.focus();
      return;
    }
    showSuggestions(recognized.label, recognized.urls,
      "Analysis runs locally. Text is not sent or transferred to another tool; paste it again after opening that tool.");
  });

  function renderSaved() {
    favList.replaceChildren();
    recentList.replaceChildren();
    const favorites = readList(keyFavorites);
    const recents = readList(keyRecents).slice(0, 6);
    for (const url of favorites) {
      const row = document.createElement("div");
      row.className = "xsmart-saved-item";
      row.appendChild(toolLink(url, "saved"));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "xsmart-remove";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${toolMap.get(url)} from favorites`);
      remove.addEventListener("click", () => {
        setList(keyFavorites, readList(keyFavorites).filter((entry) => entry !== url));
        renderSaved();
      });
      row.appendChild(remove);
      favList.appendChild(row);
    }
    for (const url of recents) recentList.appendChild(toolLink(url, "saved"));
    favArea.hidden = !favorites.length;
    recentArea.hidden = !recents.length;
    saved.hidden = !favorites.length && !recents.length;
  }
  clearRecent.addEventListener("click", () => {
    setList(keyRecents, []);
    renderSaved();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === keyFavorites || event.key === keyRecents) renderSaved();
  });
  renderSaved();
})();
