import {
    auth,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword
} from './firebase-config.js';

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

                // Send email verification
                return sendEmailVerification(user).then(() => {
                    alert("Verification email sent. Please check your inbox.");
                    sessionStorage.setItem("emailForVerification", email);
                    sessionStorage.setItem("passwordForVerification", password);
                    $('#verifySection').show();
                });
            })
            .catch((error) => {
                alert("Error: " + error.message);
            });
    });

    $('#continueBtn').on('click', function () {
        const email = sessionStorage.getItem("emailForVerification");
        const password = sessionStorage.getItem("passwordForVerification");

        if (!email || !password) {
            alert("No credentials found. Please register again.");
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;

                return user.reload().then(() => {
                    if (user.emailVerified) {
                        alert("Email verified! Redirecting...");
                        sessionStorage.clear();
                        window.location.href = "main.html";
                    } else {
                        alert("Email not verified yet. Please check again.");
                    }
                });
            })
            .catch((error) => {
                alert("Login failed: " + error.message);
            });
    });
});
