// ===================================================
// SLEDGE CLASSROOM — FIREBASE CONFIGURATION
// ===================================================

(function() {
    const firebaseConfig = {
        apiKey: "AIzaSyDlQYkbyc-bHScppvr2GyYXQScHlHMXr0g",
        authDomain: "sledge-classroom.firebaseapp.com",
        projectId: "sledge-classroom",
        storageBucket: "sledge-classroom.firebasestorage.app",
        messagingSenderId: "348238674656",
        appId: "1:348238674656:web:7db9c9021774541f246e85",
        measurementId: "G-B8NRVC5MLF"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // Export services to window so app.js can access them safely
    window.firebaseConfig = firebaseConfig;
    window.firebaseAuth = firebase.auth();
    window.firebaseDB = firebase.firestore();
})();