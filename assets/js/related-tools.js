// =====================================
// XAVERT Related Tools
// =====================================

"use strict";

const tools = {
    ...
};

const relatedTools = {
    ...
};

function loadRelatedTools(currentTool) {

    const container = document.getElementById("related-tools");

    if (!container) return;

    const section = document.getElementById("related-tools-section");

    const ids = relatedTools[currentTool];

    if (!ids?.length) {
        container.replaceChildren();
        if (section) section.hidden = true;
        return;
    }

    const navigation = document.createElement("nav");
    navigation.className = "related-tools-grid";
    navigation.setAttribute("aria-label","Related tools");

    ids
        .filter(id => id !== currentTool && tools[id])
        .slice(0,4)
        .forEach(id => {

            const tool = tools[id];

            const link = document.createElement("a");
            link.className = "related-tool-card";
            link.href = tool.path;

            link.innerHTML = `
                <span class="related-tool-title">${tool.title}</span>
                <span class="related-tool-description">${tool.description}</span>
            `;

            navigation.append(link);

        });

    if (!navigation.children.length) {

        container.replaceChildren();

        if(section) section.hidden = true;

        return;

    }

    container.replaceChildren(navigation);

    if(section) section.hidden = false;

}
