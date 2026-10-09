let installPromptEvent = null;

const installButton = document.getElementById("installAppButton");

if (installButton) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    await installPromptEvent.userChoice;

    installPromptEvent = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    installButton.hidden = true;
  });
}