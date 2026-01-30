async function includePartials() {
    const nodes = document.querySelectorAll("[data-include]");
    const tasks = Array.from(nodes).map(async (node) => {
      const path = node.getAttribute("data-include");
      if (!path) return;
  
      const res = await fetch(path, { cache: "no-cache" });
      if (!res.ok) {
        node.innerHTML = `<div style="padding:16px">Nie udało się wczytać: ${path}</div>`;
        return;
      }
      node.innerHTML = await res.text();
    });
  
    await Promise.all(tasks);
  }
  
  window.__includePartials = includePartials;
  