(() => {
    // Web3Forms' shared public hCaptcha sitekey for the free plan; this is not a secret.
    const CAPTCHA_SITEKEY = "50b2fe65-b00b-4b9e-ad62-3ba471098be2";
    const TIMEOUT_MS = 15000;
    const UNAVAILABLE_MESSAGE = "Formularz jest chwilowo niedostępny. Prosimy o kontakt e-mailem lub telefonicznie.";

    function initContactForm() {
        const form = document.getElementById("contactForm");
        if (!form) return;

        const fields = document.getElementById("contactFields");
        const status = document.getElementById("formStatus");
        const fallback = document.getElementById("formFallback");
        const captcha = document.getElementById("contactCaptcha");
        const captchaStatus = document.getElementById("captchaStatus");
        const submit = form.querySelector('button[type="submit"]');
        const controls = ["name", "email", "message", "consent"].map((name) => form.elements.namedItem(name));
        const accessKey = form.elements.namedItem("access_key").value.trim();
        const configured = Boolean(accessKey && !/^YOUR_/i.test(accessKey));
        let submitting = false;
        let captchaReady = false;
        let captchaToken = "";
        let widgetId = null;
        let captchaTimer = null;

        function showStatus(message, state = "error") {
            status.textContent = message;
            status.dataset.state = state;
            status.hidden = !message;
            fallback.hidden = !message || state === "success";
        }

        function showCaptchaStatus(message, state = "error") {
            captchaStatus.textContent = message;
            captchaStatus.dataset.state = state;
            captchaStatus.hidden = !message;
        }

        function updateSubmitState() {
            fields.disabled = !configured || submitting;
            submit.disabled = !configured || !captchaReady || submitting;
            submit.textContent = submitting ? "Wysyłanie…" : "Wyślij wiadomość";
            form.setAttribute("aria-busy", String(submitting));
        }

        function setFieldError(field, message) {
            const error = document.getElementById(`${field.id}-error`);
            error.textContent = message;
            error.hidden = !message;
            field.setAttribute("aria-invalid", String(Boolean(message)));
            field.classList.toggle("is-error", Boolean(message));
            field.closest(".form__consent")?.classList.toggle("is-error", Boolean(message));
        }

        function fieldError(field) {
            if (field.type === "checkbox") return field.checked ? "" : "Potwierdź zgodę na przetwarzanie danych.";
            if (!field.value.trim()) return "Uzupełnij to pole.";
            if (field.type === "email" && field.validity.typeMismatch) return "Podaj poprawny adres e-mail.";
            if (field.maxLength > 0 && field.value.length > field.maxLength) return "Wpisany tekst jest zbyt długi.";
            return "";
        }

        function validateFields() {
            let firstInvalid = null;
            controls.forEach((field) => {
                const message = fieldError(field);
                setFieldError(field, message);
                if (message && !firstInvalid) firstInvalid = field;
            });
            firstInvalid?.focus();
            return !firstInvalid;
        }

        controls.forEach((field) => {
            field.addEventListener(field.type === "checkbox" ? "change" : "input", () => {
                if (field.getAttribute("aria-invalid") === "true") setFieldError(field, fieldError(field));
            });
        });

        function resetCaptcha() {
            captchaToken = "";
            if (widgetId === null) return;
            try {
                window.hcaptcha.reset(widgetId);
            } catch {
                captchaReady = false;
                showCaptchaStatus("Weryfikacja antyspamowa jest niedostępna. Odśwież stronę lub skontaktuj się e-mailem.");
            }
        }

        function captchaFailed() {
            clearTimeout(captchaTimer);
            captchaReady = false;
            captchaToken = "";
            showCaptchaStatus("Nie udało się załadować weryfikacji antyspamowej. Odśwież stronę lub skontaktuj się e-mailem.");
            updateSubmitState();
        }

        window.onContactCaptchaLoad = () => {
            clearTimeout(captchaTimer);
            if (widgetId !== null) return;
            try {
                widgetId = window.hcaptcha.render(captcha, {
                    sitekey: CAPTCHA_SITEKEY,
                    hl: "pl",
                    size: "compact",
                    theme: "light",
                    callback: (token) => {
                        captchaToken = token;
                        showCaptchaStatus("");
                    },
                    "expired-callback": () => {
                        captchaToken = "";
                        showCaptchaStatus("Weryfikacja wygasła. Potwierdź ją ponownie.");
                    },
                    "error-callback": () => {
                        captchaToken = "";
                        showCaptchaStatus("Weryfikacja nie powiodła się. Spróbuj ponownie zaznaczyć pole hCaptcha.");
                    },
                });
                captchaReady = true;
                showCaptchaStatus("");
                updateSubmitState();
            } catch {
                captchaFailed();
            }
        };

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (submitting) return;
            if (!configured) {
                showStatus(UNAVAILABLE_MESSAGE, "notice");
                return;
            }
            if (form.elements.namedItem("botcheck").checked) {
                showStatus("Nie udało się wysłać wiadomości. Skontaktuj się z kancelarią e-mailem.");
                return;
            }
            showStatus("");
            if (!validateFields()) return;

            if (!captchaReady || !captchaToken) {
                showCaptchaStatus("Potwierdź weryfikację antyspamową przed wysłaniem wiadomości.");
                captcha.querySelector("iframe")?.focus();
                return;
            }

            // Read all fields before disabling the fieldset: disabled fields are excluded from FormData.
            const data = new FormData(form);
            data.set("access_key", accessKey);
            controls.filter((field) => field.type !== "checkbox").forEach((field) => data.set(field.name, field.value.trim()));
            data.set("h-captcha-response", captchaToken);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
            submitting = true;
            updateSubmitState();

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: data,
                    headers: { Accept: "application/json" },
                    signal: controller.signal,
                });
                let result = null;
                try {
                    result = await response.json();
                } catch {
                    // Rate limits and service outages can return HTML or an empty body.
                }
                if (!response.ok || result?.success !== true) {
                    showStatus(UNAVAILABLE_MESSAGE);
                    status.focus();
                    return;
                }
                form.reset();
                showStatus("Wiadomość została wysłana. Dziękujemy za kontakt.", "success");
                status.focus();
            } catch {
                showStatus(UNAVAILABLE_MESSAGE);
                status.focus();
            } finally {
                clearTimeout(timeout);
                resetCaptcha();
                submitting = false;
                updateSubmitState();
            }
        });

        updateSubmitState();
        if (!configured) {
            showStatus(UNAVAILABLE_MESSAGE, "notice");
            return;
        }

        showStatus("");
        captcha.hidden = false;
        showCaptchaStatus("Ładowanie weryfikacji antyspamowej…", "loading");
        const script = document.createElement("script");
        script.src = "https://js.hcaptcha.com/1/api.js?onload=onContactCaptchaLoad&render=explicit&hl=pl&recaptchacompat=off";
        script.async = true;
        script.defer = true;
        script.onerror = captchaFailed;
        captchaTimer = setTimeout(captchaFailed, TIMEOUT_MS);
        document.head.appendChild(script);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initContactForm);
    else initContactForm();
})();
