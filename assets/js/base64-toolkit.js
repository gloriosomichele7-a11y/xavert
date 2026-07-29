"use strict";

/* ===========================
   DOM
=========================== */

const inputText = document.getElementById("inputText");
const inputInfo = document.getElementById("inputInfo");
const inputType = document.getElementById("inputType");

const outputText = document.getElementById("outputText");
const outputLabel = document.getElementById("outputLabel");
const outputInfo = document.getElementById("outputInfo");

const resultBox = document.getElementById("resultBox");

const conversionStats = document.getElementById("conversionStats");
const utfInfo = document.getElementById("utfInfo");

const message = document.getElementById("message");

/* ===========================
   STATE
=========================== */

let lastAction = "result";

/* ===========================
   INIT
=========================== */

document.addEventListener("DOMContentLoaded", initializeTool);

function initializeTool() {

    bindEvents();

    resetOutput();

    updateInputStats();

}

/* ===========================
   EVENTS
=========================== */

function bindEvents() {

    // Verranno collegati qui tutti gli event listener
    // (input, pulsanti, tastiera, ecc.)

}

/* ===========================
   UI
=========================== */

function resetOutput() {

    resultBox.style.display = "none";

    outputText.value = "";

    outputLabel.textContent = "Output";

    outputInfo.textContent = "Characters: 0";

    conversionStats.style.display = "none";
    conversionStats.textContent = "";

    utfInfo.style.display = "none";
    utfInfo.textContent = "";

    lastAction = "result";

}

function updateInputStats() {

    inputInfo.textContent =
        "Characters: " + inputText.value.length;

}

/* ===========================
   TOOL
=========================== */

// Encode

// Decode

// Copy

// Download

// Sample

// Clear

/* ===========================
   HELPERS
=========================== */

// Validation

// UTF

// Base64

// Statistics

/* ===========================
   EXPORT
=========================== */
