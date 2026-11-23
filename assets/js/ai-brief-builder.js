"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const fields = ["briefGoal", "briefAudience", "briefFormat", "briefContext", "briefFacts", "briefTone", "briefLanguage", "briefConstraints", "briefVerification"];

  function message(text, type = "success") {
    const box = $("briefMessage");
    box.textContent = text;
    box.className = `message message-${type}`;
  }

  function value(id, fallback = "Not specified") {
    return $(id).value.trim() || fallback;
  }

  function invalidateBrief() {
    if ($("briefOutput").value) {
      $("briefOutput").value = "";
      message("Inputs changed. Build the brief again.", "info");
    }
  }

  function build() {
    if (!value("briefGoal", "")) {
      message("Describe the result you need before building the brief.", "error");
      $("briefGoal").focus();
      return;
    }
    const verification = {
      strict: "Do not invent missing information. Mark uncertainty explicitly, identify claims that require verification and provide source links when external facts are used.",
      balanced: "Distinguish facts, reasonable inferences and assumptions. State what should be verified before the result is used.",
      creative: "Creative suggestions are welcome, but label invented examples and never present them as verified facts.",
    }[$("briefVerification").value];

    const brief = [
      "# TASK", value("briefGoal"), "",
      "# AUDIENCE", value("briefAudience"), "",
      "# CONTEXT", value("briefContext"), "",
      "# VERIFIED INPUT / SOURCE MATERIAL", value("briefFacts", "No source material supplied. Ask before relying on missing facts."), "",
      "# OUTPUT REQUIREMENTS", `Format: ${value("briefFormat")}`, `Language: ${value("briefLanguage")}`, `Tone: ${value("briefTone")}`, "",
      "# CONSTRAINTS", value("briefConstraints", "No additional constraints specified."), "",
      "# VERIFICATION RULES", verification, "",
      "# WORKING METHOD", "1. Restate the task briefly to confirm understanding.", "2. Identify missing information that could materially change the answer.", "3. Produce the requested result using only the supplied facts or clearly identified external sources.", "4. End with a short verification checklist and any remaining uncertainties."
    ].join("\n");
    $("briefOutput").value = brief;
    message("Brief created. Review it before using it with an AI.");
  }

  fields.forEach((id) => {
    $(id).addEventListener("input", invalidateBrief);
    $(id).addEventListener("change", invalidateBrief);
  });

  $("buildBriefBtn").addEventListener("click", build);
  $("briefExampleBtn").addEventListener("click", () => {
    invalidateBrief();
    $("briefGoal").value = "Compare three internet plans and recommend the best option for a family that works from home.";
    $("briefAudience").value = "A non-technical household";
    $("briefFormat").value = "Table";
    $("briefContext").value = "The household has four people, frequent video calls and several streaming devices.";
    $("briefFacts").value = "Plan A: €28/month, 100 Mbps. Plan B: €34/month, 1 Gbps, 24-month term. Plan C: €31/month, 300 Mbps, no minimum term.";
    $("briefTone").value = "Simple and accessible";
    $("briefLanguage").value = "Italian";
    $("briefConstraints").value = "Do not assume fees that are not listed. Highlight contract length and total annual cost.";
    $("briefVerification").value = "strict";
    message("Example loaded.");
  });
  $("briefClearBtn").addEventListener("click", () => {
    fields.forEach((id) => { const el = $(id); if (el.tagName === "SELECT") el.selectedIndex = 0; else el.value = ""; });
    $("briefOutput").value = "";
    message("Fields cleared.", "info");
  });
  $("briefCopyBtn").addEventListener("click", async () => {
    if (!$("briefOutput").value) return message("Build a brief first.", "error");
    try {
      if (typeof window.xavertCopyText === "function") {
        await window.xavertCopyText($("briefOutput").value);
      } else {
        await navigator.clipboard.writeText($("briefOutput").value);
      }
      message("Brief copied.");
    } catch (error) {
      console.error("Brief copy failed:", error);
      message("Unable to copy. Check clipboard permissions.", "error");
    }
  });
  $("briefDownloadBtn").addEventListener("click", () => {
    if (!$("briefOutput").value) return message("Build a brief first.", "error");
    const url = URL.createObjectURL(new Blob([$("briefOutput").value], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "xavert-ai-brief.txt";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    message("Brief downloaded.");
  });
})();
