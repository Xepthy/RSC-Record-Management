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

$(document).ready(function () {
    $('#registerBtn').on('click', function () {
        const email = $('#email').val();
        const password = $('#password').val();

        if (!email || !password) {
            alert("Please fill in both email and password.");
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;

                return sendEmailVerification(user).then(() => {
                    alert("Verification email sent. Please check your inbox.");
                    // Only store email temporarily
                    sessionStorage.setItem("emailForVerification", email);
                    $('#verifySection').show();
                    $('#registerSection').hide(); // Hide register form
                });
            })
            .catch((error) => {
                alert("Error: " + error.message);
            });
    });

    $('#continueBtn').on('click', async function () {
        const email = sessionStorage.getItem("emailForVerification");
        const password = $('#verifyPassword').val(); // User retypes password

        if (!email || !password) {
            alert("Please re-enter your password.");
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await user.reload();

            if (user.emailVerified) {
                alert("Email verified! Redirecting...");
                await setupFirstTimeUser(user);
                sessionStorage.clear();
                window.location.href = "../dashboard/dashboard.html";
            } else {
                alert("Email not verified yet. Please check again.");
            }

        } catch (error) {
            alert("Login failed: " + error.message);
        }
    });
});

async function setupFirstTimeUser(user) {
    const userRef = doc(db, 'client', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        console.log('User already exists, skipping folder creation');
        return;
    }

    await setDoc(userRef, {
        email: user.email,
        uid: user.uid,
        createdAt: new Date()
    });

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
