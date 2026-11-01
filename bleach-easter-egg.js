/* ===================================================
   SLEDGE CLASSROOM — Anime character companions
   Single controller for the decorative character pop-ups.
   - One character on screen at a time
   - Randomised cooldown based on the visitor's preference
   - Pauses when the tab is hidden, Quiet Mode is on, or motion is reduced
   - Never blocks content: pointer-events only on the character itself
   =================================================== */
(function BleachEasterEgg() {
    'use strict';

    var CONFIG = {
        initialDelay: 1800,
        charSize: 92,
        charSizeMobile: 68,
        stayDuration: 3600,
        zIndex: 1500
    };

    // Cadence presets share the same assets as the rest of the site.
    var FREQUENCY = {
        rare: { delay: 65000, jitter: 26000, first: 6000 },
        normal: { delay: 26000, jitter: 14000, first: 1800 },
        frequent: { delay: 12000, jitter: 7000, first: 900 }
    };

    var CHARACTERS = [
        {
            id: 'orihime',
            name: 'Orihime',
            src: 'orihime.webp',
            fallbackSrc: 'orihime.gif',
            theme: {
                bg: 'linear-gradient(135deg,#fff0f6 0%,#ffe4f0 100%)',
                border: '#f472b6',
                text: '#9d174d'
            },
            dialogues: [
                'KAWAIII~! \u2665',
                'Hewwooo! \u2728',
                'Ehehe~ \uD83D\uDC97',
                'Haiii! \u2665',
                'Ganbatte! \u2728'
            ]
        },
        {
            id: 'ichigo',
            name: 'Ichigo',
            src: 'ichigo.gif',
            fallbackSrc: 'ichigo.gif',
            theme: {
                bg: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)',
                border: '#fb923c',
                text: '#7c2d12'
            },
            dialogues: [
                'Heh, studying? \uD83D\uDC4A',
                'BANKAI!! \u26A1',
                'Not bad! \uD83D\uDE01',
                'Keep it up! \uD83D\uDD25',
                'Oi, focus! \uD83D\uDC4B'
            ]
        },
        {
            id: 'miku',
            name: 'Miku',
            src: 'miku.gif',
            fallbackSrc: 'miku.gif',
            theme: {
                bg: 'linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%)',
                border: '#2dd4bf',
                text: '#134e4a'
            },
            dialogues: [
                'Miku Miku~! \u2665',
                'Let\u2019s study! \uD83C\uDFB5',
                'Ganbare ne~! \u2728',
                'Hatsune Miku desu! \uD83C\uDFB6',
                'Yay yay~! \uD83D\uDC97'
            ]
        },
        {
            id: 'soifon',
            name: 'Soifon',
            src: 'soifon.jpg',
            fallbackSrc: 'soifon.jpg',
            theme: {
                bg: 'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)',
                border: '#8b5cf6',
                text: '#4c1d95'
            },
            dialogues: [
                'Suzumebachi! \uD83D\uDC1D',
                'Silence. Focus. \uD83E\uDD77',
                'Your speed is lacking.',
                'Two strikes. That is all.',
                'Flash step! \u26A1'
            ]
        },
        {
            id: 'rangiku',
            name: 'Rangiku',
            src: 'rangiku.jpg',
            fallbackSrc: 'rangiku.jpg',
            theme: {
                bg: 'linear-gradient(135deg,#fefce8 0%,#fef9c3 100%)',
                border: '#eab308',
                text: '#713f12'
            },
            dialogues: [
                'Hado #31: Shakkaho! \uD83D\uDD25',
                'Take a break, okay? \uD83C\uDF7A',
                'Haineko, scatter! \u2728',
                'You work too hard.',
                'Growl, Haineko! \uD83D\uDC31'
            ]
        }
    ];

    var container = null;
    var nextSide = 'left';
    var charIndex = 0;
    var isAnimating = false;
    var currentWrap = null;
    var timer = null;
    var hideTimer = null;
    var enabled = localStorage.getItem('character_popups') !== 'false';
    var frequency = readFrequency();

    function readFrequency() {
        var stored = localStorage.getItem('sledge_character_freq');
        return Object.prototype.hasOwnProperty.call(FREQUENCY, stored) ? stored : 'normal';
    }

    function reducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function animationOff() {
        return document.documentElement.getAttribute('data-animation') === 'off';
    }

    function quietMode() {
        return document.body.classList.contains('quiet-mode');
    }

    function hiddenTab() {
        return document.hidden;
    }

    function isAllowed() {
        return enabled
            && !reducedMotion()
            && !animationOff()
            && !quietMode()
            && !hiddenTab();
    }

    function getSize() {
        return window.innerWidth <= 640 ? CONFIG.charSizeMobile : CONFIG.charSize;
    }

    function injectStyles() {
        if (document.getElementById('bee-styles')) return;
        var style = document.createElement('style');
        style.id = 'bee-styles';
        style.textContent = [
            '#bee-container{position:fixed;inset:0;pointer-events:none;z-index:' + CONFIG.zIndex + ';overflow:hidden}',
            '.bee-wrap{position:fixed;pointer-events:auto;cursor:pointer;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.22);',
            'transition:transform .42s cubic-bezier(.34,1.35,.64,1),opacity .3s ease;will-change:transform,opacity}',
            '.bee-wrap:focus-visible{outline:2px solid var(--accent-color,#3b82f6);outline-offset:4px;border-radius:14px}',
            '.bee-left{transform:translateX(-110%);opacity:0}',
            '.bee-left.bee-active{transform:translateX(0);opacity:1}',
            '.bee-right{transform:translateX(110%);opacity:0}',
            '.bee-right.bee-active{transform:translateX(0);opacity:1}',
            '.bee-img{display:block;object-fit:cover;object-position:top center;pointer-events:none;border-radius:14px;',
            'user-select:none;-webkit-user-drag:none;background:transparent}',
            '.bee-bubble{position:absolute;bottom:calc(100% + 8px);padding:6px 12px;border-radius:12px;border:2px solid;',
            'font-family:var(--ui-font,Inter,system-ui,sans-serif);font-size:11px;font-weight:700;line-height:1.25;',
            'max-width:210px;box-shadow:0 6px 18px rgba(0,0,0,.18);opacity:0;transform:scale(.6) translateY(6px);',
            'transition:opacity .25s ease,transform .25s cubic-bezier(.34,1.56,.64,1);pointer-events:none}',
            '.bee-bubble-left{left:2px}',
            '.bee-bubble-right{right:2px}',
            '.bee-bubble.bee-show{opacity:1;transform:scale(1) translateY(0)}',
            '@media (prefers-reduced-motion:reduce){.bee-wrap{transition:none}.bee-bubble{transition:none}}'
        ].join('');
        document.head.appendChild(style);
    }

    function ensureContainer() {
        if (container && container.isConnected) return container;
        container = document.createElement('div');
        container.id = 'bee-container';
        container.setAttribute('aria-hidden', 'true');
        (document.body || document.documentElement).appendChild(container);
        return container;
    }

    function clearTimers() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }

    function schedule(delay) {
        clearTimers();
        if (!isAllowed()) return;
        var preset = FREQUENCY[frequency] || FREQUENCY.normal;
        var next = typeof delay === 'number' ? delay : preset.delay + Math.random() * preset.jitter;
        timer = setTimeout(function () {
            timer = null;
            showCharacter();
        }, next);
    }

    function dismiss(character) {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        var wrap = character || currentWrap;
        if (!wrap) return;
        var bubble = wrap.querySelector('.bee-bubble');
        if (bubble) bubble.classList.remove('bee-show');
        wrap.classList.remove('bee-active');
        setTimeout(function () {
            if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
            if (currentWrap === wrap) currentWrap = null;
            isAnimating = false;
        }, 420);
    }

    function showCharacter() {
        if (!isAllowed() || isAnimating) return;

        var char = CHARACTERS[charIndex % CHARACTERS.length];
        charIndex++;
        isAnimating = true;

        var side = nextSide;
        nextSide = nextSide === 'left' ? 'right' : 'left';

        var wrap = document.createElement('div');
        wrap.className = 'bee-wrap ' + (side === 'left' ? 'bee-left' : 'bee-right');
        wrap.title = char.name + ' says hello';
        wrap.style.zIndex = String(CONFIG.zIndex);

        var size = getSize();
        var viewportHeight = window.innerHeight;
        var top = Math.round(viewportHeight * (0.36 + Math.random() * 0.22));
        var maxTop = Math.max(90, viewportHeight - size - 96);
        wrap.style.top = Math.max(96, Math.min(maxTop, top)) + 'px';

        var img = document.createElement('img');
        img.className = 'bee-img';
        img.src = char.src;
        img.alt = char.name;
        img.width = size;
        img.height = size;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.width = size + 'px';
        img.style.height = size + 'px';
        img.addEventListener('error', function () {
            if (char.fallbackSrc && img.src.indexOf(char.fallbackSrc) === -1) {
                img.src = char.fallbackSrc;
            }
        });

        var bubble = document.createElement('div');
        bubble.className = 'bee-bubble ' + (side === 'left' ? 'bee-bubble-left' : 'bee-bubble-right');
        bubble.style.background = char.theme.bg;
        bubble.style.borderColor = char.theme.border;
        bubble.style.color = char.theme.text;
        bubble.textContent = char.dialogues[Math.floor(Math.random() * char.dialogues.length)];

        wrap.appendChild(bubble);
        wrap.appendChild(img);
        ensureContainer().appendChild(wrap);
        currentWrap = wrap;

        // A gentle "hello" reaction keeps the interaction discoverable.
        wrap.addEventListener('click', function () {
            if (!isAllowed()) { dismiss(wrap); return; }
            bubble.textContent = char.dialogues[Math.floor(Math.random() * char.dialogues.length)];
            bubble.classList.add('bee-show');
            wrap.style.transform = side === 'left' ? 'translateX(14%)' : 'translateX(-14%)';
            setTimeout(function () {
                if (wrap.isConnected) wrap.style.transform = '';
            }, 220);
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(function () { dismiss(wrap); }, 1400);
        });

        requestAnimationFrame(function () {
            wrap.classList.add('bee-active');
            setTimeout(function () {
                if (wrap.isConnected) bubble.classList.add('bee-show');
            }, 240);
        });

        hideTimer = setTimeout(function () {
            dismiss(wrap);
        }, CONFIG.stayDuration);
    }

    function handleVisibility() {
        if (document.hidden) {
            clearTimers();
            dismiss();
        } else if (isAllowed()) {
            schedule();
        }
    }

    // Public API used by the floating dock and the customization panel.
    window.__bleachCharacters = {
        setEnabled: function (value) {
            enabled = !!value;
            if (!enabled) {
                clearTimers();
                dismiss();
            } else if (isAllowed() && FREQUENCY[frequency]) {
                schedule(FREQUENCY[frequency].first);
            }
        },
        setFrequency: function (value) {
            frequency = Object.prototype.hasOwnProperty.call(FREQUENCY, value) ? value : 'normal';
            if (frequency === 'off') {
                clearTimers();
                dismiss();
                return;
            }
            schedule(FREQUENCY[frequency].first);
        },
        isEnabled: function () {
            return enabled;
        },
        getFrequency: function () {
            return frequency;
        },
        showNow: function () {
            if (!isAllowed()) return;
            showCharacter();
        }
    };

    window.triggerBleachEasterEgg = function () {
        if (window.__bleachCharacters) window.__bleachCharacters.showNow();
    };

    function gridSafePosition() {
        // Keep at least one viewport-safe margin and never overlap the dock's
        // bottom-right corner. Characters live in the middle band only.
        return Math.min(
            window.innerHeight - getSize() - 90,
            Math.max(96, window.innerHeight * 0.42)
        );
    }

    function init() {
        injectStyles();
        ensureContainer();
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('resize', function () {
            if (currentWrap) {
                currentWrap.style.top = gridSafePosition() + 'px';
            }
        }, { passive: true });
        document.addEventListener('sledge:settingschanged', function () {
            var freq = readFrequency();
            if (freq !== frequency) {
                frequency = freq;
                if (FREQUENCY[frequency]) schedule(FREQUENCY[frequency].first);
                else { clearTimers(); dismiss(); }
            }
        });
        if (isAllowed()) schedule(FREQUENCY[frequency].first);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
