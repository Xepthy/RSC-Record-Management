import { db, doc, updateDoc, setDoc } from "../../firebase-config.js";

async function updateUserRole(uid, role) {
    const userRef = doc(db, "accounts", uid);
    await updateDoc(userRef, { role });
    alert(`✅ User ${uid} updated to ${role}`);
}

// Or create a new account entry if it doesn’t exist
async function createAccount(uid, email, name, role) {
    const userRef = doc(db, "accounts", uid);
    await setDoc(userRef, { email, name, role });
    alert(`✅ Account created for ${email} with role ${role}`);
}
