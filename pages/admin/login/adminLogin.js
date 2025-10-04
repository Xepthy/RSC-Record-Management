import {
    auth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    db,
    doc,
    getDoc
} from '../../../firebase-config.js';

class AdminLogin {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;

        this.init();
    }

    async init() {
        try {
            // Wait for DOM
            await this.waitForDOM();

            // Setup event listeners
            this.setupEventListeners();

            // Listen for auth state changes
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    await this.handleUserLogin(user);
                } else {
                    this.handleUserLogout();
                }
            });

        } catch (error) {
            console.error('Error initializing admin login:', error);
            this.showError('Failed to initialize login system');
        }
    }

    waitForDOM() {
        return new Promise((resolve) => {
            $(document).ready(() => {
                resolve();
            });
        });
    }

    setupEventListeners() {
        // Login form submission
        $('#loginForm').on('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
    }

    async handleLogin() {
        const email = $('#email').val().trim();
        const password = $('#password').val().trim();
        const $loginBtn = $('#loginBtn');
        const $btnText = $('.btn-text');
        const $spinner = $('.spinner');

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            // Show loading state
            $loginBtn.prop('disabled', true);
            $btnText.text('Signing in...');
            $spinner.show();
            this.hideError();

            // Sign in with Firebase
            await signInWithEmailAndPassword(auth, email, password);

            // Auth state change will handle the rest

        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please try again.';

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'Invalid email or password. Please try again.';
                    break;
            }

            this.showError(errorMessage);

        } finally {
            // Reset button state
            $loginBtn.prop('disabled', false);
            $btnText.text('Sign In');
            $spinner.hide();
        }
    }

    async handleUserLogin(user) {
        try {
            this.currentUser = user;

            // Check if user is admin
            const isAdmin = await this.checkAdminStatus(user.uid);

            if (isAdmin) {
                this.isAdmin = true;
                // Store user info in session storage for the inquiries page
                sessionStorage.setItem('adminUser', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'Admin User',
                    isAdmin: true
                }));

                // Redirect to inquiries page
                this.redirectToInquiries();
            } else {
                // User is not admin
                this.showError('Access denied. Admin privileges required.');
                await signOut(auth);
            }

        } catch (error) {
            console.error('Error handling user login:', error);
            this.showError('Failed to verify admin permissions');
            await signOut(auth);
        }
    }

    handleUserLogout() {
        this.currentUser = null;
        this.isAdmin = false;

        // Clear session storage
        sessionStorage.removeItem('adminUser');
    }

    async checkAdminStatus(uid) {
        try {
            const accountDocRef = doc(db, 'accounts', uid);
            const accountDoc = await getDoc(accountDocRef);

            return accountDoc.exists() && accountDoc.data().role === 'admin';
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    redirectToInquiries() {
        // Show success message briefly before redirect
        this.showSuccess('Login successful! Redirecting...');

        setTimeout(() => {
            window.location.href = '../inquiries/dashboard_admin.html';
        }, 1000);
    }

    showError(message) {
        const $errorMessage = $('#errorMessage');
        $errorMessage.text(message).removeClass('success').addClass('error').show();
    }

    showSuccess(message) {
        const $errorMessage = $('#errorMessage');
        $errorMessage.text(message).removeClass('error').addClass('success').show();
    }

    hideError() {
        $('#errorMessage').hide();
    }

    // Public methods
    getCurrentUser() {
        return this.currentUser;
    }

    isUserAdmin() {
        return this.isAdmin;
    }
}

// Initialize when DOM is ready
$(document).ready(() => {
    window.adminLogin = new AdminLogin();
});

export default AdminLogin;