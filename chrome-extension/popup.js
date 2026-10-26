// ===================================================
// Sledge Now Playing — Popup Script
// ===================================================
(async function PopupScript() {
    'use strict';

    const $ = id => document.getElementById(id);

    // ── Elements ──────────────────────────────────────
    const toggleEl      = $('toggle-enabled');
    const signInForm    = $('sign-in-form');
    const signedInView  = $('signed-in-view');
    const emailInput    = $('email-input');
    const passwordInput = $('password-input');
    const dbUrlInput    = $('dburl-input');
    const saveBtn       = $('save-btn');
    const signOutBtn    = $('sign-out-btn');
    const authMsg       = $('auth-msg');
    const signedEmail   = $('signed-in-email');
    const statusBadge   = $('status-badge');
    const statusText    = $('status-text');
    const npInfo        = $('np-info');
    const npTitle       = $('np-title');
    const npArtist      = $('np-artist');

    // ── Load stored state ─────────────────────────────
    const stored = await chrome.storage.local.get(['np_email', 'np_enabled', 'np_database_url']);
    const hasEmail = !!stored.np_email;
    const isEnabled = stored.np_enabled !== false;

    if (stored.np_database_url) {
        dbUrlInput.value = stored.np_database_url;
    }

    toggleEl.checked = isEnabled;
    if (hasEmail) {
        signInForm.classList.add('hidden');
        signedInView.classList.remove('hidden');
        signedEmail.textContent = stored.np_email;
    }

    // ── Fetch current status from background ──────────
    async function refreshStatus() {
        try {
            const status = await chrome.runtime.sendMessage({ type: 'NP_GET_STATUS' });
            if (!status) return;

            if (!status.enabled) {
                statusBadge.className = 'status-badge off';
                statusText.textContent = 'Broadcasting disabled';
                npInfo.classList.add('hidden');
                return;
            }

            const state = status.state;
            if (!state) {
                statusBadge.className = 'status-badge paused';
                statusText.textContent = status.tabCount > 0
                    ? 'Monitoring ' + status.tabCount + ' tab(s) — not playing'
                    : 'No YouTube tabs detected';
                npInfo.classList.add('hidden');
                return;
            }

            if (state.isPlaying) {
                statusBadge.className = 'status-badge playing';
                statusText.textContent = 'Live on ' + (state.source === 'youtube-music' ? 'YouTube Music' : 'YouTube');
            } else {
                statusBadge.className = 'status-badge paused';
                statusText.textContent = 'Paused';
            }

            npTitle.textContent  = state.title  || '—';
            npArtist.textContent = state.artist || '—';
            npInfo.classList.remove('hidden');
        } catch (e) {
            // Background not ready
        }
    }

    refreshStatus();
    setInterval(refreshStatus, 2000);

    // ── Toggle broadcast ──────────────────────────────
    toggleEl.addEventListener('change', () => {
        chrome.runtime.sendMessage({ type: 'NP_SET_ENABLED', enabled: toggleEl.checked });
        chrome.storage.local.set({ np_enabled: toggleEl.checked });
        refreshStatus();
    });

    // ── Save credentials ──────────────────────────────
    function showMsg(text, type) {
        authMsg.textContent = text;
        authMsg.className = 'msg ' + type;
        authMsg.classList.remove('hidden');
    }

    saveBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const pass  = passwordInput.value;

        if (!email || !pass) {
            showMsg('Please enter both email and password.', 'error');
            return;
        }

        saveBtn.textContent = 'Verifying…';
        saveBtn.disabled = true;

        try {
            // Quick auth check via Firebase REST
            const resp = await fetch(
                'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDlQYkbyc-bHScppvr2GyYXQScHlHMXr0g',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: pass, returnSecureToken: true })
                }
            );
            const data = await resp.json();

            if (!resp.ok) {
                const code = data.error?.message || 'UNKNOWN';
                let msg = 'Sign-in failed.';
                if (code.includes('INVALID_PASSWORD') || code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
                    msg = 'Wrong email or password.';
                } else if (code.includes('TOO_MANY_ATTEMPTS')) {
                    msg = 'Too many attempts. Try again later.';
                }
                showMsg(msg, 'error');
                return;
            }

            // Credentials valid — store them
            const dbUrl = dbUrlInput.value.trim();
            const toSave = { np_email: email, np_password: pass };
            if (dbUrl) {
                toSave.np_database_url = dbUrl;
            }
            await chrome.storage.local.set(toSave);
            chrome.runtime.sendMessage({ type: 'NP_POPUP_SAVE_CREDS' });

            showMsg('✅ Connected!', 'success');
            setTimeout(() => {
                signInForm.classList.add('hidden');
                signedInView.classList.remove('hidden');
                signedEmail.textContent = email;
            }, 700);

        } catch (e) {
            showMsg('Network error. Check your internet connection.', 'error');
        } finally {
            saveBtn.textContent = 'Save & Connect';
            saveBtn.disabled = false;
        }
    });

    // ── Sign out ──────────────────────────────────────
    signOutBtn.addEventListener('click', async () => {
        await chrome.storage.local.remove(['np_email', 'np_password']);
        chrome.runtime.sendMessage({ type: 'NP_POPUP_SAVE_CREDS' }); // reset token
        signedInView.classList.add('hidden');
        signInForm.classList.remove('hidden');
        emailInput.value = '';
        passwordInput.value = '';
        authMsg.classList.add('hidden');
    });

    // ── Enter key on password field ───────────────────
    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });

})();
