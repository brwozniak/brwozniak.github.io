function initNav() {
    const nav = document.querySelector("[data-nav]");
    const toggle = document.querySelector("[data-nav-toggle]");
    if (!nav || !toggle) return;
  
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  
    const dropdownRoot = document.querySelector("[data-dropdown]");
    if (dropdownRoot) {
      const btn = dropdownRoot.querySelector("[data-dropdown-toggle]");
      const menu = dropdownRoot.querySelector("[data-dropdown-menu]");
      if (!btn || !menu) return;
  
      const close = () => {
        menu.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      };
  
      const open = () => {
        menu.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      };
  
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains("is-open");
        isOpen ? close() : open();
      });
  
      document.addEventListener("click", (e) => {
        if (!dropdownRoot.contains(e.target)) close();
      });
  
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
    }
  }
  window.__initNav = initNav;
  