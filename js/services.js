function initServiceCards() {
    const cards = Array.from(document.querySelectorAll("[data-service-card]"));
    const modal = document.querySelector("[data-service-modal]");

    if (!cards.length || !modal) return;

    const dialog = modal.querySelector("[data-service-dialog]");
    const body = modal.querySelector("[data-service-modal-body]");
    const closeButtons = modal.querySelectorAll("[data-service-modal-close]");
    let lastTrigger = null;

    if (!dialog || !body) return;

    function closeModal() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.documentElement.classList.remove("is-modal-locked");

        if (lastTrigger) lastTrigger.focus();
    }

    function openModal(card) {
        const detail = card.parentElement?.querySelector("[data-service-detail]");
        if (!detail) return;

        lastTrigger = card;
        body.innerHTML = detail.innerHTML;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.documentElement.classList.add("is-modal-locked");
        dialog.focus();
    }

    cards.forEach((card) => {
        card.addEventListener("click", () => openModal(card));
    });

    closeButtons.forEach((button) => {
        button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("is-open")) {
            closeModal();
        }
    });
}

document.addEventListener("DOMContentLoaded", initServiceCards);
