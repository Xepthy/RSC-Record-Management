import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    doc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyDAAqEWKTCqfIPZOByAFWl5CHFrto2ngAo",
    authDomain: "rsc-2025.firebaseapp.com",
    projectId: "rsc-2025",
    storageBucket: "rsc-2025.firebasestorage.app",
    messagingSenderId: "612828032756",
    appId: "1:612828032756:web:ea45ed6e07446c412df8a1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
    auth,
    db,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
    collection,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    doc
};
