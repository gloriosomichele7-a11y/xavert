// =====================================
// XAVERT Utilities
// =====================================

"use strict";

const XAVERT_MESSAGES = Object.freeze({
  actionSuccess: "Action completed successfully.",
  copySuccess: "Copied successfully.",
  downloadSuccess: "Downloaded successfully.",
  sampleSuccess: "Sample loaded successfully.",
  clearSuccess: "Cleared.",
});

const XAVERT_MESSAGE_STATE_CLASSES = Object.freeze([
  "message-success",
  "message-error",
  "message-info",
  "success",
  "error",
  "info",
]);

function isXavertMessageElementVisible(element) {
  return (
    element instanceof HTMLElement &&
    !element.hidden &&
    !element.closest("[hidden]") &&
    element.getAttribute("aria-hidden") !== "true"
  );
}

function getXavertMessageCandidates(root = document) {
  if (!(root instanceof Document || root instanceof Element)) {
    return [];
  }

  const candidates = Array.from(
    root.querySelectorAll(
      '#message, [data-xavert-message], .message[role="status"], .message[aria-live]',
    ),
  );

  return candidates.filter(
    (element, index) =>
      isXavertMessageElementVisible(element) &&
      !element.matches(".field-error, [data-xavert-message-ignore]") &&
      candidates.indexOf(element) === index,
  );
}

function getContextualXavertMessageElement() {
  const activeElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  if (activeElement && activeElement !== document.body) {
    let context = activeElement;

    while (context && context !== document.body) {
      const candidates = getXavertMessageCandidates(context);

      if (candidates.length === 1) {
        return candidates[0];
      }

      context = context.parentElement;
    }
  }

  const standardMessage = document.getElementById("message");

  if (isXavertMessageElementVisible(standardMessage)) {
    return standardMessage;
  }

  const explicitMessages = Array.from(
    document.querySelectorAll("[data-xavert-message]"),
  ).filter(isXavertMessageElementVisible);

  if (explicitMessages.length === 1) {
    return explicitMessages[0];
  }

  const candidates = getXavertMessageCandidates(document);

  return candidates.length === 1 ? candidates[0] : null;
}

function createXavertFallbackMessageElement() {
  const existing = document.querySelector("[data-xavert-generated-message]");

  if (existing instanceof HTMLElement) {
    return existing;
  }

  const message = document.createElement("div");
  message.className = "message";
  message.dataset.xavertMessage = "";
  message.dataset.xavertGeneratedMessage = "";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  message.setAttribute("aria-atomic", "true");

  const activeElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const context =
    activeElement?.closest(".tool-card, main") ??
    document.querySelector(".tool-card") ??
    document.querySelector("main") ??
    document.body;

  const primaryAction = context.querySelector("[data-primary-action]");
  const actionGroup = primaryAction?.closest(
    ".button-grid, .button-row, .tool-actions, .actions",
  );

  if (actionGroup?.parentElement) {
    actionGroup.insertAdjacentElement("afterend", message);
  } else {
    context.append(message);
  }

  return message;
}

function getXavertMessageElement({ createFallback = true } = {}) {
  return (
    getContextualXavertMessageElement() ??
    (createFallback ? createXavertFallbackMessageElement() : null)
  );
}

function resetXavertMessageElement(message) {
  if (!(message instanceof HTMLElement)) {
    return;
  }

  message.textContent = "";
  message.classList.remove(...XAVERT_MESSAGE_STATE_CLASSES);
}

function clearMessage() {
  resetXavertMessageElement(
    getXavertMessageElement({ createFallback: false }),
  );
}

function clearPersistentSuccessMessages() {
  getXavertMessageCandidates(document).forEach((message) => {
    const isSuccess =
      message.classList.contains("message-success") ||
      message.classList.contains("success");

    if (isSuccess) {
      resetXavertMessageElement(message);
    }
  });
}

function getXavertToastElement() {
  let toast =
    document.getElementById("xavert-toast") ?? document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "xavert-toast";
    toast.className = "xavert-toast";
    toast.hidden = true;

    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");

    document.body.append(toast);
  }

  return toast;
}

function showToast(text, type = "info") {
  if (!text) {
    return;
  }

  const safeType = ["success", "error", "info"].includes(type) ? type : "info";

  const toast = getXavertToastElement();

  clearTimeout(showToast.timer);

  toast.textContent = text;
  toast.className = `xavert-toast xavert-toast-${safeType}`;

  toast.hidden = false;
  toast.setAttribute("aria-hidden", "false");

  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
    toast.textContent = "";
    toast.className = "xavert-toast";
    toast.setAttribute("aria-hidden", "true");
  }, 2000);
}

function showMessage(text, type = "info") {
  if (!text) {
    clearMessage();
    return;
  }

  const safeType = ["success", "error", "info"].includes(type) ? type : "info";

  showToast(text, safeType);

  const clearOnly =
    safeType === "success" && window.__xavertClearActionInProgress === true;

  if (clearOnly) {
    clearMessage();
    return;
  }

  const message = getXavertMessageElement();

  if (!message) {
    return;
  }

  message.textContent = text;
  message.classList.remove(...XAVERT_MESSAGE_STATE_CLASSES);
  message.classList.add(`message-${safeType}`);
}

function showActionSuccess(text = XAVERT_MESSAGES.actionSuccess) {
  showMessage(text, "success");
}

function showCopySuccess(text = XAVERT_MESSAGES.copySuccess) {
  showMessage(text, "success");
}

function showDownloadSuccess(text = XAVERT_MESSAGES.downloadSuccess) {
  showMessage(text, "success");
}

function showSampleSuccess(text = XAVERT_MESSAGES.sampleSuccess) {
  showMessage(text, "success");
}

function showClearSuccess() {
  clearMessage();
  showToast(XAVERT_MESSAGES.clearSuccess, "success");
}

async function xavertCopyText(text) {
  if (!text) {
    showMessage("Nothing to copy.", "error");
    return false;
  }

  if (!navigator.clipboard?.writeText) {
    showMessage("Copy is not supported in this browser.", "error");

    return false;
  }

  try {
    await navigator.clipboard.writeText(text);

    showCopySuccess();

    return true;
  } catch {
    showMessage("Copy failed.", "error");

    return false;
  }
}

function downloadFile(
  filename,
  content,
  mimeType = "text/plain;charset=utf-8",
) {
  if (!filename || content === null || content === undefined) {
    showMessage("Nothing to download.", "error");

    return false;
  }

  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], {
          type: mimeType,
        });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.hidden = true;

  document.body.append(link);

  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  showDownloadSuccess();

  return true;
}

window.XAVERT_MESSAGES = XAVERT_MESSAGES;

window.showToast = showToast;
window.showMessage = showMessage;
window.clearMessage = clearMessage;
window.clearPersistentSuccessMessages = clearPersistentSuccessMessages;

window.showActionSuccess = showActionSuccess;
window.showCopySuccess = showCopySuccess;
window.showDownloadSuccess = showDownloadSuccess;
window.showSampleSuccess = showSampleSuccess;
window.showClearSuccess = showClearSuccess;

window.xavertCopyText = xavertCopyText;
window.downloadFile = downloadFile;
