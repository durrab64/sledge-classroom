// ===================================================
// SLEDGE CLASSROOM — FIREBASE CONFIGURATION
// ===================================================
//
// WHY IS THE API KEY HERE?
// Firebase web API keys are NOT secret — they are identifiers, not passwords.
// They are safe to be public. Real security is enforced by:
//   1. Firebase Security Rules (Firestore + Realtime Database)
//   2. Firebase Authentication (write requires sign-in)
//   3. Authorized domains in the Firebase Console
// See: https://firebase.google.com/docs/projects/api-keys
// ===================================================

(function() {
    const firebaseConfig = {
        apiKey: "AIzaSyDlQYkbyc-bHScppvr2GyYXQScHlHMXr0g",
        authDomain: "sledge-classroom.firebaseapp.com",
        projectId: "sledge-classroom",
        // ⚠️  REPLACE this with your actual Realtime Database URL.
        // Find it in Firebase Console → Realtime Database → copy the URL.
        // Format: https://<project-id>-default-rtdb.firebaseio.com
        databaseURL: "https://sledge-classroom-default-rtdb.firebaseio.com",
        storageBucket: "sledge-classroom.firebasestorage.app",
        messagingSenderId: "348238674656",
        appId: "1:348238674656:web:7db9c9021774541f246e85",
        measurementId: "G-B8NRVC5MLF"
    };

    // Initialize Firebase (guard against double-init)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // Export services to window so app.js and widgets can access them safely
    window.firebaseConfig  = firebaseConfig;
    window.firebaseAuth    = firebase.auth();
    window.firebaseDB      = firebase.firestore();    // Existing — classroom data
    window.firebaseRTDB    = firebase.database();    // New — Now Playing widget (public read)
})();