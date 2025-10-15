import { auth, onAuthStateChanged } from '../../firebase-config.js';
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "/index.html";
    }
});