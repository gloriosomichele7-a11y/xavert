// =====================================
// XAVERT Global JavaScript
// =====================================

"use strict";

(function () {
  function clearPersistentSuccess() {
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

    if (typeof window.clearMessage === "function") {
      window.clearMessage();
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
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

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
      document.body.classList.add("xavert-ready");
    },
    { once: true },
  );
})();
