const INCLUDE_SELECTOR = "[data-include]";

async function loadPartial(node) {
    const path = node.getAttribute("data-include");

    if (!path) return;

    const response = await fetch(path, { cache: "no-cache" });

    if (!response.ok) {
        node.innerHTML = `<div style="padding:16px">Nie udało się wczytać: ${path}</div>`;
        return;
    }

    node.innerHTML = await response.text();
}

async function includePartials() {
    const nodes = Array.from(document.querySelectorAll(INCLUDE_SELECTOR));

    await Promise.all(nodes.map(loadPartial));
}

window.__includePartials = includePartials;
