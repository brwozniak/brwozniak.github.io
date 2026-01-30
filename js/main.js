(async function boot() {
  
    async function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.defer = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
  
    await loadScript("js/include.js");
    await window.__includePartials();
  
    await loadScript("js/nav.js");
    window.__initNav?.();
  
    document.querySelectorAll("[data-year]").forEach(el => el.textContent = String(new Date().getFullYear()));
  
    if (document.querySelector("[data-carousel]")) {
      await loadScript("js/carousel.js");
      window.__initCarousel?.();
    }
  })();
  