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
} from '../../firebase-config_js/firebase-config.js';

// Import admin utilities
import {
    AdminSecurityUtils,
    AdminRateLimiter,
    AdminErrorHandler,
    AdminInputUtils,
    AdminSessionManager,
    AdminValidationHandlers
} from '../register/adminRegisterUtils.js';

$(document).ready(function () {
    console.log('Admin registration page loaded');

    // Initialize real-time validation
    AdminValidationHandlers.initializeValidation();

    // Admin Registration button handler
    $('#adminRegisterBtn').on('click', async function (e) {
        e.preventDefault();
        console.log('Register button clicked');

        if (AdminRateLimiter.isLimited()) {
            const remainingTime = AdminRateLimiter.getRemainingTime();
            alert(`Please wait ${remainingTime} minutes before trying again.`);
            return;
        }

        // Get form data with null checks
        const emailValue = $('#adminEmail').val();
        const passwordValue = $('#adminPassword').val();

        const email = emailValue ? AdminSecurityUtils.sanitizeInput(emailValue) : '';
        const password = passwordValue || '';

        // Basic validation
        if (!email || !password) {
            alert("Please fill in both email and password.");
            if (!email) $('#adminEmail').focus();
            else if (!password) $('#adminPassword').focus();
            return;
        }

        if (!AdminSecurityUtils.validateEmail(email)) {
            alert("Please enter a valid email address.");
            $('#adminEmail').focus();
            return;
        }

        if (!AdminSecurityUtils.validatePassword(password)) {
            alert(AdminSecurityUtils.getPasswordRequirements());
            $('#adminPassword').focus();
            return;
        }

        // Check if admin domain is allowed
        // if (!AdminSecurityUtils.isAdminDomainAllowed(email)) {
        //     alert("This email domain is not authorized for admin registration.");
        //     $('#adminEmail').focus();
        //     return;
        // }

        AdminInputUtils.setButtonLoading('#adminRegisterBtn', true, 'Creating Admin Account...');

        try {
            console.log('Creating user with email:', email);

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('User created:', user.uid);

            // Send verification email
            await sendEmailVerification(user);
            alert("Admin verification email sent. Please check your inbox.");

            // Store temporary data using session manager
            const tempAdminData = {
                email: email
            };

            AdminSessionManager.storeVerificationEmail(email);
            AdminSessionManager.storeTempData(tempAdminData);

            // Show verification section
            $('#adminVerifySection').slideDown();
            AdminInputUtils.clearSensitiveFields();
            $('#adminRegisterBtn').hide();

            // Reset rate limiter on success
            AdminRateLimiter.reset();

        } catch (error) {
            console.error('Registration error:', error);
            AdminRateLimiter.recordAttempt();
            AdminErrorHandler.logError('admin-registration', error, { email: email });
            alert(AdminErrorHandler.getSecureMessage(error));
        } finally {
            AdminInputUtils.setButtonLoading('#adminRegisterBtn', false);
        }
    });

    // Admin Continue button handler
    $('#adminContinueBtn').on('click', async function () {
        console.log('Continue button clicked');

        if (AdminRateLimiter.isLimited()) {
            const remainingTime = AdminRateLimiter.getRemainingTime();
            alert(`Please wait ${remainingTime} minutes before trying again.`);
            return;
        }

        const emailForVerification = AdminSessionManager.getVerificationEmail();
        const passwordValue = $('#adminVerifyPassword').val();
        const password = passwordValue || '';

        if (!emailForVerification || !password) {
            alert("Please re-enter your password.");
            return;
        }

        if (!AdminSecurityUtils.validatePassword(password)) {
            alert(AdminSecurityUtils.getPasswordRequirements());
            return;
        }

        AdminInputUtils.setButtonLoading('#adminContinueBtn', true, 'Checking...');

        try {
            console.log('Signing in to check verification');

            // Sign in to check verification
            const userCredential = await signInWithEmailAndPassword(auth, emailForVerification, password);
            const user = userCredential.user;

            await user.reload();

            if (user.emailVerified) {
                alert("Email verified! Setting up admin account...");
                await setupAdminUser(user);
                AdminSessionManager.clearTempData();
                AdminInputUtils.clearSensitiveFields();
                alert("Admin account created successfully! Redirecting to admin dashboard...");
                window.location.href = "../inquiries/inquiries.html";

                // Reset rate limiter on success
                AdminRateLimiter.reset();
            } else {
                alert("Email not verified yet. Please check your inbox and click the verification link.");
            }

        } catch (error) {
            console.error('Verification error:', error);
            AdminRateLimiter.recordAttempt();
            AdminErrorHandler.logError('admin-verification', error, { email: emailForVerification });
            alert(AdminErrorHandler.getSecureMessage(error));
        } finally {
            AdminInputUtils.setButtonLoading('#adminContinueBtn', false);
        }
    });

    // Security event handlers
    $(window).on('blur', () => AdminInputUtils.clearSensitiveFields());
    $(window).on('beforeunload', () => AdminInputUtils.clearSensitiveFields());

    $('input[type="password"]').on('contextmenu', (e) => e.preventDefault());
    $('input[type="password"]').on('focus', function () {
        console.clear();
        console.warn('Security Warning: Do not paste or share passwords in console');
    });

    // Form validation
    $('#adminRegisterForm').on('submit', function (e) {
        e.preventDefault();
        if (!AdminInputUtils.validateForm('#adminRegisterForm')) {
            alert('Please fix the validation errors before submitting.');
            return false;
        }
        $('#adminRegisterBtn').click();
    });
});

/**
 * Setup admin user in accounts collection
 * @param {object} user - Firebase user object
 */
async function setupAdminUser(user) {
    try {
        console.log('Setting up admin user:', user.uid);

        // Check if admin already exists
        const adminRef = doc(db, 'accounts', user.uid);
        const docSnap = await getDoc(adminRef);

        if (docSnap.exists()) {
            console.log('Admin already exists, skipping setup');
            return;
        }

        // Get temporary admin data using session manager
        const tempAdminData = AdminSessionManager.getTempData();
        if (!tempAdminData) {
            console.error('No temporary admin data found');
            AdminErrorHandler.logError('admin-setup', new Error('No temp data'), { uid: user.uid });
            return;
        }

        // Create admin document in accounts collection
        const adminData = {
            email: AdminSecurityUtils.sanitizeInput(user.email),
            uid: user.uid,
            role: "admin", // Assign admin role
            createdAt: new Date(),
            emailVerified: user.emailVerified,
            lastLoginAt: new Date(),
            isActive: true
        };

        await setDoc(adminRef, adminData);

        console.log('Admin user setup completed successfully');
        AdminSessionManager.clearTempData();

    } catch (error) {
        console.error('Error in setupAdminUser:', error);
        AdminErrorHandler.logError('admin-setup', error, { uid: user.uid });
        alert('Admin account created successfully, but there was an issue setting up the admin profile. Please contact support if you experience any problems.');
    }
}