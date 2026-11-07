/* ===================================================
   SLEDGE CLASSROOM — Application Logic with Firebase
   =================================================== */

// ===== COURSE DATA =====
const COURSES = [
    {
        id: 'stats',
        name: 'Statistics & Probability',
        code: 'STAT 301',
        icon: 'fas fa-chart-bar',
        color: 'var(--course-stats)',
        gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        description: 'Descriptive & inferential statistics, probability distributions, hypothesis testing',
        hasLab: false,
    },
    {
        id: 'automata',
        name: 'Theory of Automata',
        code: 'CS 311',
        icon: 'fas fa-project-diagram',
        color: 'var(--course-automata)',
        gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        description: 'Finite automata, regular languages, context-free grammars, Turing machines',
        hasLab: false,
    },
    {
        id: 'calculus',
        name: 'Multivariable Calculus',
        code: 'MATH 201',
        icon: 'fas fa-infinity',
        color: 'var(--course-calculus)',
        gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
        description: 'Partial derivatives, multiple integrals, vector calculus, and applications',
        hasLab: false,
    },
    {
        id: 'os',
        name: 'Operating Systems',
        code: 'CS 321',
        icon: 'fas fa-cogs',
        color: 'var(--course-os)',
        gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
        description: 'Process management, memory management, file systems, and scheduling',
        hasLab: true,
    },
    {
        id: 'web',
        name: 'Web Engineering',
        code: 'CS 341',
        icon: 'fas fa-code',
        color: 'var(--course-web)',
        gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
        description: 'Full-stack web development, HTML, CSS, JavaScript, frameworks, and databases',
        hasLab: true,
    },
    {
        id: 'arch',
        name: 'Computer Architecture',
        code: 'CS 331',
        icon: 'fas fa-microchip',
        color: 'var(--course-arch)',
        gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        description: 'CPU design, instruction sets, pipelining, memory hierarchy, and I/O systems',
        hasLab: true,
    },
];

const LAB_COURSES = COURSES.filter(c => c.hasLab);

// File categories within each course
const FILE_CATEGORIES = {
    lectures: { label: 'Lecture Slides', icon: 'fas fa-chalkboard', collection: 'lectures' },
    papers: { label: 'Past Papers', icon: 'fas fa-scroll', collection: 'papers' },
    related: { label: 'Related Materials', icon: 'fas fa-paperclip', collection: 'related' },
    lab: { label: 'Lab Resources', icon: 'fas fa-flask', collection: 'lab' },
};

// Phase 4B: resource categories map to the Phase 4A tabs and Theory/Lab mode.
const RESOURCE_CATEGORY_META = {
    lectures: { label: 'Lecture Slides', shortLabel: 'Slides', icon: 'fas fa-chalkboard', mode: 'theory', tab: 'lectures' },
    papers: { label: 'Past Papers', shortLabel: 'Papers', icon: 'fas fa-scroll', mode: 'theory', tab: 'past-papers' },
    related: { label: 'Related Materials', shortLabel: 'Materials', icon: 'fas fa-paperclip', mode: 'theory', tab: 'related' },
    lab: { label: 'Lab Manuals', shortLabel: 'Manuals', icon: 'fas fa-flask', mode: 'lab', tab: 'lectures' },
    lab_papers: { label: 'Lab Past Papers', shortLabel: 'Lab papers', icon: 'fas fa-scroll', mode: 'lab', tab: 'past-papers' },
    lab_tasks: { label: 'Code & Lab Tasks', shortLabel: 'Tasks', icon: 'fas fa-laptop-code', mode: 'lab', tab: 'related' },
};

const COURSE_TAB_NAMES = ['lectures', 'past-papers', 'related', 'course-calendar'];

function getCategoryMeta(category) {
    return RESOURCE_CATEGORY_META[category] || null;
}

function getCategoryForTab(tabName, mode) {
    if (tabName === 'course-calendar') return null;
    const meta = RESOURCE_CATEGORY_META[mode === 'lab'
        ? (tabName === 'past-papers' ? 'lab_papers' : tabName === 'related' ? 'lab_tasks' : 'lab')
        : (tabName === 'past-papers' ? 'papers' : tabName)];
    return meta && meta.tab === tabName ? (mode === 'lab'
        ? (tabName === 'past-papers' ? 'lab_papers' : tabName === 'related' ? 'lab_tasks' : 'lab')
        : (tabName === 'past-papers' ? 'papers' : tabName)) : null;
}

const EVENT_TYPES = {
    quiz: { icon: 'fas fa-question-circle', color: 'var(--event-quiz)', bg: 'rgba(139, 92, 246, 0.1)', label: 'Quiz' },
    assignment: { icon: 'fas fa-clipboard-list', color: 'var(--event-assignment)', bg: 'rgba(245, 158, 11, 0.1)', label: 'Assignment' },
    presentation: { icon: 'fas fa-chalkboard-teacher', color: 'var(--event-presentation)', bg: 'rgba(16, 185, 129, 0.1)', label: 'Presentation' },
    exam: { icon: 'fas fa-file-signature', color: 'var(--event-exam)', bg: 'rgba(239, 68, 68, 0.1)', label: 'Exam' },
    other: { icon: 'fas fa-star', color: 'var(--event-other)', bg: 'rgba(59, 130, 246, 0.1)', label: 'Other' },
};

// ===== STATE =====
let currentPage = 'home';
let currentCourseId = null;
let currentLabId = null;
let currentTab = 'lectures';
let currentCourseMode = 'theory'; // 'theory' | 'lab'
let currentFilter = 'all'; // homepage filter: 'all' | 'theory' | 'lab'
let courseFilter = 'all'; // courses page filter: 'all' | 'theory' | 'lab'
let courseSearch = '';
let courseSort = 'code'; // 'code' | 'name' | 'materials' | 'updated'
let originPage = 'courses'; // 'courses' | 'home' | 'labs'
let courseDetailPushed = false;
let resourcePushed = false;
let resourceNavDepth = 0;
let resourceReturnScroll = null;
let currentResourceKey = null;
let resourcePreviewTimer = null;
let readerBaseTitle = null;
let readerReturnFocus = null; // element that opened the Reading Room
let readerReturnFocusInfo = null; // { courseId, category, docId } fallback
let pendingReaderFocusRestore = false;
let courseCardData = null;
let courseDataPromise = null;
let courseRenderGeneration = 0;
let uploadContext = null; // { category, courseId }
let selectedFiles = [];
let calendarDate = new Date();
let eventModalCourseId = null;
let isAdmin = false;

// Firebase references (set from firebase-config.js)
const auth = window.firebaseAuth;
const db = window.firebaseDB;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initFilters();
    initCourseTabs();
    initAuth();
    initUploadModal();
    initEventModal();
    initCalendar();
    populateEventCourseSelect();
    initFooterLinks();
    initFaqAccordion();
    initCurriculumCards();
    initZanpakutoThemes();
    initVisualCustomization();
    initBleachGateModal();
    initFloatingDock();
    initTensaMoon();
    initPktClock();
    initKeyboardShortcuts();
    initDownloadNotifications();
    initScrollExperience();
    initRevealAnimations();
    initPremiumInteractions();

    // Load initial data from Firestore
    loadAllCourseCards();
    loadHomeEvents();
});

// ===== THEME =====
function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
    });
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// ===== AUTHENTICATION =====
function initAuth() {
    const adminBtn = document.getElementById('admin-btn');
    const dropdown = document.getElementById('admin-dropdown');

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            isAdmin = true;
            document.body.classList.add('is-admin');
            adminBtn.classList.add('logged-in');
            document.getElementById('admin-email-display').textContent = user.email;
        } else {
            isAdmin = false;
            document.body.classList.remove('is-admin');
            adminBtn.classList.remove('logged-in');
            dropdown.classList.add('hidden');
        }
    });

    // Admin button click
    adminBtn.addEventListener('click', () => {
        if (isAdmin) {
            // Toggle dropdown
            dropdown.classList.toggle('hidden');
        } else {
            openLoginModal();
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== adminBtn && !adminBtn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Logout button
    document.getElementById('admin-logout-btn').addEventListener('click', () => {
        auth.signOut().then(() => {
            showToast('Signed out successfully', 'info');
            dropdown.classList.add('hidden');
        });
    });

    // Login modal
    document.getElementById('login-modal-close').addEventListener('click', closeLoginModal);
    document.getElementById('login-cancel-btn').addEventListener('click', closeLoginModal);
    document.getElementById('login-modal').addEventListener('click', (e) => {
        if (e.target.id === 'login-modal') closeLoginModal();
    });
    document.getElementById('login-confirm-btn').addEventListener('click', handleLogin);
    document.getElementById('admin-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Password toggle
    document.getElementById('password-toggle-btn').addEventListener('click', () => {
        const input = document.getElementById('admin-password');
        const icon = document.querySelector('#password-toggle-btn i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    });
}

function openLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('admin-email').focus();
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
}

async function handleLogin() {
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-confirm-btn');

    if (!email || !password) {
        errorEl.textContent = 'Please enter both email and password.';
        errorEl.classList.remove('hidden');
        return;
    }

    if (window.firebaseConfig && window.firebaseConfig.apiKey === 'YOUR_API_KEY_HERE') {
        errorEl.textContent = 'Firebase is not configured yet! Please paste your Firebase credentials into firebase-config.js (see FIREBASE_SETUP_GUIDE.md).';
        errorEl.classList.remove('hidden');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        closeLoginModal();
        showToast('Welcome back, Admin!', 'success');
    } catch (error) {
        let msg = 'Login failed. Please try again.';
        if (error.code === 'auth/invalid-api-key' || error.code === 'auth/app-deleted' || (error.message && error.message.includes('API key'))) {
            msg = 'Firebase API key is invalid or not yet configured. Please check firebase-config.js.';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = 'Invalid email or password.';
        } else if (error.code === 'auth/invalid-email') {
            msg = 'Please enter a valid email address.';
        } else if (error.code === 'auth/too-many-requests') {
            msg = 'Too many attempts. Please try again later.';
        }
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

// ===== NAVIGATION & HASH ROUTING =====
function initNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) navigateTo(page);
        });
    });

    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) {
                navigateTo(page);
                closeMobileMenu();
            }
        });
    });

    document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileMenu);

    document.getElementById('nav-logo-link').addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('home');
    });

    document.getElementById('hero-explore-btn').addEventListener('click', () => navigateTo('courses'));
    document.getElementById('hero-calendar-btn').addEventListener('click', () => navigateTo('calendar'));

    // Hash routing for deep links & browser back/forward buttons
    window.addEventListener('hashchange', handleHashRoute);
    
    // Initial route handling
    handleHashRoute();
}

function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    } catch (error) {
        return value;
    }
}

function buildResourceHash(courseId, category, docId) {
    return `#course-${encodeURIComponent(courseId)}/${encodeURIComponent(category)}/${encodeURIComponent(docId)}`;
}

function handleHashRoute() {
    const raw = (window.location.hash || '').replace(/^#\/?/, '').trim();
    const first = raw.split('/')[0].toLowerCase();
    const parts = raw.split('/').filter(Boolean);
    const isResourceRoute = first.startsWith('course-') && parts.length >= 3;
    // Browser Back/Forward can leave the Reading Room without closeReaderView().
    // Remember that transition so focus returns to the row that opened it once
    // the destination view has rendered.
    const leavingReader = isResourceViewOpen() && !isResourceRoute;

    if (!first || first === 'home') {
        if (leavingReader) pendingReaderFocusRestore = true;
        resetResourceNavigation();
        courseDetailPushed = false;
        navigateTo('home', false);
        restoreReaderFocusAfterRoute();
        return;
    }
    if (first === 'courses' || first === 'labs' || first === 'calendar') {
        if (leavingReader) pendingReaderFocusRestore = true;
        resetResourceNavigation();
        courseDetailPushed = false;
        navigateTo(first, false);
        restoreReaderFocusAfterRoute();
        return;
    }

    if (!first.startsWith('course-')) return;

    const courseId = first.slice('course-'.length);
    const course = COURSES.find(c => c.id === courseId);

    if (!course) {
        if (isResourceRoute) {
            resetResourceNavigation();
            showResourceNotFound({ reason: 'course' });
        } else {
            if (leavingReader) pendingReaderFocusRestore = true;
            resetResourceNavigation();
            courseDetailPushed = false;
            navigateTo('courses', false);
            restoreReaderFocusAfterRoute();
        }
        return;
    }

    if (isResourceRoute) {
        const category = safeDecode(parts[1]).toLowerCase();
        const docId = parts.slice(2).map(safeDecode).join('/');
        openResourceView(courseId, category, docId, { fromHash: true });
        return;
    }

    if (leavingReader) pendingReaderFocusRestore = true;

    let mode = 'theory';
    let tab = 'lectures';
    const state = history.state;
    if (parts[1]) {
        const requested = safeDecode(parts[1]).toLowerCase();
        const meta = RESOURCE_CATEGORY_META[requested];
        if (meta) {
            mode = meta.mode;
            tab = meta.tab;
        }
    } else if (state && state.courseId === courseId) {
        mode = state.courseMode === 'lab' ? 'lab' : 'theory';
        if (COURSE_TAB_NAMES.includes(state.courseTab)) tab = state.courseTab;
    }
    if (!course.hasLab) mode = 'theory';

    const restoreScroll = resourceReturnScroll;
    resourceReturnScroll = null;
    resourcePushed = false;
    resourceNavDepth = 0;
    openCourseDetail(courseId, mode, 'courses', {
        fromHash: true,
        tab,
        restoreScroll,
    });
}

function resetResourceNavigation() {
    resourcePushed = false;
    resourceNavDepth = 0;
    resourceReturnScroll = null;
    currentResourceKey = null;
    // A route change that is restoring focus (browser Back out of the reader)
    // keeps the recorded trigger until the destination view has rendered.
    if (!pendingReaderFocusRestore) {
        readerReturnFocus = null;
        readerReturnFocusInfo = null;
    }
    clearPreviewTimer();
}

function restoreReaderFocusAfterRoute() {
    if (!pendingReaderFocusRestore) return;
    pendingReaderFocusRestore = false;
    restoreReaderFocus();
}

function setCourseHistory(courseId, mode, replace = false, tab = currentTab) {
    const hash = `#course-${courseId}`;
    const state = { page: 'course', courseId, courseMode: mode, courseTab: tab };
    try {
        if (replace) {
            history.replaceState(state, '', hash);
        } else {
            history.pushState(state, '', hash);
        }
    } catch (e) {
        window.location.hash = hash;
    }
}

function navigateTo(page, updateHash = true) {
    closeReaderChrome();
    // Page-level navigation always leaves the Reading Room. Reset the reader
    // bookkeeping here so returning to a course starts a fresh history depth
    // (otherwise "Back to category" can overshoot into the archive).
    resetResourceNavigation();
    currentPage = page;

    if (page === 'courses') {
        document.getElementById('courses-list-view').classList.remove('hidden');
        document.getElementById('course-detail-view').classList.add('hidden');
    }
    if (page === 'labs') {
        document.getElementById('labs-list-view').classList.remove('hidden');
        document.getElementById('lab-detail-view').classList.add('hidden');
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    document.querySelectorAll('.mobile-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));

    if (updateHash && window.location.hash !== `#${page}`) {
        try {
            history.pushState({ page }, '', `#${page}`);
        } catch (e) {
            window.location.hash = `#${page}`;
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('open');
}

function closeMobileMenu() {
    document.getElementById('mobile-menu').classList.remove('open');
}

// ===== FIRESTORE HELPERS =====

// ===== RESOURCE LIST CACHE =====
// Resource lists are small but can be re-read often when students move between
// tabs, Theory/Lab and the Reading Room. Cache successful results only, so a
// failed query is never mistaken for an empty category.
const COURSE_FILE_TTL = 2 * 60 * 1000;
const courseFileCache = new Map(); // `${courseId}:${category}` -> { files, ts }
const courseFileInflight = new Map();

function invalidateCourseFiles(courseId, category = null) {
    if (!courseId) {
        courseFileCache.clear();
        courseFileInflight.clear();
        return;
    }
    const prefix = category ? `${courseId}:${category}` : `${courseId}:`;
    for (const key of Array.from(courseFileCache.keys())) {
        if (key === prefix || (category === null && key.startsWith(prefix))) courseFileCache.delete(key);
    }
    for (const key of Array.from(courseFileInflight.keys())) {
        if (key === prefix || (category === null && key.startsWith(prefix))) courseFileInflight.delete(key);
    }
}

// Get files for a course + category from Firestore.
// Returns { ok, files, error, fromCache } so callers can distinguish a failed
// query from a genuinely empty collection.
async function getFilesFromDB(courseId, category, options = {}) {
    const key = `${courseId}:${category}`;
    const cached = courseFileCache.get(key);
    if (!options.force && cached && Date.now() - cached.ts < COURSE_FILE_TTL) {
        return { ok: true, files: cached.files, fromCache: true };
    }

    const pending = courseFileInflight.get(key);
    if (!options.force && pending) return pending;

    let request;
    request = (async () => {
        try {
            const snapshot = await db.collection('courses').doc(courseId)
                .collection(category)
                .orderBy('createdAt', 'desc')
                .get();
            const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Publish only if this is still the current request for the key.
            // An upload/delete can invalidate the key while the read is in
            // flight; that removes the entry (and may start a newer request),
            // so the stale response must never repopulate the cache.
            if (courseFileInflight.get(key) === request) {
                courseFileCache.set(key, { files, ts: Date.now() });
            }
            return { ok: true, files, fromCache: false };
        } catch (error) {
            console.error(`Error fetching ${category} for ${courseId}:`, error);
            return { ok: false, files: [], error };
        } finally {
            if (courseFileInflight.get(key) === request) courseFileInflight.delete(key);
        }
    })();

    courseFileInflight.set(key, request);
    return request;
}

// ===== COURSE DATA CACHE =====
// Counts are fetched once per course/mode and shared by the home archive,
// the Courses grid and the Labs grid. Writes invalidate only what changed.
const COURSE_COUNT_TTL = 5 * 60 * 1000;
const EVENT_COUNT_TTL = 60 * 1000;
const courseCountCache = new Map(); // `${courseId}:${mode}` -> { data, ts }
const courseCountInflight = new Map();
let eventCountCache = { list: null, ts: 0 };

function latestUpdatedFromSnapshots(snapshots) {
    let latest = 0;
    snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
            const value = doc.get('createdAt');
            if (!value) return;
            const ms = typeof value.toMillis === 'function'
                ? value.toMillis()
                : new Date(value).getTime();
            if (Number.isFinite(ms) && ms > latest) latest = ms;
        });
    });
    return latest;
}

// Get file counts for a course (for card display)
async function getFileCounts(courseId, mode = 'theory') {
    try {
        if (mode === 'lab') {
            const [lab, labPapers, labTasks] = await Promise.all([
                db.collection('courses').doc(courseId).collection('lab').get(),
                db.collection('courses').doc(courseId).collection('lab_papers').get(),
                db.collection('courses').doc(courseId).collection('lab_tasks').get(),
            ]);
            return {
                ok: true,
                primary: lab.size,
                papers: labPapers.size,
                tertiary: labTasks.size,
                total: lab.size + labPapers.size + labTasks.size,
                latestUpdated: latestUpdatedFromSnapshots([lab, labPapers, labTasks]),
            };
        } else {
            const [lectures, papers, related] = await Promise.all([
                db.collection('courses').doc(courseId).collection('lectures').get(),
                db.collection('courses').doc(courseId).collection('papers').get(),
                db.collection('courses').doc(courseId).collection('related').get(),
            ]);
            return {
                ok: true,
                primary: lectures.size,
                papers: papers.size,
                tertiary: related.size,
                total: lectures.size + papers.size + related.size,
                latestUpdated: latestUpdatedFromSnapshots([lectures, papers, related]),
            };
        }
    } catch (error) {
        console.error('Error getting file counts:', error);
        return { ok: false, primary: 0, papers: 0, tertiary: 0, total: 0, latestUpdated: 0 };
    }
}

// Cached per-course counts with in-flight de-duplication.
async function getCourseCounts(courseId, mode = 'theory', force = false) {
    const key = `${courseId}:${mode}`;
    const cached = courseCountCache.get(key);
    if (!force && cached && Date.now() - cached.ts < COURSE_COUNT_TTL) {
        return cached.data;
    }
    const pending = courseCountInflight.get(key);
    if (!force && pending) return pending;

    const request = getFileCounts(courseId, mode)
        .then(data => {
            // Failed counts are surfaced as zeros for this render but are never
            // cached, so the next request retries instead of serving a false
            // "empty course" for the full TTL. The in-flight guard also stops an
            // invalidated request from re-seeding stale numbers.
            if (data && data.ok !== false && courseCountInflight.get(key) === request) {
                courseCountCache.set(key, { data, ts: Date.now() });
            }
            return data;
        })
        .finally(() => {
            if (courseCountInflight.get(key) === request) courseCountInflight.delete(key);
        });

    courseCountInflight.set(key, request);
    return request;
}

function invalidateCourseCounts(courseId) {
    if (!courseId) {
        courseCountCache.clear();
    } else {
        for (const key of Array.from(courseCountCache.keys())) {
            if (key.startsWith(`${courseId}:`)) courseCountCache.delete(key);
        }
        for (const key of Array.from(courseCountInflight.keys())) {
            if (key.startsWith(`${courseId}:`)) courseCountInflight.delete(key);
        }
    }
    // The aggregate dataset embeds the cached numbers, so rebuild it lazily.
    courseCardData = null;
    courseDataPromise = null;
}

function invalidateEventCounts() {
    eventCountCache = { list: null, ts: 0 };
    courseCardData = null;
    courseDataPromise = null;
}

function invalidateAllCourseData() {
    invalidateCourseCounts();
    invalidateEventCounts();
    invalidateCourseFiles();
    courseCardData = null;
    courseDataPromise = null;
}

// One shared events read powers all card event counts. The main calendar uses
// its own month range query; this is only for aggregate counts.
async function getEventsForCounts(force = false) {
    if (!force && eventCountCache.list && Date.now() - eventCountCache.ts < EVENT_COUNT_TTL) {
        return eventCountCache.list;
    }
    try {
        const snapshot = await db.collection('events').get();
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        eventCountCache = { list, ts: Date.now() };
        return list;
    } catch (error) {
        console.error('Error fetching event counts:', error);
        return [];
    }
}

// Build the full card dataset once; both grids and the Labs grid reuse it.
async function getCourseCardData(force = false) {
    if (!force && courseCardData) return courseCardData;
    if (!force && courseDataPromise) return courseDataPromise;

    courseDataPromise = (async () => {
        const [events, entries] = await Promise.all([
            getEventsForCounts(force),
            Promise.all(COURSES.map(async course => {
                const tasks = [getCourseCounts(course.id, 'theory', force)];
                if (course.hasLab) tasks.push(getCourseCounts(course.id, 'lab', force));
                const results = await Promise.all(tasks);
                return {
                    course,
                    theory: results[0],
                    lab: results[1] || null,
                };
            })),
        ]);

        const countsByCourse = new Map();
        events.forEach(event => {
            if (!event.courseId) return;
            countsByCourse.set(event.courseId, (countsByCourse.get(event.courseId) || 0) + 1);
        });

        entries.forEach(entry => {
            entry.eventCount = countsByCourse.get(entry.course.id) || 0;
        });

        courseCardData = entries;
        return courseCardData;
    })().finally(() => {
        courseDataPromise = null;
    });

    return courseDataPromise;
}

// ===== FILTER PILLS & COURSES TOOLBAR =====
function pad2(value) {
    return String(value).padStart(2, '0');
}

function pluralize(count, singular, plural) {
    return count === 1 ? singular : (plural || `${singular}s`);
}

function setPillState(bar, value) {
    if (!bar) return;
    bar.querySelectorAll('.filter-pill').forEach(pill => {
        const active = pill.dataset.filter === value;
        pill.classList.toggle('active', active);
        pill.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function resetCourseListFilters() {
    courseFilter = 'all';
    courseSearch = '';
    courseSort = 'code';
    const input = document.getElementById('courses-search-input');
    const sort = document.getElementById('courses-sort-select');
    if (input) input.value = '';
    if (sort) sort.value = 'code';
    setPillState(document.getElementById('courses-filter-bar'), 'all');
    if (courseCardData) {
        renderCourseCards('courses-grid-full', courseCardData, courseFilter);
    }
}

function initFilters() {
    // Homepage filter — independent from the Courses page toolbar.
    const homeBar = document.getElementById('home-filter-bar');
    if (homeBar) {
        homeBar.querySelectorAll('.filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                setPillState(homeBar, currentFilter);
                if (courseCardData) {
                    renderCourseCards('home-courses-grid', courseCardData, currentFilter);
                } else {
                    loadAllCourseCards();
                }
            });
        });
    }

    // Courses page filter — never touches the homepage state.
    const coursesBar = document.getElementById('courses-filter-bar');
    if (coursesBar) {
        coursesBar.querySelectorAll('.filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                courseFilter = btn.dataset.filter;
                setPillState(coursesBar, courseFilter);
                if (courseCardData) {
                    renderCourseCards('courses-grid-full', courseCardData, courseFilter);
                } else {
                    loadAllCourseCards();
                }
            });
        });
    }

    const search = document.getElementById('courses-search-input');
    if (search) {
        search.addEventListener('input', () => {
            courseSearch = search.value;
            if (courseCardData) {
                renderCourseCards('courses-grid-full', courseCardData, courseFilter);
            }
        });
    }

    const sort = document.getElementById('courses-sort-select');
    if (sort) {
        sort.value = courseSort;
        sort.addEventListener('change', () => {
            courseSort = sort.value;
            if (courseCardData) {
                renderCourseCards('courses-grid-full', courseCardData, courseFilter);
            }
        });
    }
}

function updateFilterCounters() {
    const theoryCount = COURSES.length; // 6
    const labCount = LAB_COURSES.length; // 3
    const allCount = theoryCount + labCount; // 9

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setEl('count-all', allCount);
    setEl('count-theory', theoryCount);
    setEl('count-lab', labCount);

    setEl('home-count-all', allCount);
    setEl('home-count-theory', theoryCount);
    setEl('home-count-lab', labCount);

    setEl('courses-count-all', allCount);
    setEl('courses-count-theory', theoryCount);
    setEl('courses-count-lab', labCount);

    setEl('courses-stat-theory', pad2(theoryCount));
    setEl('courses-stat-lab', pad2(labCount));
    setEl('courses-stat-total', pad2(allCount));
}

// ===== COURSE CARDS =====
async function loadAllCourseCards(options = {}) {
    const force = !!options.force;
    updateFilterCounters();

    const generation = ++courseRenderGeneration;
    const home = document.getElementById('home-courses-grid');
    const full = document.getElementById('courses-grid-full');

    if (home && !courseCardData) {
        home.setAttribute('aria-busy', 'true');
        home.innerHTML = skeletonMarkup(6);
    }
    if (full && !courseCardData) {
        full.setAttribute('aria-busy', 'true');
        full.innerHTML = skeletonMarkup(6);
    }

    let entries = [];
    try {
        entries = await getCourseCardData(force);
    } catch (error) {
        console.error('Error loading course cards:', error);
    }

    // A newer render started while this one was waiting — discard stale output.
    if (generation !== courseRenderGeneration) return;

    if (home) {
        home.removeAttribute('aria-busy');
        renderCourseCards('home-courses-grid', entries, currentFilter);
    }
    if (full) {
        full.removeAttribute('aria-busy');
        renderCourseCards('courses-grid-full', entries, courseFilter);
    }
    renderLabCards(entries);
}

function renderCourseCards(containerId, entries = [], filter = 'all') {
    if (containerId === 'home-courses-grid') {
        renderHomeCourseCards(entries, filter);
    } else {
        renderArchiveCourseCards(entries, filter);
    }
}

// Homepage archive grid — markup and visual output intentionally unchanged.
function renderHomeCourseCards(entries, filter) {
    const container = document.getElementById('home-courses-grid');
    if (!container) return;

    container.innerHTML = '';

    const theoryData = entries.map(entry => ({
        course: entry.course,
        counts: entry.theory,
        eventCount: entry.eventCount,
    }));
    const labData = entries.filter(entry => entry.course.hasLab).map(entry => ({
        course: entry.course,
        counts: entry.lab,
        eventCount: entry.eventCount,
    }));

    const showTheory = filter === 'all' || filter === 'theory';
    const showLab = filter === 'all' || filter === 'lab';

    // 1. THEORY COURSES SECTION
    if (showTheory) {
        if (filter === 'all') {
            const header = document.createElement('div');
            header.className = 'courses-group-header';
            header.style.gridColumn = '1 / -1';
            header.innerHTML = `
                <div class="courses-group-title">
                    <i class="fas fa-book-reader" style="color: var(--blue-500);"></i> Theory Courses
                </div>
                <span class="courses-group-badge theory">6 Courses</span>
            `;
            container.appendChild(header);
        }

        theoryData.forEach(({ course, counts, eventCount }, index) => {
            const card = document.createElement('div');
            card.className = 'course-card course-card--home';
            card.style.setProperty('--card-accent', course.color);
            card.style.animationDelay = `${index * 0.04}s`;
            card.innerHTML = `
                <span class="course-type-badge theory"><i class="fas fa-book-reader"></i> Theory</span>
                <div class="card-index" aria-hidden="true">TH ${pad2(index + 1)}</div>
                <div class="card-icon" style="background: ${course.gradient}">
                    <i class="${course.icon}"></i>
                </div>
                <div class="card-title">${course.name}${course.hasLab ? ' — Theory' : ''}</div>
                <div class="card-subtitle">${course.code} · Theory Coursework</div>
                <div class="card-meta">
                    <div class="card-meta-item"><i class="fas fa-chalkboard"></i> ${counts.primary} Slides</div>
                    <div class="card-meta-item"><i class="fas fa-scroll"></i> ${counts.papers} Papers</div>
                    <div class="card-meta-item"><i class="fas fa-paperclip"></i> ${counts.tertiary} Materials</div>
                    <div class="card-meta-item"><i class="fas fa-calendar-day"></i> ${eventCount} Events</div>
                </div>
            `;
            card.addEventListener('click', () => openCourseDetail(course.id, 'theory', currentPage));
            container.appendChild(card);
        });
    }

    // 2. LAB SECTIONS
    if (showLab) {
        if (filter === 'all') {
            const header = document.createElement('div');
            header.className = 'courses-group-header';
            header.style.gridColumn = '1 / -1';
            header.innerHTML = `
                <div class="courses-group-title">
                    <i class="fas fa-flask" style="color: #10b981;"></i> Lab Sections
                </div>
                <span class="courses-group-badge lab">3 Labs</span>
            `;
            container.appendChild(header);
        }

        labData.forEach(({ course, counts, eventCount }, index) => {
            const card = document.createElement('div');
            card.className = 'course-card course-card--home';
            card.style.setProperty('--card-accent', '#10b981');
            card.style.animationDelay = `${index * 0.04}s`;
            card.innerHTML = `
                <span class="course-type-badge lab"><i class="fas fa-flask"></i> Practical Lab</span>
                <div class="card-index" aria-hidden="true">LB ${pad2(index + 1)}</div>
                <div class="card-icon" style="background: linear-gradient(135deg, #10b981, #059669)">
                    <i class="fas fa-flask"></i>
                </div>
                <div class="card-title">${course.name} — Lab</div>
                <div class="card-subtitle">${course.code} · Hands-on Practical Lab</div>
                <div class="card-meta">
                    <div class="card-meta-item"><i class="fas fa-vial"></i> ${counts.primary} Manuals</div>
                    <div class="card-meta-item"><i class="fas fa-scroll"></i> ${counts.papers} Past Papers</div>
                    <div class="card-meta-item"><i class="fas fa-laptop-code"></i> ${counts.tertiary} Tasks</div>
                    <div class="card-meta-item"><i class="fas fa-calendar-day"></i> ${eventCount} Events</div>
                </div>
            `;
            card.addEventListener('click', () => openCourseDetail(course.id, 'lab', currentPage));
            container.appendChild(card);
        });
    }
}

// Courses page archive grid — editorial cards, search, sort and grouping.
function renderArchiveCourseCards(entries, filter = courseFilter) {
    const container = document.getElementById('courses-grid-full');
    if (!container) return;

    const term = courseSearch.trim().toLowerCase();
    const matches = course => {
        if (!term) return true;
        return [course.name, course.code, course.description]
            .some(value => (value || '').toLowerCase().includes(term));
    };

    const sorters = {
        code: (a, b) => a.course.code.localeCompare(b.course.code),
        name: (a, b) => a.course.name.localeCompare(b.course.name),
        materials: (a, b) => (b.counts.total - a.counts.total) || a.course.code.localeCompare(b.course.code),
        updated: (a, b) => (b.counts.latestUpdated - a.counts.latestUpdated) || a.course.code.localeCompare(b.course.code),
    };
    const sorter = sorters[courseSort] || sorters.code;

    const makeItem = (entry, kind) => ({
        course: entry.course,
        counts: kind === 'lab' ? entry.lab : entry.theory,
        eventCount: entry.eventCount,
        kind,
    });

    const theory = entries
        .map(entry => makeItem(entry, 'theory'))
        .filter(item => matches(item.course))
        .sort(sorter);
    const labs = entries
        .filter(entry => entry.course.hasLab)
        .map(entry => makeItem(entry, 'lab'))
        .filter(item => matches(item.course))
        .sort(sorter);

    const groups = [];
    if (filter !== 'lab') {
        groups.push({ kind: 'theory', label: 'Theory Courses', jp: '理論', noun: 'Course', items: theory });
    }
    if (filter !== 'theory') {
        groups.push({ kind: 'lab', label: 'Lab Sections', jp: '実験', noun: 'Lab', items: labs });
    }

    const visibleGroups = groups.filter(group => group.items.length > 0);
    const totalShown = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);

    container.innerHTML = '';

    if (totalShown === 0) {
        container.innerHTML = `
            <div class="courses-empty">
                <i class="fas fa-search" aria-hidden="true"></i>
                <h3>No courses match your search</h3>
                <p>Try a different term, or reset the archive filters.</p>
                <button type="button" class="btn btn-ghost btn-sm" id="courses-clear-filters">Clear filters</button>
            </div>
        `;
        const clear = document.getElementById('courses-clear-filters');
        if (clear) clear.addEventListener('click', resetCourseListFilters);
        return;
    }

    visibleGroups.forEach(group => {
        const header = document.createElement('div');
        header.className = 'courses-group-header';
        header.innerHTML = `
            <div class="courses-group-title">
                <span>${group.label}</span>
                <span class="courses-group-jp" aria-hidden="true">${group.jp}</span>
            </div>
            <span class="courses-group-badge ${group.kind}">${pad2(group.items.length)} ${pluralize(group.items.length, group.noun)}</span>
        `;
        container.appendChild(header);

        group.items.forEach((item, index) => {
            container.appendChild(createArchiveCourseCard(item, index));
        });
    });
}

function createArchiveCourseCard(item, index) {
    const { course, counts, eventCount, kind } = item;
    const isLab = kind === 'lab';
    const card = document.createElement('a');

    card.className = `course-card course-card--archive course-card--${kind}`;
    card.href = `#course-${course.id}`;
    card.dataset.courseId = course.id;
    card.dataset.courseMode = kind;
    card.style.setProperty('--card-accent', isLab ? '#10b981' : course.color);
    card.setAttribute('aria-label', `${course.name}, ${course.code}, ${isLab ? 'lab section' : 'theory course'}`);

    const primaryLabel = isLab ? 'Manual' : 'Slide';
    const tertiaryLabel = isLab ? 'Task' : 'Material';
    const metrics = [
        { value: counts.primary, label: pluralize(counts.primary, primaryLabel) },
        { value: counts.papers, label: pluralize(counts.papers, 'Paper') },
        { value: counts.tertiary, label: pluralize(counts.tertiary, tertiaryLabel) },
        { value: eventCount, label: pluralize(eventCount, 'Event') },
    ];

    card.innerHTML = `
        <span class="archive-card-top">
            <span class="archive-card-index">${isLab ? 'LB' : 'TH'} ${pad2(index + 1)}</span>
            <span class="archive-card-type ${kind}">${isLab ? 'Lab' : 'Theory'}</span>
        </span>
        <span class="archive-card-code">${escapeHtml(course.code)}</span>
        <span class="archive-card-title">${escapeHtml(course.name)}</span>
        <span class="archive-card-desc">${escapeHtml(course.description)}</span>
        <span class="archive-card-metrics">
            ${metrics.map(metric => `
                <span class="archive-metric">
                    <span class="archive-metric-value">${pad2(metric.value)}</span>
                    <span class="archive-metric-label">${metric.label}</span>
                </span>
            `).join('')}
        </span>
        <span class="archive-card-open">Open course <span aria-hidden="true">→</span></span>
    `;

    card.addEventListener('click', event => {
        event.preventDefault();
        openCourseDetail(course.id, kind, 'courses');
    });
    card.addEventListener('keydown', event => {
        if (event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
            card.click();
        }
    });

    return card;
}

// ===== COURSE DETAIL VIEW (Theory vs Lab Separation) =====
async function openCourseDetail(courseId, initialMode = 'theory', fromPage = currentPage, options = {}) {
    // BLEACH SHINIGAMI GATE (MVC Easter Egg)
    if (courseId === 'calculus' && !sessionStorage.getItem('bleachGateUnlocked')) {
        promptBleachGate(() => {
            openCourseDetail(courseId, initialMode, fromPage, options);
        });
        return;
    }

    const course = COURSES.find(c => c.id === courseId);
    if (!course) return;

    closeReaderChrome();

    const fromHash = !!options.fromHash;
    if (fromHash) {
        originPage = fromPage || 'courses';
        // Back/Forward into a course entry can restore the "Back to the Archive"
        // behaviour; a fresh deep link starts its own history path.
        courseDetailPushed = !!(history.state
            && history.state.page === 'course'
            && history.state.courseId === courseId);
    } else {
        originPage = fromPage || (currentPage === 'labs' ? 'labs' : currentPage === 'home' ? 'home' : 'courses');
    }

    if (currentPage !== 'courses') navigateTo('courses', false);

    currentCourseId = courseId;
    currentCourseMode = course.hasLab ? initialMode : 'theory';

    const stateTab = fromHash && history.state && history.state.courseId === courseId
        && COURSE_TAB_NAMES.includes(history.state.courseTab)
        ? history.state.courseTab
        : null;
    if (options.tab && COURSE_TAB_NAMES.includes(options.tab)) {
        currentTab = options.tab;
    } else if (stateTab) {
        currentTab = stateTab;
    } else if (!fromHash) {
        currentTab = 'lectures';
    }

    if (!fromHash) {
        setCourseHistory(courseId, currentCourseMode, false, currentTab);
        courseDetailPushed = true;
    }

    document.getElementById('courses-list-view').classList.add('hidden');
    document.getElementById('course-detail-view').classList.remove('hidden');

    // Section Mode Switcher setup
    const modeBar = document.getElementById('course-mode-bar');
    if (course.hasLab) {
        modeBar.classList.remove('hidden');
        document.getElementById('mode-btn-theory').onclick = () => switchCourseMode('theory');
        document.getElementById('mode-btn-lab').onclick = () => switchCourseMode('lab');
    } else {
        modeBar.classList.add('hidden');
        currentCourseMode = 'theory';
    }

    document.getElementById('course-back-btn').onclick = closeCourseDetail;

    // Render content for current mode
    await applyCourseModeView();
    if (pendingReaderFocusRestore) {
        pendingReaderFocusRestore = false;
        restoreReaderFocus();
    }
    const restore = options.restoreScroll;
    window.scrollTo({
        top: restore != null ? restore : 0,
        behavior: restore != null ? 'auto' : 'smooth',
    });
}

function closeCourseDetail() {
    closeReaderChrome();
    resourcePushed = false;
    resourceNavDepth = 0;
    document.getElementById('courses-list-view').classList.remove('hidden');
    document.getElementById('course-detail-view').classList.add('hidden');

    const target = originPage === 'labs' ? 'labs' : originPage === 'home' ? 'home' : 'courses';

    if (courseDetailPushed) {
        courseDetailPushed = false;
        history.back();
        return;
    }

    navigateTo(target, false);
    try {
        history.replaceState({ page: target }, '', `#${target}`);
    } catch (e) {
        window.location.hash = target;
    }
}

async function switchCourseMode(mode) {
    if (currentCourseMode === mode) return;
    currentCourseMode = mode;
    setCourseHistory(currentCourseId, mode, true, currentTab);
    await applyCourseModeView();
}

async function getCourseDetailStats(courseId, mode) {
    const [counts, events] = await Promise.all([
        getCourseCounts(courseId, mode),
        getEventsForCounts(),
    ]);
    return {
        counts,
        eventCount: events.filter(event => event.courseId === courseId).length,
    };
}

function courseDetailStatsMarkup(mode, stats) {
    const isLab = mode === 'lab';
    const metrics = [
        { label: isLab ? 'Manuals' : 'Slides', value: stats.counts.primary },
        { label: isLab ? 'Past papers' : 'Papers', value: stats.counts.papers },
        { label: isLab ? 'Tasks' : 'Materials', value: stats.counts.tertiary },
        { label: 'Events', value: stats.eventCount },
    ];
    return metrics.map(metric => `
        <div class="course-stat">
            <dt>${metric.label}</dt>
            <dd>${pad2(metric.value)}</dd>
        </div>
    `).join('');
}

async function updateCourseDetailHeader(course, mode) {
    const header = document.getElementById('course-header');
    if (!header) return;

    const courseId = course.id;
    const stats = await getCourseDetailStats(courseId, mode);
    if (currentCourseId !== courseId || currentCourseMode !== mode) return;

    const isLab = mode === 'lab';
    const accent = isLab ? '#10b981' : course.color;
    header.style.removeProperty('background');
    header.style.setProperty('--course-accent', accent);
    header.dataset.mode = mode;
    header.dataset.courseId = course.id;
    header.innerHTML = `
        <div class="course-header-content">
            <div class="course-detail-meta">
                <span class="course-detail-code">${escapeHtml(course.code)}</span>
                <span class="course-detail-sep" aria-hidden="true">/</span>
                <span class="course-detail-section">${isLab ? 'Lab Section' : 'Theory Section'}</span>
            </div>
            <h1 class="course-detail-title">${escapeHtml(course.name)}</h1>
            <p class="course-detail-desc">${escapeHtml(isLab
                ? 'Practical lab manuals, experiment sheets, code exercises, and viva past papers.'
                : course.description)}</p>
            <dl class="course-detail-stats" aria-label="Resource totals">
                ${courseDetailStatsMarkup(mode, stats)}
            </dl>
        </div>
    `;
    return stats;
}

async function refreshCourseDetailStats() {
    const course = COURSES.find(c => c.id === currentCourseId);
    if (!course) return;
    const mode = currentCourseMode;
    const stats = await getCourseDetailStats(course.id, mode);
    if (currentCourseId !== course.id || currentCourseMode !== mode) return;
    const statsEl = document.querySelector('#course-header .course-detail-stats');
    if (statsEl) statsEl.innerHTML = courseDetailStatsMarkup(mode, stats);
}

async function applyCourseModeView() {
    const course = COURSES.find(c => c.id === currentCourseId);
    if (!course) return;
    const mode = currentCourseMode;

    // Update Mode Switcher buttons & status
    const btnTheory = document.getElementById('mode-btn-theory');
    const btnLab = document.getElementById('mode-btn-lab');
    const statusText = document.getElementById('mode-status-text');

    if (btnTheory && btnLab) {
        btnTheory.classList.toggle('active', mode === 'theory');
        btnLab.classList.toggle('active', mode === 'lab');
        btnTheory.setAttribute('aria-pressed', mode === 'theory' ? 'true' : 'false');
        btnLab.setAttribute('aria-pressed', mode === 'lab' ? 'true' : 'false');
    }
    if (statusText) {
        statusText.textContent = mode === 'theory' ? 'Theory coursework' : 'Practical lab section';
    }

    await updateCourseDetailHeader(course, mode);
    if (currentCourseId !== course.id || currentCourseMode !== mode) return;

    // Update Tab Labels and Toolbars
    const tabLabel1 = document.getElementById('tab-label-1');
    const tabLabel2 = document.getElementById('tab-label-2');
    const tabLabel3 = document.getElementById('tab-label-3');
    const tabLabel4 = document.getElementById('tab-label-4');

    const tab1Title = document.getElementById('tab-1-title');
    const tab2Title = document.getElementById('tab-2-title');
    const tab3Title = document.getElementById('tab-3-title');

    const upload1Btn = document.getElementById('upload-1-btn-text');
    const upload2Btn = document.getElementById('upload-2-btn-text');
    const upload3Btn = document.getElementById('upload-3-btn-text');

    const cat1 = mode === 'lab' ? 'lab' : 'lectures';
    const cat2 = mode === 'lab' ? 'lab_papers' : 'papers';
    const cat3 = mode === 'lab' ? 'lab_tasks' : 'related';

    if (mode === 'lab') {
        if (tabLabel1) tabLabel1.textContent = 'Lab Manuals';
        if (tabLabel2) tabLabel2.textContent = 'Lab Past Papers';
        if (tabLabel3) tabLabel3.textContent = 'Code & Tasks';
        if (tabLabel4) tabLabel4.textContent = 'Lab Schedule';

        if (tab1Title) tab1Title.innerHTML = '<i class="fas fa-flask"></i> Lab Manuals & Experiments';
        if (tab2Title) tab2Title.innerHTML = '<i class="fas fa-scroll"></i> Lab Past Papers & Viva';
        if (tab3Title) tab3Title.innerHTML = '<i class="fas fa-laptop-code"></i> Code & Lab Tasks';

        if (upload1Btn) upload1Btn.textContent = 'Add Lab Manual';
        if (upload2Btn) upload2Btn.textContent = 'Add Lab Past Paper';
        if (upload3Btn) upload3Btn.textContent = 'Add Lab Task';
    } else {
        if (tabLabel1) tabLabel1.textContent = 'Lecture Slides';
        if (tabLabel2) tabLabel2.textContent = 'Past Papers';
        if (tabLabel3) tabLabel3.textContent = 'Related Materials';
        if (tabLabel4) tabLabel4.textContent = 'Calendar';

        if (tab1Title) tab1Title.innerHTML = '<i class="fas fa-chalkboard"></i> Lecture Slides';
        if (tab2Title) tab2Title.innerHTML = '<i class="fas fa-scroll"></i> Past Papers';
        if (tab3Title) tab3Title.innerHTML = '<i class="fas fa-paperclip"></i> Related Materials';

        if (upload1Btn) upload1Btn.textContent = 'Add Slides';
        if (upload2Btn) upload2Btn.textContent = 'Add Past Paper';
        if (upload3Btn) upload3Btn.textContent = 'Add Material';
    }

    // Hydrate tab badges from the Phase 4A count cache without reading the
    // other collections. Only the tab the student is actually viewing loads.
    resetTabCounts();
    const counts = await getCourseCounts(course.id, mode);
    if (currentCourseId !== course.id || currentCourseMode !== mode) return;
    setTabCount(1, counts.primary);
    setTabCount(2, counts.papers);
    setTabCount(3, counts.tertiary);
    const events = await getEventsForCounts();
    if (currentCourseId !== course.id || currentCourseMode !== mode) return;
    setTabCount(4, events.filter(event => event.courseId === course.id).length);

    // Bind upload buttons to current active collections
    document.getElementById('upload-lectures-btn').onclick = () => openUploadModal(cat1, currentCourseId);
    document.getElementById('upload-papers-btn').onclick = () => openUploadModal(cat2, currentCourseId);
    document.getElementById('upload-related-btn').onclick = () => openUploadModal(cat3, currentCourseId);

    document.getElementById('add-course-event-btn').onclick = () => {
        eventModalCourseId = currentCourseId;
        openEventModal();
    };

    const activeTab = COURSE_TAB_NAMES.includes(currentTab) ? currentTab : 'lectures';
    currentTab = activeTab;
    switchTab(activeTab, false, { load: false });
    await loadCourseTab(activeTab);
}

// ===== TABS =====
const COURSE_TAB_PANELS = {
    'lectures': 'tab-content-lectures',
    'past-papers': 'tab-content-past-papers',
    'related': 'tab-content-related',
    'course-calendar': 'tab-content-course-calendar',
};

function setTabCount(index, count) {
    const el = document.getElementById(`tab-count-${index}`);
    if (!el) return;
    el.textContent = pad2(count);
    el.hidden = false;
}

function resetTabCounts() {
    for (let i = 1; i <= 4; i += 1) clearTabCount(i);
}

function clearTabCount(index) {
    const el = document.getElementById(`tab-count-${index}`);
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
}

function switchTab(tabName, focus = false, options = {}) {
    currentTab = tabName;
    const tabs = Array.from(document.querySelectorAll('#course-tabs .tab'));
    tabs.forEach(tab => {
        const active = tab.dataset.tab === tabName;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
    });

    const activeTab = tabs.find(tab => tab.dataset.tab === tabName);
    const tabBar = document.getElementById('course-tabs');
    if (activeTab && tabBar && tabBar.scrollWidth > tabBar.clientWidth) {
        const barRect = tabBar.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        if (tabRect.left < barRect.left || tabRect.right > barRect.right) {
            tabBar.scrollLeft += (tabRect.left - barRect.left) - (barRect.width - tabRect.width) / 2;
        }
    }

    document.querySelectorAll('#course-detail-view .tab-content').forEach(panel => {
        panel.classList.remove('active');
    });

    const targetId = COURSE_TAB_PANELS[tabName];
    if (targetId) {
        const panel = document.getElementById(targetId);
        if (panel) panel.classList.add('active');
    }

    // Remember the tab without adding a history entry. Back from the Reading
    // Room can then restore the exact category the student came from.
    // A direct `#course-<id>` visit starts with `history.state === null`, so
    // seed the entry here too; otherwise the tab is lost on the way back.
    const detail = document.getElementById('course-detail-view');
    const detailVisible = !!detail && !detail.classList.contains('hidden');
    if (currentPage === 'courses' && currentCourseId && detailVisible && !isResourceViewOpen()) {
        const state = history.state;
        const sameCourse = state && state.page === 'course' && state.courseId === currentCourseId;
        if (!state || sameCourse) {
            try {
                history.replaceState(
                    {
                        page: 'course',
                        courseId: currentCourseId,
                        courseMode: currentCourseMode,
                        courseTab: tabName,
                    },
                    '',
                    window.location.hash
                );
            } catch (error) {
                /* Ignore state failures; the tab still works in-session. */
            }
        }
    }

    // Load only the category the student selected. No background prefetching.
    if (options.load !== false && currentPage === 'courses' && currentCourseId && !isResourceViewOpen()) {
        void loadCourseTab(tabName);
    }
}

function loadCourseTab(tabName) {
    if (!currentCourseId || isResourceViewOpen()) return Promise.resolve();
    if (tabName === 'course-calendar') return renderCourseEvents();
    const category = getCategoryForTab(tabName, currentCourseMode);
    if (!category) return Promise.resolve();
    return renderFileList(category);
}

function initCourseTabs() {
    const tablist = document.getElementById('course-tabs');
    if (!tablist) return;

    tablist.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    tablist.addEventListener('keydown', event => {
        const tabs = Array.from(tablist.querySelectorAll('.tab'));
        const index = tabs.indexOf(document.activeElement);
        if (index < 0) return;

        let next = null;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        if (next === null) return;

        event.preventDefault();
        switchTab(tabs[next].dataset.tab, true);
    });
}

// ===== RENDER FILE LISTS FROM FIRESTORE =====
async function renderFileList(category, options = {}) {
    const listIdMap = {
        lectures: 'lectures-list',
        papers: 'papers-list',
        related: 'related-list',
        lab: 'lectures-list',        // Tab 1 in Lab mode
        lab_papers: 'papers-list',   // Tab 2 in Lab mode
        lab_tasks: 'related-list',   // Tab 3 in Lab mode
    };

    const emptyMessages = {
        lectures: { icon: 'fas fa-chalkboard', title: 'No Lecture Slides Yet', desc: 'Theory lecture slides and presentations will appear here.' },
        papers: { icon: 'fas fa-scroll', title: 'No Past Papers Yet', desc: 'Theory exam past papers will appear here.' },
        related: { icon: 'fas fa-paperclip', title: 'No Related Materials Yet', desc: 'Reference notes, books, and study guides will appear here.' },
        lab: { icon: 'fas fa-flask', title: 'No Lab Manuals Yet', desc: 'Lab manuals, experiment sheets, and guidelines will appear here.' },
        lab_papers: { icon: 'fas fa-scroll', title: 'No Lab Past Papers Yet', desc: 'Lab exam past papers, viva questions, and practical solutions will appear here.' },
        lab_tasks: { icon: 'fas fa-laptop-code', title: 'No Code or Lab Tasks Yet', desc: 'Sample codes, starter projects, and lab assignments will appear here.' },
    };

    const listEl = document.getElementById(listIdMap[category]);
    if (!listEl) return;

    const tabIndexMap = {
        lectures: 1, lab: 1,
        papers: 2, lab_papers: 2,
        related: 3, lab_tasks: 3,
    };
    const courseId = currentCourseId;
    const mode = currentCourseMode;

    // Show loading
    listEl.setAttribute('aria-busy', 'true');
    listEl.innerHTML = skeletonMarkup(3, 'row');

    const result = await getFilesFromDB(courseId, category, options);
    if (currentCourseId !== courseId || currentCourseMode !== mode) return;
    listEl.removeAttribute('aria-busy');

    if (!result.ok) {
        // A failed read is never presented as "no resources yet".
        clearTabCount(tabIndexMap[category]);
        listEl.innerHTML = `
            <div class="empty-state resource-error-state" role="alert">
                <i class="fas fa-cloud-exclamation"></i>
                <h3>Resources could not be loaded</h3>
                <p>We couldn't reach this section. Check your connection and try again.</p>
                <button type="button" class="btn btn-ghost btn-sm" data-retry-category="${escapeAttr(category)}">
                    <i class="fas fa-redo" aria-hidden="true"></i> Retry
                </button>
            </div>
        `;
        const retry = listEl.querySelector('[data-retry-category]');
        if (retry) {
            retry.addEventListener('click', () => {
                renderFileList(category, { force: true });
            });
        }
        return;
    }

    const files = result.files;
    setTabCount(tabIndexMap[category], files.length);

    if (files.length === 0) {
        const msg = emptyMessages[category] || { icon: 'fas fa-folder-open', title: 'No Files Yet', desc: 'Uploaded resources will appear here.' };
        listEl.innerHTML = `
            <div class="empty-state">
                <i class="${msg.icon}"></i>
                <h3>${msg.title}</h3>
                <p>${msg.desc}</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = '';
    files.forEach((file) => {
        listEl.appendChild(createFileItem(file, category));
    });
}

function safeHttpUrl(value) {
    if (!value) return '';
    try {
        const url = new URL(value, window.location.href);
        return (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : '';
    } catch (error) {
        return '';
    }
}

// Phase 4B: recognize the link shapes we can honestly preview. Anything else
// stays an external link; we never fabricate an embed for an unknown host.
function parseResourceUrl(value) {
    const safe = safeHttpUrl(value);
    const invalid = {
        kind: 'invalid', url: '', host: '', source: 'Unknown source',
        embedUrl: '', externalLabel: 'Open link', id: '',
    };
    if (!safe) return invalid;

    let parsed;
    try {
        parsed = new URL(safe);
    } catch (error) {
        return invalid;
    }

    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const path = parsed.pathname;
    const search = parsed.searchParams;
    const base = {
        kind: 'external',
        url: safe,
        host,
        source: host || 'External link',
        embedUrl: '',
        externalLabel: 'Open external link',
        id: '',
    };

    if (host === 'drive.google.com') {
        let id = '';
        const fileMatch = path.match(/\/file\/d\/([^/]+)/);
        if (fileMatch) id = fileMatch[1];
        if (!id && /^\/(open|uc)\/?$/.test(path) && search.get('id')) id = search.get('id');
        if (id) {
            return {
                ...base,
                kind: 'drive',
                id,
                source: 'Google Drive',
                embedUrl: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`,
                externalLabel: 'Open in Google Drive',
            };
        }
        if (/\/folders\//.test(path)) {
            return {
                ...base,
                kind: 'folder',
                source: 'Google Drive',
                externalLabel: 'Open folder in Google Drive',
            };
        }
    }

    if (host === 'docs.google.com') {
        let match = path.match(/\/(document|presentation|spreadsheets)\/d\/e\/([^/]+)/);
        if (match) {
            const docType = match[1];
            const id = match[2];
            const source = docType === 'presentation' ? 'Google Slides'
                : docType === 'spreadsheets' ? 'Google Sheets' : 'Google Docs';
            return {
                ...base,
                kind: 'docs',
                docType,
                published: true,
                id,
                source,
                embedUrl: `https://docs.google.com/${docType}/d/e/${encodeURIComponent(id)}/pub?embedded=true`,
                externalLabel: `Open in ${source}`,
            };
        }
        match = path.match(/\/(document|presentation|spreadsheets)\/d\/([^/]+)/);
        if (match) {
            const docType = match[1];
            const id = match[2];
            const source = docType === 'presentation' ? 'Google Slides'
                : docType === 'spreadsheets' ? 'Google Sheets' : 'Google Docs';
            return {
                ...base,
                kind: 'docs',
                docType,
                published: false,
                id,
                source,
                embedUrl: `https://docs.google.com/${docType}/d/${encodeURIComponent(id)}/preview`,
                externalLabel: `Open in ${source}`,
            };
        }
    }

    return base;
}

// A download action is only shown when the URL represents an actual file
// download rather than another editor/view page.
function isDirectDownloadUrl(value) {
    const info = parseResourceUrl(value);
    if (info.kind === 'invalid' || info.kind === 'folder') return false;

    let parsed;
    try {
        parsed = new URL(info.url);
    } catch (error) {
        return false;
    }
    const search = parsed.searchParams;

    if (info.kind === 'drive') {
        return /\/uc\/?$/.test(parsed.pathname) || search.get('export') === 'download';
    }
    if (info.kind === 'docs') {
        return /\/export\/?$/.test(parsed.pathname) || search.get('export') === 'download';
    }
    if (/\.(pdf|pptx?|docx?|xlsx?|zip|rar|7z|csv|txt)$/i.test(parsed.pathname)) return true;
    return search.get('download') === '1' || search.get('dl') === '1';
}

// Infer a format only from an unambiguous signal. Generic Drive file URLs are
// deliberately left alone: Drive does not expose the MIME type in the URL.
function inferResourceType(value) {
    const info = parseResourceUrl(value);
    if (info.kind === 'invalid') return '';
    if (info.kind === 'folder') return 'link';
    if (info.kind === 'docs') {
        if (info.docType === 'presentation') return 'ppt';
        if (info.docType === 'spreadsheets') return 'sheet';
        return 'doc';
    }

    let path = '';
    try {
        path = new URL(info.url).pathname.toLowerCase();
    } catch (error) {
        return '';
    }

    if (/\.pdf$/.test(path)) return 'pdf';
    if (/\.(ppt|pptx)$/.test(path)) return 'ppt';
    if (/\.(doc|docx)$/.test(path)) return 'doc';
    if (/\.(xls|xlsx|csv)$/.test(path)) return 'sheet';
    if (/\.(zip|rar|7z|tar|gz)$/.test(path)) return 'zip';
    if (/\.(py|js|java|cpp|c|cs|html|css|json|ts|jsx|tsx)$/.test(path)) return 'code';
    return '';
}

function normalizeResourceKey(value) {
    const info = parseResourceUrl(value);
    if (info.kind === 'invalid') return '';
    if (info.kind === 'drive' && info.id) return `drive:${info.id}`;
    if (info.kind === 'docs' && info.id) return `docs:${info.docType}:${info.id}`;
    if (info.kind === 'folder') {
        const match = info.url.match(/\/folders\/([^/?#]+)/);
        if (match) return `drive-folder:${match[1]}`;
    }
    return info.url.replace(/\/+$/, '').toLowerCase();
}

function createFileItem(file, category) {
    const iconInfo = getResourceIconInfo(file.type || file.name);
    const item = document.createElement('div');
    item.className = 'file-item';
    item.dataset.resourceId = file.id || '';
    item.dataset.category = category;

    // Only http(s) links are rendered. Open and Download are independent, and
    // Download is omitted when it would duplicate Open or merely reopen an
    // editor page (e.g. Google Docs).
    const previewUrl = safeHttpUrl(file.previewURL || file.url);
    const downloadCandidate = safeHttpUrl(file.downloadURL);
    const downloadUrl = downloadCandidate && downloadCandidate !== previewUrl
        && isDirectDownloadUrl(downloadCandidate) ? downloadCandidate : '';
    const fileName = escapeHtml(file.name || 'Untitled resource');
    const fileNameAttr = escapeAttr(file.name || 'Untitled resource');
    const routeHash = currentCourseId && file.id
        ? buildResourceHash(currentCourseId, category, file.id)
        : '';

    item.innerHTML = `
        <a class="file-main" href="${escapeAttr(routeHash || '#courses')}" aria-label="Read ${fileNameAttr} in the Reading Room">
            <div class="file-icon ${iconInfo.type}" aria-hidden="true">
                <i class="${iconInfo.icon}"></i>
            </div>
            <div class="file-info">
                <div class="file-name" title="${fileNameAttr}">${fileName}</div>
                ${file.description ? `<div class="file-desc">${escapeHtml(file.description)}</div>` : ''}
                <div class="file-meta">
                    <span class="file-type-pill">${iconInfo.label}</span>
                    ${file.date ? `<span class="file-meta-sep" aria-hidden="true">·</span><span>${escapeHtml(file.date)}</span>` : ''}
                </div>
            </div>
        </a>
        <div class="file-actions">
            ${previewUrl ? `
                <a href="${escapeAttr(previewUrl)}" target="_blank" rel="noopener noreferrer" class="file-action-btn" data-action="open" title="Open online" aria-label="Open ${fileNameAttr} online">
                    <i class="fas fa-external-link-alt" aria-hidden="true"></i><span class="file-action-label">Open</span>
                </a>
            ` : ''}
            ${downloadUrl ? `
                <a href="${escapeAttr(downloadUrl)}" target="_blank" rel="noopener noreferrer" class="file-action-btn" data-action="download" title="Download" aria-label="Download ${fileNameAttr}">
                    <i class="fas fa-download" aria-hidden="true"></i><span class="file-action-label">Download</span>
                </a>
            ` : ''}
            ${!previewUrl && !downloadUrl ? `
                <span class="file-link-missing"><i class="fas fa-link-slash" aria-hidden="true"></i> Link unavailable</span>
            ` : ''}
            <button class="file-action-btn delete" title="Delete (Admin)" aria-label="Delete ${fileNameAttr}" data-id="${escapeAttr(file.id)}" data-category="${escapeAttr(category)}">
                <i class="fas fa-trash-alt" aria-hidden="true"></i>
            </button>
        </div>
    `;

    // Row click opens the Reading Room; explicit actions stay independent.
    const main = item.querySelector('.file-main');
    if (main && routeHash) {
        main.addEventListener('click', (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            openResourceView(currentCourseId, category, file.id, { push: true, trigger: main });
        });
        main.addEventListener('keydown', (event) => {
            if (event.key === ' ' || event.key === 'Spacebar') {
                event.preventDefault();
                openResourceView(currentCourseId, category, file.id, { push: true, trigger: main });
            }
        });
    }
    item.addEventListener('click', (event) => {
        if (event.target.closest('a, button')) return;
        if (routeHash) openResourceView(currentCourseId, category, file.id, { push: true, trigger: main || item });
    });

    // Delete (admin only — CSS hides it for non-admin)
    const deleteBtn = item.querySelector('.delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFileFromDB(file, category);
        });
    }

    return item;
}

function getResourceIconInfo(typeOrName) {
    const val = (typeOrName || '').toLowerCase();
    if (val.includes('pdf')) return { type: 'pdf', icon: 'fas fa-file-pdf', label: 'PDF' };
    if (val.includes('ppt') || val.includes('presentation') || val.includes('slides')) return { type: 'ppt', icon: 'fas fa-file-powerpoint', label: 'Slides' };
    if (val.includes('doc') || val.includes('word')) return { type: 'doc', icon: 'fas fa-file-word', label: 'Document' };
    if (val.includes('sheet') || val.includes('xls') || val.includes('excel')) return { type: 'xls', icon: 'fas fa-file-excel', label: 'Spreadsheet' };
    if (val.includes('code') || val.includes('py') || val.includes('js') || val.includes('cpp') || val.includes('java')) return { type: 'img', icon: 'fas fa-file-code', label: 'Code' };
    if (val.includes('zip') || val.includes('rar') || val.includes('tar')) return { type: 'zip', icon: 'fas fa-file-archive', label: 'Archive' };
    return { type: 'default', icon: 'fas fa-link', label: 'Resource' };
}

// ===== PHASE 4B — THE READING ROOM =====
function isResourceViewOpen() {
    const detail = document.getElementById('course-detail-view');
    return !!detail && detail.classList.contains('reader-open');
}

function clearPreviewTimer() {
    if (resourcePreviewTimer) {
        clearTimeout(resourcePreviewTimer);
        resourcePreviewTimer = null;
    }
}

function closeReaderChrome() {
    clearPreviewTimer();
    const detail = document.getElementById('course-detail-view');
    if (detail) detail.classList.remove('reader-open');
    const reader = document.getElementById('course-reader-view');
    if (reader) {
        reader.classList.add('hidden');
        reader.innerHTML = '';
        reader.removeAttribute('aria-busy');
    }
    if (readerBaseTitle) {
        document.title = readerBaseTitle;
        readerBaseTitle = null;
    }
    currentResourceKey = null;
}

function prepareReaderShell() {
    if (currentPage !== 'courses') navigateTo('courses', false);
    document.getElementById('courses-list-view').classList.add('hidden');
    const detail = document.getElementById('course-detail-view');
    detail.classList.remove('hidden');
    detail.classList.add('reader-open');
    const reader = document.getElementById('course-reader-view');
    reader.classList.remove('hidden');
    reader.setAttribute('aria-busy', 'true');
    window.scrollTo({ top: 0, behavior: 'auto' });
}

function readerSkeletonMarkup() {
    return `
        <div class="reading-room reading-room--loading" aria-label="Loading resource">
            <div class="rr-skeleton rr-skeleton--crumb"></div>
            <div class="rr-skeleton rr-skeleton--eyebrow"></div>
            <div class="rr-skeleton rr-skeleton--title"></div>
            <div class="rr-skeleton rr-skeleton--title rr-skeleton--title-short"></div>
            <div class="rr-skeleton rr-skeleton--line"></div>
            <div class="rr-skeleton rr-skeleton--preview"></div>
        </div>
    `;
}

function renderReaderSkeleton() {
    const reader = document.getElementById('course-reader-view');
    if (!reader) return;
    reader.setAttribute('aria-busy', 'true');
    reader.innerHTML = readerSkeletonMarkup();
}

// ===== READING ROOM FOCUS MANAGEMENT =====
function setReaderReturnFocus(options = {}) {
    const trigger = options.trigger;
    if (trigger && document.contains(trigger)) {
        readerReturnFocus = trigger;
        return;
    }
    const active = document.activeElement;
    if (!readerReturnFocus && active && active !== document.body
        && typeof active.closest === 'function'
        && !active.closest('#course-reader-view')) {
        readerReturnFocus = active;
    }
}

function focusReaderHeading() {
    const reader = document.getElementById('course-reader-view');
    if (!reader || reader.classList.contains('hidden')) return;
    const heading = reader.querySelector('#rr-title')
        || reader.querySelector('.rr-state h1')
        || reader.querySelector('h1');
    const target = heading || reader;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
}

function isFocusableNow(el) {
    return !!(el && document.contains(el) && !el.closest('.hidden'));
}

function restoreReaderFocus() {
    const direct = readerReturnFocus;
    const info = readerReturnFocusInfo;
    readerReturnFocus = null;
    readerReturnFocusInfo = null;

    if (isFocusableNow(direct)) {
        direct.focus({ preventScroll: true });
        return;
    }

    const focusPageFallback = () => {
        const tab = document.querySelector('#course-tabs .tab[aria-selected="true"]');
        if (isFocusableNow(tab)) {
            tab.focus({ preventScroll: true });
            return;
        }
        // Browser Back may land on the archive instead of a course page; give
        // the keyboard a sensible place to continue from.
        const card = document.querySelector('#courses-list-view .course-card');
        if (isFocusableNow(card)) card.focus({ preventScroll: true });
    };

    if (!info) {
        focusPageFallback();
        return;
    }

    const escapeId = value => (window.CSS && typeof CSS.escape === 'function'
        ? CSS.escape(String(value))
        : String(value).replace(/["\\]/g, '\\$&'));
    const deadline = Date.now() + 1500;
    const findAndFocus = () => {
        const selector = `.file-item[data-resource-id="${escapeId(info.docId)}"][data-category="${escapeId(info.category)}"] .file-main`;
        const target = document.querySelector(selector);
        if (isFocusableNow(target)) {
            target.focus({ preventScroll: true });
            return;
        }
        if (Date.now() < deadline) {
            requestAnimationFrame(findAndFocus);
            return;
        }
        focusPageFallback();
    };
    requestAnimationFrame(findAndFocus);
}

async function openResourceView(courseId, category, docId, options = {}) {
    // The Bleach gate guards every calculus URL, including direct resource deep
    // links. Prompt before the reader shell or skeleton is rendered so no
    // protected content can appear until access is granted.
    if (courseId === 'calculus' && !sessionStorage.getItem('bleachGateUnlocked')) {
        navigateTo('courses', false);
        promptBleachGate(() => {
            openResourceView(courseId, category, docId, options);
        }, options.trigger);
        return;
    }

    const course = COURSES.find(c => c.id === courseId) || null;
    const meta = getCategoryMeta(category);

    if (!course || !meta || !docId) {
        resetResourceNavigation();
        showResourceNotFound({
            reason: !course ? 'course' : 'category',
            course,
            category,
        });
        return;
    }

    const wasOpen = isResourceViewOpen();
    if (!options.fromHash && !wasOpen) {
        resourceReturnScroll = window.scrollY;
    }

    const key = `${course.id}:${category}:${docId}`;
    currentCourseId = course.id;
    currentCourseMode = meta.mode;
    currentTab = meta.tab;

    prepareReaderShell();
    // prepareReaderShell may navigate to the Courses page, which clears the
    // reader key. Claim it only after the shell is ready.
    currentResourceKey = key;
    if (!wasOpen) {
        // Capture the trigger after any page-level reset so closing the reader
        // can return focus to the row that opened it.
        setReaderReturnFocus(options);
        readerReturnFocusInfo = { courseId: course.id, category, docId };
        pendingReaderFocusRestore = false;
    }
    renderReaderSkeleton();

    if (options.push && !options.fromHash) {
        const hash = buildResourceHash(course.id, category, docId);
        const nextDepth = resourceNavDepth + 1;
        try {
            history.pushState({
                page: 'resource',
                courseId: course.id,
                category,
                docId,
                courseMode: meta.mode,
                courseTab: meta.tab,
                resourceDepth: nextDepth,
            }, '', hash);
            resourceNavDepth = nextDepth;
            resourcePushed = true;
        } catch (error) {
            window.location.hash = hash;
        }
    } else if (options.fromHash) {
        const state = history.state;
        resourcePushed = !!(state && state.page === 'resource');
        resourceNavDepth = resourcePushed ? (state.resourceDepth || 0) : 0;
    }

    const result = await getFilesFromDB(course.id, category, { force: !!options.force });
    if (currentResourceKey !== key) return;

    if (!result.ok) {
        renderResourceError(course, category, docId);
        return;
    }

    const files = result.files;
    const index = files.findIndex(file => file.id === docId);
    if (index < 0) {
        showResourceNotFound({ reason: 'missing', course, category });
        return;
    }

    renderResourceView(course, category, files[index], files, index);
    focusReaderHeading();
}

function previewFacadeMarkup(info, file, iconInfo) {
    return `
        <div class="rr-facade" id="rr-facade">
            <div class="rr-facade-icon ${iconInfo.type}" aria-hidden="true">
                <i class="${iconInfo.icon}"></i>
            </div>
            <p class="rr-kicker">In-site preview</p>
            <h2>Read it here</h2>
            <p class="rr-facade-copy">
                This document loads from ${escapeHtml(info.source)} only when you ask.
                It may ask you to sign in with a Google account that has access.
            </p>
            <button type="button" class="btn btn-primary rr-load-btn" data-rr-load-preview aria-controls="rr-preview-region">
                <i class="fas fa-book-open" aria-hidden="true"></i> Load preview
            </button>
            <p class="rr-facade-note">
                Nothing loads automatically.
                <a href="${escapeAttr(info.url)}" target="_blank" rel="noopener noreferrer">Open externally</a> instead.
            </p>
        </div>
    `;
}

function renderResourceView(course, category, file, files, index) {
    const reader = document.getElementById('course-reader-view');
    if (!reader) return;

    const meta = getCategoryMeta(category);
    const iconInfo = getResourceIconInfo(file.type || file.name);
    const viewInfo = parseResourceUrl(file.previewURL || file.url);
    const externalInfo = parseResourceUrl(file.url || file.previewURL || file.downloadURL);
    const downloadUrl = safeHttpUrl(file.downloadURL);
    const showDownload = !!(downloadUrl
        && downloadUrl !== viewInfo.url
        && isDirectDownloadUrl(downloadUrl));
    const canPreview = !!viewInfo.embedUrl;
    const externalUrl = externalInfo.kind !== 'invalid'
        ? externalInfo.url
        : (viewInfo.kind !== 'invalid' ? viewInfo.url : '');
    const externalLabel = externalInfo.externalLabel || viewInfo.externalLabel || 'Open external link';
    const source = viewInfo.kind !== 'invalid' ? viewInfo.source : externalInfo.source;
    const title = file.name || 'Untitled resource';
    const titleAttr = escapeAttr(title);
    const categoryLabel = meta ? meta.label : 'Resource';
    const courseName = course.name;
    const date = file.date || 'Date not recorded';
    const description = file.description || '';

    let reason = 'This link opens outside Sledge Classroom.';
    if (viewInfo.kind === 'folder') {
        reason = 'Google Drive folders cannot be embedded inside Sledge Classroom.';
    } else if (viewInfo.kind === 'external') {
        reason = 'This file is hosted outside Google Drive, so Sledge cannot embed it.';
    } else if (viewInfo.kind === 'invalid') {
        reason = 'This resource does not have a valid preview link.';
    }

    const prevFile = index > 0 ? files[index - 1] : null;
    const nextFile = index < files.length - 1 ? files[index + 1] : null;
    const related = files
        .map((entry, entryIndex) => ({ entry, entryIndex }))
        .filter(item => item.entryIndex !== index)
        .slice(0, 4);

    let actions = '';
    if (canPreview) {
        actions += `
            <button type="button" class="btn btn-primary rr-action-primary" id="rr-load-preview" data-rr-load-preview aria-controls="rr-preview-region">
                <i class="fas fa-book-open" aria-hidden="true"></i> View online
            </button>
        `;
    } else if (externalUrl) {
        actions += `
            <a class="btn btn-primary rr-action-primary" href="${escapeAttr(externalUrl)}" target="_blank" rel="noopener noreferrer">
                <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> ${escapeHtml(externalLabel)}
            </a>
        `;
    }
    if (canPreview && externalUrl) {
        actions += `
            <a class="btn btn-ghost" href="${escapeAttr(externalUrl)}" target="_blank" rel="noopener noreferrer">
                <i class="fas fa-external-link-alt" aria-hidden="true"></i> ${escapeHtml(externalLabel)}
            </a>
        `;
    }
    if (showDownload) {
        actions += `
            <a class="btn btn-ghost" href="${escapeAttr(downloadUrl)}" target="_blank" rel="noopener noreferrer" data-action="download">
                <i class="fas fa-download" aria-hidden="true"></i> Download
            </a>
        `;
    }
    if (!actions) {
        actions = `
            <p class="rr-missing-link" role="alert">
                <i class="fas fa-link-slash" aria-hidden="true"></i>
                This resource has no usable link. An administrator can update it from the course category.
            </p>
        `;
    }

    const previewBody = canPreview
        ? previewFacadeMarkup(viewInfo, file, iconInfo)
        : `
            <div class="rr-unavailable">
                <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                <h2>In-site preview isn't available</h2>
                <p>${escapeHtml(reason)}</p>
                ${externalUrl ? `<a class="btn btn-ghost btn-sm" href="${escapeAttr(externalUrl)}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> ${escapeHtml(externalLabel)}
                </a>` : ''}
            </div>
        `;

    const prevMarkup = prevFile ? `
        <a class="rr-nav-link rr-nav-prev" href="${escapeAttr(buildResourceHash(course.id, category, prevFile.id))}" data-rr-open-resource="${escapeAttr(prevFile.id)}">
            <span class="rr-nav-direction"><i class="fas fa-arrow-left" aria-hidden="true"></i> Previous</span>
            <span class="rr-nav-name">${escapeHtml(prevFile.name || 'Untitled resource')}</span>
        </a>
    ` : '<span></span>';
    const nextMarkup = nextFile ? `
        <a class="rr-nav-link rr-nav-next" href="${escapeAttr(buildResourceHash(course.id, category, nextFile.id))}" data-rr-open-resource="${escapeAttr(nextFile.id)}">
            <span class="rr-nav-direction">Next <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
            <span class="rr-nav-name">${escapeHtml(nextFile.name || 'Untitled resource')}</span>
        </a>
    ` : '<span></span>';

    const relatedMarkup = related.length ? `
        <section class="rr-related" aria-labelledby="rr-related-title">
            <div class="rr-related-head">
                <h2 id="rr-related-title">More in ${escapeHtml(categoryLabel)}</h2>
                <button type="button" class="rr-text-link" data-rr-back-category>
                    View all <i class="fas fa-arrow-right" aria-hidden="true"></i>
                </button>
            </div>
            <div class="rr-related-list">
                ${related.map(({ entry }) => {
                    const info = getResourceIconInfo(entry.type || entry.name);
                    return `
                        <a class="rr-related-item" href="${escapeAttr(buildResourceHash(course.id, category, entry.id))}" data-rr-open-resource="${escapeAttr(entry.id)}">
                            <span class="rr-related-icon ${info.type}" aria-hidden="true"><i class="${info.icon}"></i></span>
                            <span class="rr-related-copy">
                                <span class="rr-related-name">${escapeHtml(entry.name || 'Untitled resource')}</span>
                                <span class="rr-related-meta">${info.label}${entry.date ? ` · ${escapeHtml(entry.date)}` : ''}</span>
                            </span>
                        </a>
                    `;
                }).join('')}
            </div>
        </section>
    ` : '';

    if (!readerBaseTitle) readerBaseTitle = document.title;
    document.title = `${title} — ${courseName} | Sledge Classroom`;

    reader.innerHTML = `
        <article class="reading-room" aria-labelledby="rr-title">
            <div class="rr-topline">
                <button type="button" class="rr-back-btn" id="rr-back-to-category">
                    <i class="fas fa-arrow-left" aria-hidden="true"></i> Back to ${escapeHtml(categoryLabel)}
                </button>
                <nav class="rr-breadcrumb" aria-label="Breadcrumb">
                    <a href="#courses" data-rr-nav="courses">Courses</a>
                    <span aria-hidden="true">/</span>
                    <a href="${escapeAttr(`#course-${course.id}`)}" data-rr-nav="course">${escapeHtml(courseName)}</a>
                    <span aria-hidden="true">/</span>
                    <a href="${escapeAttr(`#course-${course.id}`)}" data-rr-nav="category">${escapeHtml(categoryLabel)}</a>
                    <span aria-hidden="true">/</span>
                    <span aria-current="page">${escapeHtml(title)}</span>
                </nav>
            </div>

            <header class="rr-header">
                <p class="rr-eyebrow">
                    <span>${escapeHtml(course.code)}</span>
                    <span aria-hidden="true">·</span>
                    <span>${escapeHtml(categoryLabel)}</span>
                    <span aria-hidden="true">·</span>
                    <span>${escapeHtml(iconInfo.label)}</span>
                </p>
                <h1 class="rr-title" id="rr-title">${escapeHtml(title)}</h1>
                ${description
                    ? `<p class="rr-desc">${escapeHtml(description)}</p>`
                    : '<p class="rr-desc rr-desc--empty">No description has been added for this resource.</p>'}
                <dl class="rr-meta">
                    <div><dt>Uploaded</dt><dd>${escapeHtml(date)}</dd></div>
                    <div><dt>Source</dt><dd>${escapeHtml(source)}</dd></div>
                    <div><dt>Format</dt><dd>${escapeHtml(iconInfo.label)}</dd></div>
                    <div><dt>Course</dt><dd>${escapeHtml(course.code)}</dd></div>
                </dl>
            </header>

            <div class="rr-actions">${actions}</div>

            <section class="rr-preview" id="rr-preview-region" aria-label="Document preview">
                <div class="rr-preview-head">
                    <span class="rr-kicker">${canPreview ? 'In-site preview' : 'Preview unavailable'}</span>
                    <span class="rr-preview-source">${escapeHtml(source)}</span>
                </div>
                <div class="rr-stage" id="rr-preview-stage">
                    ${previewBody}
                </div>
            </section>

            <footer class="rr-footer">
                <div class="rr-footer-back">
                    <button type="button" class="rr-text-link" data-rr-back-category>
                        <i class="fas fa-arrow-left" aria-hidden="true"></i> Back to ${escapeHtml(categoryLabel)}
                    </button>
                </div>
                ${prevMarkup}
                ${nextMarkup}
            </footer>

            ${relatedMarkup}
        </article>
    `;

    reader.removeAttribute('aria-busy');

    // Preview loads only on explicit request.
    reader.querySelectorAll('[data-rr-load-preview]').forEach(button => {
        button.addEventListener('click', () => loadResourcePreview(viewInfo, file));
    });

    reader.querySelectorAll('[data-rr-back-category]').forEach(button => {
        button.addEventListener('click', closeReaderView);
    });
    const backBtn = document.getElementById('rr-back-to-category');
    if (backBtn) backBtn.addEventListener('click', closeReaderView);

    reader.querySelectorAll('[data-rr-nav]').forEach(link => {
        link.addEventListener('click', event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (link.dataset.rrNav === 'courses') {
                navigateTo('courses');
            } else {
                closeReaderView();
            }
        });
    });

    reader.querySelectorAll('[data-rr-open-resource]').forEach(link => {
        link.addEventListener('click', event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            openResourceView(course.id, category, link.dataset.rrOpenResource, { push: true, trigger: link });
        });
    });
}

function loadResourcePreview(info, file) {
    if (!info || !info.embedUrl) return;
    const stage = document.getElementById('rr-preview-stage');
    const region = document.getElementById('rr-preview-region');
    if (!stage || !region) return;

    clearPreviewTimer();
    region.setAttribute('aria-busy', 'true');
    stage.innerHTML = `
        <div class="rr-preview-loading" id="rr-preview-loading" role="status">
            <span class="spinner" aria-hidden="true"></span>
            <p>Loading preview…</p>
            <p class="rr-preview-note">If Google asks you to sign in, your account needs access to this file.</p>
        </div>
    `;

    const iframe = document.createElement('iframe');
    iframe.className = 'rr-iframe';
    iframe.src = info.embedUrl;
    iframe.title = `Preview of ${file.name || 'resource'}`;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    iframe.setAttribute('allow', 'fullscreen');
    iframe.setAttribute('allowfullscreen', '');

    let settled = false;
    const fail = (message) => {
        if (settled) return;
        settled = true;
        clearPreviewTimer();
        region.removeAttribute('aria-busy');
        stage.innerHTML = `
            <div class="rr-preview-fallback" role="alert">
                <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
                <h2>Preview didn't load</h2>
                <p>${escapeHtml(message)} Google may restrict embedding for this file, or the viewer may need a signed-in account.</p>
                <div class="rr-fallback-actions">
                    <a class="btn btn-primary btn-sm" href="${escapeAttr(info.url)}" target="_blank" rel="noopener noreferrer">
                        <i class="fas fa-external-link-alt" aria-hidden="true"></i> Open externally
                    </a>
                    <button type="button" class="btn btn-ghost btn-sm" id="rr-preview-retry">
                        <i class="fas fa-redo" aria-hidden="true"></i> Try again
                    </button>
                </div>
            </div>
        `;
        const retry = document.getElementById('rr-preview-retry');
        if (retry) retry.addEventListener('click', () => loadResourcePreview(info, file));
    };

    iframe.addEventListener('load', () => {
        if (settled) return;
        settled = true;
        clearPreviewTimer();
        region.removeAttribute('aria-busy');
        stage.classList.add('is-loaded');
        const loading = document.getElementById('rr-preview-loading');
        if (loading) loading.remove();
    });
    iframe.addEventListener('error', () => fail('The preview could not be loaded.'));

    resourcePreviewTimer = setTimeout(() => {
        fail('The preview took too long to respond.');
    }, 15000);

    stage.appendChild(iframe);
}

function returnToCourseTab(tab = currentTab, options = {}) {
    if (!currentCourseId) {
        navigateTo('courses');
        return;
    }
    const safeTab = COURSE_TAB_NAMES.includes(tab) ? tab : 'lectures';
    const courseId = currentCourseId;
    const mode = currentCourseMode;
    const hash = `#course-${courseId}`;
    const state = { page: 'course', courseId, courseMode: mode, courseTab: safeTab };

    closeReaderChrome();
    resourcePushed = false;
    resourceNavDepth = 0;
    document.getElementById('courses-list-view').classList.add('hidden');
    document.getElementById('course-detail-view').classList.remove('hidden');

    try {
        if (options.replace) history.replaceState(state, '', hash);
        else history.pushState(state, '', hash);
    } catch (error) {
        window.location.hash = hash;
    }

    currentTab = safeTab;
    const header = document.getElementById('course-header');
    const needsRender = !header
        || header.dataset.courseId !== courseId
        || header.dataset.mode !== mode;

    if (needsRender) {
        // Arrived from a direct resource deep link: the course detail was never
        // rendered, so hydrate it before revealing the category.
        applyCourseModeView();
    } else {
        switchTab(safeTab);
    }

    window.scrollTo({
        top: options.restoreScroll !== false && resourceReturnScroll != null ? resourceReturnScroll : 0,
        behavior: 'auto',
    });
    resourceReturnScroll = null;
    if (pendingReaderFocusRestore) {
        pendingReaderFocusRestore = false;
        restoreReaderFocus();
    }
}

function closeReaderView() {
    clearPreviewTimer();
    pendingReaderFocusRestore = true;
    if (resourceNavDepth > 0) {
        const depth = resourceNavDepth;
        resourceNavDepth = 0;
        resourcePushed = false;
        history.go(-depth);
        return;
    }
    returnToCourseTab(currentTab, { push: true });
}

function readerStateMarkup({ icon, title, message, action = '' }) {
    return `
        <div class="reading-room reading-room--state">
            <div class="rr-topline">
                <button type="button" class="rr-back-btn" data-rr-state-back>
                    <i class="fas fa-arrow-left" aria-hidden="true"></i> Back to the Archive
                </button>
            </div>
            <div class="rr-state">
                <i class="${icon}" aria-hidden="true"></i>
                <p class="rr-kicker">The Reading Room</p>
                <h1>${escapeHtml(title)}</h1>
                <p>${escapeHtml(message)}</p>
                ${action}
            </div>
        </div>
    `;
}

function showResourceNotFound({ reason, course, category }) {
    currentResourceKey = null;
    currentCourseId = course ? course.id : null;
    prepareReaderShell();

    const meta = getCategoryMeta(category);
    const canReturn = !!(course && meta);
    const title = reason === 'course' ? 'Course not found' : 'Resource not found';
    const message = reason === 'course'
        ? 'This course link is incomplete or the course no longer exists.'
        : reason === 'category'
            ? 'This resource category is not part of the course.'
            : 'This resource may have been removed, or the link is incomplete.';

    const reader = document.getElementById('course-reader-view');
    reader.innerHTML = readerStateMarkup({
        icon: 'fas fa-compass',
        title,
        message,
        action: canReturn
            ? `<button type="button" class="btn btn-primary btn-sm" data-rr-state-category>
                   Back to ${escapeHtml(meta.label)}
               </button>`
            : `<a class="btn btn-primary btn-sm" href="#courses" data-rr-state-archive>
                   Back to the Archive
               </a>`,
    });
    reader.removeAttribute('aria-busy');
    if (!readerBaseTitle) readerBaseTitle = document.title;
    document.title = `${title} | Sledge Classroom`;

    const back = reader.querySelector('[data-rr-state-back]');
    if (back) back.addEventListener('click', () => {
        if (canReturn) closeReaderView();
        else navigateTo('courses');
    });
    const categoryBtn = reader.querySelector('[data-rr-state-category]');
    if (categoryBtn) categoryBtn.addEventListener('click', () => closeReaderView());
    const archive = reader.querySelector('[data-rr-state-archive]');
    if (archive) archive.addEventListener('click', event => {
        event.preventDefault();
        navigateTo('courses');
    });
    focusReaderHeading();
}

function renderResourceError(course, category, docId) {
    prepareReaderShell();
    const meta = getCategoryMeta(category);
    const reader = document.getElementById('course-reader-view');
    reader.innerHTML = readerStateMarkup({
        icon: 'fas fa-cloud-exclamation',
        title: 'This resource could not be loaded',
        message: 'We could not reach the library. Check your connection and try again.',
        action: `
            <div class="rr-state-actions">
                <button type="button" class="btn btn-primary btn-sm" data-rr-state-retry>
                    <i class="fas fa-redo" aria-hidden="true"></i> Retry
                </button>
                ${meta ? `<button type="button" class="btn btn-ghost btn-sm" data-rr-state-category>
                    Back to ${escapeHtml(meta.label)}
                </button>` : ''}
            </div>
        `,
    });
    reader.removeAttribute('aria-busy');
    if (!readerBaseTitle) readerBaseTitle = document.title;
    document.title = 'Resource unavailable | Sledge Classroom';

    const back = reader.querySelector('[data-rr-state-back]');
    if (back) back.addEventListener('click', () => closeReaderView());
    const retry = reader.querySelector('[data-rr-state-retry]');
    if (retry) retry.addEventListener('click', () => {
        openResourceView(course.id, category, docId, { fromHash: true, force: true });
    });
    const categoryBtn = reader.querySelector('[data-rr-state-category]');
    if (categoryBtn) categoryBtn.addEventListener('click', () => closeReaderView());
    focusReaderHeading();
}

// ===== DELETE RESOURCE FROM FIREBASE FIRESTORE =====
async function deleteFileFromDB(file, category) {
    if (!isAdmin) {
        showToast('Only admin can delete resources', 'error');
        return;
    }

    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;

    const courseId = currentCourseId;
    showLoading('Deleting resource...');

    try {
        await db.collection('courses').doc(courseId)
            .collection(category).doc(file.id).delete();

        showToast('Resource deleted successfully', 'success');

        invalidateCourseCounts(courseId);
        invalidateCourseFiles(courseId, category);
        await renderFileList(category);
        await refreshCourseDetailStats();
        await loadAllCourseCards();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Unable to delete this resource. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// ===== RESOURCE MODAL (Google Drive, OneDrive, Links) =====
function showUploadFormError(message) {
    const errorEl = document.getElementById('upload-form-error');
    const urlInput = document.getElementById('resource-url');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
    if (urlInput) urlInput.setAttribute('aria-invalid', 'true');
}

function clearUploadFormError() {
    const errorEl = document.getElementById('upload-form-error');
    const urlInput = document.getElementById('resource-url');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }
    if (urlInput) urlInput.removeAttribute('aria-invalid');
}

function initUploadModal() {
    document.getElementById('upload-cancel-btn').addEventListener('click', closeUploadModal);
    document.getElementById('upload-modal-close').addEventListener('click', closeUploadModal);
    document.getElementById('upload-modal').addEventListener('click', (e) => {
        if (e.target.id === 'upload-modal') closeUploadModal();
    });

    document.getElementById('upload-confirm-btn').addEventListener('click', confirmUpload);

    // Auto-detect format on URL paste
    const urlInput = document.getElementById('resource-url');
    if (urlInput) {
        urlInput.addEventListener('input', () => {
            clearUploadFormError();
            const typeSelect = document.getElementById('resource-type');
            if (!typeSelect) return;
            // Only unambiguous formats override the student/admin selection.
            // Generic Drive file links do not reveal their MIME type.
            const inferred = inferResourceType(urlInput.value.trim());
            if (inferred) typeSelect.value = inferred;
        });
    }
}

function openUploadModal(category, courseId) {
    if (!isAdmin) {
        showToast('Please sign in as admin to add resources', 'error');
        return;
    }

    uploadContext = { category, courseId };

    const modal = document.getElementById('upload-modal');
    const title = document.getElementById('upload-modal-title');

    const titles = {
        lectures: '<i class="fas fa-chalkboard"></i> Add Lecture Slides',
        papers: '<i class="fas fa-scroll"></i> Add Past Paper',
        related: '<i class="fas fa-paperclip"></i> Add Related Material',
        lab: '<i class="fas fa-flask"></i> Add Lab Manual / Experiment',
        lab_papers: '<i class="fas fa-scroll"></i> Add Lab Past Paper / Viva',
        lab_tasks: '<i class="fas fa-laptop-code"></i> Add Code / Lab Task',
    };
    title.innerHTML = titles[category] || '<i class="fas fa-link"></i> Add Resource';

    document.getElementById('resource-title').value = '';
    document.getElementById('resource-url').value = '';
    document.getElementById('resource-description').value = '';
    clearUploadFormError();

    // Set default format based on category
    const typeSelect = document.getElementById('resource-type');
    if (typeSelect) {
        if (category === 'lectures') typeSelect.value = 'ppt';
        else if (category === 'papers' || category === 'lab_papers') typeSelect.value = 'pdf';
        else if (category === 'lab_tasks') typeSelect.value = 'code';
        else if (category === 'lab') typeSelect.value = 'pdf';
        else typeSelect.value = 'pdf';
    }

    modal.classList.remove('hidden');
    document.getElementById('resource-title').focus();
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
    clearUploadFormError();
    uploadContext = null;
}

// ===== SAVE RESOURCE TO FIRESTORE =====
async function confirmUpload() {
    if (!uploadContext || !isAdmin) return;

    clearUploadFormError();

    const title = document.getElementById('resource-title').value.trim();
    let url = document.getElementById('resource-url').value.trim();
    const selectedType = document.getElementById('resource-type').value;
    const description = document.getElementById('resource-description').value.trim();
    const { category, courseId } = uploadContext;

    if (!title) {
        showToast('Please enter a resource title', 'error');
        document.getElementById('resource-title').focus();
        return;
    }

    if (!url) {
        showUploadFormError('Please enter the document or share link.');
        document.getElementById('resource-url').focus();
        return;
    }

    // Normalize the scheme, then accept only http(s). This rejects
    // javascript:, data:, ftp: and malformed links before any write.
    if (/^\/\//.test(url)) url = 'https:' + url;
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;

    const safeUrl = safeHttpUrl(url);
    if (!safeUrl) {
        showUploadFormError('That link is not a valid http:// or https:// URL.');
        document.getElementById('resource-url').focus();
        return;
    }
    url = safeUrl;

    // Infer only from a clear extension or a known Google Docs/Drive path.
    const inferredType = inferResourceType(url);
    const type = inferredType || selectedType;

    // Smart link conversions (existing records remain untouched).
    let previewURL = url;
    let downloadURL = url;

    const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
    const driveIdMatch = url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i);
    const driveFileId = driveFileMatch ? driveFileMatch[1] : (driveIdMatch ? driveIdMatch[1] : '');
    if (driveFileId) {
        previewURL = `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;
        downloadURL = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    } else if (url.includes('dropbox.com') && /dl=0(?:&|$)/.test(url)) {
        downloadURL = url.replace('dl=0', 'dl=1');
    }

    const confirmBtn = document.getElementById('upload-confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking link...';

    try {
        // Duplicate detection is scoped to this course/category. We compare
        // normalized Drive/Docs IDs so tracking parameters do not hide a copy.
        const existing = await getFilesFromDB(courseId, category, { force: true });
        if (!existing.ok) {
            showUploadFormError('We could not check this section for duplicates. Please try again.');
            return;
        }

        const key = normalizeResourceKey(url);
        const duplicate = key && existing.files.some(file => (
            [file.url, file.previewURL, file.downloadURL]
                .some(candidate => candidate && normalizeResourceKey(candidate) === key)
        ));
        if (duplicate) {
            showUploadFormError('That link is already in this section. Choose a different file or section.');
            document.getElementById('resource-url').focus();
            return;
        }

        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        await db.collection('courses').doc(courseId)
            .collection(category)
            .add({
                name: title,
                url: url,
                previewURL: previewURL,
                downloadURL: downloadURL,
                type: type,
                description: description,
                date: new Date().toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                }),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

        showToast('Resource added successfully!', 'success');
        closeUploadModal();

        invalidateCourseCounts(courseId);
        invalidateCourseFiles(courseId, category);
        await renderFileList(category);
        await refreshCourseDetailStats();
        await loadAllCourseCards();

    } catch (error) {
        console.error('Save resource error:', error);
        showUploadFormError('Unable to save this resource. Please try again.');
        showToast('Unable to save this resource. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Save Resource';
    }
}

// ===== LAB CARDS =====
function renderLabCards(entries) {
    const container = document.getElementById('labs-grid');
    if (!container) return;

    if (!Array.isArray(entries)) {
        container.setAttribute('aria-busy', 'true');
        container.innerHTML = skeletonMarkup(3);
        return;
    }

    const results = entries
        .filter(entry => entry.course.hasLab)
        .map(entry => ({
            course: entry.course,
            counts: entry.lab,
            eventCount: entry.eventCount,
        }));

    container.removeAttribute('aria-busy');
    container.innerHTML = '';

    results.forEach(({ course, counts, eventCount }) => {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.style.setProperty('--card-accent', '#10b981');
        card.innerHTML = `
            <span class="course-type-badge lab"><i class="fas fa-flask"></i> Practical Lab</span>
            <div class="card-icon" style="background: linear-gradient(135deg, #10b981, #059669)">
                <i class="fas fa-flask"></i>
            </div>
            <div class="card-title">${course.name} — Lab</div>
            <div class="card-subtitle">${course.code} · Hands-on Practical Lab</div>
            <div class="card-meta">
                <div class="card-meta-item"><i class="fas fa-vial"></i> ${counts.primary} Manuals</div>
                <div class="card-meta-item"><i class="fas fa-scroll"></i> ${counts.papers} Past Papers</div>
                <div class="card-meta-item"><i class="fas fa-laptop-code"></i> ${counts.tertiary} Tasks</div>
                <div class="card-meta-item"><i class="fas fa-calendar-day"></i> ${eventCount} Events</div>
            </div>
        `;
        card.addEventListener('click', () => openCourseDetail(course.id, 'lab', 'labs'));
        container.appendChild(card);
    });
    container.removeAttribute('aria-busy');
}

async function openLabDetail(courseId) {
    await openCourseDetail(courseId, 'lab', 'labs');
}

// ===== EVENT MODAL =====
function initEventModal() {
    const modal = document.getElementById('event-modal');
    document.getElementById('event-cancel-btn').addEventListener('click', closeEventModal);
    document.getElementById('event-modal-close').addEventListener('click', closeEventModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEventModal();
    });
    document.getElementById('event-confirm-btn').addEventListener('click', saveEvent);

    document.getElementById('add-global-event-btn').addEventListener('click', () => {
        eventModalCourseId = null;
        openEventModal();
    });
}

function populateEventCourseSelect() {
    const select = document.getElementById('event-course');
    select.innerHTML = '';
    COURSES.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        select.appendChild(option);
    });
}

function openEventModal() {
    if (!isAdmin) {
        showToast('Please sign in as admin to add events', 'error');
        return;
    }

    const modal = document.getElementById('event-modal');
    document.getElementById('event-title').value = '';
    document.getElementById('event-date').value = '';
    document.getElementById('event-time').value = '';
    document.getElementById('event-type').value = 'quiz';
    document.getElementById('event-description').value = '';
    document.getElementById('event-groups').value = '';

    if (eventModalCourseId) {
        document.getElementById('event-course').value = eventModalCourseId;
    }

    modal.classList.remove('hidden');
}

function closeEventModal() {
    document.getElementById('event-modal').classList.add('hidden');
    eventModalCourseId = null;
}

async function saveEvent() {
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const type = document.getElementById('event-type').value;
    const courseId = document.getElementById('event-course').value;
    const description = document.getElementById('event-description').value.trim();
    const groupsStr = document.getElementById('event-groups').value.trim();

    if (!title || !date) {
        showToast('Please fill in the title and date', 'error');
        return;
    }

    const eventData = {
        title,
        date,
        time,
        type,
        courseId,
        description,
        groups: groupsStr ? groupsStr.split(',').map(g => g.trim()).filter(Boolean) : [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
        await db.collection('events').add(eventData);
        closeEventModal();
        showToast('Event added successfully', 'success');

        // Refresh
        invalidateEventCounts();
        await renderCalendar();
        await loadHomeEvents();
        if (currentCourseId) {
            await renderCourseEvents();
            await refreshCourseDetailStats();
        }
        await loadAllCourseCards();
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Unable to save this event. Please try again.', 'error');
    }
}

async function deleteEvent(eventId) {
    if (!isAdmin) {
        showToast('Only admin can delete events', 'error');
        return;
    }
    if (!confirm('Delete this event?')) return;

    try {
        await db.collection('events').doc(eventId).delete();
        showToast('Event deleted', 'info');
        invalidateEventCounts();
        await renderCalendar();
        await loadHomeEvents();
        if (currentCourseId) {
            await renderCourseEvents();
            await refreshCourseDetailStats();
        }
        await loadAllCourseCards();
    } catch (error) {
        console.error('Delete event error:', error);
        showToast('Unable to delete this event. Please try again.', 'error');
    }
}

// ===== RENDER COURSE EVENTS =====
async function renderCourseEvents() {
    const list = document.getElementById('course-events-list');
    if (!list) return;

    const courseId = currentCourseId;
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:12px;">Loading events...</p></div>';

    try {
        // Equality-only query: no composite index required. Sorting happens
        // client-side so Firebase configuration stays untouched.
        const snapshot = await db.collection('events')
            .where('courseId', '==', courseId)
            .get();

        if (currentCourseId !== courseId) return;

        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        events.sort((a, b) => {
            const byDate = String(a.date || '').localeCompare(String(b.date || ''));
            if (byDate !== 0) return byDate;
            return String(a.time || '').localeCompare(String(b.time || ''));
        });

        list.removeAttribute('aria-busy');
        setTabCount(4, events.length);

        if (events.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <h3>No Events Scheduled</h3>
                    <p>Quizzes, assignments, and presentations will appear here.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = '';
        events.forEach(event => {
            list.appendChild(createEventCard(event));
        });
    } catch (error) {
        console.error('Error loading course events:', error);
        if (currentCourseId !== courseId) return;

        list.removeAttribute('aria-busy');
        const countEl = document.getElementById('tab-count-4');
        if (countEl) countEl.hidden = true;

        list.innerHTML = `
            <div class="empty-state course-events-error">
                <i class="fas fa-cloud-exclamation"></i>
                <h3>The schedule could not be loaded</h3>
                <p>Check your connection and try again.</p>
                <div class="course-events-error-actions">
                    <button type="button" class="btn btn-ghost btn-sm" id="retry-course-events">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                    <button type="button" class="btn btn-primary btn-sm admin-only" id="course-events-add-btn">
                        <i class="fas fa-plus"></i> Add event
                    </button>
                </div>
            </div>
        `;

        const retry = document.getElementById('retry-course-events');
        if (retry) retry.addEventListener('click', () => renderCourseEvents());

        const addBtn = document.getElementById('course-events-add-btn');
        if (addBtn) addBtn.addEventListener('click', () => {
            eventModalCourseId = currentCourseId;
            openEventModal();
        });
    }
}

function createEventCard(event, options = {}) {
    const typeInfo = EVENT_TYPES[event.type] || EVENT_TYPES.other;
    const course = COURSES.find(c => c.id === event.courseId);
    const dateObj = new Date(event.date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
    // Homepage-only editorial treatment. Course detail and calendar feeds keep
    // the original card untouched.
    const isTransmission = options.variant === 'transmission';

    const card = document.createElement('div');
    card.className = 'event-card' + (isTransmission ? ' event-card--transmission' : '');
    if (isTransmission && options.index === 0) card.classList.add('event-card--featured');
    card.style.setProperty('--event-color', typeInfo.color);

    let groupsHTML = '';
    if (event.groups && event.groups.length > 0) {
        groupsHTML = `<div class="event-groups">${event.groups.map(g => `<span class="group-tag">${escapeHtml(g)}</span>`).join('')}</div>`;
    }

    let descHTML = '';
    if (event.description) {
        descHTML = `<div class="event-description">${escapeHtml(event.description)}</div>`;
    }

    const dateHTML = `
        <div class="transmission-stamp" aria-hidden="true">
            <span class="transmission-day">${String(dateObj.getDate()).padStart(2, '0')}</span>
            <span class="transmission-month">${dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
        </div>`;

    const iconHTML = `
        <div class="event-type-icon" style="background: ${typeInfo.bg}; color: ${typeInfo.color};">
            <i class="${typeInfo.icon}"></i>
        </div>`;

    const metaHTML = isTransmission ? `
        <div class="transmission-meta">
            <span class="transmission-index">Transmission ${String((options.index || 0) + 1).padStart(2, '0')}</span>
            <span class="transmission-type" style="color: ${typeInfo.color};">${typeInfo.label}</span>
        </div>` : '';

    const detailsHTML = isTransmission ? `
        <div class="event-details">
            <span><i class="fas fa-calendar"></i> ${dateStr}</span>
            ${event.time ? `<span><i class="fas fa-clock"></i> ${formatTime(event.time)}</span>` : ''}
            <span><i class="fas fa-book"></i> ${course ? course.name : ''}</span>
        </div>` : `
        <div class="event-details">
            <span><i class="fas fa-calendar"></i> ${dateStr}</span>
            ${event.time ? `<span><i class="fas fa-clock"></i> ${formatTime(event.time)}</span>` : ''}
            <span><i class="fas fa-book"></i> ${course ? course.name : ''}</span>
            <span style="color: ${typeInfo.color}; font-weight: 600;">${typeInfo.label}</span>
        </div>`;

    card.innerHTML = `
        ${isTransmission ? dateHTML : iconHTML}
        <div class="event-info">
            ${metaHTML}
            <div class="event-title">${escapeHtml(event.title)}</div>
            ${detailsHTML}
            ${descHTML}
            ${groupsHTML}
        </div>
        <button class="event-delete-btn" title="Delete event">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;

    card.querySelector('.event-delete-btn').addEventListener('click', () => deleteEvent(event.id));
    return card;
}

function formatTime(time) {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return escapeHtml(String(text == null ? '' : text))
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Lightweight loading placeholders. These are static elements (no animation
// loop) and CSS disables the shimmer under reduced motion.
function skeletonMarkup(count = 6, variant = '') {
    const cls = variant === 'row' ? 'skeleton-card skeleton-row' : 'skeleton-card';
    let markup = '';
    for (let i = 0; i < count; i++) markup += `<div class="${cls}" aria-hidden="true"></div>`;
    return markup;
}

// ===== HOME EVENTS =====
async function loadHomeEvents() {
    const container = document.getElementById('home-events-preview');
    container.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:12px;">Loading events...</p></div>';

    try {
        const today = new Date().toISOString().split('T')[0];
        const snapshot = await db.collection('events')
            .where('date', '>=', today)
            .orderBy('date', 'asc')
            .limit(5)
            .get();

        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        container.innerHTML = '';

        if (events.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <h3>No Upcoming Events</h3>
                    <p>Add events from the Calendar page to see them here.</p>
                </div>
            `;
            return;
        }

        events.forEach((event, index) => {
            container.appendChild(createEventCard(event, { variant: 'transmission', index }));
        });
    } catch (error) {
        console.error('Error loading home events:', error);
        container.innerHTML = '<div class="empty-state"><p>Failed to load events.</p></div>';
    }
}

// ===== CALENDAR =====
function initCalendar() {
    document.getElementById('cal-prev').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('close-day-panel').addEventListener('click', () => {
        document.getElementById('day-events-panel').classList.add('hidden');
    });

    renderCalendar();
}

async function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const titleEl = document.getElementById('calendar-month-title');

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    titleEl.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Fetch events for this month range
    const startDate = formatDateStr(year, month, 1 - firstDay);
    const endDate = formatDateStr(year, month + 1, 7);

    let events = [];
    try {
        const snapshot = await db.collection('events')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();
        events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching calendar events:', error);
    }

    const today = new Date();

    grid.innerHTML = '';

    // Day headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const dateStr = formatDateStr(year, month - 1, dayNum);
        const dayEl = createCalendarDay(dayNum, dateStr, events, true, false);
        grid.appendChild(dayEl);
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatDateStr(year, month, d);
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
        const dayEl = createCalendarDay(d, dateStr, events, false, isToday);
        grid.appendChild(dayEl);
    }

    // Next month days
    const totalCells = grid.children.length - 7;
    const remaining = 42 - totalCells;
    for (let d = 1; d <= remaining; d++) {
        const dateStr = formatDateStr(year, month + 1, d);
        const dayEl = createCalendarDay(d, dateStr, events, true, false);
        grid.appendChild(dayEl);
    }
}

function createCalendarDay(dayNum, dateStr, events, isOtherMonth, isToday) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) dayEl.classList.add('other-month');
    if (isToday) dayEl.classList.add('today');

    const dayEvents = events.filter(e => e.date === dateStr);

    dayEl.innerHTML = `
        <span class="calendar-day-number">${dayNum}</span>
        <div class="calendar-day-events">
            ${dayEvents.slice(0, 3).map(e => {
                const typeInfo = EVENT_TYPES[e.type] || EVENT_TYPES.other;
                return `<span class="calendar-event-dot" style="background: ${typeInfo.color};" title="${escapeHtml(e.title)}"></span>`;
            }).join('')}
            ${dayEvents.length > 3 ? `<span class="calendar-event-dot" style="background: var(--text-tertiary);" title="${dayEvents.length - 3} more"></span>` : ''}
        </div>
    `;

    dayEl.addEventListener('click', () => showDayEvents(dateStr, dayEvents));
    return dayEl;
}

function showDayEvents(dateStr, events) {
    const panel = document.getElementById('day-events-panel');
    const titleEl = document.getElementById('day-events-title');
    const listEl = document.getElementById('day-events-list');

    const date = new Date(dateStr + 'T00:00:00');
    titleEl.textContent = `Events for ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;

    listEl.innerHTML = '';

    if (events.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 20px;">No events on this day.</p>';
    } else {
        events.forEach(event => {
            listEl.appendChild(createEventCard(event));
        });
    }

    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatDateStr(year, month, day) {
    const d = new Date(year, month, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

// ===== FOOTER LINKS =====
function initFooterLinks() {
    document.querySelectorAll('.footer-links-section a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.footer-links-section a[data-course]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openCourseDetail(link.dataset.course);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ===== FAQ ACCORDION (SEO & ACCESSIBILITY) =====
function initFaqAccordion() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            if (!item) return;
            const isOpen = item.classList.contains('active');

            // Close all items
            document.querySelectorAll('.faq-item').forEach(other => {
                other.classList.remove('active');
                const otherBtn = other.querySelector('.faq-question');
                if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
            });

            // Toggle clicked item
            if (!isOpen) {
                item.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

// ===== CURRICULUM DIRECTORY CARDS =====
function initCurriculumCards() {
    document.querySelectorAll('.curriculum-card[data-course]').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const courseId = card.dataset.course;
            if (courseId) {
                openCourseDetail(courseId, 'theory', 'home');
            }
        });
    });
}

// ===== TOAST =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
    };

    toast.innerHTML = `
        <i class="toast-icon ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ===== LOADING OVERLAY =====
function showLoading(text = 'Loading...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// ===== BLEACH SHINIGAMI GATE (MVC EASTER EGG) =====
let bleachUnlockCallback = null;
let bleachGateReturnFocus = null;
let bleachGateReturnFocusInfo = null;
let bleachGateInerted = [];
let bleachGateSuccessTimer = null;

function escapeSelectorValue(value) {
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
}

const BLEACH_GATE_FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getBleachGateFocusables(modal) {
    return Array.from(modal.querySelectorAll(BLEACH_GATE_FOCUSABLE))
        .filter(el => !el.closest('.hidden') && el.getClientRects().length > 0);
}

// Background content must not be reachable by keyboard while the gate is open.
// Track pre-existing `inert` attributes (the dock popups rely on them) so they
// are restored exactly as they were.
function setBleachGateBackgroundInert(shouldInert) {
    const modal = document.getElementById('bleach-gate-modal');
    if (shouldInert) {
        if (bleachGateInerted.length) return;
        Array.from(document.body.children).forEach(child => {
            if (!modal || child === modal) return;
            if (['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE'].includes(child.tagName)) return;
            bleachGateInerted.push({ el: child, hadInert: child.hasAttribute('inert') });
            child.setAttribute('inert', '');
        });
        return;
    }
    bleachGateInerted.forEach(({ el, hadInert }) => {
        if (!hadInert) el.removeAttribute('inert');
    });
    bleachGateInerted = [];
}

function focusBleachGateInitial() {
    const modal = document.getElementById('bleach-gate-modal');
    if (!modal) return;
    const focusables = getBleachGateFocusables(modal);
    const target = document.getElementById('bleach-gate-yes') || focusables[0] || modal;
    if (target && typeof target.focus === 'function') {
        target.focus({ preventScroll: true });
    }
}

function openBleachGate(trigger) {
    const modal = document.getElementById('bleach-gate-modal');
    if (!modal) return;
    const active = document.activeElement;
    let nextReturnFocus = null;
    if (trigger && document.contains(trigger)) {
        nextReturnFocus = trigger;
    } else if (active && active !== document.body && !modal.contains(active)
        && typeof active.focus === 'function') {
        nextReturnFocus = active;
    }
    bleachGateReturnFocus = nextReturnFocus;
    bleachGateReturnFocusInfo = null;
    if (nextReturnFocus && typeof nextReturnFocus.closest === 'function') {
        const courseCard = nextReturnFocus.closest('.course-card[data-course-id]');
        if (courseCard) {
            bleachGateReturnFocusInfo = {
                selector: `#courses-list-view .course-card[data-course-id="${escapeSelectorValue(courseCard.dataset.courseId)}"]`,
            };
        }
    }
    modal.classList.remove('hidden');
    setBleachGateBackgroundInert(true);
    focusBleachGateInitial();
}

function resetGateHashToCourses() {
    resetResourceNavigation();
    navigateTo('courses', false);
    try {
        history.replaceState({ page: 'courses' }, '', '#courses');
    } catch (error) {
        window.location.hash = '#courses';
    }
}

function restoreBleachGateFocus() {
    let target = bleachGateReturnFocus;
    const info = bleachGateReturnFocusInfo;
    bleachGateReturnFocus = null;
    bleachGateReturnFocusInfo = null;
    if (!isFocusableNow(target) && info && info.selector) {
        target = document.querySelector(info.selector);
    }
    if (isFocusableNow(target)) {
        target.focus({ preventScroll: true });
        return;
    }
    const fallback = document.querySelector('#courses-list-view .course-card')
        || document.querySelector('#courses-list-view a, #courses-list-view button')
        || document.getElementById('nav-logo-link');
    if (isFocusableNow(fallback)) {
        fallback.focus({ preventScroll: true });
    }
}

function hideBleachGate(options = {}) {
    const modal = document.getElementById('bleach-gate-modal');
    if (!modal) return;
    const actionsRow = document.getElementById('bleach-actions-row');
    const succMsg = document.getElementById('bleach-success-msg');
    if (bleachGateSuccessTimer) {
        clearTimeout(bleachGateSuccessTimer);
        bleachGateSuccessTimer = null;
    }
    modal.classList.add('hidden');
    if (actionsRow) actionsRow.style.pointerEvents = '';
    if (succMsg) succMsg.classList.add('hidden');
    setBleachGateBackgroundInert(false);

    const callback = bleachUnlockCallback;
    bleachUnlockCallback = null;

    if (options.unlocked) {
        // Access was granted: open the requested view and let it move focus to
        // the reader heading (or the course view) itself.
        bleachGateReturnFocus = null;
        bleachGateReturnFocusInfo = null;
        if (typeof callback === 'function') callback();
        return;
    }

    // Dismissed without unlocking. Never leave a protected resource URL in the
    // address bar while the archive is what the student actually sees.
    resetGateHashToCourses();
    restoreBleachGateFocus();
}

function initBleachGateModal() {
    const modal = document.getElementById('bleach-gate-modal');
    const closeBtn = document.getElementById('bleach-gate-close');
    const yesBtn = document.getElementById('bleach-gate-yes');
    const noBtn = document.getElementById('bleach-gate-no');
    const rejMsg = document.getElementById('bleach-rejection-msg');
    const succMsg = document.getElementById('bleach-success-msg');
    const actionsRow = document.getElementById('bleach-actions-row');

    if (!modal) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => hideBleachGate());
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideBleachGate();
    });

    if (noBtn) {
        noBtn.addEventListener('click', () => {
            if (succMsg) succMsg.classList.add('hidden');
            if (rejMsg) {
                rejMsg.classList.remove('hidden');
                // Re-trigger shake animation
                rejMsg.style.animation = 'none';
                void rejMsg.offsetWidth; // trigger reflow
                rejMsg.style.animation = 'bleachShake 0.45s ease-in-out';
            }
        });
    }

    if (yesBtn) {
        yesBtn.addEventListener('click', () => {
            if (rejMsg) rejMsg.classList.add('hidden');
            if (succMsg) succMsg.classList.remove('hidden');
            if (actionsRow) actionsRow.style.pointerEvents = 'none';
            sessionStorage.setItem('bleachGateUnlocked', 'true');

            bleachGateSuccessTimer = setTimeout(() => {
                bleachGateSuccessTimer = null;
                hideBleachGate({ unlocked: true });
            }, 1000);
        });
    }

    // Escape dismisses without unlocking. Tab and Shift+Tab stay inside the
    // dialog; the background is also inert, so focus cannot leak out anyway.
    modal.addEventListener('keydown', (event) => {
        if (modal.classList.contains('hidden')) return;

        if (event.key === 'Escape' || event.key === 'Esc') {
            // Ignore Escape during the one-second "access granted" animation.
            if (bleachGateSuccessTimer) return;
            event.preventDefault();
            event.stopPropagation();
            hideBleachGate();
            return;
        }

        if (event.key !== 'Tab') return;
        const focusables = getBleachGateFocusables(modal);
        if (!focusables.length) {
            event.preventDefault();
            modal.focus({ preventScroll: true });
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey) {
            if (active === first || !modal.contains(active)) {
                event.preventDefault();
                last.focus({ preventScroll: true });
            }
        } else if (active === last || !modal.contains(active)) {
            event.preventDefault();
            first.focus({ preventScroll: true });
        }
    });
}

function promptBleachGate(onSuccess, trigger) {
    bleachUnlockCallback = onSuccess;
    const modal = document.getElementById('bleach-gate-modal');
    const rejMsg = document.getElementById('bleach-rejection-msg');
    const succMsg = document.getElementById('bleach-success-msg');

    if (!modal) {
        if (onSuccess) onSuccess();
        return;
    }

    if (rejMsg) rejMsg.classList.add('hidden');
    if (succMsg) succMsg.classList.add('hidden');
    openBleachGate(trigger);
}

// ===== ZANPAKUTO THEMES =====
function initZanpakutoThemes() {
    // The theme picker lives in the floating dock; just restore the saved theme.
    const savedTheme = localStorage.getItem('zanpakuto_theme');
    if (savedTheme) {
        applyZanpakutoTheme(savedTheme, false);
    }
}

// Restore the default (non-Zanpakuto) theme.
function resetZanpakutoTheme(showNotification = true, options = {}) {
    document.documentElement.removeAttribute('data-zanpakuto');
    document.documentElement.removeAttribute('data-blood-moon');
    localStorage.removeItem('zanpakuto_theme');
    if (showNotification) {
        showToast('Zanpakuto spiritual pressure sealed (Default Theme).', 'info');
    }
    document.dispatchEvent(new CustomEvent('sledge:themechange', {
        detail: { theme: 'default', userInitiated: !!options.userInitiated }
    }));
}

function applyZanpakutoTheme(themeName, showNotification = true, options = {}) {
    const validThemes = ['getsuga-tensho', 'nozarashi', 'senbonzakura', 'kyoka-suigetsu', 'tensa-zangetsu', 'hogyoku'];
    if (!validThemes.includes(themeName)) return;

    document.documentElement.setAttribute('data-zanpakuto', themeName);
    localStorage.setItem('zanpakuto_theme', themeName);

    // Blood Moon only belongs to Tensa Zangetsu
    if (themeName !== 'tensa-zangetsu') {
        document.documentElement.removeAttribute('data-blood-moon');
    }

    // Picking a theme here also awakens its signature effect, via
    // applyThemeSignatureEffect() in the dock's theme click handler.
    if (showNotification) {
        const themeTitles = {
            'getsuga-tensho': 'Getsuga Tensho (月牙天衝) — Black & White Theme',
            'nozarashi': 'Nozarashi (野晒) — Yellow & Black Theme with Fire',
            'senbonzakura': 'Senbonzakura (千本桜) — Sakura Pink Theme with Flower Petals',
            'kyoka-suigetsu': 'Kyoka Suigetsu (鏡花水月) — Purple & Black Theme',
            'tensa-zangetsu': 'Tensa Zangetsu (天鎖斬月) — Crimson Bankai + Blood Moon',
            'hogyoku': 'Hōgyoku (崩玉) — Awakened Crystal Theme'
        };
        showToast(`Awakened: ${themeTitles[themeName] || themeName}!`, 'success');
    }

    // One event, one source of truth. The Hōgyoku module (and anything else
    // that cares) reacts to the attribute without keeping its own theme state.
    // userInitiated is only true for real clicks, so page loads never replay
    // the glass-shatter reveal.
    document.dispatchEvent(new CustomEvent('sledge:themechange', {
        detail: { theme: themeName, userInitiated: !!options.userInitiated }
    }));
}

// Signature visual effect awarded to each Zanpakuto. Clicking a theme in the
// dock awakens its effect; the user can turn it off later from the dock.
// Page loads never re-enable it, so an explicit "off" stays off until the
// theme is picked again.
const THEME_SIGNATURE_EFFECTS = {
    'default': null,
    'getsuga-tensho': 'gold',
    'nozarashi': 'nozarashi',
    'senbonzakura': 'sakura',
    'kyoka-suigetsu': 'reiatsu',
    'tensa-zangetsu': 'rain',
    // Hōgyoku's signature effect is the section-anchored crystal, not a
    // full-page particle layer; keep the rest of the page calm.
    'hogyoku': null
};

function applyThemeSignatureEffect(themeName) {
    const mode = Object.prototype.hasOwnProperty.call(THEME_SIGNATURE_EFFECTS, themeName)
        ? THEME_SIGNATURE_EFFECTS[themeName]
        : null;
    setParticleMode(mode, true);
}

// ===== DECORATIVE EFFECT ENGINE =====
// One canvas particle loop runs at a time so the page never carries several
// expensive systems at once. Dropping a mode stops the previous loop first.
const PARTICLE_MODES = ['rain', 'gold', 'sakura', 'nozarashi', 'reiatsu', 'starfield'];
const ATMOSPHERE_MODES = ['aurora', 'mist'];
const EFFECT_INTENSITIES = ['subtle', 'medium', 'intense'];
const PARTICLE_COUNTS = {
    rain: { subtle: 40, medium: 85, intense: 145 },
    gold: { subtle: 32, medium: 65, intense: 105 },
    sakura: { subtle: 26, medium: 46, intense: 72 },
    nozarashi: { subtle: 20, medium: 36, intense: 56 },
    reiatsu: { subtle: 20, medium: 36, intense: 56 },
    starfield: { subtle: 80, medium: 135, intense: 200 }
};

let particleMode = null;
let particleRafId = null;
let particleResizeHandler = null;
let particleCtx = null;
let particleWidth = 0;
let particleHeight = 0;
let particleList = [];
let particleLastTime = 0;
let decorativeLoopsSuspended = false;

const ANIMATION_LEVELS = ['off', 'low', 'medium', 'high'];

function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function effectsMotionPaused() {
    return prefersReducedMotion() || localStorage.getItem('effects_reduced_motion') === 'true';
}

function getAnimationLevel() {
    const stored = localStorage.getItem('sledge_animation');
    return ANIMATION_LEVELS.includes(stored) ? stored : 'medium';
}

function animationScale() {
    const level = getAnimationLevel();
    if (level === 'off') return 0;
    if (level === 'low') return 0.68;
    if (level === 'high') return 1.22;
    return 1;
}

function areDecorativeEffectsAllowed() {
    return !effectsMotionPaused()
        && getAnimationLevel() !== 'off'
        && !document.body.classList.contains('quiet-mode');
}

function syncDecorationPauseState() {
    document.body.classList.toggle('effects-paused', !areDecorativeEffectsAllowed());
}

function getEffectIntensity() {
    const stored = localStorage.getItem('effect_intensity');
    return EFFECT_INTENSITIES.includes(stored) ? stored : 'medium';
}

function setEffectIntensity(value, persist = true) {
    if (!EFFECT_INTENSITIES.includes(value)) return;
    if (persist) localStorage.setItem('effect_intensity', value);
    document.documentElement.style.setProperty(
        '--ambient-opacity',
        value === 'intense' ? '0.64' : value === 'subtle' ? '0.28' : '0.46'
    );
    refreshParticleEffect();
}

function particleCountFor(mode) {
    const base = PARTICLE_COUNTS[mode][getEffectIntensity()];
    const mobile = window.innerWidth < 640;
    const motion = animationScale() || 1;
    return Math.max(10, Math.round(base * (mobile ? 0.68 : 1) * motion));
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function spawnParticle(mode, initial) {
    if (mode === 'rain') {
        return {
            x: Math.random() * particleWidth,
            y: initial ? randomBetween(-particleHeight * 0.6, particleHeight) : randomBetween(-particleHeight * 0.5, -20),
            length: randomBetween(10, 28),
            width: randomBetween(0.6, 1.8),
            speed: randomBetween(5, 13),
            drift: randomBetween(-1.8, -0.2),
            alpha: randomBetween(0.14, 0.5),
            bright: Math.random() < 0.12
        };
    }

    if (mode === 'gold') {
        return {
            x: Math.random() * particleWidth,
            y: initial ? Math.random() * particleHeight : particleHeight + randomBetween(0, 40),
            size: randomBetween(0.8, 3.2),
            speedY: -randomBetween(0.2, 1.0),
            drift: randomBetween(-0.5, 0.5),
            phase: Math.random() * Math.PI * 2,
            twinkle: randomBetween(0.02, 0.05),
            alpha: randomBetween(0.25, 0.75)
        };
    }

    if (mode === 'sakura') {
        return {
            x: Math.random() * particleWidth,
            y: initial ? Math.random() * particleHeight : randomBetween(-particleHeight * 0.25, -20),
            size: randomBetween(7, 16),
            speedY: randomBetween(1.1, 2.9),
            speedX: randomBetween(-0.8, 0.8),
            angle: Math.random() * Math.PI * 2,
            angularSpeed: randomBetween(-0.035, 0.035),
            oscillation: Math.random() * Math.PI * 2,
            oscillationSpeed: randomBetween(0.015, 0.04),
            color: ['rgba(244,114,182,0.85)', 'rgba(251,207,232,0.9)',
                'rgba(236,72,153,0.8)', 'rgba(219,39,119,0.75)'][Math.floor(Math.random() * 4)]
        };
    }

    if (mode === 'nozarashi') {
        if (Math.random() < 0.28) {
            return {
                kind: 'spark',
                x: Math.random() * particleWidth,
                y: initial ? Math.random() * particleHeight : particleHeight + randomBetween(0, 20),
                size: randomBetween(1, 3),
                speedY: randomBetween(2.5, 6.5),
                drift: randomBetween(-1.2, 1.2),
                life: initial ? Math.random() : 0
            };
        }
        return {
            kind: 'flame',
            x: Math.random() * particleWidth,
            y: initial ? randomBetween(particleHeight * 0.45, particleHeight) : particleHeight + randomBetween(10, 40),
            size: randomBetween(16, 46),
            speedY: randomBetween(1.0, 2.8),
            drift: randomBetween(-0.5, 0.5),
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: randomBetween(0.02, 0.055),
            life: initial ? Math.random() * 0.7 : randomBetween(0.1, 0.25),
            heat: randomBetween(0.45, 1)
        };
    }

    if (mode === 'starfield') {
        return {
            x: Math.random() * particleWidth,
            y: Math.random() * particleHeight,
            size: randomBetween(0.5, 1.8),
            alpha: randomBetween(0.25, 0.9),
            phase: Math.random() * Math.PI * 2,
            twinkle: randomBetween(0.006, 0.022),
            drift: randomBetween(-0.08, 0.08),
            bright: Math.random() < 0.11
        };
    }

    // reiatsu
    return {
        x: Math.random() * particleWidth,
        y: initial ? Math.random() * particleHeight : particleHeight + 10,
        size: randomBetween(2, 6.5),
        speedY: -randomBetween(0.9, 2.7),
        speedX: randomBetween(-0.6, 0.6),
        opacity: randomBetween(0.3, 0.95),
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: randomBetween(0.03, 0.07),
        isBladeShard: Math.random() > 0.75
    };
}

function buildParticleList(mode) {
    const count = particleCountFor(mode);
    const list = [];
    for (let i = 0; i < count; i++) list.push(spawnParticle(mode, true));
    return list;
}

function resizeParticleCanvas() {
    const canvas = document.getElementById('sakura-canvas');
    if (!canvas) return;
    particleWidth = canvas.width = window.innerWidth;
    particleHeight = canvas.height = window.innerHeight;
}

function getAccentRgb() {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
    return value || '59, 130, 246';
}

function drawStarfield(dt) {
    const accent = getAccentRgb();
    particleCtx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < particleList.length; i++) {
        const p = particleList[i];
        p.phase += p.twinkle * dt;
        p.x += p.drift * dt;
        const twinkle = 0.58 + Math.sin(p.phase) * 0.42;
        const alpha = Math.max(0.12, p.alpha * twinkle);
        if (p.x < -4) p.x = particleWidth + 4;
        if (p.x > particleWidth + 4) p.x = -4;
        particleCtx.fillStyle = p.bright
            ? `rgba(${accent}, ${alpha})`
            : `rgba(255, 255, 255, ${alpha * 0.8})`;
        particleCtx.beginPath();
        particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        particleCtx.fill();
        if (p.bright) {
            particleCtx.fillStyle = `rgba(${accent}, ${alpha * 0.22})`;
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size * 2.6, 0, Math.PI * 2);
            particleCtx.fill();
        }
    }
}

function drawRain(dt) {
    particleCtx.lineCap = 'round';
    for (let i = 0; i < particleList.length; i++) {
        const p = particleList[i];
        p.y += p.speed * dt;
        p.x += p.drift * dt;
        if (p.y - p.length > particleHeight) {
            Object.assign(p, spawnParticle('rain', false));
            continue;
        }
        if (p.x < -40) p.x = particleWidth + 40;

        particleCtx.strokeStyle = p.bright
            ? `rgba(255, 82, 92, ${Math.min(0.75, p.alpha * 1.6)})`
            : `rgba(176, 16, 34, ${p.alpha})`;
        particleCtx.lineWidth = p.width;
        particleCtx.beginPath();
        particleCtx.moveTo(p.x, p.y);
        particleCtx.lineTo(p.x - p.drift * 1.6, p.y + p.length);
        particleCtx.stroke();
    }
}

function drawGold(dt) {
    particleCtx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < particleList.length; i++) {
        const p = particleList[i];
        p.phase += p.twinkle * dt;
        p.y += p.speedY * dt;
        p.x += p.drift * dt + Math.sin(p.phase) * 0.25;
        if (p.y < -12) {
            Object.assign(p, spawnParticle('gold', false));
            continue;
        }
        if (p.x < -12) p.x = particleWidth + 12;
        if (p.x > particleWidth + 12) p.x = -12;

        const alpha = p.alpha * (0.65 + Math.sin(p.phase) * 0.35);
        particleCtx.fillStyle = `rgba(250, 204, 21, ${Math.max(0.1, alpha)})`;
        particleCtx.beginPath();
        particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        particleCtx.fill();
    }
}

// Cached reusable Path2D for Sakura petal rendering (zero per-frame path allocations)
const SAKURA_PETAL_PATH = (typeof Path2D !== 'undefined') ? (() => {
    const path = new Path2D();
    path.moveTo(0, 0);
    path.bezierCurveTo(0.5, -0.5, 1, -0.25, 1, 0);
    path.bezierCurveTo(1, 0.25, 0.5, 0.5, 0, 0);
    return path;
})() : null;

function drawSakura(dt) {
    for (let i = 0; i < particleList.length; i++) {
        const p = particleList[i];
        p.oscillation += p.oscillationSpeed * dt;
        p.x += (p.speedX + Math.sin(p.oscillation) * 1.2) * dt;
        p.y += p.speedY * dt;
        p.angle += p.angularSpeed * dt;

        if (p.y > particleHeight + 20) {
            Object.assign(p, spawnParticle('sakura', false));
            continue;
        }
        if (p.x < -20) p.x = particleWidth + 20;
        if (p.x > particleWidth + 20) p.x = -20;

        const cos = Math.cos(p.angle) * p.size;
        const sin = Math.sin(p.angle) * p.size;
        particleCtx.setTransform(cos, sin, -sin, cos, p.x, p.y);
        particleCtx.fillStyle = p.color;

        if (SAKURA_PETAL_PATH) {
            particleCtx.fill(SAKURA_PETAL_PATH);
        } else {
            particleCtx.beginPath();
            particleCtx.moveTo(0, 0);
            particleCtx.bezierCurveTo(0.5, -0.5, 1, -0.25, 1, 0);
            particleCtx.bezierCurveTo(1, 0.25, 0.5, 0.5, 0, 0);
            particleCtx.fill();
        }
    }
    particleCtx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawFlames(dt) {
    particleCtx.globalCompositeOperation = 'lighter';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    for (let i = 0; i < particleList.length; i++) {
        const p = particleList[i];
        if (p.kind === 'spark') {
            p.life += 0.012 * dt;
            p.y -= p.speedY * dt;
            p.x += p.drift * dt + Math.sin(p.life * 12) * 0.6;
            if (p.life >= 1 || p.y < particleHeight * 0.18) {
                Object.assign(p, spawnParticle('nozarashi', false));
                continue;
            }
            particleCtx.fillStyle = `rgba(253, 224, 71, ${(1 - p.life) * 0.9})`;
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            particleCtx.fill();
            continue;
        }

        p.life += (0.007 + p.heat * 0.006) * dt;
        p.wobble += p.wobbleSpeed * dt;
        p.y -= p.speedY * dt;
        p.x += (p.drift + Math.sin(p.wobble) * 0.9) * dt;

        if (p.life >= 1 || p.y < particleHeight * 0.18) {
            Object.assign(p, spawnParticle('nozarashi', false));
            continue;
        }

        const fade = Math.sin(p.life * Math.PI);
        const alpha = Math.max(0.08, fade * (isDark ? 0.8 : 0.5));
        const radius = p.size * (0.5 + p.life * 0.9);
        const gradient = particleCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        gradient.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
        gradient.addColorStop(0.35, `rgba(250, 204, 21, ${alpha * 0.85})`);
        gradient.addColorStop(0.7, `rgba(234, 88, 12, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(120, 30, 0, 0)');
        particleCtx.fillStyle = gradient;
        particleCtx.beginPath();
        particleCtx.ellipse(p.x, p.y, radius * 0.72, radius * 1.15, 0, 0, Math.PI * 2);
        particleCtx.fill();
    }
}

function drawReiatsu(dt) {
    particleCtx.globalCompositeOperation = 'lighter';
    const isBloodMoon = document.documentElement.getAttribute('data-blood-moon') === 'true';

    // The spirit-pressure effect follows the active theme's accent so it reads
    // as "its" reiatsu instead of always drawing crimson.
    let accentRgb = '239, 68, 68';
    const shell = document.getElementById('dock-shell');
    if (shell) {
        const value = getComputedStyle(shell).getPropertyValue('--dock-accent-rgb').trim();
        if (value) accentRgb = value;
    }

    for (let i = 0; i < particleList.length; i++) {
        const p = particleList[i];
        p.pulse += p.pulseSpeed * dt;
        p.y += p.speedY * dt;
        p.x += (p.speedX + Math.sin(p.pulse) * 0.6) * dt;
        const alpha = Math.max(0.15, Math.min(1, p.opacity + Math.sin(p.pulse) * 0.25));

        if (p.y < -20) {
            Object.assign(p, spawnParticle('reiatsu', false));
            continue;
        }
        if (p.x < -20) p.x = particleWidth + 20;
        if (p.x > particleWidth + 20) p.x = -20;

        if (p.isBladeShard) {
            // Crescent spirit slash fragment
            const cos = 0.7071; // cos(-45deg)
            const sin = -0.7071; // sin(-45deg)
            particleCtx.setTransform(cos, sin, -sin, cos, p.x, p.y);

            // Outer spirit aura
            particleCtx.fillStyle = isBloodMoon
                ? `rgba(255, 30, 45, ${alpha * 0.35})`
                : `rgba(${accentRgb}, ${alpha * 0.3})`;
            particleCtx.beginPath();
            particleCtx.ellipse(0, 0, p.size * 2.5, p.size * 1.1, 0, 0, Math.PI * 2);
            particleCtx.fill();

            // Inner razor shard
            particleCtx.fillStyle = isBloodMoon
                ? `rgba(255, 120, 130, ${alpha})`
                : `rgba(255, 255, 255, ${alpha * 0.9})`;
            particleCtx.beginPath();
            particleCtx.ellipse(0, 0, p.size * 1.8, p.size * 0.6, 0, 0, Math.PI * 2);
            particleCtx.fill();
        } else {
            // Glowing spirit ember (additive dual-arc glow, zero shadowBlur)
            particleCtx.setTransform(1, 0, 0, 1, 0, 0);

            // Outer spiritual pressure halo
            particleCtx.fillStyle = isBloodMoon
                ? `rgba(255, 30, 45, ${alpha * 0.28})`
                : `rgba(${accentRgb}, ${alpha * 0.22})`;
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
            particleCtx.fill();

            // Core bright spiritual ember
            particleCtx.fillStyle = isBloodMoon
                ? `rgba(255, 220, 220, ${alpha * 0.95})`
                : `rgba(255, 255, 255, ${alpha * 0.9})`;
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size * 0.85, 0, Math.PI * 2);
            particleCtx.fill();
        }
    }
    particleCtx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawParticles(dt) {
    if (!particleCtx) return;
    particleCtx.clearRect(0, 0, particleWidth, particleHeight);
    particleCtx.globalCompositeOperation = 'source-over';

    if (particleMode === 'rain') drawRain(dt);
    else if (particleMode === 'gold') drawGold(dt);
    else if (particleMode === 'sakura') drawSakura(dt);
    else if (particleMode === 'nozarashi') drawFlames(dt);
    else if (particleMode === 'reiatsu') drawReiatsu(dt);
    else if (particleMode === 'starfield') drawStarfield(dt);

    particleCtx.globalCompositeOperation = 'source-over';
}

function animateParticles(now) {
    if (!particleMode || !particleCtx) return;
    if (document.hidden || decorativeLoopsSuspended) {
        particleRafId = null;
        return;
    }
    const elapsed = particleLastTime ? now - particleLastTime : 16.667;
    particleLastTime = now;
    const dt = Math.max(0.25, Math.min(3, elapsed / 16.667)) * (animationScale() || 1);
    drawParticles(dt);
    particleRafId = requestAnimationFrame(animateParticles);
}

function stopParticleLoop() {
    if (particleRafId) {
        cancelAnimationFrame(particleRafId);
        particleRafId = null;
    }
    if (particleResizeHandler) {
        window.removeEventListener('resize', particleResizeHandler);
        particleResizeHandler = null;
    }
    particleList = [];
    document.body.classList.remove('blood-rain-on');
    const canvas = document.getElementById('sakura-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.add('hidden');
    }
    particleCtx = null;
}

function startParticleLoop(mode) {
    const canvas = document.getElementById('sakura-canvas');
    if (!canvas) return;

    canvas.classList.remove('hidden');
    particleCtx = canvas.getContext('2d');
    resizeParticleCanvas();
    particleList = buildParticleList(mode);
    document.body.classList.toggle('blood-rain-on', mode === 'rain');

    particleResizeHandler = () => {
        resizeParticleCanvas();
        particleList = buildParticleList(mode);
    };
    window.addEventListener('resize', particleResizeHandler);

    particleLastTime = 0;
    if (!decorativeLoopsSuspended && !document.hidden) {
        particleRafId = requestAnimationFrame(animateParticles);
    }
}

function refreshParticleEffect() {
    stopParticleLoop();
    syncDecorationPauseState();
    if (!particleMode || !areDecorativeEffectsAllowed()) return;
    startParticleLoop(particleMode);
}

function setParticleMode(mode, persist = true) {
    particleMode = PARTICLE_MODES.includes(mode) ? mode : null;
    if (persist) localStorage.setItem('effect_particle', particleMode || 'none');
    refreshParticleEffect();
}

// Best-effort migration from the pre-dock effect keys. Once the user makes a
// choice, `effect_particle` wins on page reload; clicking a theme in the dock
// deliberately rewakes that theme's signature effect.
function restoreParticlePreference() {
    const stored = localStorage.getItem('effect_particle');
    if (stored !== null) {
        particleMode = PARTICLE_MODES.includes(stored) ? stored : null;
        return;
    }
    const theme = document.documentElement.getAttribute('data-zanpakuto');
    if (theme === 'senbonzakura' && localStorage.getItem('effect_sakura') !== 'false') {
        particleMode = 'sakura';
    } else if (theme === 'nozarashi' && localStorage.getItem('effect_nozarashi') !== 'false') {
        particleMode = 'nozarashi';
    } else if (theme === 'tensa-zangetsu' && localStorage.getItem('effect_reiatsu') !== 'false') {
        particleMode = 'reiatsu';
    } else {
        particleMode = null;
    }
}

// ===== ATMOSPHERE LAYER =====
// Aurora and mist are cheap CSS layers. They are mutually exclusive and can
// run alongside one particle mode because they do not use a second canvas.
let atmosphereMode = null;

function getAtmosphereMode() {
    const stored = localStorage.getItem('effect_atmosphere');
    return ATMOSPHERE_MODES.includes(stored) ? stored : null;
}

function applyAtmosphereState() {
    document.documentElement.setAttribute('data-atmosphere', atmosphereMode || 'none');
    document.documentElement.style.setProperty(
        '--ambient-opacity',
        getEffectIntensity() === 'intense' ? '0.64' : getEffectIntensity() === 'subtle' ? '0.28' : '0.46'
    );
    syncDecorationPauseState();
}

function setAtmosphereMode(mode, persist = true) {
    atmosphereMode = ATMOSPHERE_MODES.includes(mode) ? mode : null;
    if (persist) {
        localStorage.setItem('effect_atmosphere', atmosphereMode || 'none');
    }
    applyAtmosphereState();
}

function restoreAtmospherePreference() {
    atmosphereMode = getAtmosphereMode();
    applyAtmosphereState();
}

// ===== CURSOR TRAIL =====
let cursorTrailEnabled = localStorage.getItem('effect_cursor_trail') === 'true';
let cursorTrailRafId = null;
let cursorTrailPoints = [];
let cursorTrailLastTime = 0;
let cursorTrailResizeHandler = null;
let cursorTrailPointerBound = false;
let cursorTrailCtx = null;
let cursorTrailAccentCache = null;
const CURSOR_TRAIL_MAX_POINTS = 10;

function isFinePointer() {
    return !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
}

// The accent is resolved once and cached; reading getComputedStyle on every
// animation frame forced a style read 60x per second.
function readCursorTrailAccent() {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-color').trim();
    return value && value.indexOf('var(') === -1 ? value : '#3b82f6';
}

function refreshCursorTrailAccent() {
    cursorTrailAccentCache = readCursorTrailAccent();
}

function invalidateCursorTrailAccent() {
    cursorTrailAccentCache = null;
}

function cursorTrailAccent() {
    if (!cursorTrailAccentCache) refreshCursorTrailAccent();
    return cursorTrailAccentCache;
}

// Theme changes are the only moment the accent can change (custom accents
// also invalidate the cache from applyAccentSetting).
document.addEventListener('sledge:themechange', invalidateCursorTrailAccent);

function sizeCursorTrailCanvas(canvas) {
    // DPR 1 on purpose: the trail is a soft glow, so a full-resolution buffer
    // only wastes fill rate. CSS stretches this buffer over the viewport.
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
}

function animateCursorTrail(now) {
    const canvas = document.getElementById('cursor-trail-canvas');
    if (!canvas) return;
    if (document.hidden || decorativeLoopsSuspended) {
        cursorTrailRafId = null;
        return;
    }
    if (!cursorTrailCtx || cursorTrailCtx.canvas !== canvas) {
        cursorTrailCtx = canvas.getContext('2d');
    }
    const ctx = cursorTrailCtx;
    const elapsed = cursorTrailLastTime ? now - cursorTrailLastTime : 16.667;
    cursorTrailLastTime = now;
    const dt = Math.max(0.25, Math.min(3, elapsed / 16.667));

    const accent = cursorTrailAccent();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;

    let lifeSum = 0;
    for (let i = 0; i < cursorTrailPoints.length; i++) {
        lifeSum += Math.max(0, cursorTrailPoints[i].life);
    }
    const avgLife = cursorTrailPoints.length ? lifeSum / cursorTrailPoints.length : 0;

    // One combined path drawn twice (wide halo + thin core) replaces the old
    // per-segment shadowBlur strokes: same neon read, a fraction of the cost.
    if (cursorTrailPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(cursorTrailPoints[0].x, cursorTrailPoints[0].y);
        for (let i = 1; i < cursorTrailPoints.length; i++) {
            ctx.lineTo(cursorTrailPoints[i].x, cursorTrailPoints[i].y);
        }
        ctx.globalAlpha = avgLife * 0.12;
        ctx.lineWidth = 9;
        ctx.stroke();
        ctx.globalAlpha = avgLife * 0.55;
        ctx.lineWidth = 2.6;
        ctx.stroke();
    }

    // All spark dots in a single fill call.
    if (cursorTrailPoints.length) {
        ctx.beginPath();
        for (let i = 0; i < cursorTrailPoints.length; i++) {
            const point = cursorTrailPoints[i];
            const radius = Math.max(0.8, 2.6 * Math.max(0, point.life));
            ctx.moveTo(point.x + radius, point.y);
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        }
        ctx.globalAlpha = avgLife * 0.7;
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < cursorTrailPoints.length; i++) {
        cursorTrailPoints[i].life -= 0.055 * dt;
    }
    cursorTrailPoints = cursorTrailPoints.filter(p => p.life > 0);

    if (cursorTrailPoints.length > 0) {
        cursorTrailRafId = requestAnimationFrame(animateCursorTrail);
    } else {
        cursorTrailRafId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.add('hidden');
    }
}

function onCursorTrailMove(event) {
    if (!cursorTrailEnabled || !areDecorativeEffectsAllowed()) return;
    if (document.hidden || decorativeLoopsSuspended) return;
    if (event.pointerType === 'touch') return;

    const canvas = document.getElementById('cursor-trail-canvas');
    if (!canvas) return;
    sizeCursorTrailCanvas(canvas);
    canvas.classList.remove('hidden');

    cursorTrailPoints.push({ x: event.clientX, y: event.clientY, life: 1 });
    if (cursorTrailPoints.length > CURSOR_TRAIL_MAX_POINTS) cursorTrailPoints.shift();

    if (!cursorTrailRafId) {
        cursorTrailLastTime = 0;
        cursorTrailRafId = requestAnimationFrame(animateCursorTrail);
    }
}

function startCursorTrail() {
    if (!cursorTrailEnabled || !areDecorativeEffectsAllowed() || !isFinePointer()) return;
    if (!cursorTrailPointerBound) {
        document.addEventListener('pointermove', onCursorTrailMove, { passive: true });
        cursorTrailPointerBound = true;
    }
    const canvas = document.getElementById('cursor-trail-canvas');
    if (canvas) {
        refreshCursorTrailAccent();
        sizeCursorTrailCanvas(canvas);
        cursorTrailResizeHandler = () => sizeCursorTrailCanvas(canvas);
        window.addEventListener('resize', cursorTrailResizeHandler);
    }
}

function stopCursorTrail() {
    if (cursorTrailRafId) {
        cancelAnimationFrame(cursorTrailRafId);
        cursorTrailRafId = null;
    }
    if (cursorTrailPointerBound) {
        document.removeEventListener('pointermove', onCursorTrailMove);
        cursorTrailPointerBound = false;
    }
    if (cursorTrailResizeHandler) {
        window.removeEventListener('resize', cursorTrailResizeHandler);
        cursorTrailResizeHandler = null;
    }
    cursorTrailPoints = [];
    const canvas = document.getElementById('cursor-trail-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.add('hidden');
    }
}

function refreshCursorTrail() {
    stopCursorTrail();
    syncDecorationPauseState();
    if (cursorTrailEnabled && areDecorativeEffectsAllowed()) startCursorTrail();
}

function setCursorTrailEnabled(enabled, persist = true) {
    cursorTrailEnabled = !!enabled && isFinePointer();
    if (persist) localStorage.setItem('effect_cursor_trail', String(cursorTrailEnabled));
    refreshCursorTrail();
}

// ===== DECORATIVE LOOP LIFECYCLE =====
// rAF loops are cancelled while the tab is hidden and rescheduled on return.
// Canvas state and the user's effect selections are kept, so nothing restarts
// from scratch and no duplicate loops are created.
function suspendDecorativeLoops() {
    if (decorativeLoopsSuspended) return;
    decorativeLoopsSuspended = true;
    document.body.classList.add('effects-suspended');
    if (particleRafId) {
        cancelAnimationFrame(particleRafId);
        particleRafId = null;
    }
    if (cursorTrailRafId) {
        cancelAnimationFrame(cursorTrailRafId);
        cursorTrailRafId = null;
    }
}

function resumeDecorativeLoops() {
    if (!decorativeLoopsSuspended) return;
    decorativeLoopsSuspended = false;
    document.body.classList.remove('effects-suspended');
    if (particleMode && particleCtx && areDecorativeEffectsAllowed() && !particleRafId) {
        particleLastTime = 0;
        particleRafId = requestAnimationFrame(animateParticles);
    }
    if (cursorTrailEnabled && areDecorativeEffectsAllowed() && cursorTrailPoints.length && !cursorTrailRafId) {
        cursorTrailLastTime = 0;
        cursorTrailRafId = requestAnimationFrame(animateCursorTrail);
    }
}

function handlePageVisibility() {
    if (document.hidden) suspendDecorativeLoops();
    else resumeDecorativeLoops();
}

document.addEventListener('visibilitychange', handlePageVisibility);
window.addEventListener('pagehide', suspendDecorativeLoops);
window.addEventListener('pageshow', () => {
    if (!document.hidden) resumeDecorativeLoops();
});

// Small public facade used by the dock, presets and future effect layers.
window.__sledgeEffects = {
    setParticleMode: (mode) => setParticleMode(mode),
    setIntensity: (value) => setEffectIntensity(value),
    setCursorTrail: (enabled) => setCursorTrailEnabled(enabled),
    setAtmosphere: (mode) => setAtmosphereMode(mode),
    setSpotlight: (enabled) => setSpotlightEnabled(enabled),
    suspend: suspendDecorativeLoops,
    resume: resumeDecorativeLoops,
    getState: () => ({
        particleMode,
        intensity: getEffectIntensity(),
        cursorTrail: cursorTrailEnabled,
        atmosphere: atmosphereMode,
        spotlight: spotlightEnabled,
        suspended: decorativeLoopsSuspended,
        rafActive: !!particleRafId,
        cursorRafActive: !!cursorTrailRafId
    })
};

// ===== VISITOR CUSTOMIZATION =====
// These are optional overrides layered on top of the six themes. They never
// replace the theme system and contain no account or credential data.
const FONT_STACKS = {
    site: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    poppins: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    outfit: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
};

const CHARACTER_FREQUENCIES = ['off', 'rare', 'normal', 'frequent'];

function normalizeHex(value) {
    const hex = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex : null;
}

function hexToRgbString(hex) {
    const normalized = normalizeHex(hex);
    if (!normalized) return '59, 130, 246';
    const n = parseInt(normalized.slice(1), 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function getCustomAccent() {
    return normalizeHex(localStorage.getItem('sledge_accent'));
}

function syncAccentVars() {
    const custom = getCustomAccent();
    const shell = document.getElementById('dock-shell');
    let accent = custom;
    let rgb = custom ? hexToRgbString(custom) : '';

    if (!accent && shell) {
        const computed = getComputedStyle(shell);
        accent = computed.getPropertyValue('--dock-accent').trim() || '#3b82f6';
        rgb = computed.getPropertyValue('--dock-accent-rgb').trim() || hexToRgbString(accent);
    }

    document.documentElement.style.setProperty('--accent-color', accent || '#3b82f6');
    document.documentElement.style.setProperty('--accent-rgb', rgb || '59, 130, 246');

    if (custom) {
        document.documentElement.style.setProperty('--custom-accent', custom);
        document.documentElement.style.setProperty('--custom-accent-rgb', rgb);
    } else {
        document.documentElement.style.removeProperty('--custom-accent');
        document.documentElement.style.removeProperty('--custom-accent-rgb');
    }
}

function applyAccentSetting(value, persist = true) {
    const custom = normalizeHex(value);
    if (custom) {
        document.documentElement.setAttribute('data-custom-accent', 'true');
        document.documentElement.style.setProperty('--custom-accent', custom);
        document.documentElement.style.setProperty('--custom-accent-rgb', hexToRgbString(custom));
        if (persist) localStorage.setItem('sledge_accent', custom);
    } else {
        document.documentElement.removeAttribute('data-custom-accent');
        document.documentElement.style.removeProperty('--custom-accent');
        document.documentElement.style.removeProperty('--custom-accent-rgb');
        if (persist) localStorage.removeItem('sledge_accent');
    }
    syncAccentVars();
    invalidateCursorTrailAccent();
    updateVisualControls();
}

function ensureFontLoaded(font) {
    if (font !== 'poppins' && font !== 'outfit') return;
    const id = `sledge-font-${font}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = font === 'poppins'
        ? 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'
        : 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
}

function applyFontSetting(value, persist = true) {
    const font = Object.prototype.hasOwnProperty.call(FONT_STACKS, value) ? value : 'site';
    document.documentElement.style.setProperty('--ui-font', FONT_STACKS[font]);
    if (font !== 'site') ensureFontLoaded(font);
    if (persist) {
        if (font === 'site') localStorage.removeItem('sledge_font');
        else localStorage.setItem('sledge_font', font);
    }
    updateVisualControls();
}

function applyCursorSetting(value, persist = true) {
    const cursor = value === 'system' ? 'system' : 'theme';
    if (cursor === 'system') document.documentElement.setAttribute('data-cursor', 'system');
    else document.documentElement.removeAttribute('data-cursor');
    if (persist) {
        if (cursor === 'system') localStorage.setItem('sledge_cursor', 'system');
        else localStorage.removeItem('sledge_cursor');
    }
    updateVisualControls();
}

function applyCardSetting(value, persist = true) {
    const cards = ['original', 'glass', 'glow'].includes(value) ? value : 'original';
    if (cards === 'original') document.documentElement.removeAttribute('data-cards');
    else document.documentElement.setAttribute('data-cards', cards);
    if (persist) {
        if (cards === 'original') localStorage.removeItem('sledge_cards');
        else localStorage.setItem('sledge_cards', cards);
    }
    updateVisualControls();
}

function applyAnimationSetting(value, persist = true) {
    const level = ANIMATION_LEVELS.includes(value) ? value : 'medium';
    if (persist) {
        if (level === 'medium') localStorage.removeItem('sledge_animation');
        else localStorage.setItem('sledge_animation', level);
    }
    document.documentElement.setAttribute('data-animation', level);
    refreshParticleEffect();
    refreshCursorTrail();
    applyAtmosphereState();
    if (typeof refreshSpotlight === 'function') refreshSpotlight();
    if (window.__bleachCharacters) {
        window.__bleachCharacters.setEnabled(
            localStorage.getItem('character_popups') !== 'false'
            && getCharacterFrequency() !== 'off'
            && areDecorativeEffectsAllowed()
        );
    }
    syncDecorationPauseState();
    // Tell every visual subsystem (including the Hōgyoku orb) that the
    // animation level changed, so motion can pause/resume live.
    document.dispatchEvent(new CustomEvent('sledge:settingschanged'));
    updateVisualControls();
}

function getCharacterFrequency() {
    const stored = localStorage.getItem('sledge_character_freq');
    return CHARACTER_FREQUENCIES.includes(stored) ? stored : 'normal';
}

function setCharacterFrequency(value, persist = true) {
    const frequency = CHARACTER_FREQUENCIES.includes(value) ? value : 'normal';
    localStorage.setItem('sledge_character_freq', frequency);
    localStorage.setItem('character_popups', frequency === 'off' ? 'false' : 'true');
    if (window.__bleachCharacters) {
        window.__bleachCharacters.setFrequency(frequency);
        window.__bleachCharacters.setEnabled(
            frequency !== 'off' && areDecorativeEffectsAllowed()
        );
    }
    document.dispatchEvent(new CustomEvent('sledge:settingschanged'));
    updateVisualControls();
}

let spotlightEnabled = localStorage.getItem('sledge_spotlight') === 'true';
let spotlightRafId = null;
let spotlightX = -9999;
let spotlightY = -9999;
let spotlightBound = false;

function refreshSpotlight() {
    const el = document.getElementById('cursor-spotlight');
    if (!el) return;
    if (!spotlightEnabled || !areDecorativeEffectsAllowed() || !isFinePointer()) {
        el.classList.remove('active');
        return;
    }
    el.style.transform = `translate3d(${Math.round(spotlightX - 210)}px, ${Math.round(spotlightY - 210)}px, 0)`;
    el.classList.add('active');
}

function setSpotlightEnabled(enabled, persist = true) {
    spotlightEnabled = !!enabled && isFinePointer();
    if (persist) localStorage.setItem('sledge_spotlight', String(spotlightEnabled));
    const toggle = document.getElementById('toggle-spotlight');
    if (toggle) toggle.checked = spotlightEnabled;
    refreshSpotlight();
}

function initSpotlight() {
    if (spotlightBound) return;
    spotlightBound = true;
    const el = document.getElementById('cursor-spotlight');
    if (!el) return;

    document.addEventListener('pointermove', (event) => {
        if (!spotlightEnabled || !areDecorativeEffectsAllowed() || event.pointerType === 'touch') return;
        spotlightX = event.clientX;
        spotlightY = event.clientY;
        if (spotlightRafId) return;
        spotlightRafId = requestAnimationFrame(() => {
            spotlightRafId = null;
            refreshSpotlight();
        });
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
        el.classList.remove('active');
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) el.classList.remove('active');
    });
}

function updateVisualControls() {
    const accent = getCustomAccent();
    const accentInput = document.getElementById('custom-accent');
    if (accentInput) {
        const computed = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        if (document.activeElement !== accentInput) accentInput.value = accent || computed || '#6366f1';
    }
    const font = localStorage.getItem('sledge_font') || 'site';
    const fontSelect = document.getElementById('custom-font');
    if (fontSelect) fontSelect.value = FONT_STACKS[font] ? font : 'site';
    const cursorSelect = document.getElementById('custom-cursor');
    if (cursorSelect) cursorSelect.value = document.documentElement.getAttribute('data-cursor') === 'system' ? 'system' : 'theme';
    const animationSelect = document.getElementById('custom-animation');
    if (animationSelect) animationSelect.value = getAnimationLevel();
    const cardsSelect = document.getElementById('custom-cards');
    if (cardsSelect) cardsSelect.value = document.documentElement.getAttribute('data-cards') || 'original';
    const charSelect = document.getElementById('character-frequency');
    if (charSelect) charSelect.value = localStorage.getItem('character_popups') === 'false' ? 'off' : getCharacterFrequency();
    const spotlightToggle = document.getElementById('toggle-spotlight');
    if (spotlightToggle) spotlightToggle.checked = spotlightEnabled;
    const preset = localStorage.getItem('sledge_preset');
    document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(!!preset && btn.dataset.preset === preset));
    });
}

function initVisualCustomization() {
    applyAccentSetting(getCustomAccent(), false);
    applyFontSetting(localStorage.getItem('sledge_font') || 'site', false);
    applyCursorSetting(localStorage.getItem('sledge_cursor') || 'theme', false);
    applyCardSetting(localStorage.getItem('sledge_cards') || 'original', false);
    document.documentElement.setAttribute('data-animation', getAnimationLevel());
    restoreAtmospherePreference();
    // Void Mode is a preset-only look flag, so restore it from the preset key.
    if (localStorage.getItem('sledge_preset') === 'void') {
        document.documentElement.setAttribute('data-look', 'void');
    }
    setSpotlightEnabled(localStorage.getItem('sledge_spotlight') === 'true', false);
    initSpotlight();

    const accentInput = document.getElementById('custom-accent');
    if (accentInput) {
        accentInput.addEventListener('input', () => applyAccentSetting(accentInput.value));
    }
    const resetAccent = document.getElementById('reset-accent');
    if (resetAccent) resetAccent.addEventListener('click', () => applyAccentSetting(''));
    const fontSelect = document.getElementById('custom-font');
    if (fontSelect) fontSelect.addEventListener('change', () => applyFontSetting(fontSelect.value));
    const cursorSelect = document.getElementById('custom-cursor');
    if (cursorSelect) cursorSelect.addEventListener('change', () => applyCursorSetting(cursorSelect.value));
    const animationSelect = document.getElementById('custom-animation');
    if (animationSelect) animationSelect.addEventListener('change', () => applyAnimationSetting(animationSelect.value));
    const cardsSelect = document.getElementById('custom-cards');
    if (cardsSelect) cardsSelect.addEventListener('change', () => applyCardSetting(cardsSelect.value));
    const charSelect = document.getElementById('character-frequency');
    if (charSelect) charSelect.addEventListener('change', () => setCharacterFrequency(charSelect.value));
    const reset = document.getElementById('reset-customization');
    if (reset) {
        reset.addEventListener('click', () => {
            applyAccentSetting('');
            applyFontSetting('site');
            applyCursorSetting('theme');
            applyCardSetting('original');
            applyAnimationSetting('medium');
            setCharacterFrequency('normal');
            setSpotlightEnabled(true);
            showToast('Appearance overrides reset to the active theme.', 'info');
        });
    }

    document.addEventListener('sledge:settingschanged', updateVisualControls);
    document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });
    updateVisualControls();
}

// ===== APPEARANCE PRESETS =====
const VISUAL_PRESETS = {
    classic: {
        label: 'Classic Sledge',
        theme: 'default',
        mode: 'dark',
        look: '',
        particle: 'gold',
        atmosphere: null,
        intensity: 'subtle',
        accent: '#eab308',
        font: 'site',
        cursor: 'theme',
        animation: 'low',
        cards: 'original',
        characters: 'rare'
    },
    anime: {
        label: 'Anime Dream',
        theme: 'senbonzakura',
        mode: 'light',
        look: '',
        particle: 'sakura',
        atmosphere: null,
        intensity: 'medium',
        accent: '#ec4899',
        font: 'poppins',
        cursor: 'theme',
        animation: 'medium',
        cards: 'glass',
        characters: 'normal'
    },
    soul: {
        label: 'Soul Society',
        theme: 'tensa-zangetsu',
        mode: 'dark',
        look: '',
        particle: 'rain',
        atmosphere: 'mist',
        intensity: 'medium',
        accent: '#ef4444',
        font: 'site',
        cursor: 'theme',
        animation: 'medium',
        cards: 'original',
        characters: 'rare'
    },
    golden: {
        label: 'Golden Hour',
        theme: 'nozarashi',
        mode: 'dark',
        look: '',
        particle: 'gold',
        atmosphere: 'aurora',
        intensity: 'medium',
        accent: '#f59e0b',
        font: 'outfit',
        cursor: 'theme',
        animation: 'medium',
        cards: 'glow',
        characters: 'normal'
    },
    void: {
        label: 'Void Mode',
        theme: 'default',
        mode: 'dark',
        look: 'void',
        particle: 'starfield',
        atmosphere: null,
        intensity: 'subtle',
        accent: '#a3a3a3',
        font: 'outfit',
        cursor: 'theme',
        animation: 'low',
        cards: 'original',
        characters: 'rare'
    },
    hogyoku: {
        label: 'Hōgyoku Awakening',
        theme: 'hogyoku',
        mode: 'dark',
        look: '',
        particle: null,
        atmosphere: null,
        intensity: 'subtle',
        accent: '#c084fc',
        font: 'outfit',
        cursor: 'theme',
        animation: 'low',
        cards: 'original',
        characters: 'rare'
    }
};

function applyPreset(name) {
    const preset = VISUAL_PRESETS[name];
    if (!preset) return;

    if (preset.theme === 'default') resetZanpakutoTheme(false, { userInitiated: true });
    else applyZanpakutoTheme(preset.theme, false, { userInitiated: true });

    document.documentElement.setAttribute('data-theme', preset.mode);
    localStorage.setItem('theme', preset.mode);
    updateThemeIcon(preset.mode);

    if (preset.look) document.documentElement.setAttribute('data-look', preset.look);
    else document.documentElement.removeAttribute('data-look');

    setEffectIntensity(preset.intensity, true);
    setParticleMode(preset.particle, true);
    setAtmosphereMode(preset.atmosphere, true);
    applyAccentSetting(preset.accent, true);
    applyFontSetting(preset.font, true);
    applyCursorSetting(preset.cursor, true);
    applyAnimationSetting(preset.animation, true);
    applyCardSetting(preset.cards, true);
    setCharacterFrequency(preset.characters, true);

    localStorage.setItem('sledge_preset', name);
    document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.preset === name));
    });
    syncAccentVars();
    document.dispatchEvent(new CustomEvent('sledge:settingschanged'));
    updateVisualControls();
    showToast(`Preset applied: ${preset.label}.`, 'success');
}

// ===== PAKISTAN CLOCK & GREETING =====
function initPktClock() {
    const timeEl = document.getElementById('pkt-time');
    const greetEl = document.getElementById('pkt-greeting');
    if (!timeEl && !greetEl) return;

    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    function pktHour() {
        try {
            return Number(new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Karachi',
                hour: '2-digit',
                hour12: false
            }).format(new Date()));
        } catch (error) {
            return new Date().getHours();
        }
    }

    function greetingFor(hour) {
        if (hour < 5) return 'Burning the midnight oil? Study smart, scholars.';
        if (hour < 12) return 'Good morning, scholars. Pakistan Standard Time.';
        if (hour < 17) return 'Good afternoon, scholars. Keep your streak alive.';
        if (hour < 21) return 'Good evening, scholars. One more chapter?';
        return 'Late-night grind, scholars. Remember to rest.';
    }

    function render() {
        if (timeEl) {
            try {
                timeEl.textContent = formatter.format(new Date());
            } catch (error) {
                timeEl.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            }
        }
        if (greetEl) greetEl.textContent = greetingFor(pktHour());
    }

    render();
    // Align updates to the minute boundary, then tick every minute.
    const msToNextMinute = 60000 - (Date.now() % 60000);
    setTimeout(() => {
        render();
        setInterval(render, 60000);
    }, msToNextMinute);
}

// ===== KEYBOARD SHORTCUTS =====
function initKeyboardShortcuts() {
    const overlay = document.getElementById('shortcuts-overlay');
    const closeBtn = document.getElementById('shortcuts-close');
    if (!overlay) return;
    let lastFocused = null;

    function openShortcuts() {
        lastFocused = document.activeElement;
        overlay.classList.remove('hidden');
        const focusTarget = closeBtn || overlay.querySelector('button');
        if (focusTarget) focusTarget.focus();
    }

    function closeShortcuts() {
        if (overlay.classList.contains('hidden')) return;
        overlay.classList.add('hidden');
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    if (closeBtn) closeBtn.addEventListener('click', closeShortcuts);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeShortcuts();
    });

    function ensureDockOpen() {
        const dock = document.getElementById('sledge-dock');
        if (!dock) return false;
        if (dock.getAttribute('aria-hidden') !== 'false') {
            const toggle = document.getElementById('dock-toggle');
            if (toggle) toggle.click();
        }
        return true;
    }

    function clickDockControl(buttonId) {
        if (!ensureDockOpen()) return;
        const btn = document.getElementById(buttonId);
        if (btn) btn.click();
    }

    document.addEventListener('keydown', (event) => {
        const target = event.target;
        const typing = target && (
            target.isContentEditable
            || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName || '')
        );

        if (event.key === 'Escape') {
            if (!overlay.classList.contains('hidden')) {
                event.preventDefault();
                closeShortcuts();
            }
            return;
        }

        if (typing || event.ctrlKey || event.metaKey) return;

        if (event.key === '?' || (event.shiftKey && event.key === '/')) {
            event.preventDefault();
            if (overlay.classList.contains('hidden')) openShortcuts();
            else closeShortcuts();
            return;
        }

        if (!event.altKey) return;
        const key = event.key.toLowerCase();
        if (key === 't') { event.preventDefault(); clickDockControl('dock-themes'); }
        else if (key === 'e') { event.preventDefault(); clickDockControl('dock-effects'); }
        else if (key === 'm') { event.preventDefault(); clickDockControl('dock-music'); }
        else if (key === 'q') { event.preventDefault(); clickDockControl('dock-quiet'); }
    });
}

// ===== DOWNLOAD NOTIFICATIONS =====
function initDownloadNotifications() {
    document.addEventListener('click', (event) => {
        const link = event.target.closest('.file-action-btn[title="Download Document"]');
        if (!link) return;
        const item = link.closest('.file-item');
        const name = item && item.querySelector('.file-name');
        const label = name ? name.textContent.trim() : 'your file';
        showToast(`Download started: ${label}`, 'success');
    });
}

// ===== SCROLL PROGRESS & BACK TO TOP =====
function initScrollExperience() {
    const bar = document.querySelector('#scroll-progress span');
    const topBtn = document.getElementById('back-to-top');
    let ticking = false;

    function update() {
        ticking = false;
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - window.innerHeight);
        const ratio = Math.min(1, Math.max(0, window.scrollY / max));
        if (bar) bar.style.transform = `scaleX(${ratio})`;
        if (topBtn) topBtn.classList.toggle('visible', window.scrollY > 480);
    }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();

    if (topBtn) {
        topBtn.addEventListener('click', () => {
            const smooth = !prefersReducedMotion() && getAnimationLevel() !== 'off';
            window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
        });
    }
}

// ===== SCROLL REVEALS =====
function initRevealAnimations() {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;

    const revealSelector = [
        '.section-header', '.about-card', '.curriculum-card',
        '.course-card', '.faq-item', '.contact-card'
    ].join(',');

    const seen = new WeakSet();
    let observer = null;

    function ensureObserver() {
        if (observer) return observer;
        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('reveal-in');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
        return observer;
    }

    function register(root) {
        if (!root) return;
        if (getAnimationLevel() === 'off') {
            root.querySelectorAll('.reveal-target').forEach(el => el.classList.add('reveal-in'));
            return;
        }
        const io = ensureObserver();
        const nodes = [];
        if (root.nodeType === 1 && root.matches && root.matches(revealSelector)) nodes.push(root);
        const descendants = root.querySelectorAll ? root.querySelectorAll(revealSelector) : [];
        descendants.forEach(el => nodes.push(el));
        nodes.forEach((el) => {
            if (seen.has(el) || el.closest('.hidden')) return;
            seen.add(el);
            el.classList.add('reveal-target');
            io.observe(el);
        });
    }

    register(document);
    // Cards are rendered after Firestore resolves, so watch for new nodes.
    const mo = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) register(node.parentNode || node);
            });
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Fallback sweep: if the observer misses an element that is already in the
    // viewport (layout shifts, hidden panels opening), show it rather than
    // leaving content at zero opacity.
    function sweep() {
        document.querySelectorAll('.reveal-target:not(.reveal-in)').forEach((el) => {
            if (getAnimationLevel() === 'off') { el.classList.add('reveal-in'); return; }
            const rect = el.getBoundingClientRect();
            if (rect.height > 0 && rect.top < window.innerHeight * 0.98 && rect.bottom > 0) {
                el.classList.add('reveal-in');
                if (observer) observer.unobserve(el);
            }
        });
    }
    document.addEventListener('sledge:settingschanged', () => setTimeout(sweep, 60));
    setTimeout(sweep, 2200);

    // Safety net: never leave content invisible if the observer misses a node.
    setTimeout(() => {
        document.querySelectorAll('.reveal-target:not(.reveal-in)').forEach((el) => {
            if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('reveal-in');
        });
    }, 1600);
}

// ===== PREMIUM MICRO-INTERACTIONS =====
function initPremiumInteractions() {
    if (!isFinePointer()) return;

    document.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if (!areDecorativeEffectsAllowed()) return;
        const target = event.target.closest(
            'button, .btn, .course-card, .dock-action, .dock-theme-item, .file-action-btn, .nav-link'
        );
        if (!target) return;
        const ripple = document.createElement('span');
        ripple.className = 'click-ripple';
        ripple.style.left = `${event.clientX}px`;
        ripple.style.top = `${event.clientY}px`;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 620);
    }, { passive: true });
}

// ===== FLOATING DOCK =====
function initFloatingDock() {
    const shell = document.getElementById('dock-shell');
    const dock = document.getElementById('sledge-dock');
    if (!shell || !dock) return;

    const toggleBtn = document.getElementById('dock-toggle');
    const themeBtn = document.getElementById('dock-themes');
    const themePopup = document.getElementById('dock-theme-popup');
    const effectsBtn = document.getElementById('dock-effects');
    const effectsPopup = document.getElementById('dock-effects-popup');
    const musicBtn = document.getElementById('dock-music');
    const quietBtn = document.getElementById('dock-quiet');

    if (!toggleBtn || !themeBtn || !themePopup || !effectsBtn || !effectsPopup || !musicBtn || !quietBtn) return;

    const rainToggle = document.getElementById('toggle-rain');
    const goldToggle = document.getElementById('toggle-gold');
    const sakuraToggle = document.getElementById('toggle-sakura');
    const fireToggle = document.getElementById('toggle-fire');
    const reiatsuToggle = document.getElementById('toggle-reiatsu');
    const starfieldToggle = document.getElementById('toggle-starfield');
    const auroraToggle = document.getElementById('toggle-aurora');
    const mistToggle = document.getElementById('toggle-mist');
    const cursorToggle = document.getElementById('toggle-cursor');
    const spotlightToggle = document.getElementById('toggle-spotlight');
    const reducedToggle = document.getElementById('toggle-reduced');
    const bloodmoonToggle = document.getElementById('toggle-bloodmoon');
    const charsToggle = document.getElementById('toggle-chars');
    const cursorRow = document.getElementById('effect-row-cursor');
    const bloodMoonRow = document.getElementById('effect-row-bloodmoon');
    const effectsNote = document.getElementById('dock-effects-note');
    const clearBtn = document.getElementById('dock-clear-effects');
    const intensityButtons = Array.from(document.querySelectorAll('[data-intensity]'));
    const intensityGroup = document.querySelector('.dock-intensity');
    const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const hoverQuery = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;

    let quietActive = localStorage.getItem('quiet_mode') === 'true';
    let charactersEnabled = localStorage.getItem('character_popups') !== 'false';
    let dockOpen = false;

    const getActiveTheme = () => document.documentElement.getAttribute('data-zanpakuto') || 'default';
    const bloodMoonActive = () => document.documentElement.getAttribute('data-blood-moon') === 'true';

    restoreParticlePreference();

    // ---------- Dock expansion ----------
    function closePopups(restoreFocusTo) {
        setPopupOpen(themePopup, themeBtn, false);
        setPopupOpen(effectsPopup, effectsBtn, false);
        if (restoreFocusTo) restoreFocusTo.focus({ preventScroll: true });
    }

    function setPopupOpen(popup, btn, open) {
        popup.classList.toggle('open', open);
        popup.setAttribute('aria-hidden', String(!open));
        btn.setAttribute('aria-expanded', String(open));
        if ('inert' in popup) popup.inert = !open;
    }

    function setDockOpen(open, options = {}) {
        if (dockOpen === open) return;
        dockOpen = open;
        shell.classList.toggle('dock-open', open);
        toggleBtn.setAttribute('aria-expanded', String(open));
        const label = open ? 'Close quick controls' : 'Open quick controls';
        toggleBtn.setAttribute('aria-label', label);
        toggleBtn.title = label;
        const icon = toggleBtn.querySelector('i');
        if (icon) icon.className = open ? 'fas fa-xmark' : 'fas fa-bolt';
        dock.setAttribute('aria-hidden', String(!open));
        if ('inert' in dock) dock.inert = !open;

        if (open) {
            updateDockThemeHighlight();
            updateEffectsPanel();
            if (options.focusFirst) {
                const first = dock.querySelector('.dock-btn');
                if (first) first.focus({ preventScroll: true });
            }
        } else {
            closePopups();
            if (options.returnFocus) toggleBtn.focus({ preventScroll: true });
        }
    }

    toggleBtn.addEventListener('click', () => {
        if (dockOpen) {
            closePopups();
            setDockOpen(false, { returnFocus: true });
        } else {
            setDockOpen(true, { focusFirst: true });
        }
    });

    function openPopup(popup, btn) {
        const isOpen = popup.classList.contains('open');
        closePopups();
        if (isOpen) return;
        setDockOpen(true);
        setPopupOpen(popup, btn, true);
        // Focus the dialog itself so the panel resets to the top instead of
        // scrolling to (and hiding) its heading.
        popup.scrollTop = 0;
        popup.setAttribute('tabindex', '-1');
        popup.focus({ preventScroll: true });
    }

    themeBtn.addEventListener('click', () => {
        updateDockThemeHighlight();
        openPopup(themePopup, themeBtn);
    });

    effectsBtn.addEventListener('click', () => {
        updateEffectsPanel();
        openPopup(effectsPopup, effectsBtn);
    });

    // Desktop hover expansion; pointer leave only retracts when nothing is
    // being used and focus is not inside the dock.
    if (hoverQuery && hoverQuery.matches) {
        shell.addEventListener('pointerenter', () => {
            if (!dockOpen) setDockOpen(true);
        });
        shell.addEventListener('pointerleave', () => {
            if (!dockOpen) return;
            if (themePopup.classList.contains('open') || effectsPopup.classList.contains('open')) return;
            if (shell.contains(document.activeElement)) return;
            setDockOpen(false);
        });
    }

    document.addEventListener('click', (event) => {
        if (shell.contains(event.target)) return;
        if (!dockOpen) return;
        closePopups();
        setDockOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !dockOpen) return;
        closePopups();
        setDockOpen(false, { returnFocus: true });
    });

    // Arrow-key navigation inside the theme list
    themePopup.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        const items = Array.from(themePopup.querySelectorAll('.dock-theme-item'));
        const index = items.indexOf(document.activeElement);
        if (index === -1) return;
        event.preventDefault();
        const next = event.key === 'ArrowDown'
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length;
        items[next].focus();
    });

    // Arrow-key navigation inside the intensity radio group
    if (intensityGroup) {
        intensityGroup.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            const current = intensityButtons.findIndex(btn => btn.getAttribute('aria-checked') === 'true');
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            const next = (current + direction + intensityButtons.length) % intensityButtons.length;
            event.preventDefault();
            intensityButtons[next].focus();
            setEffectIntensity(intensityButtons[next].dataset.intensity);
            updateEffectsPanel();
        });
    }

    // ---------- Themes (reuse the existing theme engine) ----------
    themePopup.querySelectorAll('.dock-theme-item').forEach(item => {
        item.addEventListener('click', () => {
            const theme = item.dataset.dockTheme;
            // Hōgyoku is a dark-first cinematic theme: selecting it from the
            // dock also switches the existing colour mode, rather than
            // introducing a second theme state.
            if (theme === 'hogyoku' && document.documentElement.getAttribute('data-theme') !== 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                updateThemeIcon('dark');
            }
            if (theme === 'default') {
                resetZanpakutoTheme(true, { userInitiated: true });
            } else {
                applyZanpakutoTheme(theme, true, { userInitiated: true });
            }
            // Choosing a Zanpakuto awakens its signature effect (user can turn
            // it off afterwards from the dock).
            applyThemeSignatureEffect(theme);
            document.documentElement.removeAttribute('data-look');
            localStorage.removeItem('sledge_preset');
            document.querySelectorAll('[data-preset]').forEach(btn => btn.setAttribute('aria-pressed', 'false'));
            updateDockThemeHighlight();
            closePopups(themeBtn);
        });
    });

    function updateDockThemeHighlight() {
        const active = getActiveTheme();
        themePopup.querySelectorAll('.dock-theme-item').forEach(item => {
            const isActive = item.dataset.dockTheme === active;
            item.classList.toggle('active-theme', isActive);
            if (isActive) {
                item.setAttribute('aria-current', 'true');
            } else {
                item.removeAttribute('aria-current');
            }
        });
        syncAccentVars();
        updateEffectsPanel();
    }

    // ---------- Effects ----------
    function updateEffectsPanel() {
        const locked = quietActive || effectsMotionPaused();
        const finePointer = isFinePointer();

        if (bloodMoonRow) bloodMoonRow.hidden = getActiveTheme() !== 'tensa-zangetsu';
        if (cursorRow) cursorRow.hidden = !finePointer;

        const setToggle = (input, checked, disabled) => {
            if (!input) return;
            input.checked = checked;
            input.disabled = !!disabled;
        };

        setToggle(rainToggle, particleMode === 'rain', locked);
        setToggle(goldToggle, particleMode === 'gold', locked);
        setToggle(sakuraToggle, particleMode === 'sakura', locked);
        setToggle(fireToggle, particleMode === 'nozarashi', locked);
        setToggle(reiatsuToggle, particleMode === 'reiatsu', locked);
        setToggle(starfieldToggle, particleMode === 'starfield', locked);
        setToggle(auroraToggle, atmosphereMode === 'aurora', locked);
        setToggle(mistToggle, atmosphereMode === 'mist', locked);
        setToggle(cursorToggle, cursorTrailEnabled, locked || !finePointer);
        setToggle(spotlightToggle, spotlightEnabled, locked || !finePointer);
        setToggle(reducedToggle, effectsMotionPaused(), prefersReducedMotion());
        setToggle(bloodmoonToggle, bloodMoonActive(), getActiveTheme() !== 'tensa-zangetsu' || locked);
        setToggle(charsToggle, charactersEnabled, locked || getCharacterFrequency() === 'off');

        var spotlightRow = document.getElementById('effect-row-spotlight');
        if (spotlightRow) spotlightRow.hidden = !finePointer;

        intensityButtons.forEach(btn => {
            btn.setAttribute('aria-checked', String(btn.dataset.intensity === getEffectIntensity()));
        });

        if (clearBtn) {
            clearBtn.disabled = !particleMode && !cursorTrailEnabled && !bloodMoonActive()
                && !charactersEnabled && !atmosphereMode && !spotlightEnabled;
        }

        if (effectsNote) {
            let note = '';
            if (prefersReducedMotion()) {
                note = 'Reduced motion is on in your system settings — particle effects are paused.';
            } else if (effectsMotionPaused()) {
                note = 'Reduced motion is on — particle effects are paused.';
            } else if (quietActive) {
                note = 'Quiet mode is on — effects are paused until you turn it off.';
            } else if (particleMode) {
                note = 'One particle layer runs at a time. Switching effects stops the previous one.';
            }
            effectsNote.textContent = note;
            effectsNote.hidden = !note;
        }
    }

    function bindParticleToggle(input, mode) {
        if (!input) return;
        input.addEventListener('change', () => {
            if (input.checked) {
                setParticleMode(mode);
            } else if (particleMode === mode) {
                setParticleMode(null);
            }
            updateEffectsPanel();
        });
    }

    bindParticleToggle(rainToggle, 'rain');
    bindParticleToggle(goldToggle, 'gold');
    bindParticleToggle(sakuraToggle, 'sakura');
    bindParticleToggle(fireToggle, 'nozarashi');
    bindParticleToggle(reiatsuToggle, 'reiatsu');
    bindParticleToggle(starfieldToggle, 'starfield');

    function bindAtmosphereToggle(input, mode) {
        if (!input) return;
        input.addEventListener('change', () => {
            if (input.checked) {
                setAtmosphereMode(mode);
            } else if (atmosphereMode === mode) {
                setAtmosphereMode(null);
            }
            syncAccentVars();
            updateEffectsPanel();
            document.dispatchEvent(new CustomEvent('sledge:settingschanged'));
        });
    }

    bindAtmosphereToggle(auroraToggle, 'aurora');
    bindAtmosphereToggle(mistToggle, 'mist');

    if (spotlightToggle) {
        spotlightToggle.addEventListener('change', () => {
            setSpotlightEnabled(spotlightToggle.checked);
            updateEffectsPanel();
            document.dispatchEvent(new CustomEvent('sledge:settingschanged'));
        });
    }

    intensityButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setEffectIntensity(btn.dataset.intensity);
            updateEffectsPanel();
        });
    });

    if (cursorToggle) {
        cursorToggle.addEventListener('change', () => {
            setCursorTrailEnabled(cursorToggle.checked);
            updateEffectsPanel();
        });
    }

    if (reducedToggle) {
        reducedToggle.addEventListener('change', () => {
            localStorage.setItem('effects_reduced_motion', String(reducedToggle.checked));
            refreshParticleEffect();
            refreshCursorTrail();
            if (window.__bleachCharacters) {
                window.__bleachCharacters.setEnabled(charactersEnabled && !quietActive && !effectsMotionPaused());
            }
            updateEffectsPanel();
        });
    }

    if (bloodmoonToggle) {
        bloodmoonToggle.addEventListener('change', () => {
            if (getActiveTheme() !== 'tensa-zangetsu') return;
            const moon = document.getElementById('tensa-moon');
            if (moon) moon.click();
            updateEffectsPanel();
        });
    }

    // ---------- Character pop-ups ----------
    function applyCharactersEnabled(enabled, persist = true) {
        charactersEnabled = enabled;
        if (persist) localStorage.setItem('character_popups', String(enabled));
        document.body.classList.toggle('characters-off', !enabled);
        if (window.__bleachCharacters) {
            window.__bleachCharacters.setEnabled(enabled && !quietActive && !effectsMotionPaused());
        }
        if (charsToggle) charsToggle.checked = enabled;
    }

    if (charsToggle) {
        charsToggle.addEventListener('change', () => {
            applyCharactersEnabled(charsToggle.checked);
            updateEffectsPanel();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            setParticleMode(null);
            setCursorTrailEnabled(false);
            setAtmosphereMode(null);
            setSpotlightEnabled(false);
            applyCharactersEnabled(false);
            if (window.__tensaBloodMoon && window.__tensaBloodMoon.isActive()) {
                window.__tensaBloodMoon.setActive(false, false);
            }
            updateEffectsPanel();
            document.dispatchEvent(new CustomEvent('sledge:settingschanged'));
            showToast('All decorative effects cleared.', 'info');
        });
    }

    // ---------- Music pop-up (existing Now Playing widget) ----------
    function syncMusicButton() {
        const np = window.__nowPlayingWidget;
        const open = !!(np && typeof np.isOpen === 'function' && np.isOpen());
        musicBtn.classList.toggle('dock-active', open);
        musicBtn.setAttribute('aria-pressed', String(open));
    }

    musicBtn.addEventListener('click', () => {
        const np = window.__nowPlayingWidget;
        if (!np || typeof np.showDetails !== 'function') {
            showToast('Music pop-up is still loading…', 'info');
            return;
        }
        closePopups();
        if (typeof np.isOpen === 'function' && np.isOpen()) {
            np.hide();
        } else {
            np.showDetails();
        }
        syncMusicButton();
    });

    document.addEventListener('sledge:nowplaying', syncMusicButton);

    // ---------- Quiet mode ----------
    function applyQuietMode(active, persist = true) {
        quietActive = active;
        document.body.classList.toggle('quiet-mode', active);
        quietBtn.classList.toggle('dock-active', active);
        quietBtn.setAttribute('aria-pressed', String(active));
        const icon = quietBtn.querySelector('i');
        if (icon) icon.className = active ? 'fas fa-eye' : 'fas fa-eye-slash';
        quietBtn.title = active
            ? 'Quiet mode is on — click to restore decorative effects'
            : 'Quiet mode: hide decorative pop-ups and effects';
        quietBtn.setAttribute('aria-label', quietBtn.title);
        if (persist) localStorage.setItem('quiet_mode', String(active));

        if (window.__bleachCharacters) {
            window.__bleachCharacters.setEnabled(charactersEnabled && !active && !effectsMotionPaused());
        }

        // The selected particle mode and trail preference are kept, so turning
        // Quiet Mode off restores the previous effects.
        refreshParticleEffect();
        refreshCursorTrail();
        updateEffectsPanel();
    }

    quietBtn.addEventListener('click', () => applyQuietMode(!quietActive));

    // ---------- Reduced-motion changes at runtime ----------
    if (motionQuery) {
        const onMotionChange = () => {
            refreshParticleEffect();
            refreshCursorTrail();
            if (window.__bleachCharacters) {
                window.__bleachCharacters.setEnabled(charactersEnabled && !quietActive && !effectsMotionPaused());
            }
            updateEffectsPanel();
        };
        if (typeof motionQuery.addEventListener === 'function') {
            motionQuery.addEventListener('change', onMotionChange);
        } else if (typeof motionQuery.addListener === 'function') {
            motionQuery.addListener(onMotionChange);
        }
    }

    // Keep the dock in sync when the theme or Blood Moon changes anywhere
    const observer = new MutationObserver(() => updateDockThemeHighlight());
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-zanpakuto', 'data-blood-moon']
    });

    // Customization/preset changes can enable or disable characters from outside
    // the dock (for example the frequency selector inside the Themes panel).
    document.addEventListener('sledge:settingschanged', () => {
        charactersEnabled = localStorage.getItem('character_popups') !== 'false'
            && getCharacterFrequency() !== 'off';
        document.body.classList.toggle('characters-off', !charactersEnabled);
        if (charsToggle) charsToggle.checked = charactersEnabled;
        if (window.__bleachCharacters) {
            window.__bleachCharacters.setFrequency(getCharacterFrequency());
            window.__bleachCharacters.setEnabled(
                charactersEnabled && !quietActive && !effectsMotionPaused()
            );
        }
        updateEffectsPanel();
    });

    // Initial state
    applyCharactersEnabled(charactersEnabled, false);
    applyQuietMode(quietActive, false);
    updateDockThemeHighlight();
    syncMusicButton();
    setTimeout(syncMusicButton, 600); // widget builds on DOMContentLoaded
}

// ===== TENSA ZANGETSU BLOOD MOON =====
function initTensaMoon() {
    const moon = document.getElementById('tensa-moon');
    if (!moon) return;

    let bloodMoonActive = false;

    function activateBloodMoon(notify = true) {
        bloodMoonActive = true;
        document.documentElement.setAttribute('data-blood-moon', 'true');
        moon.setAttribute('title', 'Tensō Zangetsu — Blood Moon Active! Click to seal.');
        moon.setAttribute('aria-label', 'Blood Moon active — click to deactivate');
        const toggle = document.getElementById('toggle-bloodmoon');
        if (toggle) toggle.checked = true;
        // Reiatsu embers change color when the Blood Moon is active.
        if (particleMode === 'reiatsu') refreshParticleEffect();
        if (notify) showToast('⚔️ BANKAI… Tensa Zangetsu! Blood Moon Awakened!', 'success');
    }

    function deactivateBloodMoon(notify = true) {
        bloodMoonActive = false;
        document.documentElement.removeAttribute('data-blood-moon');
        moon.setAttribute('title', 'Tensō Zangetsu — Click to awaken Blood Moon');
        moon.setAttribute('aria-label', 'Tensa Zangetsu Moon — click to activate Blood Moon');
        const toggle = document.getElementById('toggle-bloodmoon');
        if (toggle) toggle.checked = false;
        if (particleMode === 'reiatsu') refreshParticleEffect();
        if (notify) showToast('Blood Moon sealed. 月牙天衝…', 'info');
    }

    function onMoonClick() {
        const activeTheme = document.documentElement.getAttribute('data-zanpakuto');
        if (activeTheme !== 'tensa-zangetsu') return;
        if (bloodMoonActive) {
            deactivateBloodMoon();
        } else {
            activateBloodMoon();
        }
    }

    moon.addEventListener('click', onMoonClick);
    moon.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onMoonClick();
        }
    });

    // Small public API so the dock's "Clear all effects" action can seal the
    // Blood Moon without firing a second notification.
    window.__tensaBloodMoon = {
        isActive: () => bloodMoonActive,
        setActive: (value, notify = true) => {
            if (value) activateBloodMoon(notify);
            else deactivateBloodMoon(notify);
        }
    };

    // Reset Blood Moon when switching away from Tensa Zangetsu
    const observer = new MutationObserver(() => {
        const activeTheme = document.documentElement.getAttribute('data-zanpakuto');
        if (activeTheme !== 'tensa-zangetsu' && bloodMoonActive) {
            bloodMoonActive = false;
            document.documentElement.removeAttribute('data-blood-moon');
            const toggle = document.getElementById('toggle-bloodmoon');
            if (toggle) toggle.checked = false;
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-zanpakuto'] });
}
