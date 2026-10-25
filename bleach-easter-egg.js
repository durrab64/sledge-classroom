/* ===================================================
   SLEDGE CLASSROOM — Bleach Character Easter Egg
   Characters: Orihime, Soi Fon, Rangiku
   =================================================== */

(function BleachEasterEgg() {
    'use strict';

    // ─── Configuration ────────────────────────────────────────────────────────
    var CONFIG = {
        initialDelay:    3000,   // ms before first appearance
        interval:        20000,  // ms between recurring appearances
        visibleDuration: 4200,   // ms the character stays visible
        charSize:        180,    // px — desktop
        charSizeMobile:  120,    // px — <= 600 px viewport width
        zIndex:          9999,
    };

    // ─── Character definitions ─────────────────────────────────────────────────
    var CHARACTERS = [
        {
            id: 'orihime',
            name: 'Orihime',
            src: 'orihime.png',
            bubbleBg:     'linear-gradient(135deg,#fff0f6 0%,#ffe4f0 100%)',
            bubbleBorder: '#f9a8d4',
            textColor:    '#9d174d',
            dialogues:    ['KAWAIII~! \u2665','Hewwooo! \u2728','Ehehe~ \uD83D\uDC97','Haiii! \u2665','Yoo-hoo~ \u2728'],
            animIn:       'bee-bounce-in',
            animOut:      'bee-bounce-out',
            inDur:        550,
            outDur:       480,
        },
        {
            id: 'soifon',
            name: 'Soi Fon',
            src: 'soifon.jpg',
            bubbleBg:     'linear-gradient(135deg,#eef2ff 0%,#e0e7ff 100%)',
            bubbleBorder: '#a5b4fc',
            textColor:    '#3730a3',
            dialogues:    ['What are you doing? \uD83D\uDC40','Peekaboo! \uD83D\uDC41\uFE0F','I was never here... \u2728','Hmph. Carry on. \uD83D\uDC40'],
            animIn:       'bee-sneak-in',
            animOut:      'bee-sneak-out',
            inDur:        380,
            outDur:       300,
        },
        {
            id: 'rangiku',
            name: 'Rangiku',
            src: 'rangiku.jpg',
            bubbleBg:     'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)',
            bubbleBorder: '#fcd34d',
            textColor:    '#92400e',
            dialogues:    ['Hellooo~ \u2665','Boo! \uD83D\uDC97','Looking good~ \u2728','Hehe~ \uD83D\uDE0F',"Don't mind me~ \u2728"],
            animIn:       'bee-lean-in',
            animOut:      'bee-lean-out',
            inDur:        550,
            outDur:       480,
        },
    ];

    var DIRECTIONS = ['left', 'right', 'bottom'];

    var lastCharIndex  = -1;
    var isAnimating    = false;
    var initialTimer   = null;
    var recurringTimer = null;
    var container      = null;

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function pickCharacter() {
        var candidates = CHARACTERS.filter(function(_, i) { return i !== lastCharIndex; });
        if (!candidates.length) candidates = CHARACTERS;
        var char = candidates[Math.floor(Math.random() * candidates.length)];
        lastCharIndex = CHARACTERS.indexOf(char);
        return char;
    }

    function pickDirection() {
        return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    }

    function pickDialogue(char) {
        var d = char.dialogues;
        return d[Math.floor(Math.random() * d.length)];
    }

    function getSize() {
        return window.innerWidth <= 600 ? CONFIG.charSizeMobile : CONFIG.charSize;
    }

    function injectStyles() {
        if (document.getElementById('bee-styles')) return;
        var style = document.createElement('style');
        style.id = 'bee-styles';
        style.textContent = [
            '#bee-container{position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;}',
            '.bee-wrap{position:absolute;pointer-events:none;will-change:transform,opacity;}',
            '.bee-img{display:block;object-fit:contain;object-position:top center;filter:drop-shadow(0 8px 24px rgba(0,0,0,.3));user-select:none;-webkit-user-drag:none;}',
            '.bee-img.bee-white{mix-blend-mode:multiply;}',
            '.bee-bubble{position:absolute;padding:8px 14px;border-radius:18px;border:2px solid transparent;',
              'font-family:Inter,system-ui,sans-serif;font-size:clamp(11px,2vw,14px);font-weight:600;',
              'white-space:nowrap;max-width:210px;text-align:center;line-height:1.4;',
              'box-shadow:0 4px 20px rgba(0,0,0,.18),0 1px 4px rgba(0,0,0,.10);',
              'opacity:0;transform:translateX(-50%) scale(.6) translateY(8px);',
              'transition:opacity 320ms ease,transform 320ms cubic-bezier(.34,1.56,.64,1);}',
            '.bee-bubble.show{opacity:1;transform:translateX(-50%) scale(1) translateY(0);}',
            '.bee-tail{position:absolute;width:11px;height:11px;border-radius:0 0 2px 0;',
              'transform:rotate(45deg);bottom:-7px;left:50%;margin-left:-6px;}',
            /* Keyframes */
            '@keyframes bee-bounce-in{0%{transform:var(--bee-off);opacity:0}',
              '60%{transform:var(--bee-on) translateY(-14px);opacity:1}',
              '80%{transform:var(--bee-on) translateY(4px)}100%{transform:var(--bee-on);opacity:1}}',
            '@keyframes bee-bounce-out{0%{transform:var(--bee-on);opacity:1}',
              '30%{transform:var(--bee-on) translateY(-10px)}100%{transform:var(--bee-off);opacity:0}}',
            '@keyframes bee-sneak-in{0%{transform:var(--bee-off);opacity:0}100%{transform:var(--bee-on);opacity:1}}',
            '@keyframes bee-sneak-out{0%{transform:var(--bee-on);opacity:1}100%{transform:var(--bee-off);opacity:0}}',
            '@keyframes bee-lean-in{0%{transform:var(--bee-off) rotate(var(--bee-rf));opacity:0}',
              '70%{transform:var(--bee-on) rotate(var(--bee-rt));opacity:1}100%{transform:var(--bee-on) rotate(0deg);opacity:1}}',
            '@keyframes bee-lean-out{0%{transform:var(--bee-on) rotate(0deg);opacity:1}',
              '30%{transform:var(--bee-on) rotate(var(--bee-rt))}100%{transform:var(--bee-off);opacity:0}}',
            '@keyframes bee-idle{0%,100%{transform:var(--bee-on) translateY(0)}',
              '30%{transform:var(--bee-on) translateY(-6px)}70%{transform:var(--bee-on) translateY(3px)}}',
        ].join('');
        document.head.appendChild(style);
    }

    function showCharacter() {
        if (isAnimating || prefersReducedMotion()) return;
        isAnimating = true;

        var char = pickCharacter();
        var dir  = pickDirection();
        var size = getSize();
        var text = pickDialogue(char);

        /* --- Wrapper --- */
        var wrap = document.createElement('div');
        wrap.className = 'bee-wrap';

        /* CSS vars for keyframes */
        var offX, onX, rf, rt;
        if (dir === 'left')   { offX = -(size+20); onX = 0; rf = '-15deg'; rt = '-4deg'; }
        if (dir === 'right')  { offX = (size+20);  onX = 0; rf = '15deg';  rt = '4deg';  }
        if (dir === 'bottom') { offX = 0; onX = 0; rf = '8deg'; rt = '3deg'; }

        var offTransform, onTransform;
        if (dir === 'left' || dir === 'right') {
            offTransform = 'translateX(' + offX + 'px)';
            onTransform  = 'translateX(0px)';
        } else {
            offTransform = 'translateY(' + (size+20) + 'px)';
            onTransform  = 'translateY(0px)';
        }

        wrap.style.setProperty('--bee-off', offTransform);
        wrap.style.setProperty('--bee-on',  onTransform);
        wrap.style.setProperty('--bee-rf',  rf);
        wrap.style.setProperty('--bee-rt',  rt);

        /* Initial position (starts off-screen) */
        var vw = window.innerWidth, vh = window.innerHeight;
        if (dir === 'left') {
            wrap.style.left   = '0px';
            wrap.style.top    = Math.max(vh * 0.30, 100) + 'px';
        } else if (dir === 'right') {
            wrap.style.right  = '0px';
            wrap.style.top    = Math.max(vh * 0.30, 100) + 'px';
        } else {
            wrap.style.bottom = '0px';
            var safeLeft = 20 + Math.random() * Math.max(vw - size - 40, 10);
            wrap.style.left = safeLeft + 'px';
        }
        wrap.style.transform = offTransform;
        wrap.style.opacity   = '0';

        /* --- Image --- */
        var img = document.createElement('img');
        img.className = 'bee-img';
        if (char.src.match(/\.jpe?g$/i)) img.classList.add('bee-white');
        img.src = char.src;
        img.alt = char.name;
        img.style.width  = size + 'px';
        img.style.height = size + 'px';
        img.draggable    = false;

        /* --- Bubble --- */
        var bubble = document.createElement('div');
        bubble.className = 'bee-bubble';
        bubble.textContent = text;
        bubble.style.background   = char.bubbleBg;
        bubble.style.borderColor  = char.bubbleBorder;
        bubble.style.color        = char.textColor;
        /* Bubble position: above the image */
        bubble.style.bottom = (size + 12) + 'px';
        bubble.style.left   = '50%';

        /* Tail */
        var tail = document.createElement('div');
        tail.className = 'bee-tail';
        tail.style.background = char.bubbleBorder;
        bubble.appendChild(tail);

        wrap.appendChild(img);
        wrap.appendChild(bubble);
        container.appendChild(wrap);

        /* --- Entrance animation --- */
        requestAnimationFrame(function() {
            wrap.style.animation = char.animIn + ' ' + char.inDur + 'ms cubic-bezier(.34,1.3,.64,1) forwards';

            /* Show bubble after entrance finishes */
            setTimeout(function() {
                bubble.classList.add('show');
                /* Switch to idle wobble */
                wrap.style.animation = 'bee-idle 2.6s ease-in-out infinite';
            }, char.inDur + 60);

            /* Exit */
            var exitAt = CONFIG.visibleDuration - char.outDur - 220;
            if (exitAt < char.inDur + 300) exitAt = char.inDur + 500;

            setTimeout(function() {
                /* Hide bubble */
                bubble.classList.remove('show');
                bubble.style.transition = 'opacity 200ms ease, transform 200ms ease';
                setTimeout(function() {
                    wrap.style.animation = char.animOut + ' ' + char.outDur + 'ms cubic-bezier(.4,0,.8,1) forwards';
                    setTimeout(function() {
                        wrap.remove();
                        isAnimating = false;
                    }, char.outDur + 80);
                }, 180);
            }, exitAt);
        });
    }

    function init() {
        injectStyles();
        container = document.createElement('div');
        container.id = 'bee-container';
        document.body.appendChild(container);

        initialTimer   = setTimeout(showCharacter, CONFIG.initialDelay);
        recurringTimer = setInterval(showCharacter, CONFIG.interval);

        window.addEventListener('beforeunload', function() {
            clearTimeout(initialTimer);
            clearInterval(recurringTimer);
        }, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
