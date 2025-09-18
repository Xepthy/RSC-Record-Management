import {
    db,
    auth,
    doc,
    getDoc,
    signOut,
    onAuthStateChanged
} from '../../firebase-config_js/firebase-config.js';

class AuthManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    setupAuthListener() {
        console.log('Setting up auth listener...');
        onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed:', user ? 'User logged in' : 'No user');
            if (user) {
                console.log('User details:', { uid: user.uid, email: user.email, displayName: user.displayName });
                this.parent.currentUser = user;
                await this.handleUserAuthenticated(user);
            } else {
                console.log('No authenticated user found');
                this.handleUserNotAuthenticated();
            }
        });
    }

    async handleUserAuthenticated(user) {
        try {
            // Check if user is admin
            const isAdmin = await this.checkAdminStatus(user.uid);

            // Debugging: confirm Firestore role
            console.log("Admin check UID:", user.uid);
            const snap = await getDoc(doc(db, "accounts", user.uid));
            console.log("Doc exists?", snap.exists(), "Role:", snap.data()?.role);

            if (isAdmin) {
                this.parent.isAdmin = true;
                await this.parent.initializeAdminPanel();
            } else {
                this.parent.uiRenderer.showAccessDenied();
            }
        } catch (error) {
            console.error('Error handling authenticated user:', error);
            this.parent.uiRenderer.showError('Failed to verify admin permissions');
        }
    }

    handleUserNotAuthenticated() {
        console.log('User not authenticated - redirecting to login');
        // Clear any stored user data
        sessionStorage.removeItem('adminUser');

        // Update UI to show unauthenticated state
        $('#userName').text('Not logged in');
        $('#userEmail').text('Authentication required');

        // Redirect to login page
        this.redirectToLogin();
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

    async handleLogout() {
        try {
            // Show loading state on logout button
            const $logoutBtn = $('#logoutBtn');
            $logoutBtn.prop('disabled', true).text('Logging out...');

            // Sign out from Firebase
            await signOut(auth);

            // Clear session storage
            sessionStorage.removeItem('adminUser');

            // Redirect will be handled by auth state change

        } catch (error) {
            console.error('Logout error:', error);

            // Reset logout button
            const $logoutBtn = $('#logoutBtn');
            $logoutBtn.prop('disabled', false).html('<span>Logout</span>');

            this.parent.uiRenderer.showError('Failed to logout. Please try again.');
        }
    }

    redirectToLogin() {
        // Show message briefly before redirect
        $('#inquiryContent').html(`
            <div class="error-state">
                <h3>Authentication Required</h3>
                <p>Redirecting to login page...</p>
            </div>
        `);

        setTimeout(() => {
            window.location.href = '../login/adminLogin.html';
        }, 1500);
    }
}

export default AuthManager;