const NAV_OPEN_CLASS = "is-open";

function setExpanded(element, isExpanded) {
    element.setAttribute("aria-expanded", String(isExpanded));
}

function initMobileNav() {
    const nav = document.querySelector("[data-nav]");
    const toggle = document.querySelector("[data-nav-toggle]");

    if (!nav || !toggle) return;

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle(NAV_OPEN_CLASS);
        setExpanded(toggle, isOpen);
    });
}

function initDropdown() {
    const dropdown = document.querySelector("[data-dropdown]");

    if (!dropdown) return;

    const button = dropdown.querySelector("[data-dropdown-toggle]");
    const menu = dropdown.querySelector("[data-dropdown-menu]");

    if (!button || !menu) return;

    const closeDropdown = () => {
        menu.classList.remove(NAV_OPEN_CLASS);
        setExpanded(button, false);
    };

    const openDropdown = () => {
        menu.classList.add(NAV_OPEN_CLASS);
        setExpanded(button, true);
    };

    button.addEventListener("click", (event) => {
        event.stopPropagation();

        const isOpen = menu.classList.contains(NAV_OPEN_CLASS);
        isOpen ? closeDropdown() : openDropdown();
    });

    document.addEventListener("click", (event) => {
        if (!dropdown.contains(event.target)) closeDropdown();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeDropdown();
    });
}

function initNav() {
    initMobileNav();
    initDropdown();
}

window.__initNav = initNav;
