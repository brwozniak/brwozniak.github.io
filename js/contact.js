const CONTACT_FORM_ID = "contactForm";
const CONSENT_ID = "consent";
const ERROR_CLASS = "is-error";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(field, hasError) {
    field.classList.toggle(ERROR_CLASS, hasError);
}

function isFilled(field) {
    return field.value.trim().length > 0;
}

function validateRequiredFields(fields) {
    let isValid = true;

    fields.forEach((field) => {
        const hasError = !isFilled(field);
        setFieldError(field, hasError);

        if (hasError) {
            isValid = false;
        }
    });

    return isValid;
}

function validateEmail(emailField) {
    const hasError = !EMAIL_PATTERN.test(emailField.value.trim());
    setFieldError(emailField, hasError);

    return !hasError;
}

function validateConsent(consentField) {
    const consentWrapper = consentField.closest(".form__consent");
    const hasError = !consentField.checked;

    consentWrapper?.classList.toggle(ERROR_CLASS, hasError);

    return !hasError;
}

function getFormFields(form) {
    return {
        consent: document.getElementById(CONSENT_ID),
        email: form.elements.namedItem("email"),
        message: form.elements.namedItem("message"),
        name: form.elements.namedItem("name"),
    };
}

function validateForm(form) {
    const { consent, email, message, name } = getFormFields(form);
    const requiredFields = [name, email, message].filter(Boolean);

    if (requiredFields.length < 3 || !email) return false;

    const hasRequiredFields = validateRequiredFields(requiredFields);
    const hasValidEmail = validateEmail(email);
    const hasConsent = consent ? validateConsent(consent) : true;

    return hasRequiredFields && hasValidEmail && hasConsent;
}

async function submitForm(form) {
    const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: {
            Accept: "application/json",
        },
    });

    return response.ok;
}

function initContactForm() {
    const form = document.getElementById(CONTACT_FORM_ID);

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateForm(form)) return;

        const isSubmitted = await submitForm(form).catch(() => false);

        if (isSubmitted) {
            form.reset();
            alert("Wiadomość została wysłana. Skontaktuję się z Tobą wkrótce.");
            return;
        }

        alert("Błąd wysyłki. Spróbuj ponownie później.");
    });
}

document.addEventListener("DOMContentLoaded", initContactForm);
