const SCRIPTS = {
    carousel: "/js/carousel.js?v=20261020-4",
    include: "/js/include.js?v=20261020-4",
    nav: "/js/nav.js?v=20261020-4",
};

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Nie udało się wczytać skryptu: ${src}`));

        document.head.appendChild(script);
    });
}

function updateCurrentYear() {
    const currentYear = String(new Date().getFullYear());

    document.querySelectorAll("[data-year]").forEach((element) => {
        element.textContent = currentYear;
    });
}

async function loadPartials() {
    await loadScript(SCRIPTS.include);
    await window.__includePartials?.();
}

async function initNavigation() {
    await loadScript(SCRIPTS.nav);
    window.__initNav?.();
}

async function initCarouselIfNeeded() {
    if (!document.querySelector("[data-carousel]")) return;

    await loadScript(SCRIPTS.carousel);
    window.__initCarousel?.();
}

function applyTypography(root = document.querySelector("main")) {
    if (!root) return;

    const targets = root.querySelectorAll(
        "p, li, h1, h2, h3, h4, h5, h6, .service-card__title, .service-card__text, .service-link__title, .service-link__text, .carousel-points > span"
    );

    targets.forEach((target) => {
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        const text = nodes.map((node) => node.nodeValue).join("");
        const spaces = Array.from(
            text.matchAll(/(?<![\p{L}\p{N}_])([aiouwz])([ \t\r\n]+)(?=\S)/giu),
            (match) => ({ start: match.index + 1, end: match.index + match[0].length })
        );
        if (!spaces.length) return;

        // Map text offsets back to nodes to preserve inline formatting, including <strong>.
        let offset = 0;
        nodes.forEach((node) => {
            const original = node.nodeValue;
            const nodeEnd = offset + original.length;
            let cursor = 0;
            let value = "";

            spaces.forEach((space) => {
                if (space.end <= offset || space.start >= nodeEnd) return;
                const start = Math.max(0, space.start - offset);
                const end = Math.min(original.length, space.end - offset);
                value += original.slice(cursor, start);
                if (space.start >= offset) value += "\u00A0";
                cursor = end;
            });

            node.nodeValue = value + original.slice(cursor);
            offset = nodeEnd;
        });
    });

    root.querySelectorAll("template").forEach((template) => applyTypography(template.content));
}

window.__applyTypography = applyTypography;

async function initLayout() {
    await loadPartials();
    updateCurrentYear();
    await initNavigation();
}

(async function boot() {
    const results = await Promise.allSettled([
        initLayout(),
        initCarouselIfNeeded(),
        Promise.resolve().then(() => applyTypography()),
    ]);

    results.forEach((result) => {
        if (result.status === "rejected") console.error(result.reason);
    });
})();
