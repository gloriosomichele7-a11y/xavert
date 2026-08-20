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

function getXavertMessageElement() {
  return document.getElementById("message");
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

function clearMessage() {
  const message = getXavertMessageElement();

  if (!message) {
    return;
  }

  message.textContent = "";
  message.classList.remove(
    "message-success",
    "message-error",
    "message-info",
    "success",
    "error",
    "info",
  );
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

  message.classList.remove(
    "message-success",
    "message-error",
    "message-info",
    "success",
    "error",
    "info",
  );

  message.classList.add(`message-${safeType}`);
}

function showActionSuccess() {
  showMessage(XAVERT_MESSAGES.actionSuccess, "success");
}

function showCopySuccess() {
  showMessage(XAVERT_MESSAGES.copySuccess, "success");
}

function showDownloadSuccess() {
  showMessage(XAVERT_MESSAGES.downloadSuccess, "success");
}

function showSampleSuccess() {
  showMessage(XAVERT_MESSAGES.sampleSuccess, "success");
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

window.showActionSuccess = showActionSuccess;
window.showCopySuccess = showCopySuccess;
window.showDownloadSuccess = showDownloadSuccess;
window.showSampleSuccess = showSampleSuccess;
window.showClearSuccess = showClearSuccess;

window.xavertCopyText = xavertCopyText;
window.downloadFile = downloadFile;
