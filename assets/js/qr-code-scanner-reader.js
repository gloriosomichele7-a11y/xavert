"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const el = {
    form: $("scannerForm"), dropZone: $("dropZone"), fileInput: $("fileInput"), fileMeta: $("fileMeta"),
    previewShell: $("previewShell"), previewImage: $("previewImage"), imageOverlay: $("imageOverlay"),
    scanImageBtn: $("scanImageBtn"), pasteImageBtn: $("pasteImageBtn"), cameraSelect: $("cameraSelect"),
    inversionSelect: $("inversionSelect"), cameraInterval: $("cameraInterval"), cameraShell: $("cameraShell"),
    cameraVideo: $("cameraVideo"), cameraOverlay: $("cameraOverlay"), scanCanvas: $("scanCanvas"),
    startCameraBtn: $("startCameraBtn"), stopCameraBtn: $("stopCameraBtn"), engineText: $("engineText"),
    message: $("message"), resultSection: $("resultSection"), typeStat: $("typeStat"), lengthStat: $("lengthStat"),
    bytesStat: $("bytesStat"), sourceStat: $("sourceStat"), decoderStat: $("decoderStat"), decodedText: $("decodedText"),
    copyBtn: $("copyBtn"), openBtn: $("openBtn"), downloadBtn: $("downloadBtn"), detailList: $("detailList"), noDetails: $("noDetails")
  };

  const missing = Object.entries(el).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error("QR scanner initialization failed:", missing); return; }

  const JSQR_URL = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
  const state = {
    objectUrl: "", imageReady: false, imageName: "", imageWidth: 0, imageHeight: 0,
    stream: null, timer: 0, cameraBusy: false, cameraToken: 0,
    detector: null, nativeQr: false, jsQrPromise: null,
    lastText: "", lastUrl: "", resetting: false
  };

  function clearInlineMessage() { el.message.textContent = ""; el.message.classList.remove("message-success", "message-error", "message-info"); }
  function notify(text, type = "info") { if (typeof window.showMessage === "function") { window.showMessage(text, type); return; } clearInlineMessage(); el.message.textContent = text; el.message.classList.add(`message-${type}`); }
  function success(text) { if (typeof window.showActionSuccess === "function") window.showActionSuccess(text); else notify(text, "success"); }
  function utf8Size(text) { return new TextEncoder().encode(String(text || "")).byteLength; }
  function formatBytes(bytes) { if (!bytes) return "0 B"; const u = ["B", "KB", "MB"]; const p = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 2); const v = bytes / 1024 ** p; return `${v >= 10 || p === 0 ? v.toFixed(0) : v.toFixed(1)} ${u[p]}`; }
  function limits() { const m = Number(navigator.deviceMemory || 0); if (m && m <= 2) return { bytes: 8e6, pixels: 12e6 }; if (m && m <= 4) return { bytes: 15e6, pixels: 24e6 }; return { bytes: 25e6, pixels: 40e6 }; }
  function supportedImage(file) { const t = String(file?.type || "").toLowerCase(); const n = String(file?.name || "").toLowerCase(); return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(t) || /\.(png|jpe?g|webp|gif)$/.test(n); }
  function releaseUrl() { if (state.objectUrl) { URL.revokeObjectURL(state.objectUrl); state.objectUrl = ""; } }
  function invalidateResult() { state.lastText = ""; state.lastUrl = ""; el.resultSection.hidden = true; el.decodedText.value = ""; el.detailList.replaceChildren(); el.noDetails.hidden = false; el.openBtn.hidden = true; }

  function clearOverlay(canvas) {
    const r = canvas.getBoundingClientRect(); const d = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(r.width * d)); canvas.height = Math.max(1, Math.round(r.height * d));
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function normalizePoints(list) {
    if (!Array.isArray(list) || list.length < 4) return null;
    const p = list.slice(0, 4).map((x) => ({ x: Number(x?.x), y: Number(x?.y) })).filter((x) => Number.isFinite(x.x) && Number.isFinite(x.y));
    return p.length === 4 ? p : null;
  }

  function drawOverlay(canvas, p, sw, sh) {
    if (!p || !sw || !sh) { clearOverlay(canvas); return; }
    const r = canvas.getBoundingClientRect(); const d = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(r.width * d)); canvas.height = Math.max(1, Math.round(r.height * d));
    const c = canvas.getContext("2d"); c.clearRect(0, 0, canvas.width, canvas.height); c.scale(d, d);
    const cr = r.width / r.height, sr = sw / sh; let w, h, x, y;
    if (sr > cr) { w = r.width; h = w / sr; x = 0; y = (r.height - h) / 2; } else { h = r.height; w = h * sr; y = 0; x = (r.width - w) / 2; }
    c.beginPath(); p.forEach((pt, i) => { const px = x + (pt.x / sw) * w, py = y + (pt.y / sh) * h; i ? c.lineTo(px, py) : c.moveTo(px, py); });
    c.closePath(); c.lineWidth = 3; c.strokeStyle = "#dc2626"; c.stroke(); c.fillStyle = "rgba(220,38,38,.12)"; c.fill();
  }

  async function initNative() {
    if (!("BarcodeDetector" in globalThis)) { el.engineText.textContent = "jsQR fallback will be used."; return; }
    try {
      const formats = typeof BarcodeDetector.getSupportedFormats === "function" ? await BarcodeDetector.getSupportedFormats() : [];
      if (formats.includes("qr_code")) { state.detector = new BarcodeDetector({ formats: ["qr_code"] }); state.nativeQr = true; el.engineText.textContent = "Native QR detection available, with jsQR fallback."; return; }
    } catch (e) { console.warn(e); }
    el.engineText.textContent = "Native QR detection unavailable; jsQR fallback will be used.";
  }

  function ensureJsQr() {
    if (typeof window.jsQR === "function") return Promise.resolve(window.jsQR);
    if (state.jsQrPromise) return state.jsQrPromise;
    state.jsQrPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script"); s.src = JSQR_URL; s.async = true; s.dataset.xavertJsqr = "1";
      s.onload = () => typeof window.jsQR === "function" ? resolve(window.jsQR) : reject(new Error("jsQR loaded without a usable decoder."));
      s.onerror = () => reject(new Error("jsQR could not be downloaded.")); document.head.appendChild(s);
    }).catch((e) => { state.jsQrPromise = null; throw e; });
    return state.jsQrPromise;
  }

  async function nativeDecode(source) {
    if (!state.nativeQr || !state.detector) return null;
    try { const r = (await state.detector.detect(source))?.[0]; return r?.rawValue ? { text: r.rawValue, points: normalizePoints(r.cornerPoints), decoder: "Native", version: null } : null; }
    catch (e) { console.warn("Native decode failed:", e); return null; }
  }

  function scanSize(w, h, max = 1800) { const s = Math.min(1, max / Math.max(w, h)); return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), s }; }

  async function jsQrDecode(source, w, h) {
    const fn = await ensureJsQr(); const z = scanSize(w, h); const cv = el.scanCanvas; cv.width = z.w; cv.height = z.h;
    const c = cv.getContext("2d", { willReadFrequently: true }); c.clearRect(0, 0, z.w, z.h); c.drawImage(source, 0, 0, z.w, z.h);
    const d = c.getImageData(0, 0, z.w, z.h); const r = fn(d.data, z.w, z.h, { inversionAttempts: el.inversionSelect.value });
    if (!r?.data) return null;
    const loc = r.location; const p = loc ? normalizePoints([loc.topLeftCorner, loc.topRightCorner, loc.bottomRightCorner, loc.bottomLeftCorner])?.map((q) => ({ x: q.x / z.s, y: q.y / z.s })) : null;
    return { text: r.data, points: p, decoder: "jsQR", version: Number.isFinite(r.version) ? String(r.version) : null };
  }

  async function decode(source, w, h) { return (await nativeDecode(source)) || jsQrDecode(source, w, h); }

  async function loadFile(file, label = "Image") {
    if (!supportedImage(file)) { notify("Choose a PNG, JPEG, WebP or GIF image.", "error"); return; }
    const lim = limits(); if (file.size > lim.bytes) { notify(`This device is limited to image files up to ${formatBytes(lim.bytes)}.`, "error"); return; }
    stopCamera(true); releaseUrl(); state.objectUrl = URL.createObjectURL(file); state.imageReady = false; state.imageName = file.name || "clipboard-image";
    el.scanImageBtn.disabled = true; el.previewShell.hidden = false; el.previewImage.src = state.objectUrl;
    try {
      await el.previewImage.decode(); const w = el.previewImage.naturalWidth, h = el.previewImage.naturalHeight, px = w * h;
      if (!w || !h) throw new Error("The image has invalid dimensions.");
      if (px > lim.pixels) throw new Error(`This image has ${px.toLocaleString("en-US")} pixels; the safe limit is ${lim.pixels.toLocaleString("en-US")}.`);
      state.imageWidth = w; state.imageHeight = h; state.imageReady = true; el.scanImageBtn.disabled = false;
      el.fileMeta.textContent = `${state.imageName} · ${w} × ${h} · ${formatBytes(file.size)} · ${label}`; clearOverlay(el.imageOverlay); invalidateResult(); await scanImage();
    } catch (e) { console.error(e); state.imageReady = false; el.scanImageBtn.disabled = true; notify(e instanceof Error ? e.message : "The image could not be loaded.", "error"); }
  }

  async function scanImage() {
    if (!state.imageReady) { notify("Choose or paste a QR code image first.", "error"); return; }
    el.scanImageBtn.disabled = true;
    try { const r = await decode(el.previewImage, state.imageWidth, state.imageHeight); if (!r) { clearOverlay(el.imageOverlay); notify("No readable QR code was found in this image.", "error"); return; } drawOverlay(el.imageOverlay, r.points, state.imageWidth, state.imageHeight); present(r, "Image"); }
    catch (e) { console.error(e); notify(e instanceof Error ? e.message : "The QR code could not be decoded.", "error"); }
    finally { el.scanImageBtn.disabled = !state.imageReady; }
  }

  async function clipboardRead() {
    if (!navigator.clipboard?.read) { notify("Direct clipboard image reading is unavailable. Paste an image with Ctrl+V / Cmd+V instead.", "info"); return; }
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => /^image\/(png|jpeg|webp|gif)$/i.test(t)); if (!type) continue;
        const blob = await item.getType(type), ext = type === "image/jpeg" ? "jpg" : type.split("/")[1];
        await loadFile(new File([blob], `clipboard-qr.${ext}`, { type }), "Clipboard"); return;
      }
      notify("No supported image was found in the clipboard.", "error");
    } catch (e) { console.error(e); notify("Clipboard image access was unavailable or denied.", "error"); }
  }

  async function pasteEvent(e) {
    const item = Array.from(e.clipboardData?.items || []).find((x) => /^image\/(png|jpeg|webp|gif)$/i.test(x.type)); if (!item) return;
    const blob = item.getAsFile(); if (!blob) return; e.preventDefault(); const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1] || "png";
    await loadFile(new File([blob], `pasted-qr.${ext}`, { type: blob.type }), "Clipboard paste");
  }

  function escapedFields(text) {
    const f = {}, parts = []; let cur = "", esc = false;
    for (const ch of text) { if (esc) { cur += ch; esc = false; continue; } if (ch === "\\") { esc = true; continue; } if (ch === ";") { parts.push(cur); cur = ""; continue; } cur += ch; }
    parts.push(cur); for (const part of parts) { const i = part.indexOf(":"); if (i > 0) f[part.slice(0, i).trim().toUpperCase()] = part.slice(i + 1); } return f;
  }

  function payload(text) {
    const t = String(text || "").trim();
    if (/^https?:\/\//i.test(t)) { try { const u = new URL(t); return { type: "URL", url: u.href, details: { Protocol: u.protocol.replace(":", "").toUpperCase(), Host: u.host, Path: `${u.pathname}${u.search}${u.hash}` } }; } catch {} }
    if (/^WIFI:/i.test(t)) { const f = escapedFields(t.replace(/^WIFI:/i, "").replace(/;;$/, "")); return { type: "Wi-Fi", url: "", details: { SSID: f.S || "", Security: f.T || "Open / unspecified", Password: f.P || "", Hidden: /^true$/i.test(f.H || "") ? "Yes" : "No" } }; }
    if (/^mailto:/i.test(t)) { try { const u = new URL(t); return { type: "Email", url: "", details: { To: decodeURIComponent(u.pathname || ""), Subject: u.searchParams.get("subject") || "", CC: u.searchParams.get("cc") || "", Body: u.searchParams.get("body") || "" } }; } catch {} }
    if (/^tel:/i.test(t)) return { type: "Phone", url: "", details: { Number: t.replace(/^tel:/i, "") } };
    if (/^(sms:|smsto:)/i.test(t)) { const v = t.replace(/^(sms:|smsto:)/i, ""), [n, ...m] = v.split(":"); return { type: "SMS", url: "", details: { Number: n || "", Message: m.join(":") } }; }
    if (/^geo:/i.test(t)) { const c = t.replace(/^geo:/i, "").split("?")[0].split(","); return { type: "Geo", url: "", details: { Latitude: c[0] || "", Longitude: c[1] || "", Altitude: c[2] || "" } }; }
    if (/^BEGIN:VCARD/i.test(t)) { const d = {}; for (const line of t.split(/\r?\n/)) { const i = line.indexOf(":"); if (i <= 0) continue; const k = line.slice(0, i).toUpperCase(), v = line.slice(i + 1).trim(); if (k === "FN") d.Name = v; else if (k.startsWith("TEL")) d.Phone = v; else if (k.startsWith("EMAIL")) d.Email = v; else if (k.startsWith("ORG")) d.Organization = v; else if (k === "URL") d.URL = v; } return { type: "vCard", url: "", details: d }; }
    return { type: "Text", url: "", details: {} };
  }

  function renderDetails(details) {
    el.detailList.replaceChildren(); const entries = Object.entries(details || {}).filter(([, v]) => String(v ?? "").trim() !== ""); el.noDetails.hidden = entries.length > 0;
    for (const [k, v] of entries) { const box = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd"); box.className = "qrs-detail"; dt.textContent = k; dd.textContent = String(v); box.append(dt, dd); el.detailList.appendChild(box); }
  }

  function present(r, source) {
    const p = payload(r.text); state.lastText = r.text; state.lastUrl = p.url || ""; el.decodedText.value = r.text; el.typeStat.textContent = p.type;
    el.lengthStat.textContent = Array.from(r.text).length.toLocaleString("en-US"); el.bytesStat.textContent = formatBytes(utf8Size(r.text)); el.sourceStat.textContent = source;
    el.decoderStat.textContent = r.version ? `${r.decoder} · QR v${r.version}` : r.decoder; renderDetails(p.details); el.openBtn.hidden = !state.lastUrl; el.resultSection.hidden = false; success("QR code decoded successfully.");
  }

  async function cameras() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try { const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput"), prev = el.cameraSelect.value; el.cameraSelect.replaceChildren(); const def = document.createElement("option"); def.value = ""; def.textContent = "Default / Rear camera"; el.cameraSelect.appendChild(def); list.forEach((d, i) => { const o = document.createElement("option"); o.value = d.deviceId; o.textContent = d.label || `Camera ${i + 1}`; el.cameraSelect.appendChild(o); }); if (prev && list.some((d) => d.deviceId === prev)) el.cameraSelect.value = prev; }
    catch (e) { console.warn(e); }
  }

  function constraints() { return el.cameraSelect.value ? { deviceId: { exact: el.cameraSelect.value }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }; }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { notify("Camera access is unavailable in this browser or context.", "error"); return; }
    stopCamera(true); const token = ++state.cameraToken; el.startCameraBtn.disabled = true; el.stopCameraBtn.disabled = false;
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: constraints(), audio: false }); if (token !== state.cameraToken) { stream.getTracks().forEach((t) => t.stop()); return; } state.stream = stream; el.cameraVideo.srcObject = stream; el.cameraShell.hidden = false; await el.cameraVideo.play(); await cameras(); const id = stream.getVideoTracks()[0]?.getSettings?.().deviceId; if (id) el.cameraSelect.value = id; schedule(0); }
    catch (e) { console.error(e); stopCamera(true); if (e?.name === "NotAllowedError") notify("Camera permission was denied or blocked.", "error"); else if (e?.name === "NotFoundError") notify("No usable camera was found.", "error"); else notify("The camera could not be started. Camera access requires HTTPS and browser permission.", "error"); }
  }

  function stopCamera(silent = false) {
    state.cameraToken++; state.cameraBusy = false; if (state.timer) { clearTimeout(state.timer); state.timer = 0; }
    if (state.stream) { state.stream.getTracks().forEach((t) => t.stop()); state.stream = null; }
    el.cameraVideo.pause(); el.cameraVideo.srcObject = null; el.cameraShell.hidden = true; el.startCameraBtn.disabled = false; el.stopCameraBtn.disabled = true; clearOverlay(el.cameraOverlay); if (!silent) clearInlineMessage();
  }

  function schedule(delay) { if (!state.stream) return; if (state.timer) clearTimeout(state.timer); state.timer = setTimeout(scanFrame, Math.max(0, delay)); }

  async function scanFrame() {
    if (!state.stream || state.cameraBusy) return; const token = state.cameraToken, v = el.cameraVideo;
    if (v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !v.videoWidth) { schedule(120); return; }
    state.cameraBusy = true;
    try { const r = await decode(v, v.videoWidth, v.videoHeight); if (token !== state.cameraToken || !state.stream) return; if (r) { drawOverlay(el.cameraOverlay, r.points, v.videoWidth, v.videoHeight); present(r, "Camera"); stopCamera(true); return; } clearOverlay(el.cameraOverlay); }
    catch (e) { console.warn(e); } finally { state.cameraBusy = false; }
    if (token === state.cameraToken && state.stream) schedule(Number(el.cameraInterval.value) || 220);
  }

  async function copyResult() {
    if (!state.lastText) { notify("There is no decoded QR content to copy.", "error"); return; }
    try { if (typeof window.xavertCopyText === "function") { await window.xavertCopyText(state.lastText); return; } await navigator.clipboard.writeText(state.lastText); if (typeof window.showCopySuccess === "function") window.showCopySuccess(); }
    catch { notify("Copy failed.", "error"); }
  }

  function openUrl() { if (!state.lastUrl) { notify("This QR code does not contain a safe HTTP(S) URL.", "error"); return; } window.open(state.lastUrl, "_blank", "noopener,noreferrer"); }

  function downloadResult() {
    if (!state.lastText) { notify("There is no decoded QR content to download.", "error"); return; }
    const name = "decoded-qr-code.txt"; if (typeof window.downloadFile === "function") { window.downloadFile(name, state.lastText, "text/plain;charset=utf-8"); return; }
    const b = new Blob([state.lastText], { type: "text/plain;charset=utf-8" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); if (typeof window.showDownloadSuccess === "function") window.showDownloadSuccess();
  }

  function resetTool() {
    if (state.resetting) return; state.resetting = true; stopCamera(true); releaseUrl(); state.imageReady = false; state.imageName = ""; state.imageWidth = 0; state.imageHeight = 0; state.lastText = ""; state.lastUrl = "";
    setTimeout(() => { el.fileMeta.textContent = "No image selected."; el.previewImage.removeAttribute("src"); el.previewShell.hidden = true; el.scanImageBtn.disabled = true; invalidateResult(); el.typeStat.textContent = "—"; el.lengthStat.textContent = "0"; el.bytesStat.textContent = "0 B"; el.sourceStat.textContent = "—"; el.decoderStat.textContent = "—"; clearOverlay(el.imageOverlay); clearOverlay(el.cameraOverlay); el.dropZone.classList.remove("dragover"); clearInlineMessage(); state.resetting = false; el.fileInput.focus(); }, 0);
  }

  el.fileInput.addEventListener("change", () => { const f = el.fileInput.files?.[0]; if (f) void loadFile(f); });
  el.scanImageBtn.addEventListener("click", () => void scanImage());
  el.pasteImageBtn.addEventListener("click", () => void clipboardRead());
  document.addEventListener("paste", (e) => void pasteEvent(e));
  ["dragenter", "dragover"].forEach((n) => el.dropZone.addEventListener(n, (e) => { e.preventDefault(); el.dropZone.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach((n) => el.dropZone.addEventListener(n, () => el.dropZone.classList.remove("dragover")));
  el.dropZone.addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) void loadFile(f); });
  el.dropZone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.fileInput.click(); } });
  el.startCameraBtn.addEventListener("click", () => void startCamera());
  el.stopCameraBtn.addEventListener("click", () => stopCamera());
  el.cameraSelect.addEventListener("change", () => { if (state.stream) void startCamera(); });
  el.inversionSelect.addEventListener("change", () => { if (state.imageReady) invalidateResult(); });
  el.copyBtn.addEventListener("click", () => void copyResult());
  el.openBtn.addEventListener("click", openUrl);
  el.downloadBtn.addEventListener("click", downloadResult);
  el.form.addEventListener("reset", resetTool);
  window.addEventListener("pagehide", () => { stopCamera(true); releaseUrl(); }, { once: true });
  if (!navigator.clipboard?.read) el.pasteImageBtn.title = "If direct clipboard access is unavailable, paste with Ctrl+V / Cmd+V.";
  void initNative();
});
