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

// --- TOAST HELPER ---
let toastTimeout;
function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Remove existing toast to prevent overlap
    const existingToast = container.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
        clearTimeout(toastTimeout);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type} show`;
    toast.textContent = message;
    container.appendChild(toast);

    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// --- Main Logic ---
$(document).ready(function () {
    ValidationHandlers.initializeValidation();

    $('#registerBtn').on('click', async function (e) {
        e.preventDefault();

        if ($('.policy-required:checked').length < 2) {
            $('#checkboxError').show();
            return;
        } else { $('#checkboxError').hide(); }

        if (RateLimiter.isLimited()) {
            showToast("Please wait a moment before trying again.", "warning");
            return;
        }

        const firstName = SecurityUtils.sanitizeInput($('#firstName').val());
        const middleName = SecurityUtils.sanitizeInput($('#middleName').val());
        const lastName = SecurityUtils.sanitizeInput($('#lastName').val());
        const suffix = SecurityUtils.sanitizeInput($('#suffix').val());
        const mobileNumber = SecurityUtils.sanitizeInput($('#mobileNumber').val());
        const classification = $('#classification').val();
        const email = SecurityUtils.sanitizeInput($('#email').val());
        const password = $('#password').val();

        if (!firstName || !lastName ) {
            showToast('Incomplete Form: Please fill out all required fields.', 'warning');
            return;
        }

        if (!classification) {
            showToast('Please select a classification.', 'warning');
            return;
        }

        if (!SecurityUtils.validateEmail(email)) {
            showToast("Please enter a valid email address.", "warning");
            return;
        }

        if (!SecurityUtils.validatePassword(password)) {
            showToast(SecurityUtils.getPasswordRequirements(), "warning");
            return;
        }

        if (!SecurityUtils.validateMobileNumber(mobileNumber)) {
            showToast("Please enter a valid 11-digit mobile number starting with 09.", "warning");
            return;
        }

        const $registerBtn = $('#registerBtn');
        $registerBtn.prop('disabled', true).text('Creating Account...');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await sendEmailVerification(user);
            showToast("Verification email sent. Please check your inbox or spam folder.", "success");

            const tempUserData = { firstName, middleName, lastName, suffix, mobileNumber, classification, email };
            sessionStorage.setItem("emailForVerification", email);
            sessionStorage.setItem("tempUserData", JSON.stringify(tempUserData));

            $('#verifySection').slideDown();
            $('#password').val('').hide();
            $('.password-container').show();
            $('#registerBtn').hide();
            $('#togglePassword').hide();

        } catch (error) {
            showToast(ErrorHandler.getSecureMessage(error), "error");
        } finally {
            $registerBtn.prop('disabled', false).text('Sign Up');
        }
    });

    $('#continueBtn').on('click', async function () {
        if (RateLimiter.isLimited()) {
            showToast("Please wait a moment before trying again.", "warning");
            return;
        }

        const email = sessionStorage.getItem("emailForVerification");
        const password = $('#verifyPassword').val();

        if (!email || !password) {
            showToast("Please re-enter your password.", "warning");
            return;
        }

        if (!SecurityUtils.validatePassword(password)) {
            showToast(SecurityUtils.getPasswordRequirements(), "warning");
            return;
        }

        const $continueBtn = $('#continueBtn');
        $continueBtn.prop('disabled', true).text('Checking...');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await user.reload();

            if (user.emailVerified) {
                showToast("Email verified! Redirecting...", "success");
                await setupFirstTimeUser(user);
                sessionStorage.clear();
                InputUtils.clearSensitiveFields();
                window.location.href = "../dashboard/dashboard.html";
            } else {
                showToast("Email not verified yet. Please check your inbox and click the verification link.", "warning");
            }
        } catch (error) {
            showToast(ErrorHandler.getSecureMessage(error), "error");
        } finally {
            $continueBtn.prop('disabled', false).text('I have verified');
        }
    });

    $(window).on('blur beforeunload', () => InputUtils.clearSensitiveFields());

    $('input[type="password"]').on('contextmenu', (e) => e.preventDefault());
    let passwordWarningShown = false;
    $('input[type="password"]').on('focus', function () {
        if (!passwordWarningShown) {
            console.warn('Security Warning: Do not paste or share passwords in console');
            passwordWarningShown = true;
        }
    });

    async function setupFirstTimeUser(user) {
        try {
            const userRef = doc(db, 'client', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) return;

            const tempUserDataString = sessionStorage.getItem("tempUserData");
            if (!tempUserDataString) return;

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
                await setDoc(doc(colRef, '_init'), { placeholder: true, createdAt: new Date(), folderName: folder });
            }

            sessionStorage.removeItem("tempUserData");
        } catch (error) {
            console.error('Error in setupFirstTimeUser:', error);
            showToast('Account created successfully, but there was an issue setting up your profile. Please contact support.', "error");
        }
    }

    // --- Password toggle and modal logic (unchanged) ---
    $(document).ready(function () {
        function setupPasswordToggle(toggleSelector, inputSelector) {
            $(toggleSelector).on("click", function () {
                const $password = $(inputSelector);
                const isHidden = $password.attr("type") === "password";
                $password.attr("type", isHidden ? "text" : "password");
                $(this).toggleClass("fa-eye", isHidden).toggleClass("fa-eye-slash", !isHidden);
            });
        }

        setupPasswordToggle("#togglePassword", "#password");

        $("#showPrivacy").on("click", e => { e.preventDefault(); e.stopPropagation(); $("#privacyModal").fadeIn(300); });
        $("#showTerms").on("click", e => { e.preventDefault(); e.stopPropagation(); $("#termsModal").fadeIn(300); });

        $(".close, .close-btn").on("click", function () {
            const modalId = $(this).data("modal");
            $("#" + modalId).fadeOut(300);
            if (modalId === "termsModal") $("#termsCheckbox").prop("checked", true);
            else if (modalId === "privacyModal") $("#privacyCheckbox").prop("checked", true);
        });

        $(".modal").on("click", e => { if ($(e.target).hasClass("modal")) $(e.target).fadeOut(300); });
        $(document).on("keydown", e => { if (e.key === "Escape") $(".modal").fadeOut(300); });

        $(".checkbox-label").on("click", function (e) {
            if (!$(e.target).is('a, .info-icon, .tooltip')) {
                const checkbox = $(this).find('input[type="checkbox"]');
                checkbox.prop('checked', !checkbox.prop('checked'));
            }
        });

        $('input[type="checkbox"]').on("click", e => e.stopPropagation());
    });

});
