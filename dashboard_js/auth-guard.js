import { auth, onAuthStateChanged } from '../firebase-config_js/firebase-config.js';
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "../login.html";
    }
});