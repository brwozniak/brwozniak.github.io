document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        let valid = true;

        const name = form.name;
        const email = form.email;
        const message = form.message;
        const consent = document.getElementById("consent");

        [name, email, message].forEach((field) => {
            field.classList.remove("is-error");
            if (!field.value.trim()) {
                field.classList.add("is-error");
                valid = false;
            }
        });

        if (!emailRegex.test(email.value)) {
            email.classList.add("is-error");
            valid = false;
        }

        const consentWrap = consent.closest(".form__consent");

        if (!consent.checked) {
            consentWrap.classList.add("is-error");
            valid = false;
        } else {
            consentWrap.classList.remove("is-error");
        }

        if (!valid) return;

        const response = await fetch(form.action, {
            method: "POST",
            body: new FormData(form),
            headers: { Accept: "application/json" },
        });

        if (response.ok) {
            form.reset();
            alert("Wiadomość została wysłana.");
        } else {
            alert("Wystąpił błąd. Spróbuj ponownie później.");
        }
    });
});
