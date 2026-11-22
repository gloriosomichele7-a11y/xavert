    "use strict";

    (() => {
      const toolSearch = document.getElementById("toolSearch");
      const toolSearchCombobox = document.getElementById("toolSearchCombobox");
      const searchResults = document.getElementById("searchResults");
      const categories = Array.from(document.querySelectorAll(".tool-category"));
      const filterButtons = Array.from(
        document.querySelectorAll("[data-category-filter]"),
      );

      const categoryIcons = {
        developer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9-3 3 3 3"></path><path d="m16 9 3 3-3 3"></path><path d="m14 5-4 14"></path></svg>',
        documents: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h5"></path><path d="M9 13h6M9 17h6"></path></svg>',
        images: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="m4 18 5-5 4 4 2-2 5 4"></path></svg>',
        utilities: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"></path><circle cx="16" cy="7" r="2"></circle><circle cx="8" cy="17" r="2"></circle></svg>',
        data: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="7" ry="3"></ellipse><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"></path><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"></path></svg>',
        ai: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z"></path><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"></path></svg>',
      };

      if (!toolSearch || !searchResults || !categories.length) {
        return;
      }

      function getCards(category) {
        return Array.from(category.querySelectorAll(".card-link"));
      }

      function getCategoryButton(category) {
        return category.querySelector(".category-button");
      }

      function getCopy(key, fallback) {
        return window.xavertLocale?.copy?.[key] || fallback;
      }

      function enhanceCategory(category) {
        const key = category.dataset.category || "utilities";
        const iconMarkup = categoryIcons[key] || categoryIcons.utilities;
        const title = category.querySelector(".category-title");
        const description = category.querySelector(".category-description");
        const grid = category.querySelector(".grid");
        const cards = getCards(category);

        if (title && description && grid && !category.querySelector(".category-heading")) {
          const heading = document.createElement("div");
          heading.className = "category-heading";

          const icon = document.createElement("span");
          icon.className = "category-icon";
          icon.innerHTML = iconMarkup;

          const copy = document.createElement("div");
          copy.className = "category-copy";
          copy.append(title, description);

          const count = document.createElement("span");
          count.className = "category-count";
          count.textContent = `${cards.length} ${cards.length === 1 ? "tool" : "tools"}`;

          heading.append(icon, copy, count);
          category.insertBefore(heading, grid);
        }

        cards.forEach((card) => {
          const panel = card.querySelector(".card");
          if (!panel || panel.querySelector(".card-icon")) return;

          const icon = document.createElement("span");
          icon.className = "card-icon";
          icon.innerHTML = iconMarkup;
          panel.prepend(icon);
        });
      }

      categories.forEach(enhanceCategory);

      function setCategoryExpanded(category, expanded) {
        const cards = getCards(category);
        const button = getCategoryButton(category);

        if (!button || cards.length <= 4) {
          if (button) {
            button.hidden = true;
          }

          cards.forEach((card) => {
            card.hidden = false;
          });

          return;
        }

        button.hidden = false;
        button.setAttribute("aria-expanded", String(expanded));
        category.classList.toggle("expanded", expanded);

        cards.forEach((card, index) => {
          card.hidden = !expanded && index >= 4;
        });

        button.textContent = expanded
          ? getCopy("showLess", "Show less")
          : button.dataset.originalText;
      }

      categories.forEach((category) => {
        let button = getCategoryButton(category);

        if (!button) {
          button = document.createElement("button");
          button.className = "category-button";
          button.type = "button";
          button.setAttribute("aria-expanded", "false");
          category.appendChild(button);
        }

        button.dataset.originalText = getCopy("showMore", "Show all");
        button.textContent = button.dataset.originalText;

        const cards = getCards(category);

        if (cards.length <= 4) {
          button.hidden = true;
          return;
        }

        setCategoryExpanded(category, false);

        button.addEventListener("click", () => {
          const expanded = button.getAttribute("aria-expanded") === "true";
          setCategoryExpanded(category, !expanded);
        });
      });

      function selectCategoryFilter(filter) {
        filterButtons.forEach((button) => {
          const active = button.dataset.categoryFilter === filter;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });

        categories.forEach((category) => {
          const matches = filter === "all" || category.dataset.category === filter;
          category.hidden = !matches;
          if (matches) {
            setCategoryExpanded(category, filter !== "all");
          }
        });
      }

      filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
          selectCategoryFilter(button.dataset.categoryFilter || "all");
        });
      });

      // Every main tool is indexed from its existing homepage link.
      // Actions below use real modes exposed by eight multi-tool pages.
      // Never create a deep link unless that page supports ?tool=mode.
      const actionIndex = [
        {
                "title": "Merge PDF",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=merge",
                "keywords": "merge combine join multiple pdf documents",
                "action": true
        },
        {
                "title": "Split PDF",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=split",
                "keywords": "split separate divide pdf pages documents",
                "action": true
        },
        {
                "title": "Images to PDF",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=images",
                "keywords": "images jpg jpeg png photos pictures to pdf",
                "action": true
        },
        {
                "title": "PDF to JPG",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=pdfjpg",
                "keywords": "pdf to jpg pdf to jpeg export image",
                "action": true
        },
        {
                "title": "Rotate PDF",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=rotate",
                "keywords": "rotate pdf pages orientation sideways",
                "action": true
        },
        {
                "title": "Extract Pages",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=extract",
                "keywords": "extract select save pdf pages",
                "action": true
        },
        {
                "title": "Delete Pages",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=delete",
                "keywords": "remove delete pdf pages",
                "action": true
        },
        {
                "title": "PDF to PNG",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=png",
                "keywords": "pdf to png convert pages to images",
                "action": true
        },
        {
                "title": "Watermark PDF",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=watermark",
                "keywords": "watermark add logo text stamp pdf",
                "action": true
        },
        {
                "title": "Compress PDF",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=compress",
                "keywords": "compress reduce shrink pdf file size",
                "action": true
        },
        {
                "title": "Reorder Pages",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=reorder",
                "keywords": "reorder rearrange move sort pdf pages",
                "action": true
        },
        {
                "title": "Add Page Numbers",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=numbers",
                "keywords": "add pdf page numbers numbering paginate",
                "action": true
        },
        {
                "title": "Sign PDF",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=sign",
                "keywords": "sign a pdf signature place signature draw signature sign document handwritten autograph digital ink",
                "action": true
        },
        {
                "title": "PDF OCR & Text Extraction",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=ocr",
                "keywords": "ocr scanned pdf extract recognize text",
                "action": true
        },
        {
                "title": "Compare PDFs",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=compare",
                "keywords": "compare pdf differences documents",
                "action": true
        },
        {
                "title": "Redact PDF",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=redact",
                "keywords": "redact cover hide censor sensitive private information pdf",
                "action": true
        },
        {
                "title": "Crop PDF",
                "category": "PDF Toolkit · Action",
                "href": "tools/pdf-toolkit.html?tool=crop",
                "keywords": "crop trim margins pdf pages",
                "action": true
        },
        {
                "title": "Color Format Converter",
                "category": "Color Toolkit · Action",
                "href": "tools/color-toolkit.html?tool=converter",
                "keywords": "convert colors color formats rgb hex hsl",
                "action": true
        },
        {
                "title": "Random Color Generator",
                "category": "Color Toolkit · Action",
                "href": "tools/color-toolkit.html?tool=generator",
                "keywords": "random color generate hexadecimal swatches",
                "action": true
        },
        {
                "title": "Contrast Checker",
                "category": "Color Toolkit · Action",
                "href": "tools/color-toolkit.html?tool=contrast",
                "keywords": "accessibility contrast check wcag colors",
                "action": true
        },
        {
                "title": "Palette Generator",
                "category": "Color Toolkit · Action",
                "href": "tools/color-toolkit.html?tool=palette",
                "keywords": "generate color palette color combinations",
                "action": true
        },
        {
                "title": "Date Difference",
                "category": "Date & Time Toolkit · Action",
                "href": "tools/date-time-toolkit.html?tool=difference",
                "keywords": "date difference between dates days",
                "action": true
        },
        {
                "title": "Age Calculator",
                "category": "Date & Time Toolkit · Action",
                "href": "tools/date-time-toolkit.html?tool=age",
                "keywords": "age calculate birthday years months days",
                "action": true
        },
        {
                "title": "Timestamp Converter",
                "category": "Date & Time Toolkit · Action",
                "href": "tools/date-time-toolkit.html?tool=timestamp",
                "keywords": "convert epoch unix timestamp datetime",
                "action": true
        },
        {
                "title": "Time Zone Converter / World Time",
                "category": "Date & Time Toolkit · Action",
                "href": "tools/date-time-toolkit.html?tool=timezone",
                "keywords": "convert time zones world clock international timezone",
                "action": true
        },
        {
                "title": "Add / Subtract Days",
                "category": "Date & Time Toolkit · Action",
                "href": "tools/date-time-toolkit.html?tool=dateadd",
                "keywords": "add subtract days dates offset",
                "action": true
        },
        {
                "title": "Countdown Calculator",
                "category": "Date & Time Toolkit · Action",
                "href": "tools/date-time-toolkit.html?tool=countdown",
                "keywords": "countdown remaining days timer to date",
                "action": true
        },
        {
                "title": "CSV to XLSX",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=csvxlsx",
                "keywords": "csv to excel xlsx spreadsheet conversion",
                "action": true
        },
        {
                "title": "XLSX to CSV",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=xlsxcsv",
                "keywords": "excel xlsx to csv spreadsheet conversion",
                "action": true
        },
        {
                "title": "XLSX to JSON",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=xlsxjson",
                "keywords": "excel xlsx to json spreadsheet conversion",
                "action": true
        },
        {
                "title": "JSON to XLSX",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=jsonxlsx",
                "keywords": "json to excel xlsx spreadsheet conversion",
                "action": true
        },
        {
                "title": "JSON to CSV",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=jsoncsv",
                "keywords": "json to csv conversion",
                "action": true
        },
        {
                "title": "CSV to JSON",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=csvjson",
                "keywords": "csv to json conversion",
                "action": true
        },
        {
                "title": "XML to JSON",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=xmljson",
                "keywords": "xml to json conversion",
                "action": true
        },
        {
                "title": "JSON to XML",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=jsonxml",
                "keywords": "json to xml conversion",
                "action": true
        },
        {
                "title": "JSON Formatter",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=jsonformat",
                "keywords": "format beautify pretty print json",
                "action": true
        },
        {
                "title": "JSON Minifier",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=jsonminify",
                "keywords": "minify compress compact json",
                "action": true
        },
        {
                "title": "JSON Validator",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=jsonvalidate",
                "keywords": "validate check json syntax",
                "action": true
        },
        {
                "title": "XML Formatter",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=xmlformat",
                "keywords": "format beautify pretty print xml",
                "action": true
        },
        {
                "title": "XML Minifier",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=xmlminify",
                "keywords": "minify compress compact xml",
                "action": true
        },
        {
                "title": "XML Validator",
                "category": "Data Converter · Action",
                "href": "tools/data-converter.html?tool=xmlvalidate",
                "keywords": "validate check xml syntax",
                "action": true
        },
        {
                "title": "Resize Image",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=resize",
                "keywords": "resize image photo dimensions scale picture",
                "action": true
        },
        {
                "title": "Crop Image",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=crop",
                "keywords": "crop trim image photo picture",
                "action": true
        },
        {
                "title": "Compress Image",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=compress",
                "keywords": "compress shrink image photo reduce filesize",
                "action": true
        },
        {
                "title": "Convert Image",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=convert",
                "keywords": "convert conversion image png jpg webp heic heif avif file format",
                "action": true
        },
        {
                "title": "Rotate Image",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=rotate",
                "keywords": "rotate photo image orientation turn",
                "action": true
        },
        {
                "title": "Flip Image",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=flip",
                "keywords": "flip image photo mirror horizontal vertical",
                "action": true
        },
        {
                "title": "Watermark Image",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=watermark",
                "keywords": "watermark photo image add text logo",
                "action": true
        },
        {
                "title": "Grayscale Image",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=grayscale",
                "keywords": "grayscale black and white photo image",
                "action": true
        },
        {
                "title": "Clean Metadata",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=metadata",
                "keywords": "remove clean image photo metadata exif privacy",
                "action": true
        },
        {
                "title": "Image to PDF",
                "category": "Image Toolkit · Action",
                "href": "tools/image-toolkit.html?tool=pdf",
                "keywords": "image photo picture jpg png to pdf conversion",
                "action": true
        },
        {
                "title": "Password Generator",
                "category": "Password Toolkit · Action",
                "href": "tools/password-toolkit.html?tool=generator",
                "keywords": "generate random password secure",
                "action": true
        },
        {
                "title": "Password Strength Checker",
                "category": "Password Toolkit · Action",
                "href": "tools/password-toolkit.html?tool=checker",
                "keywords": "check password strength strength test",
                "action": true
        },
        {
                "title": "Passphrase Generator",
                "category": "Password Toolkit · Action",
                "href": "tools/password-toolkit.html?tool=passphrase",
                "keywords": "generate passphrase memorable secure words password",
                "action": true
        },
        {
                "title": "Hash Generator",
                "category": "Password Toolkit · Action",
                "href": "tools/password-toolkit.html?tool=hash",
                "keywords": "password hash digest secure cryptographic hash",
                "action": true
        },
        {
                "title": "Word & Character Counter",
                "category": "Text Toolkit · Action",
                "href": "tools/text-toolkit.html?tool=counter",
                "keywords": "count words characters text statistics",
                "action": true
        },
        {
                "title": "Case Converter",
                "category": "Text Toolkit · Action",
                "href": "tools/text-toolkit.html?tool=case",
                "keywords": "convert text case upper lower title",
                "action": true
        },
        {
                "title": "Remove Extra Spaces",
                "category": "Text Toolkit · Action",
                "href": "tools/text-toolkit.html?tool=spaces",
                "keywords": "remove extra spaces clean whitespace text",
                "action": true
        },
        {
                "title": "Remove Duplicate Lines",
                "category": "Text Toolkit · Action",
                "href": "tools/text-toolkit.html?tool=duplicates",
                "keywords": "remove duplicate lines repeated text",
                "action": true
        },
        {
                "title": "Sort Lines",
                "category": "Text Toolkit · Action",
                "href": "tools/text-toolkit.html?tool=sort",
                "keywords": "sort lines alphabetize text",
                "action": true
        },
        {
                "title": "Find & Replace",
                "category": "Text Toolkit · Action",
                "href": "tools/text-toolkit.html?tool=findreplace",
                "keywords": "find and replace text search replace words",
                "action": true
        },
        {
                "title": "Text to Slug",
                "category": "Text Toolkit · Action",
                "href": "tools/text-toolkit.html?tool=slug",
                "keywords": "convert text to url slug web address",
                "action": true
        },
        {
                "title": "URL Encode / Decode",
                "category": "Text Toolkit · Action",
                "href": "tools/text-toolkit.html?tool=url",
                "keywords": "encode decode url percent encoding text",
                "action": true
        },
        {
                "title": "Base64 Encode / Decode",
                "category": "Text Toolkit · Action",
                "href": "tools/text-toolkit.html?tool=base64",
                "keywords": "encode decode base64 text",
                "action": true
        },
        {
                "title": "URL Encode",
                "category": "URL Toolkit · Action",
                "href": "tools/url-toolkit.html?tool=encode",
                "keywords": "url encode percent escape encode uri",
                "action": true
        },
        {
                "title": "URL Decode",
                "category": "URL Toolkit · Action",
                "href": "tools/url-toolkit.html?tool=decode",
                "keywords": "url decode percent unescape uri",
                "action": true
        },
        {
                "title": "Parse URL",
                "category": "URL Toolkit · Action",
                "href": "tools/url-toolkit.html?tool=parse",
                "keywords": "parse inspect analyze URL parameters query",
                "action": true
        },
        {
                "title": "UTM Builder",
                "category": "URL Toolkit · Action",
                "href": "tools/url-toolkit.html?tool=utm",
                "keywords": "utm campaign builder tracking url parameters",
                "action": true
        }
].map((entry) => ({
        ...entry,
        searchable: normalizeSearch(`${entry.title} ${entry.category} ${entry.keywords}`),
        normalizedTitle: normalizeSearch(entry.title),
      }));

      const extraSearchTerms = {
        "json-toolkit.html": "json editor json formatter validator minifier beautifier compare escape unescape",
        "xml-json-converter.html": "xml json convert transform both ways",
        "xml-formatter-validator.html": "xml formatting validation minifier",
        "yaml-json-converter.html": "yaml to json json to yaml yml",
        "markdown-editor.html": "markdown edit render live preview to html",
        "jwt-decoder.html": "decode json web token inspect jwt",
        "jwt-generator.html": "create jwt token sign generate",
        "meta-tag-generator.html": "seo meta title description html head tags",
        "open-graph-generator.html": "open graph og tags social sharing twitter card",
        "markup-generator.html": "schema markup json ld structured data faq recipe product",
        "robots-generator.html": "robots txt generate seo indexing crawler",
        "sitemap-generator.html": "sitemap xml sitemap seo urls",
        "lorem-ipsum-generator.html": "placeholder dummy text filler",
        "css-minifier.html": "compress minify format css beautify",
        "html-minifier.html": "compress minify html source markup",
        "javascript-formatter-minifier.html": "beautify pretty print minify javascript js",
        "sql-formatter.html": "sql format beautify query pretty",
        "sql-minifier.html": "sql minify compact shrink query",
        "cron-expression-generator.html": "cron schedule task expression scheduler",
        "htaccess-generator.html": "apache htaccess rewrite redirect force https security headers",
        "env-generator.html": "environment env variables dotenv secrets config",
        "regex-tester.html": "regular expression regex tester pattern matching",
        "base64-toolkit.html": "base64 encode decode convert text",
        "html-entity-encoder-decoder.html": "html entities encode decode special symbols escape",
        "uuid-generator.html": "generate uuid guid random identifier",
        "file-hash-checker.html": "hash file verify checksum sha256 sha512 digest integrity",
        "hash-generator.html": "hash text md5 sha1 sha256 sha512",
        "diff-checker.html": "compare texts text diff differences",
        "http-header-analyzer.html": "inspect response http security headers server cache",
        "user-agent-parser.html": "user agent parse device browser detector",
        "image-toolkit.html": "heic heif image format conversion converter jpeg jpg png webp photo editor",
        "word-toolkit.html": "word docx document preview convert to html markdown txt extract text",
        "background-remover.html": "remove background photo transparent background picture",
        "image-to-text-ocr.html": "scan image ocr extract text picture",
        "image-metadata-exif-cleaner.html": "exif remove metadata gps photo privacy",
        "svg-toolkit.html": "svg optimize sanitize convert vector png",
        "favicon-generator.html": "favicon ico pwa icon logo generator apple touch",
        "image-upscaler.html": "upscale enlarge photo super resolution image ai",
        "color-palette-extractor.html": "extract photo colors color palette",
        "qr-generator.html": "qr generator create code wifi vcard",
        "qr-code-scanner-reader.html": "scan read decode qr barcode image camera",
        "barcode-generator.html": "barcode generate code128 ean13 product labels",
        "unix-timestamp-converter.html": "epoch timestamp unix convert seconds datetime",
        "unit-converter.html": "unit convert km miles kilograms pounds celsius fahrenheit",
        "word-character-counter.html": "word counter characters length text",
        "case-converter.html": "snake case kebab camel title upper lower case",
        "spreadsheet-toolkit.html": "excel spreadsheet xlsx csv ods edit clean merge remove duplicates",
        "csv-viewer-editor.html": "csv viewer spreadsheet editor tables",
        "ai-brief-builder.html": "ai prompt task instructions structured brief",
        "ai-response-reviewer.html": "verify check ai response facts review claims"
};

      function normalizeSearch(value) {
        return String(value || "")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      const tools = categories.flatMap((category) => {
        const categoryTitle =
          category.querySelector(".category-title")?.textContent.trim() || "XAVERT";

        return getCards(category).map((card) => {
          const title = card.querySelector("h3")?.textContent.trim() || "Tool";
          const description =
            card.querySelector("p")?.textContent.replace(/\s+/g, " ").trim() || "";
          const href = card.getAttribute("href") || "#";

          return {
            title,
            description,
            category: categoryTitle,
            categoryElement: category,
            cardElement: card,
            href,
            keywords: extraSearchTerms[href.replace(/^tools\//, "")] || "",
            searchable: normalizeSearch(`${title} ${description} ${categoryTitle} ${extraSearchTerms[href.replace(/^tools\//, "")] || ""}`),
          };
        });
      });

      function refreshToolIndex() {
        tools.forEach((tool) => {
          tool.title = tool.cardElement?.querySelector("h3")?.textContent.trim() || tool.title;
          tool.description = tool.cardElement?.querySelector("p")?.textContent.replace(/\s+/g, " ").trim() || tool.description;
          tool.category = tool.categoryElement?.querySelector(".category-title")?.textContent.trim() || tool.category;
          tool.searchable = normalizeSearch(`${tool.title} ${tool.description} ${tool.category} ${tool.keywords}`);
        });
      }

      let visibleResults = [];
      let activeIndex = -1;

      function closeResults() {
        visibleResults = [];
        activeIndex = -1;
        searchResults.innerHTML = "";
        searchResults.hidden = true;
        toolSearchCombobox?.setAttribute("aria-expanded", "false");
        toolSearch.removeAttribute("aria-activedescendant");
      }

      function scoreTool(tool, query) {
        const title = tool.normalizedTitle || normalizeSearch(tool.title);
        const terms = query.split(" ").filter(Boolean).filter(word => !["to", "a", "an", "the", "please", "how", "my", "for", "with"].includes(word));
        // A broad search like "pdf" should find the PDF Toolkit, rather than
        // flood the suggestions with 17 separate PDF operations.
        if (tool.action && !terms.some(word => !["pdf", "tool", "toolkit", "converter", "conversion", "image", "images", "text", "data", "file", "files", "document", "documents", "color", "date", "time", "url", "password"].includes(word))) return 0;

        if (title === query) return tool.action ? 160 : 170;
        if (title.startsWith(query)) return tool.action ? 135 : 140;
        if (title.includes(query)) return tool.action ? 115 : 110;
        if (terms.length && terms.every(word => title.split(" ").includes(word))) return tool.action ? 105 : 100;
        if (tool.searchable.includes(query)) return 80;
        if (terms.length && terms.every(word => tool.searchable.split(" ").some(term => term.startsWith(word)))) return 65;
        return 0;
      }

      function setActive(index) {
        const items = Array.from(
          searchResults.querySelectorAll(".search-result-item"),
        );

        if (!items.length) {
          activeIndex = -1;
          return;
        }

        activeIndex = Math.max(0, Math.min(index, items.length - 1));

        items.forEach((item, itemIndex) => {
          const active = itemIndex === activeIndex;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
        });

        const activeItem = items[activeIndex];

        if (activeItem) {
          toolSearch.setAttribute("aria-activedescendant", activeItem.id);
          activeItem.scrollIntoView({ block: "nearest" });
        }
      }

      function renderResults() {
        const query = normalizeSearch(toolSearch.value);

        if (!query) {
          closeResults();
          return;
        }

        refreshToolIndex();
        visibleResults = [...tools, ...actionIndex]
          .map((tool) => ({
            ...tool,
            score: scoreTool(tool, query),
          }))
          .filter((tool) => tool.score > 0)
          .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
          .slice(0, 8);

        activeIndex = -1;
        searchResults.innerHTML = "";

        if (!visibleResults.length) {
          const empty = document.createElement("div");
          empty.className = "search-empty";
          empty.textContent = getCopy("noResults", "No matching tools");
          searchResults.appendChild(empty);
        } else {
          visibleResults.forEach((tool, index) => {
            const link = document.createElement("a");
            link.className = "search-result-item";
            link.href = tool.href;
            link.id = `search-result-${index}`;
            link.setAttribute("role", "option");
            link.setAttribute("aria-selected", "false");

            const title = document.createElement("span");
            title.className = "search-result-title";
            title.textContent = tool.title;

            const meta = document.createElement("span");
            meta.className = "search-result-meta";
            meta.textContent = tool.category;

            link.append(title, meta);
            searchResults.appendChild(link);
          });
        }

        searchResults.hidden = false;
        toolSearchCombobox?.setAttribute("aria-expanded", "true");
      }

      toolSearch.addEventListener("input", renderResults);

      document.addEventListener("keydown", (event) => {
        const target = event.target;
        const isTyping =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target?.isContentEditable;

        if (
          (!isTyping && event.key === "/") ||
          ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")
        ) {
          event.preventDefault();
          toolSearch.focus();
          toolSearch.select();
        }
      });

      toolSearch.addEventListener("focus", () => {
        if (toolSearch.value.trim()) {
          renderResults();
        }
      });

      toolSearch.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeResults();
          toolSearch.select();
          return;
        }

        if (searchResults.hidden || !visibleResults.length) {
          if (event.key === "Enter" && toolSearch.value.trim()) {
            renderResults();

            if (visibleResults.length) {
              window.location.href = visibleResults[0].href;
            }
          }

          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActive(activeIndex + 1);
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActive(
            activeIndex <= 0 ? visibleResults.length - 1 : activeIndex - 1,
          );
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();

          const target = visibleResults[activeIndex >= 0 ? activeIndex : 0];

          if (target) {
            window.location.href = target.href;
          }
        }
      });

      document.addEventListener("click", (event) => {
        if (event.target !== toolSearch && !searchResults.contains(event.target)) {
          closeResults();
        }
      });

      window.addEventListener("xavert:languagechange", () => {
        refreshToolIndex();
        categories.forEach((category) => {
          const button = getCategoryButton(category);
          if (!button || button.hidden) return;
          button.dataset.originalText = getCopy("showMore", "Show all");
          const expanded = button.getAttribute("aria-expanded") === "true";
          button.textContent = expanded
            ? getCopy("showLess", "Show less")
            : button.dataset.originalText;
        });

        if (!searchResults.hidden) renderResults();
      });
    })();
