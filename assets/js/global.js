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
    en: { tools: "Tools", work: "Work", ai: "AI", home: "Home", skip: "Skip to main content", kicker: "XAVERT / BROWSER TOOL", privacy: "Privacy", terms: "Terms", support: "Support" },
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
    brand.href = "../";
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
      ["../#services", "tools"],
      ["../work/", "work"],
      ["../ai/", "ai"],
    ];
    navItems.forEach(([href, key]) => {
      const link = element("a", "", shellCopy.en[key]);
      link.href = href;
      link.dataset.shellKey = key;
      if (new URL(link.href).pathname === window.location.pathname) {
        link.setAttribute("aria-current", "page");
      }
      nav.appendChild(link);
    });

    const actions = element("div", "xavert-shell-actions");
    const home = element("a", "xavert-shell-home", "Home");
    home.href = "../";
    home.dataset.shellKey = "home";
    actions.append(home);
    header.append(brand, nav, actions);

    const main = document.querySelector("main");
    if (main) {
      main.id ||= "xavert-main-content";
      main.tabIndex = -1;
      if (!document.querySelector(".xavert-skip-link, .skip-link, .hub-skip-link")) {
        const skipLink = element("a", "xavert-skip-link", shellCopy.en.skip);
        skipLink.href = `#${main.id}`;
        skipLink.dataset.shellKey = "skip";
        document.body.insertBefore(skipLink, main);
      }
    }
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

    localStorage.removeItem("xavert-language");
    document.documentElement.lang = "en";
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
