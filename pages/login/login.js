import {
    auth,
    signInWithEmailAndPassword,
    signOut,
    db,
    doc,
    setDoc,
    getDoc,
    collection,
    onAuthStateChanged
} from '../../firebase-config.js';

import { SecurityUtils, LoginRateLimiter, LoginErrorHandler, InputUtils, LoginValidationHandlers } from './loginUtils.js';

// Check if current user is a client (not admin/staff)
async function isClientUser(uid) {
    try {
        const clientDoc = await getDoc(doc(db, 'client', uid));
        return clientDoc.exists();
    } catch (error) {
        console.error('Error checking client status:', error);
        return false;
    }
}

// Auto-login check on page load (only for clients)
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        // Check if user is a client
        const isClient = await isClientUser(user.uid);

        if (isClient) {
            // Silently redirect to dashboard for verified clients
            window.location.href = '../dashboard/dashboard.html';
        }
        // If not a client (admin/staff), do nothing - let them stay on login page
    }
});

$(document).ready(() => {
    // Initialize validation handlers
    LoginValidationHandlers.initializeValidation();

    $('#loginBtn').click(async () => {
        // Check if user is rate limited
        if (LoginRateLimiter.isBlocked()) {
            const remainingTime = LoginRateLimiter.getRemainingLockoutTime();
            if (remainingTime > 0) {
                alert(`Too many failed attempts. Please wait ${remainingTime} minutes before trying again.`);
            } else {
                alert("Please wait 1 minute before trying again.");
            }
            return;
        }

        // Get and sanitize inputs
        const email = SecurityUtils.sanitizeInput($('#loginEmail').val());
        const password = $('#loginPassword').val();

        // Basic validation
        if (!email || !password) {
            alert("Please fill in both email and password.");
            InputUtils.setValidationStyle(document.getElementById('loginEmail'), !email);
            InputUtils.setValidationStyle(document.getElementById('loginPassword'), !password);
            return;
        }

        if (!SecurityUtils.validateEmail(email)) {
            alert("Please enter a valid email address.");
            InputUtils.setValidationStyle(document.getElementById('loginEmail'), false);
            return;
        }

        // Button state management
        const $loginBtn = $('#loginBtn');
        $loginBtn.prop('disabled', true).text('Signing in...');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await user.reload();

            if (!user.emailVerified) {
                alert('Please verify your email before logging in.');
                await signOut(auth);
                LoginRateLimiter.recordAttempt(true); // Count as failed attempt
                return;
            }

            // Check if user is a client
            const isClient = await isClientUser(user.uid);

            if (!isClient) {
                // User is admin/staff, sign them out and show message
                alert('This login page is for clients only. Please use the admin login page.');
                await signOut(auth);
                LoginRateLimiter.recordAttempt(true);
                return;
            }

            // Successful login - reset rate limiter
            LoginRateLimiter.recordAttempt(false);

            // Check if user has complete profile data
            await ensureUserProfile(user);

            // Clear sensitive data
            InputUtils.clearSensitiveFields();

            // Redirect to dashboard
            window.location.href = '../dashboard/dashboard.html';

        } catch (error) {
            // Record failed attempt
            LoginRateLimiter.recordAttempt(true);

            // Show secure error message
            alert(LoginErrorHandler.getSecureMessage(error));
        } finally {
            $loginBtn.prop('disabled', false).text('Sign In');
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

/**
 * Ensure user has complete profile data (for users who registered before profile fields were added)
 * @param {object} user - Firebase user object
 */
async function ensureUserProfile(user) {
    try {
        const userRef = doc(db, 'client', user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
            // Create minimal user document for legacy users
            const userData = {
                email: SecurityUtils.sanitizeInput(user.email),
                uid: user.uid,
                createdAt: new Date(),
                emailVerified: user.emailVerified,
                lastLoginAt: new Date(),
                profileComplete: false // Mark as incomplete
            };

            await setDoc(userRef, userData);

            // Create folder structure
            const folders = ['pending', 'completed', 'rejected'];
            for (const folder of folders) {
                const colRef = collection(db, 'client', user.uid, folder);
                await setDoc(doc(colRef, '_init'), {
                    placeholder: true,
                    createdAt: new Date(),
                    folderName: folder
                });
            }

            console.log('Legacy user profile created');
        } else {
            // Update last login time for existing users
            const userData = docSnap.data();
            await setDoc(userRef, {
                ...userData,
                lastLoginAt: new Date()
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error ensuring user profile:', error);
        // Don't block login for profile issues
    }
}