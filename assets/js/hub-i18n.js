"use strict";

(() => {
  const copy = {
    en: {
      workTitle: "XAVERT Work | Guided Document & Data Workflows",
      workSkip: "Skip to main content",
      workDescription: "Move from document to usable result with connected browser tools for PDF, Word, spreadsheets, OCR and data.",
      workHero: "Turn files into finished work.",
      workIntro: "Choose a practical route through documents, scans, spreadsheets and structured data. Each step opens a focused tool; your files remain under your control.",
      workChoose: "Choose a workflow", workAllTools: "Open all tools", workVisual: "XAVERT Work process",
      workStep1: "Bring the source", workStep1Text: "PDF, DOCX, image, spreadsheet or structured data",
      workStep2: "Prepare and verify", workStep2Text: "Extract, clean, compare, inspect or reorganize",
      workStep3: "Export the result", workStep3Text: "Download a useful file or continue in another tool",
      workSectionTitle: "Start from the job, not the file type.",
      workSectionIntro: "These routes connect tools that already work together. Stop after any step or continue with the next suggested action.",
      documents: "Documents", data: "Data", extraction: "Extraction", conversion: "Conversion", aiHandoff: "AI handoff",
      pdfTitle: "Prepare a PDF", pdfText: "Merge, split, compress, compare, redact, crop, OCR and convert PDF documents.", pdfLink: "Open PDF workflow →",
      docxTitle: "Inspect a DOCX", docxText: "Preview a Word document, extract text, convert to HTML or Markdown and clean metadata.", docxLink: "Open Word workflow →",
      sheetTitle: "Clean a spreadsheet", sheetText: "Open XLSX, XLS, ODS or CSV, remove duplicates, reorganize rows and export the result.", sheetLink: "Open spreadsheet workflow →",
      ocrTitle: "Turn an image into text", ocrText: "Prepare a scan, choose recognition languages and export editable text or JSON.", ocrLink: "Open OCR workflow →",
      dataTitle: "Move data between formats", dataText: "Convert CSV, XLSX, JSON and XML while keeping processing in the browser.", dataLink: "Open data workflow →",
      briefTitle: "Prepare work for an AI", briefText: "Turn verified material, goals and constraints into a clear task brief.", briefLink: "Build an AI brief →",
      workPrinciplesTitle: "A workflow you can inspect.",
      workPrinciplesIntro: "XAVERT Work does not hide your files in a black box. Each tool explains what it does and lets you review the result before moving on.",
      localTitle: "Local when possible", localText: "Browser processing reduces unnecessary uploads and keeps control closer to you.",
      focusedTitle: "One task at a time", focusedText: "Focused tools make it easier to understand what changed and correct mistakes.",
      exportTitle: "Exportable results", exportText: "Your work should leave XAVERT in a practical format you can store, send or reuse.",
      aiTitle: "XAVERT AI | Human-Guided AI Collaboration",
      aiSkip: "Skip to main content",
      aiDescription: "Prepare better AI tasks and review AI responses with privacy-conscious, human-guided browser tools.",
      aiHero: "Keep the human in the loop.",
      aiIntro: "XAVERT helps people communicate intent to AI systems and bring the result back for review. The goal is clearer instructions, visible assumptions and safer decisions.",
      aiBuild: "Build an AI brief", aiReview: "Review a response", aiVisual: "Human-guided AI workflow",
      aiStep1: "Human intent", aiStep1Text: "Goal, context, facts, limits and expected result",
      aiStep2: "Clear handoff", aiStep2Text: "A structured brief you can inspect before sharing",
      aiStep3: "Human verification", aiStep3Text: "Check claims, figures, sources and uncertainty",
      aiSectionTitle: "Two sides of responsible collaboration.",
      aiSectionIntro: "Prepare the request before generation and review the result before it affects a person, decision or document.",
      beforeTag: "Before generation", briefCardTitle: "AI Task Brief Builder",
      briefCardText: "Organize the objective, audience, verified material, constraints, tone and verification rules into one reusable instruction.",
      briefCardLink: "Build a clear brief →", afterTag: "After generation", reviewCardTitle: "AI Response Reviewer",
      reviewCardText: "Identify numbers, dates, sources, absolute claims and possible personal data that need human attention.",
      reviewCardLink: "Create a verification plan →", connectedTag: "Connected work",
      sourceCardTitle: "Prepare the source first", sourceCardText: "Use XAVERT Work to extract, clean or organize documents and data before involving an AI.",
      sourceCardLink: "Explore XAVERT Work →", aiPrinciplesTitle: "Collaboration, not blind delegation.",
      aiPrinciplesIntro: "The person remains responsible for purpose, consent, judgment and final use. XAVERT makes those checkpoints visible.",
      intentTitle: "Intent before output", intentText: "A precise request should state what is known, what is missing and what success looks like.",
      uncertaintyTitle: "Keep uncertainty visible", uncertaintyText: "Separate verified facts from assumptions, estimates and creative suggestions.",
      reviewTitle: "Review before action", reviewText: "Medical, legal, financial and safety-critical material requires qualified human verification."
    }
  };

  function init() {
    const page = document.body.dataset.hubPage;
    if (!page) return;

    function applyLanguage(language) {
      const code = Object.prototype.hasOwnProperty.call(copy, language) ? language : "en";
      const prefix = page === "work" ? "work" : "ai";
      const title = copy[code][`${prefix}Title`];
      const description = copy[code][`${prefix}Description`];

      document.documentElement.lang = code;
      document.title = title;
      document.querySelector('meta[name="description"]')?.setAttribute("content", description);
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);

      document.querySelectorAll("[data-hub-i18n]").forEach((element) => {
        const value = copy[code][element.dataset.hubI18n];
        if (value) element.textContent = value;
      });
      document.querySelectorAll("[data-hub-aria-label]").forEach((element) => {
        const value = copy[code][element.dataset.hubAriaLabel];
        if (value) element.setAttribute("aria-label", value);
      });

    }

    localStorage.removeItem("xavert-language");
    applyLanguage("en");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

