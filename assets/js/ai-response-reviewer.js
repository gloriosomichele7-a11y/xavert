"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  let reportText = "";

  function setMessage(text, type = "success") { const box = $("reviewMessage"); box.textContent = text; box.className = `message message-${type}`; }
  function count(pattern, text) { return (text.match(pattern) || []).length; }

  function analyze() {
    const task = $("reviewTask").value.trim();
    const response = $("reviewResponse").value.trim();
    if (!response) { setMessage("Paste an AI response before reviewing it.", "error"); $("reviewResponse").focus(); return; }

    const words = response.split(/\s+/).filter(Boolean).length;
    const numbers = count(/\b\d+(?:[.,]\d+)?%?|[$€£]\s?\d+(?:[.,]\d+)?/g, response);
    const dates = count(/\b(?:19|20)\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, response);
    const urls = count(/https?:\/\/[^\s)]+/gi, response);
    const absolute = count(/\b(always|never|guaranteed|certainly|definitely|impossible|proven|100%)\b/gi, response);
    const uncertainty = count(/\b(may|might|could|uncertain|estimate|approximately|depends|verify|check)\b/gi, response);
    const personal = count(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\d\s().-]{7,}\d)/g, response);
    const items = [];
    items.push({ level: numbers || dates ? "check" : "good", title: "Figures and dates", text: numbers || dates ? `Found ${numbers} numeric claim(s) and ${dates} date reference(s). Verify them against a current primary source.` : "No obvious figures or dates were detected." });
    items.push({ level: absolute ? "check" : "good", title: "Certainty", text: absolute ? `Found ${absolute} strong or absolute expression(s). Check whether the evidence really supports that level of certainty.` : "No common absolute expressions were detected." });
    items.push({ level: urls ? "good" : "check", title: "Sources", text: urls ? `Found ${urls} URL reference(s). Open each source and confirm that it supports the nearby claim.` : "No direct URL was detected. Ask for sources when the answer relies on external facts." });
    items.push({ level: uncertainty ? "good" : "check", title: "Uncertainty", text: uncertainty ? "The response contains language that acknowledges limits or the need to verify." : "The response does not visibly acknowledge uncertainty. Ask which parts are assumptions." });
    items.push({ level: personal ? "check" : "good", title: "Personal data", text: personal ? `Found ${personal} possible contact or personal-data element(s). Confirm that sharing and storing them is appropriate.` : "No obvious email address or phone number was detected." });
    items.push({ level: task ? "good" : "check", title: "Fit to the task", text: task ? "Compare every section with the original request and remove material that was not requested." : "Add the original request to make the review more specific." });

    $("reviewSummary").textContent = "";
    [[`${words} words`], [`${items.filter(i => i.level === "check").length} checks`], [`${urls} URLs`]].forEach(([label]) => { const chip = document.createElement("span"); chip.className = "review-chip"; chip.textContent = label; $("reviewSummary").appendChild(chip); });
    $("reviewResults").textContent = "";
    items.forEach((item) => { const card = document.createElement("article"); card.className = "review-item"; card.dataset.level = item.level; const title = document.createElement("strong"); title.textContent = item.title; const text = document.createElement("p"); text.textContent = item.text; card.append(title, text); $("reviewResults").appendChild(card); });
    reportText = ["XAVERT AI RESPONSE REVIEW", "", `Original task: ${task || "Not supplied"}`, `Response length: ${words} words`, "", ...items.flatMap(item => [`${item.title.toUpperCase()}: ${item.text}`, ""]), "Reminder: This is a textual risk review, not a factual guarantee."].join("\n");
    setMessage("Review completed. Verify every highlighted point before relying on the response.");
  }

  $("reviewBtn").addEventListener("click", analyze);
  $("reviewExampleBtn").addEventListener("click", () => { $("reviewTask").value = "Explain whether this investment is guaranteed to grow next year."; $("reviewResponse").value = "This investment will definitely grow by 12% in 2027. It is proven to be safe and there is no possibility of loss. Contact adviser@example.com for details."; setMessage("Example loaded."); });
  $("reviewClearBtn").addEventListener("click", () => { $("reviewTask").value = ""; $("reviewResponse").value = ""; $("reviewSummary").textContent = ""; $("reviewResults").innerHTML = "<div class=\"review-item\"><strong>Ready when you are</strong><p>Run the review to generate a practical verification checklist.</p></div>"; reportText = ""; });
  $("reviewCopyBtn").addEventListener("click", async () => { if (!reportText) return setMessage("Review a response first.", "error"); await navigator.clipboard.writeText(reportText); setMessage("Review copied."); });
  $("reviewDownloadBtn").addEventListener("click", () => { if (!reportText) return setMessage("Review a response first.", "error"); const url = URL.createObjectURL(new Blob([reportText], {type:"text/plain;charset=utf-8"})); const a = document.createElement("a"); a.href = url; a.download = "xavert-ai-response-review.txt"; a.click(); URL.revokeObjectURL(url); setMessage("Review downloaded."); });
})();
