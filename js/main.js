const SCRIPTS = {
    carousel: "/js/carousel.js?v=20260822-45",
    include: "/js/include.js?v=20260822-45",
    nav: "/js/nav.js?v=20260822-45",
};

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = src;
        script.onload = resolve;
        script.onerror = reject;

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

(async function boot() {
    await loadPartials();
    await initNavigation();

    updateCurrentYear();

    await initCarouselIfNeeded();
})();
