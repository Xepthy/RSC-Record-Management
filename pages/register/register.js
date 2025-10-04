//register.js
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

import { SecurityUtils, RateLimiter, ErrorHandler, InputUtils, ValidationHandlers } from '../register/registerUtils.js';

$(document).ready(function () {
    // Initialize real-time validation
    ValidationHandlers.initializeValidation();

    // Registration button handler
    $('#registerBtn').on('click', async function (e) {
        e.preventDefault();

        if ($('.policy-required:checked').length < 2) {
            $('#checkboxError').show();
            return; // stop here, do not clear inputs
        } else {
            $('#checkboxError').hide();
        }

        // If checkboxes are okay, continue with your existing Firebase code
        if (RateLimiter.isLimited()) {
            alert("Please wait a moment before trying again.");
            return;
        }
        // Get all form data - HTML required will handle basic validation
        const firstName = SecurityUtils.sanitizeInput($('#firstName').val());
        const middleName = SecurityUtils.sanitizeInput($('#middleName').val());
        const lastName = SecurityUtils.sanitizeInput($('#lastName').val());
        const suffix = SecurityUtils.sanitizeInput($('#suffix').val());
        const mobileNumber = SecurityUtils.sanitizeInput($('#mobileNumber').val());
        const classification = $('#classification').val();
        const email = SecurityUtils.sanitizeInput($('#email').val());
        const password = $('#password').val();

        // Custom validation for things HTML can't handle well
        if (!SecurityUtils.validateEmail(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!SecurityUtils.validatePassword(password)) {
            alert(SecurityUtils.getPasswordRequirements());
            return;
        }

        if (!SecurityUtils.validateMobileNumber(mobileNumber)) {
            alert("Please enter a valid 11-digit mobile number starting with 09.");
            return;
        }

        const $registerBtn = $('#registerBtn');
        $registerBtn.prop('disabled', true).text('Creating Account...');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await sendEmailVerification(user);
            alert("Verification email sent. Please check your inbox.");

            const tempUserData = {
                firstName, middleName, lastName, suffix,
                mobileNumber, classification, email
            };

            sessionStorage.setItem("emailForVerification", email);
            sessionStorage.setItem("tempUserData", JSON.stringify(tempUserData));

            $('#verifySection').slideDown();
            $('#password').val('');
            $('#registerBtn').hide();


        } catch (error) {
            alert(ErrorHandler.getSecureMessage(error));
        } finally {
            $registerBtn.prop('disabled', false).text('Sign Up');
        }
    });

    // Continue button handler
    $('#continueBtn').on('click', async function () {
        if (RateLimiter.isLimited()) {
            alert("Please wait a moment before trying again.");
            return;
        }

        const email = sessionStorage.getItem("emailForVerification");
        const password = $('#verifyPassword').val();

        if (!email || !password) {
            alert("Please re-enter your password.");
            return;
        }

        if (!SecurityUtils.validatePassword(password)) {
            alert(SecurityUtils.getPasswordRequirements());
            return;
        }

        const $continueBtn = $('#continueBtn');
        $continueBtn.prop('disabled', true).text('Checking...');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await user.reload();

            if (user.emailVerified) {
                alert("Email verified! Redirecting...");
                await setupFirstTimeUser(user);
                sessionStorage.clear();
                InputUtils.clearSensitiveFields();
                window.location.href = "../dashboard/dashboard.html";
            } else {
                alert("Email not verified yet. Please check your inbox and click the verification link.");
            }

        } catch (error) {
            alert(ErrorHandler.getSecureMessage(error));
        } finally {
            $continueBtn.prop('disabled', false).text('I have verified');
        }
    });

    // Security event handlers
    $(window).on('blur', () => InputUtils.clearSensitiveFields());
    $(window).on('beforeunload', () => InputUtils.clearSensitiveFields());

    $('input[type="password"]').on('contextmenu', (e) => e.preventDefault());
    $('input[type="password"]').on('focus', function () {
        console.clear();
        console.warn('Security Warning: Do not paste or share passwords in console');
    });
});

async function setupFirstTimeUser(user) {
    try {
        const userRef = doc(db, 'client', user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            console.log('User already exists, skipping setup');
            return;
        }

        const tempUserDataString = sessionStorage.getItem("tempUserData");
        if (!tempUserDataString) {
            console.error('No temporary user data found');
            return;
        }

        const tempUserData = JSON.parse(tempUserDataString);

        const userData = {
            firstName: tempUserData.firstName,
            middleName: tempUserData.middleName || '',
            lastName: tempUserData.lastName,
            suffix: tempUserData.suffix || '',
            email: SecurityUtils.sanitizeInput(user.email),
            mobileNumber: tempUserData.mobileNumber,
            classification: tempUserData.classification,
            uid: user.uid,
            createdAt: new Date(),
            emailVerified: user.emailVerified,
            lastLoginAt: new Date(),
            profileComplete: true,
            dailySubmissionCount: 0
        };

        await setDoc(userRef, userData);

        const folders = ['pending', 'completed', 'rejected'];
        for (const folder of folders) {
            const colRef = collection(db, 'client', user.uid, folder);
            await setDoc(doc(colRef, '_init'), {
                placeholder: true,
                createdAt: new Date(),
                folderName: folder
            });
        }

        console.log('First-time user setup completed successfully');
        sessionStorage.removeItem("tempUserData");

    } catch (error) {
        console.error('Error in setupFirstTimeUser:', error);
        alert('Account created successfully, but there was an issue setting up your profile. Please contact support if you experience any problems.');
    }
}