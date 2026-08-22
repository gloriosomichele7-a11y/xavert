"use strict";

(() => {
  const toolSearch = document.getElementById("toolSearch");
  const searchResults = document.getElementById("searchResults");
  const categories = Array.from(document.querySelectorAll(".tool-category"));

  if (!toolSearch || !searchResults || !categories.length) {
    return;
  }

  function getCards(category) {
    return Array.from(category.querySelectorAll(".card-link"));
  }

  function getCategoryButton(category) {
    return category.querySelector(".category-button");
  }

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

    button.textContent = expanded ? "Show Less" : button.dataset.originalText;
  }

  categories.forEach((category) => {
    const button = getCategoryButton(category);

    if (!button) {
      return;
    }

    button.dataset.originalText = button.textContent.trim();

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
        href,
        searchable: `${title} ${description} ${categoryTitle}`.toLocaleLowerCase(),
      };
    });
  });

  let visibleResults = [];
  let activeIndex = -1;

  function closeResults() {
    visibleResults = [];
    activeIndex = -1;
    searchResults.innerHTML = "";
    searchResults.hidden = true;
    toolSearch.setAttribute("aria-expanded", "false");
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
      empty.textContent = "No matching tools";
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
    toolSearch.setAttribute("aria-expanded", "true");
  }

  toolSearch.addEventListener("input", renderResults);

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
})();
