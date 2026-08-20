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

  function resetCategories() {
    categories.forEach((category) => {
      category.hidden = false;

      const button = getCategoryButton(category);

      if (button) {
        button.hidden = false;
      }

      setCategoryExpanded(category, category.classList.contains("expanded"));
    });

    searchResults.textContent = "";
  }

  function filterTools() {
    const query = toolSearch.value.trim().toLocaleLowerCase();

    if (!query) {
      resetCategories();
      return;
    }

    let totalResults = 0;

    categories.forEach((category) => {
      let categoryMatches = 0;

      getCards(category).forEach((card) => {
        const searchableText = card.textContent.toLocaleLowerCase();

        const matches = searchableText.includes(query);

        card.hidden = !matches;

        if (matches) {
          categoryMatches += 1;
          totalResults += 1;
        }
      });

      category.hidden = categoryMatches === 0;

      const button = getCategoryButton(category);

      if (button) {
        button.hidden = true;
      }
    });

    searchResults.textContent = `${totalResults} tool${totalResults === 1 ? "" : "s"} found`;
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

  toolSearch.addEventListener("input", filterTools);

  toolSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !toolSearch.value) {
      return;
    }

    toolSearch.value = "";
    resetCategories();
    toolSearch.focus();
  });
})();
