// =====================================
// XAVERT Utilities
// =====================================

function showMessage(text, type = "info") {

    if (!text) return;

    let toast = document.getElementById("xavert-toast");

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

    clearTimeout(showMessage.timer);

    toast.textContent = text;
    toast.className = `xavert-toast xavert-toast-${type}`;
    toast.hidden = false;

    showMessage.timer = setTimeout(() => {

        toast.hidden = true;
        toast.textContent = "";
        toast.className = "xavert-toast";

    }, 2200);

}

async function xavertCopyText(text, successMessage = "Copied.") {

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

        showMessage(successMessage, "success");

        return true;

    } catch {

        showMessage("Copy failed.", "error");

        return false;

    }

}

function downloadFile(filename, content, mimeType) {

    const blob = new Blob([content], { type: mimeType });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.append(link);

    link.click();

    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showMessage("Download started.", "success");

}
