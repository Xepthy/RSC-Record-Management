import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,

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


import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js';


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
const storage = getStorage(app);

export {
    auth,
    db,
    storage,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
    collection,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    doc,
    onAuthStateChanged,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
};
