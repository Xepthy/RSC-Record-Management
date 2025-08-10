import {
    auth,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
    db,
    doc,
    setDoc,
    getDoc,
    collection
} from '../../firebase-config.js';

$(document).ready(() => {
    $('#loginBtn').click(async () => {
        const email = $('#loginEmail').val();
        const password = $('#loginPassword').val();

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await user.reload();

            if (!user.emailVerified) {
                alert('Please verify your email before logging in.');
                await signOut(auth);
                return;
            }

            await setupFirstTimeUser(user);

            alert('Login successful!');
            window.location.href = '../dashboard/dashboard.html';

        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    });
});

/**
 * Setup user folders if first-time login
 * @param {object} user - Firebase user object
 */
async function setupFirstTimeUser(user) {
    const userRef = doc(db, 'client', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        console.log('User already exists, skipping folder creation');
        return;
    }

    // Create user document
    await setDoc(userRef, {
        email: user.email,
        uid: user.uid,
        createdAt: new Date()
    });

    // Create subfolders
    const folders = ['pending', 'completed', 'rejected'];
    for (const folder of folders) {
        const colRef = collection(db, 'client', user.uid, folder);
        await setDoc(doc(colRef, '_init'), {
            placeholder: true,
            createdAt: new Date()
        });
    }

    console.log('First-time user setup completed');
}
