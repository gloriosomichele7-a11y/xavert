// =====================================
// XAVERT Global JavaScript
// =====================================

"use strict";

(function () {
  function clearPersistentSuccess() {
    if (typeof window.clearPersistentSuccessMessages === "function") {
      window.clearPersistentSuccessMessages();
      return;
    }

    const message = document.getElementById("message");

    if (!message) {
      return;
    }

    const isSuccess =
      message.classList.contains("message-success") ||
      message.classList.contains("success");

    if (!isSuccess) {
      return;
    }

    message.textContent = "";
    message.classList.remove("message-success", "success");
  }

  function setSampleFieldValue(element, value) {
    if (
      element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
    ) {
      element.checked = Boolean(value);
    } else {
      element.value =
        value === null || value === undefined ? "" : String(value);
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function loadDeclaredSample(key) {
    const configElement = document.getElementById(`xavert-sample-${key}`);

    if (!configElement) {
      throw new Error(`Sample configuration "${key}" was not found.`);
    }

    let config;

    try {
      config = JSON.parse(configElement.textContent);
    } catch {
      throw new Error(`Sample configuration "${key}" contains invalid JSON.`);
    }

    if (
      !config ||
      typeof config !== "object" ||
      Array.isArray(config) ||
      !config.fields ||
      typeof config.fields !== "object" ||
      Array.isArray(config.fields)
    ) {
      throw new Error(`Sample configuration "${key}" is invalid.`);
    }

    const entries = Object.entries(config.fields);

    if (!entries.length) {
      throw new Error(`Sample configuration "${key}" has no fields.`);
    }

    const resolved = entries.map(([fieldId, value]) => {
      const element = document.getElementById(fieldId);

      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        )
      ) {
        throw new Error(`Sample field "${fieldId}" was not found.`);
      }

      return { element, value };
    });

    resolved.forEach(({ element, value }) => {
      setSampleFieldValue(element, value);
    });

    /*
     * Optional immediate processing.
     * Add: "action": "buttonId"
     * to a sample JSON configuration when Load Sample should also
     * generate/process the example immediately.
     */
    if (typeof config.action === "string" && config.action) {
      const action = document.getElementById(config.action);

      if (action instanceof HTMLButtonElement && !action.disabled) {
        action.click();
      }
    }

    if (typeof config.focus === "string" && config.focus) {
      document.getElementById(config.focus)?.focus();
    }

    if (typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    } else if (typeof window.showMessage === "function") {
      window.showMessage("Sample loaded successfully.", "success");
    }
  }

  function isAvailableActionButton(element) {
    return (
      element instanceof HTMLButtonElement &&
      !element.disabled &&
      !element.closest("[hidden]")
    );
  }

  function getPrimaryActionButton() {
    const explicitButtons = Array.from(
      document.querySelectorAll("[data-primary-action]:not(:disabled)"),
    );

    const explicit = explicitButtons.find(isAvailableActionButton);

    if (explicit) {
      return explicit;
    }

    const visiblePanels = Array.from(
      document.querySelectorAll(
        ".tool-card:not([hidden]), .pdf-tool-panel:not([hidden]), .password-tool-panel:not([hidden])",
      ),
    ).filter((panel) => !panel.closest("[hidden]"));

    for (const panel of visiblePanels) {
      const buttons = Array.from(
        panel.querySelectorAll(".btn:not(.btn-secondary):not(:disabled)"),
      );

      const button = buttons.find(isAvailableActionButton);

      if (button) {
        return button;
      }
    }

    const fallbackButtons = Array.from(
      document.querySelectorAll(
        ".btn:not(.btn-secondary):not(:disabled)",
      ),
    );

    return fallbackButtons.find(isAvailableActionButton) ?? null;
  }

  function handleGlobalClearFeedback() {
    if (typeof window.showClearSuccess === "function") {
      window.showClearSuccess();
      return;
    }

    if (typeof window.clearMessage === "function") {
      window.clearMessage();
    }

    if (typeof window.showToast === "function") {
      window.showToast("Cleared.", "success");
    }
  }

  const shellCopy = {
    en: { tools: "Tools", work: "Work", ai: "AI", home: "Home", back: "Back to Home", kicker: "XAVERT / BROWSER TOOL", related: "Related Tools", privacy: "Privacy", terms: "Terms", support: "Support", clear: "Clear All", copy: "Copy Result", example: "Load Example" },
    it: { tools: "Strumenti", work: "Lavoro", ai: "IA", home: "Home", back: "Torna alla home", kicker: "XAVERT / STRUMENTO NEL BROWSER", related: "Strumenti correlati", privacy: "Privacy", terms: "Condizioni", support: "Assistenza", clear: "Cancella tutto", copy: "Copia risultato", example: "Carica esempio" },
    es: { tools: "Herramientas", work: "Trabajo", ai: "IA", home: "Inicio", back: "Volver al inicio", kicker: "XAVERT / HERRAMIENTA WEB", related: "Herramientas relacionadas", privacy: "Privacidad", terms: "Condiciones", support: "Soporte", clear: "Borrar todo", copy: "Copiar resultado", example: "Cargar ejemplo" },
    fr: { tools: "Outils", work: "Travail", ai: "IA", home: "Accueil", back: "Retour à l'accueil", kicker: "XAVERT / OUTIL WEB", related: "Outils associés", privacy: "Confidentialité", terms: "Conditions", support: "Assistance", clear: "Tout effacer", copy: "Copier le résultat", example: "Charger un exemple" },
    de: { tools: "Tools", work: "Arbeit", ai: "KI", home: "Start", back: "Zur Startseite", kicker: "XAVERT / BROWSER-TOOL", related: "Verwandte Tools", privacy: "Datenschutz", terms: "Bedingungen", support: "Support", clear: "Alles löschen", copy: "Ergebnis kopieren", example: "Beispiel laden" },
    pt: { tools: "Ferramentas", work: "Trabalho", ai: "IA", home: "Início", back: "Voltar ao início", kicker: "XAVERT / FERRAMENTA WEB", related: "Ferramentas relacionadas", privacy: "Privacidade", terms: "Termos", support: "Suporte", clear: "Limpar tudo", copy: "Copiar resultado", example: "Carregar exemplo" },
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function buildSiteChrome() {
    if (document.querySelector(".xavert-site-header")) return;

    const header = element("header", "xavert-site-header");
    const brand = element("a", "xavert-shell-brand");
    brand.href = "../index.html";
    brand.setAttribute("aria-label", "XAVERT home");
    const brandIcon = document.createElement("img");
    brandIcon.src = "../favicon.svg";
    brandIcon.alt = "";
    brandIcon.width = 34;
    brandIcon.height = 34;
    brand.append(brandIcon, element("span", "", "XAVERT"));

    const nav = element("nav", "xavert-shell-nav");
    nav.setAttribute("aria-label", "XAVERT");
    const navItems = [
      ["../index.html#services", "tools"],
      ["../work/index.html", "work"],
      ["../ai/index.html", "ai"],
    ];
    navItems.forEach(([href, key]) => {
      const link = element("a", "", shellCopy.en[key]);
      link.href = href;
      link.dataset.shellKey = key;
      nav.appendChild(link);
    });

    const actions = element("div", "xavert-shell-actions");
    const language = element("select", "xavert-shell-language");
    language.id = "xavertShellLanguage";
    language.setAttribute("aria-label", "Language");
    [["en", "EN"], ["it", "IT"], ["es", "ES"], ["fr", "FR"], ["de", "DE"], ["pt", "PT"]].forEach(([value, label]) => {
      const option = element("option", "", label);
      option.value = value;
      language.appendChild(option);
    });
    const home = element("a", "xavert-shell-home", "Home");
    home.href = "../index.html";
    home.dataset.shellKey = "home";
    actions.append(language, home);
    header.append(brand, nav, actions);

    const main = document.querySelector("main");
    document.body.insertBefore(header, main || document.body.firstChild);

    const hero = document.querySelector(".tool-hero");
    const title = hero?.querySelector(".tool-title, h1");
    if (hero && title && !hero.querySelector(".tool-kicker")) {
      const kicker = element("p", "tool-kicker", shellCopy.en.kicker);
      kicker.dataset.shellKey = "kicker";
      hero.insertBefore(kicker, title);
    }

    const footer = document.querySelector(".xavert-footer-note");
    if (footer) {
      footer.textContent = "";
      footer.appendChild(element("span", "xavert-footer-brand", "XAVERT"));
      const links = element("span", "xavert-footer-links");
      const privacy = element("a", "", shellCopy.en.privacy);
      privacy.href = "../privacy-policy.html";
      privacy.dataset.shellKey = "privacy";
      const terms = element("a", "", shellCopy.en.terms);
      terms.href = "../terms-of-use.html";
      terms.dataset.shellKey = "terms";
      links.append(privacy, terms);
      const support = element("a", "xavert-footer-support", "support@xavert.com");
      support.href = "mailto:support@xavert.com";
      support.setAttribute("aria-label", "Email XAVERT support");
      footer.append(links, support);
    }

    const saved = localStorage.getItem("xavert-language");
    const detected = navigator.language?.slice(0, 2).toLowerCase();
    const initial = shellCopy[saved] ? saved : shellCopy[detected] ? detected : "en";

    function applyShellLanguage(code) {
      const locale = shellCopy[code] || shellCopy.en;
      document.documentElement.lang = code;
      language.value = code;
      document.querySelectorAll("[data-shell-key]").forEach((node) => {
        const translated = locale[node.dataset.shellKey];
        if (translated) node.textContent = translated;
      });
      const back = document.querySelector(".back-link");
      if (back) back.textContent = `← ${locale.back}`;
      const related = document.getElementById("related-tools-title");
      if (related) related.textContent = locale.related;

      const common = new Map([
        ["Clear All", locale.clear],
        ["Copy Result", locale.copy],
        ["Load Example", locale.example],
      ]);
      document.querySelectorAll("button").forEach((button) => {
        if (!button.dataset.xavertOriginal) {
          const original = button.textContent.replace(/\s+/g, " ").trim();
          if (common.has(original)) button.dataset.xavertOriginal = original;
        }
        const original = button.dataset.xavertOriginal;
        if (original && common.has(original)) button.textContent = common.get(original);
      });

      localStorage.setItem("xavert-language", code);
    }

    applyShellLanguage(initial);
    language.addEventListener("change", () => applyShellLanguage(language.value));
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const sampleButton = target.closest("[data-sample-loader]");

      if (sampleButton instanceof HTMLButtonElement) {
        const key = sampleButton.dataset.sampleLoader;

        /*
         * Empty data-sample-loader attributes are intentionally handled
         * by the tool-specific JavaScript.
         */
        if (key) {
          event.preventDefault();

          try {
            loadDeclaredSample(key);
          } catch (error) {
            console.error("XAVERT Sample Loader:", error);

            if (typeof window.showMessage === "function") {
              window.showMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to load sample.",
                "error",
              );
            }
          }
        }

        return;
      }

      const clearButton = target.closest("[data-clear-action]");

      if (clearButton instanceof HTMLButtonElement) {
        /*
         * Tool-specific JavaScript performs the reset.
         * Shared Core owns only the standard Clear feedback.
         */
        window.setTimeout(handleGlobalClearFeedback, 0);
      }
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter") {
        return;
      }

      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      /*
       * XAVERT keyboard standard:
       *
       * Enter         -> run the primary action
       * Shift + Enter -> insert a new line in a textarea
       */
      if (
        target instanceof HTMLTextAreaElement &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }

      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      const editable =
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement) &&
        !target.readOnly &&
        !target.disabled;

      if (!editable) {
        return;
      }

      const button = getPrimaryActionButton();

      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      button.click();
    },
    true,
  );

  document.addEventListener("input", clearPersistentSuccess, true);
  document.addEventListener("change", clearPersistentSuccess, true);

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      buildSiteChrome();
      document.body.classList.add("xavert-ready");
    },
    { once: true },
  );
})();
