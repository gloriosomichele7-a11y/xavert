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
            href,
            searchable: `${title} ${description} ${categoryTitle}`.toLocaleLowerCase(),
          };
        });
      });

      function refreshToolIndex() {
        tools.forEach((tool) => {
          const categoryTitle =
            tool.categoryElement?.querySelector(".category-title")?.textContent.trim() ||
            tool.category;
          tool.category = categoryTitle;
          tool.searchable = `${tool.title} ${tool.description} ${categoryTitle}`.toLocaleLowerCase();
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
        const title = tool.title.toLocaleLowerCase();
        const category = tool.category.toLocaleLowerCase();

        if (title === query) return 100;
        if (title.startsWith(query)) return 80;
        if (title.includes(query)) return 60;
        if (category.startsWith(query)) return 40;
        if (tool.searchable.includes(query)) return 20;

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
        const query = toolSearch.value.trim().toLocaleLowerCase();

        if (!query) {
          closeResults();
          return;
        }

        visibleResults = tools
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
