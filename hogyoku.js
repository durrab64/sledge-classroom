/* ===================================================
   SLEDGE CLASSROOM — HŌGYOKU AWAKENING
   Theme-only glass-shatter reveal + section-anchored
   3D crystal orb (Three.js, lazily loaded).

   Integration rules:
   - Single source of truth: html[data-zanpakuto="hogyoku"].
     No second theme manager and no extra localStorage keys.
   - Never replays on load, scroll or navigation. Only a real
     user activation fires the reveal.
   - The canvas lives inside #about-section, scrolls with it,
     sits behind the content and never receives pointer events.
   =================================================== */
(function SledgeHogyoku() {
    'use strict';

    const THEME = 'hogyoku';
    const SECTION_ID = 'about-section';
    const STAGE_ID = 'hogyoku-stage';
    const THREE_URL = './vendor/three.module.min.js';

    let section = null;
    let stage = null;
    let canvas = null;

    let active = false;
    let initialized = false;
    let loading = false;
    let fallback = false;
    let visible = true;
    let running = false;

    let threePromise = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let orbGroup = null;
    let shellMesh = null;
    let coreMaterial = null;
    let auraMaterial = null;
    let rimMaterial = null;
    let ringA = null;
    let ringB = null;
    let particles = null;
    let shards = null;
    let halo = null;
    let frameId = 0;
    let lastFrame = 0;
    let clock = 0;
    let resizeObserver = null;
    let intersectionObserver = null;
    let revealTimer = 0;
    let shatter = null;

    function motionDisabled() {
        return !!(
            (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
            document.documentElement.getAttribute('data-animation') === 'off' ||
            localStorage.getItem('sledge_animation') === 'off'
        );
    }

    function currentTheme() {
        return document.documentElement.getAttribute('data-zanpakuto') || 'default';
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /* -------------------------------------------------
       DOM wiring
       ------------------------------------------------- */
    function init() {
        section = document.getElementById(SECTION_ID);
        stage = document.getElementById(STAGE_ID);

        if (!section || !stage) return;

        canvas = stage.querySelector('.hogyoku-canvas');
        stage.dataset.state = 'idle';

        // The theme engine announces every change. Page-load restores pass
        // userInitiated:false, which is what keeps this cinematic one-shot.
        document.addEventListener('sledge:themechange', onThemeChange);

        if (window.matchMedia) {
            const query = window.matchMedia('(prefers-reduced-motion: reduce)');
            const onChange = () => {
                if (!active || !initialized) return;
                if (query.matches) {
                    stopLoop();
                    renderOnce();
                } else {
                    updateLoop();
                }
            };
            if (query.addEventListener) query.addEventListener('change', onChange);
            else if (query.addListener) query.addListener(onChange);
        }

        document.addEventListener('visibilitychange', updateLoop);
        document.addEventListener('sledge:settingschanged', () => {
            if (!active || !initialized) return;
            if (motionDisabled()) {
                stopLoop();
                renderOnce();
            } else {
                updateLoop();
            }
        });

        intersectionObserver = new IntersectionObserver((entries) => {
            const entry = entries[0];
            visible = !!entry && entry.isIntersecting;
            updateLoop();
        }, { rootMargin: '180px 0px', threshold: 0 });

        intersectionObserver.observe(section);

        // Initial restore (the event may have fired before this script ran
        // when the page loads with Hōgyoku already saved).
        if (currentTheme() === THEME) activate(false);
    }

    function onThemeChange(event) {
        const theme = (event && event.detail && event.detail.theme) || currentTheme();
        if (theme === THEME) {
            const userInitiated = !!(event && event.detail && event.detail.userInitiated);
            activate(userInitiated);
        } else {
            deactivate();
        }
    }

    /* -------------------------------------------------
       Activation / teardown
       ------------------------------------------------- */
    function activate(playReveal) {
        active = true;

        if (playReveal) {
            gentlyRevealSection();
            if (motionDisabled()) {
                revealOrb();
            } else {
                stage.classList.remove('is-awake');
                playShatter(revealOrb);
                clearTimeout(revealTimer);
                // Start fading the orb in while the shards are still leaving,
                // so the glass never sits on a blank frame.
                revealTimer = window.setTimeout(revealOrb, 1350);
            }
        } else {
            revealOrb();
        }

        stage.dataset.state = fallback ? 'fallback' : 'awake';

        // A fresh user activation should retry WebGL even after an earlier failure.
        if (playReveal && fallback) resetFallback();
        ensureScene();
    }

    function revealOrb() {
        if (!stage || !active) return;
        window.clearTimeout(revealTimer);
        revealTimer = 0;
        stage.classList.add('is-awake');
    }

    function deactivate() {
        active = false;
        window.clearTimeout(revealTimer);
        revealTimer = 0;
        cancelShatter();
        if (stage) {
            stage.classList.remove('is-awake', 'is-fallback');
            stage.dataset.state = 'idle';
        }
        disposeScene();
    }

    function gentlyRevealSection() {
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const mostlyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight + 1;
        if (mostlyVisible) return;
        try {
            section.scrollIntoView({
                behavior: motionDisabled() ? 'auto' : 'smooth',
                block: 'center'
            });
        } catch (_) {
            section.scrollIntoView();
        }
    }

    /* -------------------------------------------------
       Glass-shatter reveal (~2.1s, no flashes)
       ------------------------------------------------- */
    function playShatter(onDone) {
        if (shatter || motionDisabled() || !document.body) {
            onDone();
            return;
        }

        const overlay = document.createElement('canvas');
        overlay.className = 'hogyoku-shatter';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);

        const ctx = overlay.getContext('2d');
        if (!ctx) {
            overlay.remove();
            onDone();
            return;
        }

        const state = {
            overlay,
            ctx,
            raf: 0,
            start: performance.now(),
            duration: 2100,
            onDone,
            width: 0,
            height: 0,
            cx: 0,
            cy: 0,
            cracks: [],
            shards: []
        };
        shatter = state;

        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        function resize() {
            state.width = Math.max(1, window.innerWidth);
            state.height = Math.max(1, window.innerHeight);
            overlay.width = Math.round(state.width * dpr);
            overlay.height = Math.round(state.height * dpr);
            overlay.style.width = state.width + 'px';
            overlay.style.height = state.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            state.cx = state.width * 0.5 + (Math.random() - 0.5) * state.width * 0.12;
            state.cy = state.height * 0.44 + (Math.random() - 0.5) * state.height * 0.1;
            buildCracks(state);
            buildShards(state);
        }

        function finish() {
            cancelAnimationFrame(state.raf);
            if (state.onResize) window.removeEventListener('resize', state.onResize);
            if (state.overlay && state.overlay.parentNode) state.overlay.remove();
            if (shatter === state) shatter = null;
            state.onDone();
        }

        function draw(now) {
            const t = clamp((now - state.start) / state.duration, 0, 1);
            const W = state.width;
            const H = state.height;
            const cx = state.cx;
            const cy = state.cy;

            ctx.clearRect(0, 0, W, H);

            const fadeIn = easeOutCubic(clamp(t / 0.1, 0, 1));
            const fadeOut = clamp((1 - t) / 0.26, 0, 1);
            const veil = Math.min(fadeIn, fadeOut);

            if (veil > 0) {
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.82);
                grad.addColorStop(0, 'rgba(48,15,82,' + (0.36 * veil) + ')');
                grad.addColorStop(0.52, 'rgba(20,6,36,' + (0.24 * veil) + ')');
                grad.addColorStop(1, 'rgba(4,1,10,' + (0.14 * veil) + ')');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H);
            }

            // Branching cracks grow outward, then hold while shards leave.
            if (t < 0.62) {
                const growth = clamp(t / 0.4, 0, 1);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                for (let i = 0; i < state.cracks.length; i++) {
                    const crack = state.cracks[i];
                    const progress = clamp((growth - crack.delay) / 0.76, 0, 1);
                    if (progress <= 0) continue;

                    const total = crack.points.length - 1;
                    const drawn = progress * total;

                    ctx.beginPath();
                    ctx.moveTo(crack.points[0].x, crack.points[0].y);
                    for (let s = 1; s <= Math.ceil(drawn); s++) {
                        const prev = crack.points[s - 1];
                        const point = crack.points[s];
                        const segment = Math.min(1, drawn - (s - 1));
                        ctx.lineTo(
                            prev.x + (point.x - prev.x) * segment,
                            prev.y + (point.y - prev.y) * segment
                        );
                    }

                    ctx.strokeStyle = 'rgba(12,2,24,' + (0.42 * veil) + ')';
                    ctx.lineWidth = 3.2;
                    ctx.stroke();

                    ctx.strokeStyle = 'rgba(228,196,255,' + (0.58 * veil) + ')';
                    ctx.lineWidth = 1.15;
                    ctx.stroke();
                }

                const ring = easeOutCubic(clamp(t / 0.24, 0, 1));
                ctx.beginPath();
                ctx.arc(cx, cy, 10 + ring * 26, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(240,220,255,' + (0.4 * (1 - ring) * veil) + ')';
                ctx.lineWidth = 1.4;
                ctx.stroke();
            }

            // Translucent fragments fly outward and fade.
            if (t > 0.24) {
                const p = clamp((t - 0.24) / 0.76, 0, 1);
                const travel = p * p;

                for (let i = 0; i < state.shards.length; i++) {
                    const shard = state.shards[i];
                    const alpha = shard.alpha * (1 - p) * veil;
                    if (alpha <= 0.004) continue;

                    const distance = travel * shard.distance;
                    ctx.save();
                    ctx.translate(
                        shard.cx + shard.dx * distance,
                        shard.cy + shard.dy * distance
                    );
                    ctx.rotate(shard.spin * travel);
                    ctx.translate(-shard.cx, -shard.cy);
                    ctx.beginPath();
                    ctx.moveTo(shard.points[0].x, shard.points[0].y);
                    for (let v = 1; v < shard.points.length; v++) {
                        ctx.lineTo(shard.points[v].x, shard.points[v].y);
                    }
                    ctx.closePath();
                    ctx.fillStyle = 'rgba(' + shard.color + ',' + alpha + ')';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(242,226,255,' + (alpha * 0.85) + ')';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                    ctx.restore();
                }
            }

            if (t < 1) {
                state.raf = requestAnimationFrame(draw);
            } else {
                finish();
            }
        }

        resize();
        state.raf = requestAnimationFrame(draw);

        // Keep the veil correct if the window is resized mid-reveal.
        state.onResize = resize;
        window.addEventListener('resize', state.onResize);
    }

    function buildCracks(state) {
        const cracks = [];
        const branches = 11;

        for (let i = 0; i < branches; i++) {
            let angle = (i / branches) * Math.PI * 2 + (Math.random() - 0.5) * 0.42;
            const points = [{ x: state.cx, y: state.cy }];
            let radius = 0;
            const segments = 4 + Math.floor(Math.random() * 4);

            for (let s = 0; s < segments; s++) {
                radius += 26 + Math.random() * 72;
                angle += (Math.random() - 0.5) * 0.26;
                points.push({
                    x: state.cx + Math.cos(angle) * radius,
                    y: state.cy + Math.sin(angle) * radius
                });
            }

            cracks.push({ points, delay: Math.random() * 0.1 });

            // A short fork makes the break read as real glass.
            if (Math.random() < 0.45) {
                const fork = [points[points.length - 1]];
                let forkAngle = angle + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.45);
                let forkRadius = 10;
                for (let f = 0; f < 2; f++) {
                    forkRadius += 18 + Math.random() * 46;
                    forkAngle += (Math.random() - 0.5) * 0.3;
                    fork.push({
                        x: fork[f].x + Math.cos(forkAngle) * forkRadius,
                        y: fork[f].y + Math.sin(forkAngle) * forkRadius
                    });
                }
                cracks.push({ points: fork, delay: 0.08 + Math.random() * 0.14 });
            }
        }

        state.cracks = cracks;
    }

    function buildShards(state) {
        const shards = [];
        const count = 26;

        for (let i = 0; i < count; i++) {
            const a0 = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
            const a1 = ((i + 1) / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
            const inner = 16 + Math.random() * 64;
            const mid = inner + 90 + Math.random() * 150;
            const outer = mid + 50 + Math.random() * 170;
            const midAngle = (a0 + a1) / 2;

            const points = [
                { x: state.cx + Math.cos(a0) * inner, y: state.cy + Math.sin(a0) * inner },
                { x: state.cx + Math.cos(a1) * inner, y: state.cy + Math.sin(a1) * inner },
                { x: state.cx + Math.cos(a1) * mid, y: state.cy + Math.sin(a1) * mid },
                { x: state.cx + Math.cos(midAngle) * outer, y: state.cy + Math.sin(midAngle) * outer },
                { x: state.cx + Math.cos(a0) * mid, y: state.cy + Math.sin(a0) * mid }
            ];

            let sx = 0;
            let sy = 0;
            for (let p = 0; p < points.length; p++) {
                sx += points[p].x;
                sy += points[p].y;
            }
            const centroidX = sx / points.length;
            const centroidY = sy / points.length;

            const violet = Math.random() < 0.58;
            shards.push({
                points,
                cx: centroidX,
                cy: centroidY,
                dx: Math.cos(midAngle + (Math.random() - 0.5) * 0.3),
                dy: Math.sin(midAngle + (Math.random() - 0.5) * 0.3),
                distance: 90 + Math.random() * 240,
                spin: (Math.random() - 0.5) * 0.9,
                alpha: 0.1 + Math.random() * 0.12,
                color: violet
                    ? '168,85,247'
                    : (Math.random() < 0.6 ? '190,18,60' : '126,34,206')
            });
        }

        state.shards = shards;
    }

    function cancelShatter() {
        if (!shatter) return;
        const current = shatter;
        shatter = null;
        cancelAnimationFrame(current.raf);
        if (current.onResize) window.removeEventListener('resize', current.onResize);
        if (current.overlay && current.overlay.parentNode) current.overlay.remove();
    }

    /* -------------------------------------------------
       Three.js scene (lazy)
       ------------------------------------------------- */
    function supportsWebGL() {
        try {
            const probe = document.createElement('canvas');
            return !!(
                window.WebGLRenderingContext &&
                (probe.getContext('webgl2') || probe.getContext('webgl'))
            );
        } catch (_) {
            return false;
        }
    }

    function ensureScene() {
        if (!active || initialized || loading || fallback) return;

        if (!supportsWebGL()) {
            showFallback();
            return;
        }

        loading = true;
        if (!threePromise) threePromise = import(THREE_URL);

        threePromise.then((THREE) => {
            loading = false;
            if (!active || currentTheme() !== THEME) return;
            try {
                buildScene(THREE);
            } catch (error) {
                showFallback(error);
            }
        }).catch((error) => {
            loading = false;
            threePromise = null;
            if (active) showFallback(error);
        });
    }

    function showFallback(error) {
        fallback = true;
        initialized = false;
        if (error && window.console) {
            console.warn('[Hōgyoku] WebGL scene unavailable; using CSS crystal.', error);
        }
        if (!stage || !active) return;
        stage.classList.add('is-fallback', 'is-awake');
        stage.dataset.state = 'fallback';
    }

    function resetFallback() {
        fallback = false;
        if (stage) stage.classList.remove('is-fallback');
    }

    function freshCanvas() {
        if (!stage) return;
        const replacement = document.createElement('canvas');
        replacement.className = 'hogyoku-canvas';
        replacement.setAttribute('aria-hidden', 'true');
        const existing = stage.querySelector('.hogyoku-canvas');
        if (existing && existing.parentNode) existing.parentNode.replaceChild(replacement, existing);
        else stage.insertBefore(replacement, stage.querySelector('.hogyoku-fallback'));
        canvas = replacement;
    }

    function makeEnvironmentTexture(THREE) {
        const envCanvas = document.createElement('canvas');
        envCanvas.width = 256;
        envCanvas.height = 128;
        const ctx = envCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 128);
        gradient.addColorStop(0, '#1b0633');
        gradient.addColorStop(0.42, '#06020c');
        gradient.addColorStop(0.72, '#2a0620');
        gradient.addColorStop(1, '#12030a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 128);

        const violet = ctx.createRadialGradient(64, 54, 0, 64, 54, 70);
        violet.addColorStop(0, 'rgba(216,180,254,0.9)');
        violet.addColorStop(0.45, 'rgba(168,85,247,0.35)');
        violet.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = violet;
        ctx.fillRect(0, 0, 256, 128);

        const crimson = ctx.createRadialGradient(196, 76, 0, 196, 76, 60);
        crimson.addColorStop(0, 'rgba(251,113,133,0.75)');
        crimson.addColorStop(0.5, 'rgba(190,18,60,0.28)');
        crimson.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = crimson;
        ctx.fillRect(0, 0, 256, 128);

        const texture = new THREE.CanvasTexture(envCanvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    function makeGlowTexture(THREE) {
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 256;
        glowCanvas.height = 256;
        const ctx = glowCanvas.getContext('2d');
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 126);
        gradient.addColorStop(0, 'rgba(220,190,255,0.95)');
        gradient.addColorStop(0.24, 'rgba(168,85,247,0.5)');
        gradient.addColorStop(0.52, 'rgba(126,34,206,0.2)');
        gradient.addColorStop(0.78, 'rgba(159,18,57,0.08)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        const texture = new THREE.CanvasTexture(glowCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    function buildScene(THREE) {
        freshCanvas();
        if (!canvas) throw new Error('Hōgyoku canvas missing');

        const rect = stage.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const small = width < 720;
        const aspect = width / height;
        const reduced = motionDisabled();

        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: false,
            powerPreference: 'low-power'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1) * (small ? 0.9 : 0.85));
        renderer.setSize(width, height, false);
        renderer.setClearAlpha(0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;

        scene = new THREE.Scene();
        scene.environment = makeEnvironmentTexture(THREE);

        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 60);
        camera.position.set(0, 0, 7.2);
        camera.lookAt(0, 0, 0);

        const ambient = new THREE.AmbientLight(0x8b5cf6, 0.9);
        scene.add(ambient);

        const key = new THREE.DirectionalLight(0xf3e8ff, 2.1);
        key.position.set(3.4, 4.2, 5.5);
        scene.add(key);

        const rim = new THREE.PointLight(0xc084fc, 45, 18, 2);
        rim.position.set(-3.2, 1.2, 3.4);
        scene.add(rim);

        const ember = new THREE.PointLight(0xbe123c, 26, 15, 2);
        ember.position.set(2.8, -2.2, 2.6);
        scene.add(ember);

        orbGroup = new THREE.Group();
        orbGroup.position.y = -0.28;
        // Size the crystal against the section width (aspect ratio), not its
        // height: the mobile section is tall and would otherwise clip.
        orbGroup.scale.setScalar(Math.min(1, Math.max(0.34, aspect * 1.05)));
        scene.add(orbGroup);

        // Soft halo behind the crystal.
        halo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: makeGlowTexture(THREE),
            color: 0xc084fc,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        halo.scale.set(7.2, 7.2, 1);
        halo.position.z = -1.4;
        halo.material.opacity = 0.4;
        orbGroup.add(halo);

        // Inner luminous core with a slow violet/crimson swirl.
        coreMaterial = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: [
                'varying vec3 vNormal;',
                'varying vec3 vPosition;',
                'void main() {',
                '  vNormal = normalize(normalMatrix * normal);',
                '  vPosition = position;',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform float uTime;',
                'varying vec3 vNormal;',
                'varying vec3 vPosition;',
                'float hash(vec3 p) {',
                '  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));',
                '  p *= 17.0;',
                '  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));',
                '}',
                'float noise(vec3 x) {',
                '  vec3 i = floor(x);',
                '  vec3 f = fract(x);',
                '  f = f * f * (3.0 - 2.0 * f);',
                '  return mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),',
                '                     mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),',
                '                 mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),',
                '                     mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);',
                '}',
                'float fbm(vec3 p) {',
                '  float value = 0.0;',
                '  float amplitude = 0.55;',
                '  for (int i = 0; i < 3; i++) {',
                '    value += amplitude * noise(p);',
                '    p *= 2.03;',
                '    amplitude *= 0.5;',
                '  }',
                '  return value;',
                '}',
                'void main() {',
                '  vec3 p = normalize(vPosition);',
                '  float n = fbm(p * 3.1 + vec3(0.0, uTime * 0.16, uTime * 0.11));',
                '  float n2 = fbm(p * 6.2 - vec3(uTime * 0.09, 0.0, uTime * 0.05));',
                '  vec3 violet = vec3(0.36, 0.11, 0.88);',
                '  vec3 crimson = vec3(0.78, 0.03, 0.17);',
                '  vec3 color = mix(crimson, violet, smoothstep(0.22, 0.78, n));',
                '  color += vec3(0.95, 0.78, 1.0) * pow(n2, 3.0) * 0.32;',
                '  color += vec3(1.0, 0.94, 1.0) * pow(n2, 6.0) * 0.36;',
                '  float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 1.7);',
                '  color += violet * rim * 0.62;',
                '  gl_FragColor = vec4(color, 0.96);',
                '}'
            ].join('\n'),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const core = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.63, small ? 3 : 4),
            coreMaterial
        );
        core.renderOrder = 1;
        orbGroup.add(core);

        // Outer aura: fresnel only, so it reads as refracted light.
        auraMaterial = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: [
                'varying vec3 vNormal;',
                'varying vec3 vPosition;',
                'void main() {',
                '  vNormal = normalize(normalMatrix * normal);',
                '  vPosition = position;',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform float uTime;',
                'varying vec3 vNormal;',
                'varying vec3 vPosition;',
                'void main() {',
                '  float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 3.0);',
                '  float pulse = 0.82 + 0.18 * sin(uTime * 0.85);',
                '  float bands = 0.7 + 0.3 * sin(vPosition.y * 6.5 + uTime * 0.5);',
                '  vec3 violet = vec3(0.62, 0.3, 0.98);',
                '  vec3 crimson = vec3(0.9, 0.1, 0.3);',
                '  vec3 color = mix(crimson, violet, 0.55 + 0.25 * sin(uTime * 0.5));',
                '  gl_FragColor = vec4(color, rim * 0.24 * pulse * bands);',
                '}'
            ].join('\n'),
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false
        });

        const aura = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.92, 2),
            auraMaterial
        );
        orbGroup.add(aura);

        // Crystal shell: low-alpha physical glass for reflections, with a
        // separate fresnel shell so the core stays visible through it.
        const shellMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            metalness: 0.35,
            roughness: 0.04,
            envMapIntensity: 2.6,
            transparent: true,
            opacity: small ? 0.18 : 0.12,
            side: THREE.FrontSide,
            depthWrite: false
        });
        shellMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.58, small ? 3 : 4),
            shellMaterial
        );
        shellMesh.renderOrder = 2;
        orbGroup.add(shellMesh);

        // Faceted fresnel edge: sells the hard crystal surface.
        rimMaterial = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: [
                'varying vec3 vNormal;',
                'varying vec3 vPosition;',
                'void main() {',
                '  vNormal = normalize(normalMatrix * normal);',
                '  vPosition = position;',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform float uTime;',
                'varying vec3 vNormal;',
                'varying vec3 vPosition;',
                'void main() {',
                '  float fres = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.1);',
                '  float facet = 0.55 + 0.45 * sin(vPosition.x * 9.0 + vPosition.y * 7.0 + vPosition.z * 5.0 + uTime * 0.35);',
                '  vec3 color = mix(vec3(0.78, 0.4, 1.0), vec3(1.0, 0.35, 0.55), facet * 0.45);',
                '  float alpha = fres * (0.24 + 0.2 * facet);',
                '  gl_FragColor = vec4(color + fres * 0.35, alpha);',
                '}'
            ].join('\n'),
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const rimShell = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.605, small ? 2 : 3),
            rimMaterial
        );
        rimShell.renderOrder = 3;
        shellMesh.add(rimShell);

        // Sparse facet edges keep the shell reading as cut crystal.
        const facetWire = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.59, 1),
            new THREE.MeshBasicMaterial({
                color: 0xe9d5ff,
                wireframe: true,
                transparent: true,
                opacity: 0.05,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        facetWire.renderOrder = 4;
        shellMesh.add(facetWire);

        // Two thin energy rings.
        const ringMaterialA = new THREE.MeshBasicMaterial({
            color: 0xd8b4fe,
            transparent: true,
            opacity: 0.32,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const ringMaterialB = new THREE.MeshBasicMaterial({
            color: 0xfb7185,
            transparent: true,
            opacity: 0.24,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        ringA = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.012, 6, 112), ringMaterialA);
        ringA.rotation.set(1.12, 0.25, 0.4);
        orbGroup.add(ringA);
        ringB = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.009, 6, 112), ringMaterialB);
        ringB.rotation.set(0.42, 1.15, -0.5);
        orbGroup.add(ringB);

        // Drifting crystal dust.
        const count = small ? 58 : 92;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new THREE.Color();
        for (let i = 0; i < count; i++) {
            const radius = 1.75 + Math.random() * 0.95;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
            positions[i * 3 + 1] = Math.cos(phi) * radius * 0.82;
            positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
            color.set(Math.random() < 0.62 ? 0xd8b4fe : 0xfb7185);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
            size: small ? 0.045 : 0.036,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        orbGroup.add(particles);

        // A few orbiting splinters.
        shards = new THREE.Group();
        const shardMaterial = new THREE.MeshStandardMaterial({
            color: 0x6b21a8,
            emissive: 0xc084fc,
            emissiveIntensity: 0.7,
            metalness: 0.35,
            roughness: 0.2
        });
        const crimsonMaterial = shardMaterial.clone();
        crimsonMaterial.color.setHex(0x7f1d1d);
        crimsonMaterial.emissive.setHex(0xfb7185);
        for (let i = 0; i < 7; i++) {
            const shard = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.07 + Math.random() * 0.045, 0),
                i % 3 === 0 ? crimsonMaterial : shardMaterial
            );
            const theta = (i / 7) * Math.PI * 2 + Math.random() * 0.3;
            const radius = 1.86 + Math.random() * 0.34;
            shard.position.set(
                Math.cos(theta) * radius,
                (Math.random() - 0.5) * 1.5,
                Math.sin(theta) * radius
            );
            shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
            shard.scale.setScalar(0.7 + Math.random() * 0.7);
            shards.add(shard);
        }
        orbGroup.add(shards);

        initialized = true;
        stage.dataset.state = 'awake';

        resizeObserver = new ResizeObserver(() => resizeScene());
        resizeObserver.observe(stage);
        resizeScene();

        if (reduced) {
            clock = 0;
            renderOnce();
        } else {
            updateLoop();
        }
    }

    function resizeScene() {
        if (!renderer || !camera || !stage) return;
        const rect = stage.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (!running) renderOnce();
    }

    function renderOnce() {
        if (!renderer || !scene || !camera) return;
        if (coreMaterial) coreMaterial.uniforms.uTime.value = clock;
        if (auraMaterial) auraMaterial.uniforms.uTime.value = clock;
        if (rimMaterial) rimMaterial.uniforms.uTime.value = clock;
        renderer.render(scene, camera);
    }

    function updateLoop() {
        const shouldRun = !!(
            active &&
            initialized &&
            !fallback &&
            !motionDisabled() &&
            visible &&
            !document.hidden
        );

        if (shouldRun && !running) {
            running = true;
            lastFrame = performance.now();
            frameId = requestAnimationFrame(frame);
        } else if (!shouldRun && running) {
            stopLoop();
            renderOnce();
        }
    }

    function stopLoop() {
        running = false;
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
    }

    function frame(now) {
        if (!running) return;
        frameId = requestAnimationFrame(frame);

        const delta = Math.min(48, Math.max(8, now - lastFrame)) / 1000;
        lastFrame = now;
        clock += delta;

        if (orbGroup) {
            orbGroup.rotation.y += delta * 0.16;
            orbGroup.rotation.x = Math.sin(clock * 0.21) * 0.07;
            orbGroup.position.y = -0.28 + Math.sin(clock * 0.55) * 0.035;
        }
        if (shellMesh) {
            shellMesh.rotation.y -= delta * 0.05;
            shellMesh.rotation.z = Math.sin(clock * 0.18) * 0.05;
        }
        if (coreMaterial) coreMaterial.uniforms.uTime.value = clock;
        if (auraMaterial) auraMaterial.uniforms.uTime.value = clock;
        if (rimMaterial) rimMaterial.uniforms.uTime.value = clock;
        if (halo) {
            halo.material.opacity = 0.34 + Math.sin(clock * 0.7) * 0.07;
            halo.material.rotation = -clock * 0.02;
        }
        if (particles) {
            particles.rotation.y -= delta * 0.045;
            particles.rotation.z += delta * 0.012;
        }
        if (ringA) ringA.rotation.z += delta * 0.12;
        if (ringB) ringB.rotation.y -= delta * 0.09;
        if (shards) shards.rotation.y += delta * 0.085;

        renderer.render(scene, camera);
    }

    function disposeScene() {
        stopLoop();

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        if (scene) {
            scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                const materials = Array.isArray(object.material)
                    ? object.material
                    : (object.material ? [object.material] : []);
                for (let m = 0; m < materials.length; m++) {
                    const material = materials[m];
                    if (!material) continue;
                    for (const key in material) {
                        const value = material[key];
                        if (value && value.isTexture) value.dispose();
                    }
                    material.dispose();
                }
            });
        }

        if (scene && scene.environment && scene.environment.dispose) {
            scene.environment.dispose();
        }

        if (renderer) {
            renderer.dispose();
            if (renderer.forceContextLoss) {
                try { renderer.forceContextLoss(); } catch (_) {}
            }
        }

        renderer = null;
        scene = null;
        camera = null;
        orbGroup = null;
        shellMesh = null;
        coreMaterial = null;
        auraMaterial = null;
        rimMaterial = null;
        ringA = null;
        ringB = null;
        particles = null;
        shards = null;
        halo = null;
        initialized = false;
        running = false;

        // Keep exactly one canvas element around, with no old context on it.
        if (stage) freshCanvas();
    }

    // Small debug surface for QA (read-only, no theme state of its own).
    window.SledgeHogyoku = {
        getState() {
            return {
                active,
                initialized,
                fallback,
                visible,
                running,
                reduced: motionDisabled(),
                theme: currentTheme(),
                contextLost: !!(renderer && renderer.getContext && renderer.getContext().isContextLost())
            };
        },
        replay() {
            if (active) activate(true);
        }
    };

    // defer guarantees the DOM is parsed; app.js has already registered its
    // DOMContentLoaded restore, and this listener runs before that event.
    init();
})();
