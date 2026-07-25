// XAVERT Related Tools
// Centralized system for generating relevant tool recommendations.

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const container = document.getElementById("related-tools");

    if (!container) {
        return;
    }

    const section = container.closest("section");

    const tools = {
        "qr-generator": {
            title: "QR Generator",
            description: "Create customizable QR codes directly in your browser.",
            path: "qr-generator.html"
        },

        "barcode-generator": {
            title: "Barcode Generator",
            description: "Generate downloadable barcodes directly in your browser.",
            path: "barcode-generator.html"
        },

        "pdf-toolkit": {
            title: "PDF Toolkit",
            description: "Work with PDF files using practical browser-based utilities.",
            path: "pdf-toolkit.html"
        },

        "image-toolkit": {
            title: "Image Toolkit",
            description: "Convert, resize and optimize images directly in your browser.",
            path: "image-toolkit.html"
        },

        "data-converter": {
            title: "Data Converter",
            description: "Convert structured data between useful formats.",
            path: "data-converter.html"
        },

        "text-toolkit": {
            title: "Text Toolkit",
            description: "Clean, transform and analyze text with practical utilities.",
            path: "text-toolkit.html"
        },

        "password-toolkit": {
            title: "Password Toolkit",
            description: "Generate and evaluate strong passwords locally.",
            path: "password-toolkit.html"
        },

        "unit-converter": {
            title: "Unit Converter",
            description: "Convert common measurement units quickly and accurately.",
            path: "unit-converter.html"
        },

        "color-toolkit": {
            title: "Color Toolkit",
            description: "Convert and inspect digital color values.",
            path: "color-toolkit.html"
        },

        "date-time-toolkit": {
            title: "Date & Time Toolkit",
            description: "Calculate and convert dates, times and durations.",
            path: "date-time-toolkit.html"
        },

        "file-hash-checker": {
            title: "File Hash Checker",
            description: "Calculate file hashes locally for integrity verification.",
            path: "file-hash-checker.html"
        },

        "uuid-generator": {
            title: "UUID Generator",
            description: "Generate UUID v4 and UUID v7 identifiers instantly.",
            path: "uuid-generator.html"
        },

        "base64-toolkit": {
            title: "Base64 Toolkit",
            description: "Encode and decode Base64 text directly in your browser.",
            path: "base64-toolkit.html"
        },

        "regex-tester": {
            title: "Regex Tester",
            description: "Test regular expressions and inspect matches in real time.",
            path: "regex-tester.html"
        },

        "text-diff-checker": {
           title: "Text Diff Checker",
           description: "Compare two text versions and identify their differences.",
           path: "diff-checker.html"
        
        },

        "json-toolkit": {
            title: "JSON Toolkit",
            description: "Format, validate and process JSON data in your browser.",
            path: "json-toolkit.html"
        }
    };

    const relatedTools = {
        "base64-toolkit": [
            "text-toolkit",
            "json-toolkit",
            "data-converter",
            "file-hash-checker"
        ],

        "json-toolkit": [
            "data-converter",
            "base64-toolkit",
            "regex-tester",
            "text-diff-checker"
        ],

        "regex-tester": [
            "text-toolkit",
            "text-diff-checker",
            "json-toolkit",
            "base64-toolkit"
        ],

        "text-diff-checker": [
            "text-toolkit",
            "regex-tester",
            "json-toolkit",
            "data-converter"
        ],

        "text-toolkit": [
            "text-diff-checker",
            "regex-tester",
            "base64-toolkit",
            "json-toolkit"
        ],

        "data-converter": [
            "json-toolkit",
            "base64-toolkit",
            "text-toolkit",
            "unit-converter"
        ],

        "file-hash-checker": [
            "base64-toolkit",
            "password-toolkit",
            "uuid-generator",
            "data-converter"
        ],

        "password-toolkit": [
            "file-hash-checker",
            "uuid-generator",
            "base64-toolkit",
            "text-toolkit"
        ],

        "uuid-generator": [
            "password-toolkit",
            "file-hash-checker",
            "json-toolkit",
            "base64-toolkit"
        ],

        "qr-generator": [
            "barcode-generator",
            "image-toolkit",
            "text-toolkit",
            "data-converter"
        ],

        "barcode-generator": [
            "qr-generator",
            "image-toolkit",
            "data-converter",
            "text-toolkit"
        ],

        "image-toolkit": [
            "color-toolkit",
            "qr-generator",
            "barcode-generator",
            "pdf-toolkit"
        ],

        "color-toolkit": [
            "image-toolkit",
            "qr-generator",
            "barcode-generator",
            "text-toolkit"
        ],

        "pdf-toolkit": [
            "image-toolkit",
            "text-toolkit",
            "file-hash-checker",
            "data-converter"
        ],

        "unit-converter": [
            "date-time-toolkit",
            "data-converter",
            "color-toolkit",
            "text-toolkit"
        ],

        "date-time-toolkit": [
            "unit-converter",
            "data-converter",
            "uuid-generator",
            "text-toolkit"
        ]
    };

    function hideRelatedSection() {
        container.replaceChildren();

        if (section) {
            section.hidden = true;
        }
    }

    function getCurrentTool() {
        return document.body.dataset.tool || "";
    }

    function createCard(tool) {
        const link = document.createElement("a");
        const title = document.createElement("span");
        const description = document.createElement("span");

        link.className = "related-tool-card";
        link.href = tool.path;

        title.className = "related-tool-title";
        title.textContent = tool.title;

        description.className = "related-tool-description";
        description.textContent = tool.description;

        link.append(title, description);

        return link;
    }

    function renderRelatedTools() {
        const currentTool = getCurrentTool();
        const relatedIds = relatedTools[currentTool];

        if (!currentTool || !relatedIds) {
            hideRelatedSection();
            return;
        }

        const validTools = relatedIds
            .filter(function (toolId) {
                return toolId !== currentTool && tools[toolId];
            })
            .slice(0, 4);

        if (validTools.length === 0) {
            hideRelatedSection();
            return;
        }

        const navigation = document.createElement("nav");

        navigation.className = "related-tools-grid";
        navigation.setAttribute("aria-label", "Related tools");

        validTools.forEach(function (toolId) {
            navigation.appendChild(createCard(tools[toolId]));
        });

        container.replaceChildren(navigation);

        if (section) {
            section.hidden = false;
        }

    }

    renderRelatedTools();
});
