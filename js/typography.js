function initTypography() {
    const targets = document.querySelectorAll(
        "main p, main li, main .service-card__text, main .service-link__text"
    );

    targets.forEach((target) => {
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        const nodes = [];

        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }

        nodes.forEach((node) => {
            node.nodeValue = node.nodeValue.replace(/\b([AaIiOoUuWwZz])\s+/g, "$1\u00A0");
        });
    });
}

window.__initTypography = initTypography;
