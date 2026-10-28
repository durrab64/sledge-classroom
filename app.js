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
let currentFilter = 'all'; // 'all' | 'theory' | 'lab'
let originPage = 'courses'; // 'courses' | 'home' | 'labs'
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
    initAuth();
    initUploadModal();
    initEventModal();
    initCalendar();
    populateEventCourseSelect();
    initFooterLinks();
    initFaqAccordion();
    initCurriculumCards();
    initZanpakutoThemes();
    initBleachGateModal();
    initFloatingDock();
    initTensaMoon();

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

function handleHashRoute() {
    const raw = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase().trim();
    if (!raw || raw === 'home') {
        navigateTo('home', false);
    } else if (raw === 'courses') {
        navigateTo('courses', false);
    } else if (raw === 'labs') {
        navigateTo('labs', false);
    } else if (raw === 'calendar') {
        navigateTo('calendar', false);
    } else if (raw.startsWith('course-')) {
        const cId = raw.replace('course-', '');
        if (COURSES.some(c => c.id === cId)) {
            openCourseDetail(cId, 'theory', 'courses');
        } else {
            navigateTo('courses', false);
        }
    }
}

function navigateTo(page, updateHash = true) {
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
            history.pushState(null, '', `#${page}`);
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

// Get files for a course + category from Firestore
async function getFilesFromDB(courseId, category) {
    try {
        const snapshot = await db.collection('courses').doc(courseId)
            .collection(category)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error fetching ${category} for ${courseId}:`, error);
        return [];
    }
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
                primary: lab.size,
                papers: labPapers.size,
                tertiary: labTasks.size,
                total: lab.size + labPapers.size + labTasks.size,
            };
        } else {
            const [lectures, papers, related] = await Promise.all([
                db.collection('courses').doc(courseId).collection('lectures').get(),
                db.collection('courses').doc(courseId).collection('papers').get(),
                db.collection('courses').doc(courseId).collection('related').get(),
            ]);
            return {
                primary: lectures.size,
                papers: papers.size,
                tertiary: related.size,
                total: lectures.size + papers.size + related.size,
            };
        }
    } catch (error) {
        console.error('Error getting file counts:', error);
        return { primary: 0, papers: 0, tertiary: 0, total: 0 };
    }
}

// Get lab file count
async function getLabFileCount(courseId) {
    try {
        const counts = await getFileCounts(courseId, 'lab');
        return counts.total;
    } catch (error) {
        return 0;
    }
}

// Get events from Firestore
async function getEventsFromDB() {
    try {
        const snapshot = await db.collection('events').orderBy('date', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}

// Get event count for a course
async function getEventCount(courseId) {
    try {
        const snapshot = await db.collection('events').where('courseId', '==', courseId).get();
        return snapshot.size;
    } catch (error) {
        return 0;
    }
}

// ===== FILTER PILLS =====
function initFilters() {
    ['home-filter-bar', 'courses-filter-bar'].forEach(barId => {
        const bar = document.getElementById(barId);
        if (!bar) return;
        bar.querySelectorAll('.filter-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                currentFilter = filter;
                document.querySelectorAll('.filter-pill').forEach(p => {
                    p.classList.toggle('active', p.dataset.filter === filter);
                });
                renderCourseCards('home-courses-grid');
                renderCourseCards('courses-grid-full');
            });
        });
    });
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
}

// ===== COURSE CARDS =====
async function loadAllCourseCards() {
    updateFilterCounters();
    await renderCourseCards('home-courses-grid');
    await renderCourseCards('courses-grid-full');
    await renderLabCards();
}

async function renderCourseCards(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:16px;">Loading courses & labs...</p></div>';

    // Fetch counts for Theory courses
    const theoryPromises = COURSES.map(async (course) => {
        const [counts, eventCount] = await Promise.all([
            getFileCounts(course.id, 'theory'),
            getEventCount(course.id),
        ]);
        return { course, counts, eventCount };
    });

    // Fetch counts for Lab sections
    const labPromises = LAB_COURSES.map(async (course) => {
        const [counts, eventCount] = await Promise.all([
            getFileCounts(course.id, 'lab'),
            getEventCount(course.id),
        ]);
        return { course, counts, eventCount };
    });

    const [theoryData, labData] = await Promise.all([
        Promise.all(theoryPromises),
        Promise.all(labPromises),
    ]);

    container.innerHTML = '';

    const showTheory = currentFilter === 'all' || currentFilter === 'theory';
    const showLab = currentFilter === 'all' || currentFilter === 'lab';

    // 1. THEORY COURSES SECTION
    if (showTheory) {
        if (currentFilter === 'all') {
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
            card.className = 'course-card';
            card.style.setProperty('--card-accent', course.color);
            card.style.animationDelay = `${index * 0.04}s`;
            card.innerHTML = `
                <span class="course-type-badge theory"><i class="fas fa-book-reader"></i> Theory</span>
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
        if (currentFilter === 'all') {
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
            card.className = 'course-card';
            card.style.setProperty('--card-accent', '#10b981');
            card.style.animationDelay = `${index * 0.04}s`;
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
            card.addEventListener('click', () => openCourseDetail(course.id, 'lab', currentPage));
            container.appendChild(card);
        });
    }
}

// ===== COURSE DETAIL VIEW (Theory vs Lab Separation) =====
async function openCourseDetail(courseId, initialMode = 'theory', fromPage = currentPage) {
    // BLEACH SHINIGAMI GATE (MVC Easter Egg)
    if (courseId === 'calculus' && !sessionStorage.getItem('bleachGateUnlocked')) {
        promptBleachGate(() => {
            openCourseDetail(courseId, initialMode, fromPage);
        });
        return;
    }

    currentCourseId = courseId;
    currentCourseMode = initialMode;
    originPage = fromPage || 'courses';
    const course = COURSES.find(c => c.id === courseId);
    if (!course) return;

    if (currentPage !== 'courses') navigateTo('courses');

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

    // Back button
    document.getElementById('course-back-btn').onclick = () => {
        document.getElementById('courses-list-view').classList.remove('hidden');
        document.getElementById('course-detail-view').classList.add('hidden');
        if (originPage === 'labs') {
            navigateTo('labs');
        } else if (originPage === 'home') {
            navigateTo('home');
        } else {
            navigateTo('courses');
        }
        loadAllCourseCards();
    };

    // Render content for current mode
    await applyCourseModeView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function switchCourseMode(mode) {
    if (currentCourseMode === mode) return;
    currentCourseMode = mode;
    await applyCourseModeView();
}

async function applyCourseModeView() {
    const course = COURSES.find(c => c.id === currentCourseId);
    if (!course) return;

    // Update Mode Switcher buttons & status
    const btnTheory = document.getElementById('mode-btn-theory');
    const btnLab = document.getElementById('mode-btn-lab');
    const statusText = document.getElementById('mode-status-text');

    if (btnTheory && btnLab) {
        btnTheory.classList.toggle('active', currentCourseMode === 'theory');
        btnLab.classList.toggle('active', currentCourseMode === 'lab');
    }
    if (statusText) {
        statusText.innerHTML = currentCourseMode === 'theory' 
            ? '<i class="fas fa-book-reader" style="color:var(--blue-500);"></i> Viewing Theory Coursework'
            : '<i class="fas fa-flask" style="color:#10b981;"></i> Viewing Practical Lab Section';
    }

    // Update Header
    const header = document.getElementById('course-header');
    if (currentCourseMode === 'lab') {
        header.style.background = 'linear-gradient(135deg, #0d9488, #059669)';
        header.innerHTML = `
            <div class="course-header-content">
                <div class="course-header-icon"><i class="fas fa-flask"></i></div>
                <h1>${course.name} — Lab Section</h1>
                <p>Practical lab manuals, experiment sheets, code exercises, and viva past papers.</p>
            </div>
        `;
    } else {
        header.style.background = course.gradient;
        header.innerHTML = `
            <div class="course-header-content">
                <div class="course-header-icon"><i class="${course.icon}"></i></div>
                <h1>${course.name}${course.hasLab ? ' — Theory Section' : ''}</h1>
                <p>${course.description}</p>
            </div>
        `;
    }

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

    const cat1 = currentCourseMode === 'lab' ? 'lab' : 'lectures';
    const cat2 = currentCourseMode === 'lab' ? 'lab_papers' : 'papers';
    const cat3 = currentCourseMode === 'lab' ? 'lab_tasks' : 'related';

    if (currentCourseMode === 'lab') {
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

    // Reset to first tab
    switchTab('lectures');

    // Bind upload buttons to current active collections
    document.getElementById('upload-lectures-btn').onclick = () => openUploadModal(cat1, currentCourseId);
    document.getElementById('upload-papers-btn').onclick = () => openUploadModal(cat2, currentCourseId);
    document.getElementById('upload-related-btn').onclick = () => openUploadModal(cat3, currentCourseId);

    document.getElementById('add-course-event-btn').onclick = () => {
        eventModalCourseId = currentCourseId;
        openEventModal();
    };

    // Load active category lists
    await Promise.all([
        renderFileList(cat1),
        renderFileList(cat2),
        renderFileList(cat3),
        renderCourseEvents(),
    ]);
}

// ===== TABS =====
function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('#course-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));

    // Map tab names to content IDs
    const tabMapping = {
        'lectures': 'tab-content-lectures',
        'past-papers': 'tab-content-past-papers',
        'related': 'tab-content-related',
        'course-calendar': 'tab-content-course-calendar',
    };

    document.querySelectorAll('.tab-content').forEach(tc => {
        tc.classList.remove('active');
    });

    const targetId = tabMapping[tabName];
    if (targetId) {
        document.getElementById(targetId).classList.add('active');
    }
}

document.querySelectorAll('#course-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ===== RENDER FILE LISTS FROM FIRESTORE =====
async function renderFileList(category) {
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

    const courseId = currentCourseId;

    // Show loading
    listEl.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:12px;">Loading...</p></div>';

    const files = await getFilesFromDB(courseId, category);

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

function createFileItem(file, category) {
    const iconInfo = getResourceIconInfo(file.type || file.name);
    const item = document.createElement('div');
    item.className = 'file-item';
    
    // Fallbacks for URLs
    const previewUrl = file.previewURL || file.url;
    const downloadUrl = file.downloadURL || file.url;

    item.innerHTML = `
        <div class="file-icon ${iconInfo.type}">
            <i class="${iconInfo.icon}"></i>
        </div>
        <div class="file-info">
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-meta">
                ${file.description ? escapeHtml(file.description) + ' · ' : ''}
                <span class="file-type-pill" style="font-size:0.75rem; text-transform:uppercase; font-weight:600; color:var(--blue-500);">${iconInfo.label}</span>
                ${file.date ? ' · ' + file.date : ''}
            </div>
        </div>
        <div class="file-actions">
            ${previewUrl ? `
                <a href="${previewUrl}" target="_blank" rel="noopener noreferrer" class="file-action-btn" title="View / Open Online">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            ` : ''}
            ${downloadUrl ? `
                <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" class="file-action-btn" title="Download Document">
                    <i class="fas fa-download"></i>
                </a>
            ` : ''}
            <button class="file-action-btn delete" title="Delete (Admin)" data-id="${file.id}" data-category="${category}">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    // Delete (admin only — CSS hides it for non-admin)
    item.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFileFromDB(file, category);
    });

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

// ===== DELETE RESOURCE FROM FIREBASE FIRESTORE =====
async function deleteFileFromDB(file, category) {
    if (!isAdmin) {
        showToast('Only admin can delete resources', 'error');
        return;
    }

    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;

    const courseId = category === 'lab' ? currentLabId : currentCourseId;
    showLoading('Deleting resource...');

    try {
        await db.collection('courses').doc(courseId)
            .collection(category).doc(file.id).delete();

        showToast('Resource deleted successfully', 'success');

        await renderFileList(category);
        await loadAllCourseCards();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete resource: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== RESOURCE MODAL (Google Drive, OneDrive, Links) =====
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
            const u = urlInput.value.toLowerCase();
            const typeSelect = document.getElementById('resource-type');
            if (!typeSelect) return;
            if (u.includes('.pdf') || (u.includes('drive.google.com') && !u.includes('/presentation') && !u.includes('/spreadsheets'))) {
                typeSelect.value = 'pdf';
            } else if (u.includes('.ppt') || u.includes('.pptx') || u.includes('docs.google.com/presentation')) {
                typeSelect.value = 'ppt';
            } else if (u.includes('.doc') || u.includes('.docx') || u.includes('docs.google.com/document')) {
                typeSelect.value = 'doc';
            } else if (u.includes('.xls') || u.includes('.xlsx') || u.includes('docs.google.com/spreadsheets')) {
                typeSelect.value = 'sheet';
            } else if (u.includes('.zip') || u.includes('.rar')) {
                typeSelect.value = 'zip';
            } else if (u.includes('github.com') || u.includes('.py') || u.includes('.java') || u.includes('.cpp')) {
                typeSelect.value = 'code';
            }
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
    uploadContext = null;
}

// ===== SAVE RESOURCE TO FIRESTORE =====
async function confirmUpload() {
    if (!uploadContext || !isAdmin) return;

    const title = document.getElementById('resource-title').value.trim();
    let url = document.getElementById('resource-url').value.trim();
    const type = document.getElementById('resource-type').value;
    const description = document.getElementById('resource-description').value.trim();
    const { category, courseId } = uploadContext;

    if (!title) {
        showToast('Please enter a resource title', 'error');
        document.getElementById('resource-title').focus();
        return;
    }

    if (!url) {
        showToast('Please enter the document or share link', 'error');
        document.getElementById('resource-url').focus();
        return;
    }

    // Auto-fix missing protocol
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    // Smart link conversions
    let previewURL = url;
    let downloadURL = url;

    // Google Drive URL processing
    const gdriveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (gdriveMatch) {
        const fileId = gdriveMatch[1];
        previewURL = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
        downloadURL = `https://drive.google.com/uc?export=download&id=${fileId}`;
    } else if (url.includes('dropbox.com')) {
        downloadURL = url.replace('dl=0', 'dl=1');
    }

    const confirmBtn = document.getElementById('upload-confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
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

        await renderFileList(category);
        await loadAllCourseCards();

    } catch (error) {
        console.error('Save resource error:', error);
        showToast('Failed to save resource: ' + error.message, 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Save Resource';
    }
}

// ===== LAB CARDS =====
async function renderLabCards() {
    const container = document.getElementById('labs-grid');
    if (!container) return;
    container.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:12px;">Loading labs...</p></div>';

    const promises = LAB_COURSES.map(async (course) => {
        const counts = await getFileCounts(course.id, 'lab');
        const eventCount = await getEventCount(course.id);
        return { course, counts, eventCount };
    });

    const results = await Promise.all(promises);
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
        await renderCalendar();
        await loadHomeEvents();
        if (currentCourseId) await renderCourseEvents();
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Failed to save event: ' + error.message, 'error');
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
        await renderCalendar();
        await loadHomeEvents();
        if (currentCourseId) await renderCourseEvents();
    } catch (error) {
        showToast('Failed to delete event', 'error');
    }
}

// ===== RENDER COURSE EVENTS =====
async function renderCourseEvents() {
    const list = document.getElementById('course-events-list');
    list.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:12px;">Loading events...</p></div>';

    try {
        const snapshot = await db.collection('events')
            .where('courseId', '==', currentCourseId)
            .orderBy('date', 'asc')
            .get();

        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
        list.innerHTML = '<div class="empty-state"><p>Failed to load events.</p></div>';
    }
}

function createEventCard(event) {
    const typeInfo = EVENT_TYPES[event.type] || EVENT_TYPES.other;
    const course = COURSES.find(c => c.id === event.courseId);
    const dateStr = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });

    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.setProperty('--event-color', typeInfo.color);

    let groupsHTML = '';
    if (event.groups && event.groups.length > 0) {
        groupsHTML = `<div class="event-groups">${event.groups.map(g => `<span class="group-tag">${escapeHtml(g)}</span>`).join('')}</div>`;
    }

    let descHTML = '';
    if (event.description) {
        descHTML = `<div class="event-description">${escapeHtml(event.description)}</div>`;
    }

    card.innerHTML = `
        <div class="event-type-icon" style="background: ${typeInfo.bg}; color: ${typeInfo.color};">
            <i class="${typeInfo.icon}"></i>
        </div>
        <div class="event-info">
            <div class="event-title">${escapeHtml(event.title)}</div>
            <div class="event-details">
                <span><i class="fas fa-calendar"></i> ${dateStr}</span>
                ${event.time ? `<span><i class="fas fa-clock"></i> ${formatTime(event.time)}</span>` : ''}
                <span><i class="fas fa-book"></i> ${course ? course.name : ''}</span>
                <span style="color: ${typeInfo.color}; font-weight: 600;">${typeInfo.label}</span>
            </div>
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

        events.forEach(event => {
            container.appendChild(createEventCard(event));
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
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            bleachUnlockCallback = null;
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            bleachUnlockCallback = null;
        }
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

            setTimeout(() => {
                modal.classList.add('hidden');
                if (actionsRow) actionsRow.style.pointerEvents = '';
                if (succMsg) succMsg.classList.add('hidden');
                if (typeof bleachUnlockCallback === 'function') {
                    const cb = bleachUnlockCallback;
                    bleachUnlockCallback = null;
                    cb();
                }
            }, 1000);
        });
    }
}

function promptBleachGate(onSuccess) {
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
    modal.classList.remove('hidden');
}

// ===== ZANPAKUTO THEMES & SAKURA EFFECT =====
let sakuraAnimationId = null;
let sakuraResizeHandler = null;
let reiatsuResizeHandler = null;
let fireAnimationId = null;
let fireResizeHandler = null;

// Persisted effect preferences (shared with the floating dock)
let sakuraEffectEnabled = localStorage.getItem('effect_sakura') !== 'false';
let reiatsuEffectEnabled = localStorage.getItem('effect_reiatsu') !== 'false';
let nozarashiEffectEnabled = localStorage.getItem('effect_nozarashi') !== 'false';

function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function areDecorativeEffectsAllowed() {
    return !prefersReducedMotion() && !document.body.classList.contains('quiet-mode');
}

function initZanpakutoThemes() {
    // The theme picker now lives in the floating dock; just restore the saved theme.
    const savedTheme = localStorage.getItem('zanpakuto_theme');
    if (savedTheme) {
        applyZanpakutoTheme(savedTheme, false);
    }
}

// Restore the default (non-Zanpakuto) theme.
// Shared by the floating dock's theme list.
function resetZanpakutoTheme(showNotification = true) {
    document.documentElement.removeAttribute('data-zanpakuto');
    document.documentElement.removeAttribute('data-blood-moon');
    localStorage.removeItem('zanpakuto_theme');
    stopSakuraPetals();
    stopReiatsuEmbers();
    stopNozarashiFlames();
    if (showNotification) {
        showToast('Zanpakuto spiritual pressure sealed (Default Theme).', 'info');
    }
}

function applyZanpakutoTheme(themeName, showNotification = true) {
    const validThemes = ['getsuga-tensho', 'nozarashi', 'senbonzakura', 'kyoka-suigetsu', 'tensa-zangetsu'];
    if (!validThemes.includes(themeName)) return;

    document.documentElement.setAttribute('data-zanpakuto', themeName);
    localStorage.setItem('zanpakuto_theme', themeName);

    // Blood Moon only belongs to Tensa Zangetsu
    if (themeName !== 'tensa-zangetsu') {
        document.documentElement.removeAttribute('data-blood-moon');
    }

    // Particle effect handling follows the user's effect preferences
    syncThemeEffects(themeName);

    if (showNotification) {
        const themeTitles = {
            'getsuga-tensho': 'Getsuga Tensho (月牙天衝) — Black & White Theme',
            'nozarashi': 'Nozarashi (野晒) — Yellow & Black Theme with Fire',
            'senbonzakura': 'Senbonzakura (千本桜) — Sakura Pink Theme with Flower Petals',
            'kyoka-suigetsu': 'Kyoka Suigetsu (鏡花水月) — Purple & Black Theme',
            'tensa-zangetsu': 'Tensa Zangetsu (天鎖斬月) — Crimson Bankai + Blood Moon'
        };
        showToast(`Awakened: ${themeTitles[themeName] || themeName}!`, 'success');
    }
}

// Start/stop the decorative particle system that belongs to the active theme.
// Shared by theme switching, quiet mode and reduced-motion changes.
function syncThemeEffects(themeName) {
    if (themeName === 'senbonzakura') {
        stopReiatsuEmbers();
        stopNozarashiFlames();
        if (sakuraEffectEnabled) {
            startSakuraPetals();
        } else {
            stopSakuraPetals();
        }
    } else if (themeName === 'tensa-zangetsu') {
        stopSakuraPetals();
        stopNozarashiFlames();
        if (reiatsuEffectEnabled) {
            startReiatsuEmbers();
        } else {
            stopReiatsuEmbers();
        }
    } else if (themeName === 'nozarashi') {
        stopSakuraPetals();
        stopReiatsuEmbers();
        if (nozarashiEffectEnabled) {
            startNozarashiFlames();
        } else {
            stopNozarashiFlames();
        }
    } else {
        stopSakuraPetals();
        stopReiatsuEmbers();
        stopNozarashiFlames();
    }
}

// Sakura Falling Petals Canvas System (Senbonzakura Effect)
function startSakuraPetals() {
    const canvas = document.getElementById('sakura-canvas');
    if (!canvas) return;
    if (sakuraAnimationId) return;
    if (!areDecorativeEffectsAllowed()) return;
    canvas.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    sakuraResizeHandler = onResize;
    window.addEventListener('resize', onResize);

    const petals = [];
    const petalCount = 42;
    const colors = [
        'rgba(244, 114, 182, 0.85)',
        'rgba(251, 207, 232, 0.9)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(219, 39, 119, 0.75)'
    ];

    for (let i = 0; i < petalCount; i++) {
        petals.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 7 + Math.random() * 9,
            speedY: 1.1 + Math.random() * 1.8,
            speedX: -0.8 + Math.random() * 1.6,
            angle: Math.random() * Math.PI * 2,
            angularSpeed: (Math.random() - 0.5) * 0.035,
            oscillation: Math.random() * Math.PI * 2,
            oscillationSpeed: 0.015 + Math.random() * 0.025,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    function drawPetal(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(p.size / 2, -p.size / 2, p.size, -p.size / 4, p.size, 0);
        ctx.bezierCurveTo(p.size, p.size / 4, p.size / 2, p.size / 2, 0, 0);
        ctx.fill();
        ctx.restore();
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < petals.length; i++) {
            const p = petals[i];
            p.oscillation += p.oscillationSpeed;
            p.x += p.speedX + Math.sin(p.oscillation) * 1.2;
            p.y += p.speedY;
            p.angle += p.angularSpeed;

            if (p.y > height + 20) {
                p.y = -20;
                p.x = Math.random() * width;
            }
            if (p.x < -20) p.x = width + 20;
            if (p.x > width + 20) p.x = -20;

            drawPetal(p);
        }
        sakuraAnimationId = requestAnimationFrame(animate);
    }

    if (sakuraAnimationId) cancelAnimationFrame(sakuraAnimationId);
    animate();
}

function stopSakuraPetals() {
    if (sakuraAnimationId) {
        cancelAnimationFrame(sakuraAnimationId);
        sakuraAnimationId = null;
    }
    if (sakuraResizeHandler) {
        window.removeEventListener('resize', sakuraResizeHandler);
        sakuraResizeHandler = null;
    }
    const canvas = document.getElementById('sakura-canvas');
    if (canvas && !reiatsuAnimationId && !fireAnimationId) {
        canvas.classList.add('hidden');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// ===== TENSA ZANGETSU BANKAI REIATSU EMBERS =====
let reiatsuAnimationId = null;

function startReiatsuEmbers() {
    const canvas = document.getElementById('sakura-canvas');
    if (!canvas) return;
    if (reiatsuAnimationId) return;
    if (!areDecorativeEffectsAllowed()) return;
    canvas.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    reiatsuResizeHandler = onResize;
    window.addEventListener('resize', onResize);

    const embers = [];
    const emberCount = 38;

    for (let i = 0; i < emberCount; i++) {
        embers.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 2 + Math.random() * 4.5,
            speedY: -(0.9 + Math.random() * 1.8),
            speedX: -0.6 + Math.random() * 1.2,
            opacity: 0.3 + Math.random() * 0.65,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.03 + Math.random() * 0.04,
            isBladeShard: Math.random() > 0.75
        });
    }

    function animateEmbers() {
        ctx.clearRect(0, 0, width, height);
        const isBloodMoon = document.documentElement.getAttribute('data-blood-moon') === 'true';

        for (let i = 0; i < embers.length; i++) {
            const e = embers[i];
            e.pulse += e.pulseSpeed;
            e.y += e.speedY;
            e.x += e.speedX + Math.sin(e.pulse) * 0.6;
            const currentAlpha = Math.max(0.15, Math.min(1, e.opacity + Math.sin(e.pulse) * 0.25));

            if (e.y < -20) {
                e.y = height + 10;
                e.x = Math.random() * width;
            }
            if (e.x < -20) e.x = width + 20;
            if (e.x > width + 20) e.x = -20;

            ctx.save();
            ctx.translate(e.x, e.y);

            if (isBloodMoon) {
                // Intense razor scarlet and crimson embers
                ctx.fillStyle = e.isBladeShard
                    ? `rgba(255, 30, 45, ${currentAlpha})`
                    : `rgba(220, 20, 30, ${currentAlpha * 0.85})`;
                ctx.shadowColor = '#ff0033';
                ctx.shadowBlur = 10;
            } else {
                // Dual crimson & black spiritual reiatsu embers
                ctx.fillStyle = e.isBladeShard
                    ? `rgba(239, 68, 68, ${currentAlpha})`
                    : `rgba(20, 0, 0, ${currentAlpha * 0.9})`;
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 6;
            }

            if (e.isBladeShard) {
                // Crescent spirit slash fragment
                ctx.beginPath();
                ctx.ellipse(0, 0, e.size * 1.8, e.size * 0.6, -Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Glowing spirit ember
                ctx.beginPath();
                ctx.arc(0, 0, e.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        reiatsuAnimationId = requestAnimationFrame(animateEmbers);
    }

    if (reiatsuAnimationId) cancelAnimationFrame(reiatsuAnimationId);
    animateEmbers();
}

function stopReiatsuEmbers() {
    if (reiatsuAnimationId) {
        cancelAnimationFrame(reiatsuAnimationId);
        reiatsuAnimationId = null;
    }
    if (reiatsuResizeHandler) {
        window.removeEventListener('resize', reiatsuResizeHandler);
        reiatsuResizeHandler = null;
    }
    const canvas = document.getElementById('sakura-canvas');
    if (canvas && !sakuraAnimationId && !fireAnimationId) {
        canvas.classList.add('hidden');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// ===== NOZARASHI BERSERKER FLAMES =====
function startNozarashiFlames() {
    const canvas = document.getElementById('sakura-canvas');
    if (!canvas) return;
    if (fireAnimationId) return;
    if (!areDecorativeEffectsAllowed()) return;
    canvas.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    fireResizeHandler = onResize;
    window.addEventListener('resize', onResize);

    const flameCount = 34;
    const flames = [];
    const sparks = [];

    function spawnFlame(fresh = false) {
        return {
            x: Math.random() * width,
            y: fresh ? height + 10 + Math.random() * 30 : height - Math.random() * height * 0.55,
            size: 16 + Math.random() * 30,
            speedY: 1.4 + Math.random() * 2.6,
            drift: -0.5 + Math.random() * 1,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.02 + Math.random() * 0.035,
            life: fresh ? 0.15 + Math.random() * 0.2 : Math.random() * 0.85,
            heat: 0.45 + Math.random() * 0.55
        };
    }

    for (let i = 0; i < flameCount; i++) flames.push(spawnFlame());
    for (let i = 0; i < 12; i++) {
        sparks.push({
            x: Math.random() * width,
            y: height - Math.random() * height * 0.4,
            size: 1 + Math.random() * 2,
            speedY: 2.5 + Math.random() * 4,
            drift: -1.2 + Math.random() * 2.4,
            life: Math.random()
        });
    }

    function animateFlames() {
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        for (let i = 0; i < flames.length; i++) {
            const f = flames[i];
            f.life += 0.007 + f.heat * 0.006;
            f.wobble += f.wobbleSpeed;
            f.y -= f.speedY;
            f.x += f.drift + Math.sin(f.wobble) * 0.9;

            if (f.life >= 1 || f.y < height * 0.18) {
                flames[i] = spawnFlame(true);
                continue;
            }

            const fade = Math.sin(f.life * Math.PI);
            const alpha = Math.max(0.08, fade * (isDark ? 0.8 : 0.5));
            const radius = f.size * (0.5 + f.life * 0.9);

            const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
            gradient.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
            gradient.addColorStop(0.35, `rgba(250, 204, 21, ${alpha * 0.85})`);
            gradient.addColorStop(0.7, `rgba(234, 88, 12, ${alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(120, 30, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(f.x, f.y, radius * 0.72, radius * 1.15, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = 0; i < sparks.length; i++) {
            const s = sparks[i];
            s.life += 0.012;
            s.y -= s.speedY;
            s.x += s.drift + Math.sin(s.life * 12) * 0.6;
            if (s.life >= 1 || s.y < height * 0.2) {
                s.x = Math.random() * width;
                s.y = height + Math.random() * 20;
                s.life = 0;
                continue;
            }
            ctx.fillStyle = `rgba(253, 224, 71, ${(1 - s.life) * 0.9})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
        fireAnimationId = requestAnimationFrame(animateFlames);
    }

    if (fireAnimationId) cancelAnimationFrame(fireAnimationId);
    animateFlames();
}

function stopNozarashiFlames() {
    if (fireAnimationId) {
        cancelAnimationFrame(fireAnimationId);
        fireAnimationId = null;
    }
    if (fireResizeHandler) {
        window.removeEventListener('resize', fireResizeHandler);
        fireResizeHandler = null;
    }
    const canvas = document.getElementById('sakura-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.globalCompositeOperation = 'source-over';
        if (!sakuraAnimationId && !reiatsuAnimationId) {
            canvas.classList.add('hidden');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

// ===== FLOATING DOCK =====
function initFloatingDock() {
    const dock = document.getElementById('sledge-dock');
    if (!dock) return;

    const themeBtn = document.getElementById('dock-themes');
    const themePopup = document.getElementById('dock-theme-popup');
    const effectsBtn = document.getElementById('dock-effects');
    const effectsPopup = document.getElementById('dock-effects-popup');
    const musicBtn = document.getElementById('dock-music');
    const quietBtn = document.getElementById('dock-quiet');

    if (!themeBtn || !themePopup || !effectsBtn || !effectsPopup || !musicBtn || !quietBtn) return;

    const fireToggle = document.getElementById('toggle-fire');
    const sakuraToggle = document.getElementById('toggle-sakura');
    const reiatsuToggle = document.getElementById('toggle-reiatsu');
    const bloodmoonToggle = document.getElementById('toggle-bloodmoon');
    const charsToggle = document.getElementById('toggle-chars');
    const effectsNote = document.getElementById('dock-effects-note');
    const emptyMsg = document.getElementById('dock-effects-empty');
    const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    let quietActive = localStorage.getItem('quiet_mode') === 'true';
    let charactersEnabled = localStorage.getItem('character_popups') !== 'false';

    const getActiveTheme = () => document.documentElement.getAttribute('data-zanpakuto') || 'default';

    // ---------- Popup plumbing ----------
    function setPopupOpen(popup, btn, open) {
        popup.classList.toggle('open', open);
        popup.setAttribute('aria-hidden', String(!open));
        btn.setAttribute('aria-expanded', String(open));
        // `inert` removes closed popup controls from the tab order
        if ('inert' in popup) popup.inert = !open;
    }

    function closePopups(restoreFocusTo) {
        setPopupOpen(themePopup, themeBtn, false);
        setPopupOpen(effectsPopup, effectsBtn, false);
        if (restoreFocusTo) restoreFocusTo.focus();
    }

    function openPopup(popup, btn) {
        const isOpen = popup.classList.contains('open');
        closePopups();
        if (isOpen) return;
        setPopupOpen(popup, btn, true);
        const first = popup.querySelector('.active-theme') ||
            popup.querySelector('button:not([disabled]), input:not([disabled])');
        if (first) first.focus({ preventScroll: true });
    }

    themeBtn.addEventListener('click', () => {
        updateDockThemeHighlight();
        openPopup(themePopup, themeBtn);
    });

    effectsBtn.addEventListener('click', () => {
        updateEffectsPanel();
        openPopup(effectsPopup, effectsBtn);
    });

    document.addEventListener('click', (e) => {
        if (dock.contains(e.target)) return;
        if (themePopup.classList.contains('open') || effectsPopup.classList.contains('open')) {
            closePopups();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!themePopup.classList.contains('open') && !effectsPopup.classList.contains('open')) return;
        const trigger = themePopup.classList.contains('open') ? themeBtn : effectsBtn;
        closePopups(trigger);
    });

    // Arrow-key navigation inside the theme list
    themePopup.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = Array.from(themePopup.querySelectorAll('.dock-theme-item'));
        const index = items.indexOf(document.activeElement);
        if (index === -1) return;
        e.preventDefault();
        const next = e.key === 'ArrowDown'
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length;
        items[next].focus();
    });

    // ---------- Themes (reuse the existing theme engine) ----------
    themePopup.querySelectorAll('.dock-theme-item').forEach(item => {
        item.addEventListener('click', () => {
            const theme = item.dataset.dockTheme;
            if (theme === 'default') {
                resetZanpakutoTheme(true);
            } else {
                applyZanpakutoTheme(theme, true);
            }
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
        updateEffectsPanel();
    }

    // ---------- Effects ----------
    function setRowVisible(row, visible) {
        if (row) row.hidden = !visible;
    }

    function updateEffectsPanel() {
        const active = getActiveTheme();
        const hasFire = active === 'nozarashi';
        const hasSakura = active === 'senbonzakura';
        const hasTensa = active === 'tensa-zangetsu';
        const locked = quietActive || prefersReducedMotion();

        setRowVisible(document.getElementById('effect-row-fire'), hasFire);
        setRowVisible(document.getElementById('effect-row-sakura'), hasSakura);
        setRowVisible(document.getElementById('effect-row-reiatsu'), hasTensa);
        setRowVisible(document.getElementById('effect-row-bloodmoon'), hasTensa);
        setRowVisible(document.getElementById('effect-row-chars'), true);

        if (emptyMsg) emptyMsg.hidden = hasFire || hasSakura || hasTensa;

        if (fireToggle) {
            fireToggle.checked = nozarashiEffectEnabled;
            fireToggle.disabled = !hasFire || locked;
        }
        if (sakuraToggle) {
            sakuraToggle.checked = sakuraEffectEnabled;
            sakuraToggle.disabled = !hasSakura || locked;
        }
        if (reiatsuToggle) {
            reiatsuToggle.checked = reiatsuEffectEnabled;
            reiatsuToggle.disabled = !hasTensa || locked;
        }
        if (bloodmoonToggle) {
            bloodmoonToggle.checked = document.documentElement.getAttribute('data-blood-moon') === 'true';
            bloodmoonToggle.disabled = !hasTensa || locked;
        }
        if (charsToggle) {
            charsToggle.checked = charactersEnabled;
            charsToggle.disabled = locked;
        }

        if (effectsNote) {
            let note = '';
            if (prefersReducedMotion()) {
                note = 'Reduced motion is enabled in your system settings — decorative effects are paused.';
            } else if (quietActive) {
                note = 'Quiet mode is on — decorative effects are paused.';
            }
            effectsNote.textContent = note;
            effectsNote.hidden = !note;
        }
    }

    if (fireToggle) {
        fireToggle.addEventListener('change', () => {
            nozarashiEffectEnabled = fireToggle.checked;
            localStorage.setItem('effect_nozarashi', String(nozarashiEffectEnabled));
            if (nozarashiEffectEnabled) {
                startNozarashiFlames();
            } else {
                stopNozarashiFlames();
            }
            updateEffectsPanel();
        });
    }

    if (sakuraToggle) {
        sakuraToggle.addEventListener('change', () => {
            sakuraEffectEnabled = sakuraToggle.checked;
            localStorage.setItem('effect_sakura', String(sakuraEffectEnabled));
            if (sakuraEffectEnabled) {
                startSakuraPetals();
            } else {
                stopSakuraPetals();
            }
            updateEffectsPanel();
        });
    }

    if (reiatsuToggle) {
        reiatsuToggle.addEventListener('change', () => {
            reiatsuEffectEnabled = reiatsuToggle.checked;
            localStorage.setItem('effect_reiatsu', String(reiatsuEffectEnabled));
            if (reiatsuEffectEnabled) {
                startReiatsuEmbers();
            } else {
                stopReiatsuEmbers();
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
            window.__bleachCharacters.setEnabled(enabled && !quietActive && !prefersReducedMotion());
        }
        if (charsToggle) charsToggle.checked = enabled;
    }

    if (charsToggle) {
        charsToggle.addEventListener('change', () => {
            applyCharactersEnabled(charsToggle.checked);
            updateEffectsPanel();
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
        // Keep the transient music toast from covering an open dock popover
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
        if (persist) localStorage.setItem('quiet_mode', String(active));

        if (window.__bleachCharacters) {
            window.__bleachCharacters.setEnabled(charactersEnabled && !active && !prefersReducedMotion());
        }

        if (active) {
            stopSakuraPetals();
            stopReiatsuEmbers();
            stopNozarashiFlames();
        } else {
            syncThemeEffects(getActiveTheme());
        }
        updateEffectsPanel();
    }

    quietBtn.addEventListener('click', () => applyQuietMode(!quietActive));

    // ---------- Reduced-motion changes at runtime ----------
    if (motionQuery) {
        const onMotionChange = () => {
            if (prefersReducedMotion()) {
                stopSakuraPetals();
                stopReiatsuEmbers();
                stopNozarashiFlames();
                if (window.__bleachCharacters) window.__bleachCharacters.setEnabled(false);
            } else if (!quietActive) {
                syncThemeEffects(getActiveTheme());
                if (window.__bleachCharacters) window.__bleachCharacters.setEnabled(charactersEnabled);
            }
            updateEffectsPanel();
        };
        if (typeof motionQuery.addEventListener === 'function') {
            motionQuery.addEventListener('change', onMotionChange);
        } else if (typeof motionQuery.addListener === 'function') {
            motionQuery.addListener(onMotionChange);
        }
    }

    // Keep the dock in sync when the theme changes anywhere
    const observer = new MutationObserver(() => updateDockThemeHighlight());
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-zanpakuto', 'data-blood-moon']
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
    const slashOverlay = document.getElementById('tensa-slash-overlay');
    if (!moon) return;

    let bloodMoonActive = false;

    function triggerSlashEffect() {
        if (!slashOverlay) return;
        slashOverlay.innerHTML = '';
        slashOverlay.classList.add('active');
        const count = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            const line = document.createElement('div');
            line.className = 'tensa-slash-line';
            line.style.left = (10 + i * 22) + '%';
            line.style.animationDelay = (i * 0.07) + 's';
            slashOverlay.appendChild(line);
        }
        setTimeout(() => {
            slashOverlay.classList.remove('active');
            slashOverlay.innerHTML = '';
        }, 700);
    }

    function activateBloodMoon() {
        bloodMoonActive = true;
        document.documentElement.setAttribute('data-blood-moon', 'true');
        moon.setAttribute('title', 'Tensō Zangetsu — Blood Moon Active! Click to seal.');
        moon.setAttribute('aria-label', 'Blood Moon active — click to deactivate');
        const bloodmoonToggle = document.getElementById('toggle-bloodmoon');
        if (bloodmoonToggle) bloodmoonToggle.checked = true;
        triggerSlashEffect();
        // Re-ignite reiatsu embers into fierce crimson flames
        if (reiatsuAnimationId) {
            startReiatsuEmbers();
        }
        showToast('⚔️ BANKAI… Tensa Zangetsu! Blood Moon Awakened!', 'success');
    }

    function deactivateBloodMoon() {
        bloodMoonActive = false;
        document.documentElement.removeAttribute('data-blood-moon');
        moon.setAttribute('title', 'Tensō Zangetsu — Click to awaken Blood Moon');
        moon.setAttribute('aria-label', 'Tensa Zangetsu Moon — click to activate Blood Moon');
        const bloodmoonToggle = document.getElementById('toggle-bloodmoon');
        if (bloodmoonToggle) bloodmoonToggle.checked = false;
        if (reiatsuAnimationId) {
            startReiatsuEmbers();
        }
        showToast('Blood Moon sealed. 月牙天衝…', 'info');
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
    moon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onMoonClick();
        }
    });

    // Reset blood moon when switching away from tensa theme
    const observer = new MutationObserver(() => {
        const activeTheme = document.documentElement.getAttribute('data-zanpakuto');
        if (activeTheme !== 'tensa-zangetsu' && bloodMoonActive) {
            bloodMoonActive = false;
            document.documentElement.removeAttribute('data-blood-moon');
            const bloodmoonToggle = document.getElementById('toggle-bloodmoon');
            if (bloodmoonToggle) bloodmoonToggle.checked = false;
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-zanpakuto'] });
}
