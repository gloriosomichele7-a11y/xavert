"use strict";

(() => {
  const translations = {
    en: {
      title: "XAVERT | Browser Tools, Workflows & AI Collaboration",
      description: "Use 57 browser-based tools, guided document workflows and human-centered AI collaboration utilities. Fast, privacy-conscious and no sign-up required.",
      navTools: "Tools", navWork: "Work", navAi: "AI", languageLabel: "Language", exploreTools: "Explore tools",
      eyebrow: "57 focused tools · built for real work",
      heroTitle: "Get digital work done—without the clutter.",
      heroText: "Convert files, clean data, build developer assets and prepare better work for AI in one focused, privacy-conscious workspace.",
      searchPlaceholder: "Search a tool, format or task...",
      trustTools: "57 focused tools", trustPrivacy: "Browser processing where supported", trustSignup: "No sign-up",
      consoleTools: "Quick tools", consoleToolsText: "Convert, clean, create and check",
      consoleWork: "Workflows", consoleWorkText: "Documents and repeatable tasks",
      consoleAi: "AI collaboration", consoleAiText: "From human intent to useful output",
      consoleNote: "Your files stay on your device whenever the tool allows it.",
      pathKicker: "Choose the right path", pathTitle: "Less hunting. More doing.",
      pathText: "Start with a quick utility, follow a complete workflow or prepare a task for AI.",
      pathTools: "XAVERT Tools", pathToolsText: "Fast utilities for files, code, data, images and everyday tasks.", browseTools: "Browse all tools →",
      pathWork: "XAVERT Work", pathWorkText: "Connected steps for documents, office work and repeatable processes.",
      pathAi: "XAVERT AI", pathAiText: "Guided collaboration that turns your goal into a useful, verifiable result.",
      inDevelopment: "In development", openWorkspace: "Open workspace →", openAi: "Open AI workspace →", installEyebrow: "XAVERT on every device",
      installTitle: "Keep your workspace one tap away.", installText: "Add XAVERT to your phone or install it on your computer.", installGuide: "How to add it", installButton: "Install XAVERT",
      installIos: "iPhone or iPad: In Safari, tap Share, then Add to Home Screen. In Chrome, tap Share beside the address bar, then Add to Home Screen.",
      installAndroid: "Android: Open the browser menu and choose Install app or Add to Home screen.",
      installComputer: "Computer: In Chrome or Edge, use the install icon in the address bar or the browser menu.",
      installNote: "An internet connection is still required to use the tools.",
      directoryLabel: "The complete toolkit",
      developerTitle: "Developer Tools", developerDescription: "Build, format, test and manage code, SEO, structured data and web projects.",
      documentTitle: "Document Tools", documentDescription: "Work with PDF and Word documents directly in your browser.",
      imageTitle: "Image & Design Tools", imageDescription: "Create, inspect and improve images, graphics, QR codes and visual assets.",
      utilityTitle: "Utility Tools", utilityDescription: "Practical everyday tools for text, security, time, measurements and files.",
      dataTitle: "Data Conversion Tools", dataDescription: "Transform spreadsheet and structured data into useful formats for analysis and reporting.", aiTitle: "AI Collaboration Tools", aiDescription: "Prepare clearer AI requests and review responses before using them in real work.",
      showMore: "Show all", showLess: "Show less", openTool: "Open tool  →", noResults: "No matching tools",
      contact: "Contact", privacyPolicy: "Privacy Policy", termsOfUse: "Terms of Use", legalLabel: "Legal", supportEmailAria: "Email XAVERT support",
      skipToMain: "Skip to main content", navPrimary: "Primary navigation", searchAria: "Search XAVERT tools", searchSuggestions: "Tool search suggestions", advantagesAria: "XAVERT advantages", productAreasAria: "XAVERT product areas", browserStatus: "Browser ready"
    }
  };

  const supported = Object.keys(translations);

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element && value) element.textContent = value;
  }

  function applyLanguage(language) {
    const code = supported.includes(language) ? language : "en";
    const copy = translations[code];
    document.documentElement.lang = code;
    document.title = copy.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", copy.description);

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = copy[element.dataset.i18n];
      if (value) element.textContent = value;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const value = copy[element.dataset.i18nPlaceholder];
      if (value) element.setAttribute("placeholder", value);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const value = copy[element.dataset.i18nAriaLabel];
      if (value) element.setAttribute("aria-label", value);
    });

    setText("#developer-tools", copy.developerTitle);
    setText("#developer-tools + .category-description", copy.developerDescription);
    setText("#document-tools", copy.documentTitle);
    setText("#document-tools + .category-description", copy.documentDescription);
    setText("#image-tools", copy.imageTitle);
    setText("#image-tools + .category-description", copy.imageDescription);
    setText("#utility-tools", copy.utilityTitle);
    setText("#utility-tools + .category-description", copy.utilityDescription);
    setText("#data-tools", copy.dataTitle);
    setText("#data-tools + .category-description", copy.dataDescription);
    setText("#ai-tools", copy.aiTitle);
    setText("#ai-tools + .category-description", copy.aiDescription);

    document.querySelectorAll(".card").forEach((card) => {
      card.dataset.openLabel = copy.openTool;
    });
    document.documentElement.style.setProperty("--open-tool-label", `"${copy.openTool}"`);

    document.querySelectorAll(".category-button").forEach((button) => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.dataset.originalText = copy.showMore;
      button.textContent = expanded ? copy.showLess : copy.showMore;
    });

    window.xavertLocale = { code, copy };
    window.dispatchEvent(new CustomEvent("xavert:languagechange", { detail: window.xavertLocale }));
  }

  localStorage.removeItem("xavert-language");
  applyLanguage("en");
})();
