import {
    auth,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
    db,
    doc,
    setDoc,
    getDoc
} from './firebase-config.js';

$(document).ready(() => {

    $('#registerBtn').click(() => {
        const email = $('#registerEmail').val();
        const password = $('#registerPassword').val();

        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                await sendEmailVerification(user);

                alert('Registration successful! Please check your email for verification.');
            })
            .catch((error) => {
                alert('Registration failed: ' + error.message);
            });
    });

    $('#loginBtn').click(() => {
        const email = $('#loginEmail').val();
        const password = $('#loginPassword').val();

        signInWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                await user.reload();

                if (user.emailVerified) {
                    const userRef = doc(db, 'client', user.uid);
                    const docSnap = await getDoc(userRef);

                    if (!docSnap.exists()) {
                        await setDoc(userRef, {
                            email: user.email,
                            uid: user.uid
                        });
                    }

                    alert('Login successful!');

                    // Redirect to the dashboard
                    // window.location.href = 'main.html';

                } else {
                    alert('Please verify your emil before logging in.');
                    await signOut(auth);
                }
            })
            .catch((error) => {
                alert('Login failed: ' + error.message);
            });
    });

});
