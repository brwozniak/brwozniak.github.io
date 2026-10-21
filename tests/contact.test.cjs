const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/contact.js'), 'utf8');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const success = () => ({ ok: true, status: 200, json: async () => ({ success: true }) });
const unavailableMessage = 'Formularz jest chwilowo niedostępny. Prosimy o kontakt e-mailem lub telefonicznie.';

function fixture(options = {}) {
    const ids = new Map();
    const calls = [];
    const scripts = [];
    const timers = new Map();
    let timerId = 0;
    let focused = null;
    let widgetOptions = null;
    let resetCount = 0;
    let captchaResets = 0;

    function element(id = '') {
        const classes = new Set();
        const attrs = new Map();
        const listeners = new Map();
        const el = {
            id, hidden: false, disabled: false, textContent: '', dataset: {},
            classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name) },
            setAttribute: (name, value) => attrs.set(name, value),
            getAttribute: name => attrs.get(name) ?? null,
            addEventListener: (name, callback) => listeners.set(name, callback),
            emit: (name, event) => listeners.get(name)?.(event),
            closest: () => null,
            querySelector: () => null,
            focus: () => { focused = id; },
        };
        if (id) ids.set(id, el);
        return el;
    }

    const fields = element('contactFields');
    fields.disabled = true;
    const status = element('formStatus');
    const fallback = element('formFallback');
    const captcha = element('contactCaptcha');
    const captchaStatus = element('captchaStatus');
    const submit = element('submit');
    const consentWrapper = element('consent-wrapper');
    const controls = {};
    function control(name, type, value = '', inFieldset = true) {
        const field = element(name);
        Object.assign(field, { name, type, value, inFieldset, checked: false, maxLength: -1, validity: { typeMismatch: false } });
        controls[name] = field;
        return field;
    }
    control('access_key', 'hidden', options.accessKey ?? 'form-public-key', false);
    control('subject', 'hidden', 'Contact from website', false);
    control('from_name', 'hidden', 'Law firm website', false);
    control('botcheck', 'checkbox', 'on', false);
    control('name', 'text').maxLength = 120;
    control('email', 'email').maxLength = 254;
    control('message', 'textarea').maxLength = 6000;
    control('consent', 'checkbox', 'accepted').closest = () => consentWrapper;
    for (const name of ['name', 'email', 'message', 'consent']) element(`${name}-error`).hidden = true;

    const form = element('contactForm');
    form.action = 'https://api.web3forms.com/submit';
    form.elements = { namedItem: name => controls[name] };
    form.querySelector = () => submit;
    form.reset = () => {
        resetCount++;
        for (const name of ['name', 'email', 'message']) controls[name].value = '';
        controls.consent.checked = false;
        controls.botcheck.checked = false;
    };
    const documentEvents = new Map();
    const document = {
        readyState: options.readyState || 'complete',
        getElementById: id => options.noForm && id === 'contactForm' ? null : ids.get(id),
        createElement: () => element(),
        addEventListener: (name, callback) => documentEvents.set(name, callback),
        head: { appendChild: script => scripts.push(script) },
    };
    const window = {
        hcaptcha: {
            render: (container, config) => { widgetOptions = config; return 1; },
            reset: () => { captchaResets++; },
        },
    };
    class MockFormData extends Map {
        constructor() {
            super();
            for (const field of Object.values(controls)) {
                if (field.inFieldset && fields.disabled) continue;
                if (field.type === 'checkbox' && !field.checked) continue;
                this.set(field.name, field.value);
            }
        }
    }
    vm.runInNewContext(source, {
        document, window, FormData: MockFormData, AbortController,
        fetch: (url, request) => {
            calls.push({ url, request });
            return options.fetch ? options.fetch(url, request) : Promise.resolve(success());
        },
        setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
        clearTimeout: id => timers.delete(id),
    });

    return {
        ids, controls, calls, scripts, fields, status, fallback, captchaStatus, submit,
        get focused() { return focused; },
        get resetCount() { return resetCount; },
        get captchaResets() { return captchaResets; },
        get widgetOptions() { return widgetOptions; },
        loadCaptcha: () => window.onContactCaptchaLoad(),
        solve: () => widgetOptions.callback('verified-token'),
        expire: () => widgetOptions['expired-callback'](),
        captchaError: () => widgetOptions['error-callback'](),
        ready: () => documentEvents.get('DOMContentLoaded')(),
        runTimers: () => [...timers.values()].forEach(callback => callback()),
        send: () => form.emit('submit', { preventDefault() {} }),
        fill() {
            controls.name.value = ' Jan Kowalski ';
            controls.email.value = ' jan@example.com ';
            controls.message.value = ' Prosze o kontakt. ';
            controls.consent.checked = true;
        },
    };
}

test('placeholder and empty key block all outbound requests', async () => {
    for (const accessKey of ['YOUR_WEB3FORMS_ACCESS_KEY', 'YOUR_ACCESS_KEY_HERE', '', '   ']) {
        const f = fixture({ accessKey });
        assert.equal(f.fields.disabled, true);
        assert.equal(f.submit.disabled, true);
        assert.equal(f.scripts.length, 0);
        f.fill();
        await f.send();
        assert.equal(f.calls.length, 0);
        assert.equal(f.status.dataset.state, 'notice');
        assert.equal(f.fallback.hidden, false);
        assert.equal(f.resetCount, 0);
    }
});

test('configured form waits for captcha and uses compact Polish widget', () => {
    const f = fixture();
    assert.equal(f.fields.disabled, false);
    assert.equal(f.submit.disabled, true);
    assert.equal(f.scripts.length, 1);
    assert.equal(f.fallback.hidden, true);
    assert.ok(f.scripts[0].src.startsWith('https://js.hcaptcha.com/1/api.js?'));
    f.loadCaptcha();
    assert.equal(f.submit.disabled, false);
    assert.equal(f.widgetOptions.size, 'compact');
    assert.equal(f.widgetOptions.hl, 'pl');
});

test('empty fields show inline errors and focus the first field', async () => {
    const f = fixture();
    f.loadCaptcha();
    f.solve();
    await f.send();
    assert.equal(f.calls.length, 0);
    assert.equal(f.focused, 'name');
    for (const name of ['name', 'email', 'message', 'consent']) {
        assert.equal(f.ids.get(`${name}-error`).hidden, false);
        assert.equal(f.controls[name].getAttribute('aria-invalid'), 'true');
    }
});

test('email, consent and field length are validated', async () => {
    for (const [field, change] of [
        ['email', f => { f.controls.email.validity.typeMismatch = true; }],
        ['consent', f => { f.controls.consent.checked = false; }],
        ['message', f => { f.controls.message.value = 'x'.repeat(6001); }],
    ]) {
        const f = fixture();
        f.fill(); f.loadCaptcha(); f.solve(); change(f);
        await f.send();
        assert.equal(f.calls.length, 0);
        assert.equal(f.focused, field);
    }
});

test('field feedback clears when corrected', async () => {
    const f = fixture();
    f.loadCaptcha(); await f.send();
    f.controls.name.value = 'Jan';
    f.controls.name.emit('input');
    assert.equal(f.ids.get('name-error').hidden, true);
    assert.equal(f.controls.name.getAttribute('aria-invalid'), 'false');
});

test('missing, expired and failed captcha never reach the API', async () => {
    for (const invalidate of [() => {}, f => { f.solve(); f.expire(); }, f => { f.solve(); f.captchaError(); }]) {
        const f = fixture();
        f.fill(); f.loadCaptcha(); invalidate(f);
        await f.send();
        assert.equal(f.calls.length, 0);
        assert.equal(f.captchaStatus.hidden, false);
    }
});

test('honeypot blocks even otherwise valid submissions', async () => {
    const f = fixture();
    f.fill(); f.loadCaptcha(); f.solve();
    f.controls.botcheck.checked = true;
    await f.send();
    assert.equal(f.calls.length, 0);
    assert.equal(f.status.dataset.state, 'error');
});

test('success submits all fields before disabling them and resets only on confirmation', async () => {
    const f = fixture();
    f.fill(); f.loadCaptcha(); f.solve();
    await f.send();
    assert.equal(f.calls.length, 1);
    const { url, request } = f.calls[0];
    assert.equal(url, 'https://api.web3forms.com/submit');
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.Accept, 'application/json');
    assert.equal(request.body.get('access_key'), 'form-public-key');
    assert.equal(request.body.get('subject'), 'Contact from website');
    assert.equal(request.body.get('from_name'), 'Law firm website');
    assert.equal(request.body.get('name'), 'Jan Kowalski');
    assert.equal(request.body.get('email'), 'jan@example.com');
    assert.equal(request.body.get('message'), 'Prosze o kontakt.');
    assert.equal(request.body.get('consent'), 'accepted');
    assert.equal(request.body.get('h-captcha-response'), 'verified-token');
    assert.equal(request.body.has('botcheck'), false);
    assert.equal(f.status.dataset.state, 'success');
    assert.equal(f.fallback.hidden, true);
    assert.equal(f.resetCount, 1);
    assert.equal(f.captchaResets, 1);
    assert.equal(f.fields.disabled, false);
    assert.equal(f.focused, 'formStatus');
    assert.equal(f.controls.message.value, '');
});

test('double submit is blocked while the first request is pending', async () => {
    let resolve;
    const f = fixture({ fetch: () => new Promise(done => { resolve = done; }) });
    f.fill(); f.loadCaptcha(); f.solve();
    const pending = f.send();
    assert.equal(f.fields.disabled, true);
    assert.equal(f.submit.disabled, true);
    await f.send();
    assert.equal(f.calls.length, 1);
    resolve(success());
    await pending;
    assert.equal(f.fields.disabled, false);
});

test('HTTP failure or success:false preserves the message and never confirms delivery', async () => {
    for (const response of [
        { ok: true, status: 200, json: async () => ({ success: false }) },
        { ok: false, status: 400, json: async () => ({ success: true }) },
    ]) {
        const f = fixture({ fetch: async () => response });
        f.fill(); f.loadCaptcha(); f.solve();
        await f.send();
        assert.equal(f.status.dataset.state, 'error');
        assert.equal(f.resetCount, 0);
        assert.equal(f.controls.message.value, ' Prosze o kontakt. ');
        assert.equal(f.captchaResets, 1);
        assert.equal(f.submit.disabled, false);
        await f.send();
        assert.equal(f.calls.length, 1, 'a fresh captcha must be solved before retrying');
    }
});

test('network failure and invalid JSON do not clear fields', async () => {
    for (const fetch of [
        async () => { throw new Error('offline'); },
        async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('invalid'); } }),
    ]) {
        const f = fixture({ fetch });
        f.fill(); f.loadCaptcha(); f.solve(); await f.send();
        assert.equal(f.status.dataset.state, 'error');
        assert.equal(f.resetCount, 0);
        assert.equal(f.fields.disabled, false);
        assert.equal(f.fallback.hidden, false);
        assert.equal(f.status.textContent, unavailableMessage);
    }
});

test('temporary rate limits show only generic unavailability, even without JSON', async () => {
    for (const response of [
        { ok: false, status: 429 },
        { ok: false, status: 429, json: async () => { throw new SyntaxError('HTML response'); } },
        { ok: false, status: 429, json: async () => ({ success: false, message: 'Too many requests' }) },
    ]) {
        const f = fixture({ fetch: async () => response });
        f.fill(); f.loadCaptcha(); f.solve(); await f.send();
        assert.equal(f.status.dataset.state, 'error');
        assert.equal(f.status.textContent, unavailableMessage);
        assert.equal(f.fallback.hidden, false);
        assert.equal(f.resetCount, 0);
        assert.equal(f.fields.disabled, false);
    }
});

test('monthly quota details stay hidden from visitors and all fields are preserved', async () => {
    // Representative responses, not a provider-documented error schema.
    for (const status of [200, 400, 403, 429]) {
        const f = fixture({ fetch: async () => ({
            ok: status === 200, status,
            json: async () => ({ success: false, message: 'Monthly submission limit exceeded' }),
        }) });
        f.fill(); f.loadCaptcha(); f.solve(); await f.send();
        assert.equal(f.status.dataset.state, 'error');
        assert.equal(f.status.textContent, unavailableMessage);
        assert.equal(f.fallback.hidden, false);
        assert.equal(f.focused, 'formStatus');
        assert.equal(f.controls.name.value, ' Jan Kowalski ');
        assert.equal(f.controls.email.value, ' jan@example.com ');
        assert.equal(f.controls.message.value, ' Prosze o kontakt. ');
        assert.equal(f.controls.consent.checked, true);
        assert.equal(f.resetCount, 0);
        assert.equal(f.fields.disabled, false);
        assert.equal(f.captchaResets, 1);
    }
});

test('unknown API failures use the same generic unavailability message', async () => {
    for (const response of [
        { ok: false, status: 503, json: async () => { throw new SyntaxError('HTML response'); } },
        { ok: false, status: 403, json: async () => null },
        { ok: false, status: 400, json: async () => ({ message: { reason: 'Invalid input' } }) },
        { ok: true, status: 200, json: async () => ({ success: false }) },
        { ok: false, status: 400, json: async () => ({ success: false, message: 'Monthly quota remaining: 200. Invalid email address.' }) },
    ]) {
        const f = fixture({ fetch: async () => response });
        f.fill(); f.loadCaptcha(); f.solve(); await f.send();
        assert.equal(f.status.textContent, unavailableMessage);
        assert.equal(f.fallback.hidden, false);
        assert.equal(f.resetCount, 0);
        assert.equal(f.controls.message.value, ' Prosze o kontakt. ');
    }
});

test('retry can succeed after a limit error and clears the unavailable state', async () => {
    let attempts = 0;
    const f = fixture({ fetch: async () => ++attempts === 1 ? {
        ok: false, status: 403,
        json: async () => ({ success: false, message: 'Monthly quota exhausted' }),
    } : success() });
    f.fill(); f.loadCaptcha(); f.solve(); await f.send();
    assert.equal(f.fallback.hidden, false);
    await f.send();
    assert.equal(f.calls.length, 1, 'retry still requires a fresh captcha');
    f.solve(); await f.send();
    assert.equal(f.calls.length, 2);
    assert.equal(f.status.dataset.state, 'success');
    assert.equal(f.fallback.hidden, true);
    assert.equal(f.resetCount, 1);
});

test('successful submissions never display quota errors from incidental response text', async () => {
    const f = fixture({ fetch: async () => ({
        ok: true, status: 200,
        json: async () => ({ success: true, message: 'Monthly quota remaining: 200' }),
    }) });
    f.fill(); f.loadCaptcha(); f.solve(); await f.send();
    assert.equal(f.status.dataset.state, 'success');
    assert.equal(f.fallback.hidden, true);
    assert.equal(f.resetCount, 1);
});

test('request timeout aborts, unlocks the form and preserves the message', async () => {
    const f = fixture({ fetch: (url, request) => new Promise((resolve, reject) => {
        request.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }) });
    f.fill(); f.loadCaptcha(); f.solve();
    const pending = f.send();
    f.runTimers();
    await pending;
    assert.equal(f.calls[0].request.signal.aborted, true);
    assert.equal(f.status.dataset.state, 'error');
    assert.equal(f.resetCount, 0);
    assert.equal(f.fields.disabled, false);
});

test('captcha network error and load timeout keep sending disabled', () => {
    for (const fail of [f => f.scripts[0].onerror(), f => f.runTimers()]) {
        const f = fixture();
        fail(f);
        assert.equal(f.submit.disabled, true);
        assert.equal(f.captchaStatus.hidden, false);
        assert.equal(f.calls.length, 0);
    }
});

test('script supports deferred DOM readiness and pages without the form', () => {
    const f = fixture({ readyState: 'loading' });
    assert.equal(f.scripts.length, 0);
    f.ready();
    assert.equal(f.scripts.length, 1);
    assert.equal(fixture({ noForm: true }).scripts.length, 0);
});

(async () => {
    for (const { name, run } of tests) {
        await run();
        console.log(`PASS ${name}`);
    }
    console.log(`${tests.length} contact form checks passed; no network requests were sent.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
