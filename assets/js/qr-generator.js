"use strict";
function initQrGenerator() {
  const qrType = document.getElementById("qrType");
  const qrForeground = document.getElementById("qrForeground");
  const qrBackground = document.getElementById("qrBackground");
  const transparentBackground = document.getElementById(
    "transparentBackground",
  );

  const qrForegroundSwatch = document.getElementById("qrForegroundSwatch");
  const qrBackgroundSwatch = document.getElementById("qrBackgroundSwatch");
  const qrForegroundValue = document.getElementById("qrForegroundValue");
  const qrBackgroundValue = document.getElementById("qrBackgroundValue");

  const errorMessage = document.getElementById("errorMessage");
  const detectedType = document.getElementById("detectedType");
  const qrContainer = document.getElementById("qrcode");

  const generateBtn = document.getElementById("generateBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const clearBtn = document.getElementById("clearBtn");

  const qrStats = document.getElementById("qrStats");
  const qrTypeStat = document.getElementById("qrTypeStat");
  const qrCharactersStat = document.getElementById("qrCharactersStat");
  const qrSizeStat = document.getElementById("qrSizeStat");
  const qrCorrectionStat = document.getElementById("qrCorrectionStat");

  const downloadCount = document.getElementById("downloadCount");
  const downloadButtons = document.getElementById("downloadButtons");

  const downloadPngBtn = document.getElementById("downloadPngBtn");
  const downloadSvgBtn = document.getElementById("downloadSvgBtn");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const downloadPngHdBtn = document.getElementById("downloadPngHdBtn");
  const downloadPdfHdBtn = document.getElementById("downloadPdfHdBtn");
  const downloadTxtBtn = document.getElementById("downloadTxtBtn");
  const copyDataBtn = document.getElementById("copyDataBtn");
  const copyImageBtn = document.getElementById("copyImageBtn");

  const sections = {
    text: document.getElementById("section-text"),
    email: document.getElementById("section-email"),
    phone: document.getElementById("section-phone"),
    sms: document.getElementById("section-sms"),
    wifi: document.getElementById("section-wifi"),
    contact: document.getElementById("section-contact"),
    event: document.getElementById("section-event"),
  };

  const required = [
    qrType,
    qrForeground,
    qrBackground,
    transparentBackground,
    qrForegroundSwatch,
    qrBackgroundSwatch,
    qrForegroundValue,
    qrBackgroundValue,
    errorMessage,
    detectedType,
    qrContainer,
    generateBtn,
    sampleBtn,
    clearBtn,
    qrStats,
    qrTypeStat,
    qrCharactersStat,
    qrSizeStat,
    qrCorrectionStat,
    downloadCount,
    downloadButtons,
    downloadPngBtn,
    downloadSvgBtn,
    downloadPdfBtn,
    downloadPngHdBtn,
    downloadPdfHdBtn,
    downloadTxtBtn,
    copyDataBtn,
    copyImageBtn,
    ...Object.values(sections),
  ];

  if (required.some((element) => !element)) {
    console.error("QR Generator: HTML and JS do not match.");
    return;
  }

  if (!window.QRCode) {
    console.error("QR Generator: QRCode library failed to load.");
  }

  if (!window.jspdf?.jsPDF) {
    console.warn(
      "QR Generator: jsPDF library is unavailable. PDF exports are disabled.",
    );
  }

  let totalDownloads = 0;
  let currentQrData = "";

  function byId(id) {
    return document.getElementById(id);
  }

  function notify(text, type = "info") {
    if (typeof window.showMessage === "function") {
      window.showMessage(text, type);
    }
  }

  function clearError() {
    errorMessage.textContent = "";

    document.querySelectorAll(".qr-input-error").forEach((element) => {
      element.classList.remove("qr-input-error");
    });
  }

  function setError(text, element = null) {
    errorMessage.textContent = text;

    if (element) {
      element.classList.add("qr-input-error");
      element.focus();
    }

    notify(text, "error");
  }

  function updateColorPreview() {
    qrForegroundSwatch.style.background = qrForeground.value;
    qrBackgroundSwatch.style.background = qrBackground.value;

    qrForegroundValue.textContent = qrForeground.value.toUpperCase();

    qrBackgroundValue.textContent = qrBackground.value.toUpperCase();

    qrBackgroundSwatch.style.opacity = transparentBackground.checked
      ? "0.35"
      : "1";
  }

  function switchSection() {
    Object.entries(sections).forEach(([key, section]) => {
      section.hidden = key !== qrType.value;
    });

    resetOutput();
  }

  function resetOutput() {
    clearError();
    detectedType.textContent = "";
    qrContainer.replaceChildren();

    qrStats.hidden = true;
    downloadButtons.hidden = true;
    downloadCount.hidden = true;

    qrTypeStat.textContent = "—";
    qrCharactersStat.textContent = "0";
    qrSizeStat.textContent = "350×350";
    qrCorrectionStat.textContent = "H";

    totalDownloads = 0;
    currentQrData = "";
  }

  function registerDownload() {
    totalDownloads += 1;
    downloadCount.textContent = `Downloads: ${totalDownloads}`;
    downloadCount.hidden = false;
  }

  function escapeWifi(value) {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/:/g, "\\:");
  }

  function escapeVCard(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  function escapeIcal(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  function formatDateForCalendar(value) {
    if (!value) {
      return "";
    }

    return value.replace(/[-:]/g, "").replace("T", "") + "00";
  }

  function detectType(value) {
    const input = value.trim();

    if (!input) return "Text";
    if (input.startsWith("WIFI:")) return "Wi-Fi";
    if (input.startsWith("BEGIN:VCARD")) return "vCard";
    if (
      input.startsWith("BEGIN:VCALENDAR") ||
      input.startsWith("BEGIN:VEVENT")
    ) {
      return "Event";
    }
    if (input.startsWith("mailto:")) return "Email";
    if (input.startsWith("tel:")) return "Phone";
    if (input.startsWith("sms:")) return "SMS";
    if (/^https?:\/\//i.test(input)) return "URL";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return "Email";
    if (/^\+?[0-9\s\-()]{7,}$/.test(input)) return "Phone";

    return "Text";
  }

  function normalizeWebsite(value) {
    const text = value.trim();

    if (!text) {
      return "";
    }

    if (/^https?:\/\//i.test(text)) {
      return text;
    }

    if (/^(localhost|([a-z0-9-]+\.)+[a-z]{2,})(:\d+)?([/?#].*)?$/i.test(text)) {
      return `https://${text}`;
    }

    return text;
  }

  function buildQrData() {
    const type = qrType.value;

    if (type === "text") {
      const input = byId("textInput");
      const value = normalizeWebsite(input.value);

      if (!value) {
        setError("Please enter a URL, text or content.", input);
        return null;
      }

      return value;
    }

    if (type === "email") {
      const email = byId("emailInput");
      const subject = byId("emailSubject").value.trim();
      const body = byId("emailBody").value.trim();

      if (!email.value.trim()) {
        setError("Please enter an email address.", email);
        return null;
      }

      const params = new URLSearchParams();

      if (subject) {
        params.set("subject", subject);
      }

      if (body) {
        params.set("body", body);
      }

      const query = params.toString();

      return `mailto:${email.value.trim()}${query ? `?${query}` : ""}`;
    }

    if (type === "phone") {
      const phone = byId("phoneInput");

      if (!phone.value.trim()) {
        setError("Please enter a phone number.", phone);
        return null;
      }

      return `tel:${phone.value.trim()}`;
    }

    if (type === "sms") {
      const phone = byId("smsPhone");
      const message = byId("smsMessage").value.trim();

      if (!phone.value.trim()) {
        setError("Please enter a phone number.", phone);
        return null;
      }

      return `sms:${phone.value.trim()}${message ? `?body=${encodeURIComponent(message)}` : ""}`;
    }

    if (type === "wifi") {
      const ssid = byId("wifiSsid");
      const password = byId("wifiPassword");
      const security = byId("wifiSecurity").value;

      if (!ssid.value.trim()) {
        setError("Please enter the Wi-Fi network name.", ssid);
        return null;
      }

      if (security !== "nopass" && !password.value.trim()) {
        setError("Please enter the Wi-Fi password.", password);
        return null;
      }

      return (
        `WIFI:T:${security};` +
        `S:${escapeWifi(ssid.value.trim())};` +
        `P:${escapeWifi(password.value.trim())};;`
      );
    }

    if (type === "contact") {
      const name = byId("contactName");
      const phone = byId("contactPhone").value.trim();
      const email = byId("contactEmail").value.trim();
      const website = byId("contactWebsite").value.trim();

      if (!name.value.trim()) {
        setError("Please enter the contact name.", name);
        return null;
      }

      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escapeVCard(name.value.trim())}`,
        phone ? `TEL:${escapeVCard(phone)}` : "",
        email ? `EMAIL:${escapeVCard(email)}` : "",
        website ? `URL:${escapeVCard(website)}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (type === "event") {
      const title = byId("eventTitle");
      const start = byId("eventStart");
      const end = byId("eventEnd");
      const location = byId("eventLocation").value.trim();

      if (!title.value.trim()) {
        setError("Please enter the event title.", title);
        return null;
      }

      if (!start.value) {
        setError("Please enter the event start date and time.", start);
        return null;
      }

      if (!end.value) {
        setError("Please enter the event end date and time.", end);
        return null;
      }

      if (new Date(end.value) <= new Date(start.value)) {
        setError(
          "End date and time must be later than the start date and time.",
          end,
        );
        return null;
      }

      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//XAVERT//QR Event//EN",
        "BEGIN:VEVENT",
        `SUMMARY:${escapeIcal(title.value.trim())}`,
        `DTSTART:${formatDateForCalendar(start.value)}`,
        `DTEND:${formatDateForCalendar(end.value)}`,
        location ? `LOCATION:${escapeIcal(location)}` : "",
        "END:VEVENT",
        "END:VCALENDAR",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return null;
  }

  function getFileName() {
    const sourceByType = {
      text: byId("textInput").value,
      email: byId("emailInput").value,
      phone: byId("phoneInput").value,
      sms: byId("smsPhone").value,
      wifi: byId("wifiSsid").value,
      contact: byId("contactName").value,
      event: byId("eventTitle").value,
    };

    const source = sourceByType[qrType.value] || "xavert-qr-code";

    const fileName = source
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return fileName || "xavert-qr-code";
  }

  function getQrOptions(width) {
    return {
      width,
      margin: 4,
      errorCorrectionLevel: "H",
      color: {
        dark: qrForeground.value,
        light: transparentBackground.checked ? "#00000000" : qrBackground.value,
      },
    };
  }

  function generateCanvas(data, width) {
    return new Promise((resolve, reject) => {
      window.QRCode.toCanvas(data, getQrOptions(width), (error, canvas) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(canvas);
      });
    });
  }

  function generateSvg(data) {
    return new Promise((resolve, reject) => {
      window.QRCode.toString(
        data,
        {
          ...getQrOptions(350),
          type: "svg",
        },
        (error, svg) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(svg);
        },
      );
    });
  }

  async function generateQr() {
    clearError();

    if (!window.QRCode) {
      notify(
        "The QR code library could not be loaded. Refresh the page and try again.",
        "error",
      );
      return false;
    }

    const data = buildQrData();

    if (!data) {
      return;
    }

    currentQrData = data;

    if (data.length > 2500) {
      notify("Large QR code: some scanners may take longer to read.", "info");
    }

    try {
      const canvas = await generateCanvas(data, 350);

      qrContainer.replaceChildren(canvas);

      const type = detectType(data);

      detectedType.textContent = `Detected type: ${type}`;

      qrTypeStat.textContent = type;
      qrCharactersStat.textContent = String(Array.from(data).length);
      qrSizeStat.textContent = "350×350";
      qrCorrectionStat.textContent = "H";

      qrStats.hidden = false;
      downloadButtons.hidden = false;

      notify("QR code generated.", "success");
    } catch (error) {
      console.error(error);
      resetOutput();
      setError("Unable to generate QR code. Please try again.");
    }
  }

  async function downloadPng(width, suffix = "") {
    if (!currentQrData) {
      notify("Generate a QR code first.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    try {
      const canvas = await generateCanvas(currentQrData, width);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) {
            resolve(value);
          } else {
            reject(new Error("Unable to create PNG."));
          }
        }, "image/png");
      });

      window.downloadFile(
        `QR-${getFileName()}${suffix}.png`,
        blob,
        "image/png",
      );

      registerDownload();
    } catch (error) {
      console.error(error);
      notify("Unable to create PNG.", "error");
    }
  }

  async function downloadSvg() {
    if (!currentQrData) {
      notify("Generate a QR code first.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    try {
      const svg = await generateSvg(currentQrData);

      window.downloadFile(
        `QR-${getFileName()}.svg`,
        svg,
        "image/svg+xml;charset=utf-8",
      );

      registerDownload();
    } catch (error) {
      console.error(error);
      notify("Unable to create SVG.", "error");
    }
  }

  function downloadTxt() {
    if (!currentQrData) {
      notify("Generate a QR code first.", "error");
      return;
    }

    if (typeof window.downloadFile !== "function") {
      notify("Download utility is unavailable.", "error");
      return;
    }

    window.downloadFile(
      `QR-${getFileName()}.txt`,
      currentQrData,
      "text/plain;charset=utf-8",
    );

    registerDownload();
  }

  async function createPdf(hd = false) {
    if (!window.jspdf?.jsPDF) {
      notify("PDF support is unavailable.", "error");
      return;
    }
    if (!currentQrData) {
      notify("Generate a QR code first.", "error");
      return;
    }

    try {
      const canvas = await generateCanvas(currentQrData, hd ? 3000 : 1600);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const qrDimension = hd ? 150 : 120;
      const x = (210 - qrDimension) / 2;
      const y = 32;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        x,
        y,
        qrDimension,
        qrDimension,
      );

      pdf.setFontSize(14);
      pdf.setTextColor(17, 24, 39);
      pdf.text("QR Code", 105, 20, { align: "center" });

      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Generated by XAVERT", 105, hd ? 190 : 164, { align: "center" });

      pdf.save(`QR-${getFileName()}${hd ? "-HD" : ""}.pdf`);

      registerDownload();
      notify("Download started.", "success");
    } catch (error) {
      console.error(error);
      notify("Unable to create PDF.", "error");
    }
  }

  async function copyQrData() {
    if (!currentQrData) {
      notify("Generate a QR code first.", "error");
      return;
    }

    if (typeof window.xavertCopyText !== "function") {
      notify("Copy utility is unavailable.", "error");
      return;
    }

    await window.xavertCopyText(currentQrData);
  }

  async function copyQrImage() {
    const canvas = qrContainer.querySelector("canvas");

    if (!canvas) {
      notify("Generate a QR code first.", "error");
      return;
    }

    if (
      !navigator.clipboard?.write ||
      typeof window.ClipboardItem !== "function"
    ) {
      notify("Image copy is not supported by this browser.", "error");
      return;
    }

    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) {
            resolve(value);
          } else {
            reject(new Error("Unable to create QR image."));
          }
        }, "image/png");
      });

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      notify("QR image copied to clipboard.", "success");
    } catch (error) {
      console.error(error);
      notify("Unable to copy QR image.", "error");
    }
  }

  async function loadSample() {
    qrType.value = "text";
    switchSection();

    byId("textInput").value = "https://xavert.com";
    qrForeground.value = "#000000";
    qrBackground.value = "#ffffff";
    transparentBackground.checked = false;

    updateColorPreview();

    await generateQr();

    if (currentQrData && typeof window.showSampleSuccess === "function") {
      window.showSampleSuccess();
    }

    byId("textInput").focus();
  }

  function clearTool() {
    document
      .querySelectorAll(
        "#section-text input, #section-text textarea, " +
          "#section-email input, #section-email textarea, " +
          "#section-phone input, #section-sms input, #section-sms textarea, " +
          "#section-wifi input, #section-contact input, #section-event input",
      )
      .forEach((element) => {
        element.value = "";
      });

    qrType.value = "text";
    qrForeground.value = "#000000";
    qrBackground.value = "#ffffff";
    transparentBackground.checked = false;
    byId("wifiSecurity").value = "WPA";

    updateColorPreview();

    switchSection();
    sections.text.hidden = false;
  }

  qrType.addEventListener("change", switchSection);

  qrForeground.addEventListener("input", () => {
    updateColorPreview();

    if (currentQrData) {
      resetOutput();
    }
  });

  qrBackground.addEventListener("input", () => {
    updateColorPreview();

    if (currentQrData) {
      resetOutput();
    }
  });

  transparentBackground.addEventListener("change", () => {
    updateColorPreview();

    if (currentQrData) {
      resetOutput();
    }
  });

  document.querySelectorAll("input, textarea, select").forEach((element) => {
    if (
      element === qrType ||
      element === qrForeground ||
      element === qrBackground ||
      element === transparentBackground
    ) {
      return;
    }

    element.addEventListener("input", () => {
      clearError();

      if (currentQrData) {
        resetOutput();
      }
    });

    element.addEventListener("change", () => {
      clearError();

      if (currentQrData) {
        resetOutput();
      }
    });
  });

  generateBtn.addEventListener("click", () => {
    void generateQr();
  });

  sampleBtn.addEventListener("click", () => {
    void loadSample();
  });

  clearBtn.addEventListener("click", clearTool);

  downloadPngBtn.addEventListener("click", () => {
    void downloadPng(350);
  });

  downloadPngHdBtn.addEventListener("click", () => {
    void downloadPng(2000, "-HD");
  });

  downloadSvgBtn.addEventListener("click", () => {
    void downloadSvg();
  });

  downloadPdfBtn.addEventListener("click", () => {
    void createPdf(false);
  });

  downloadPdfHdBtn.addEventListener("click", () => {
    void createPdf(true);
  });

  downloadTxtBtn.addEventListener("click", downloadTxt);

  copyDataBtn.addEventListener("click", () => {
    void copyQrData();
  });

  copyImageBtn.addEventListener("click", () => {
    void copyQrImage();
  });

  updateColorPreview();
  switchSection();
}

initQrGenerator();
