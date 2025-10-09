import {
    db,
    auth,
    doc,
    getDoc,
    signOut,
    onAuthStateChanged
} from '../../../firebase-config.js';

class AuthManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    async getUserRole(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'accounts', uid));
            if (userDoc.exists()) {
                return userDoc.data().role || 'staff'; // default to staff if no role
            }
            return 'staff';
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'staff'; // default to staff on error
        }
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
            // Get user role instead of just checking admin
            const userRole = await this.getUserRole(user.uid);

            if (['super_admin', 'admin', 'staff'].includes(userRole)) {
                this.parent.isAdmin = (userRole === 'admin');
                this.parent.isSuperAdmin = (userRole === 'super_admin');
                this.parent.isStaff = (userRole === 'staff');
                await this.parent.initializeAdminPanel();
            } else {
                this.parent.uiRenderer.showAccessDenied();
            }
        } catch (error) {
            console.error('Error handling authenticated user:', error);
            this.parent.uiRenderer.showError('Failed to verify permissions');
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

            return accountDoc.exists() && ['super_admin', 'admin', 'staff'].includes(accountDoc.data().role);
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
            window.location.href = '../../admin/login/adminLogin.html';
        }, 1500);
    }

    // This should be called in your setupAuthListener or after successful authentication

    async checkAccountStatus(uid) {
        try {
            const accountDoc = await getDoc(doc(db, 'accounts', uid));

            if (accountDoc.exists()) {
                const accountData = accountDoc.data();

                if (accountData.isDisabled === true) {
                    // Account is disabled - sign out the user
                    await signOut(auth);

                    // Show disabled message
                    this.showDisabledAccountMessage();

                    return false; // Account is disabled
                }
            }

            return true; // Account is active or not found (allow access)

        } catch (error) {
            console.error('Error checking account status:', error);
            return true; // On error, allow access (fail-safe)
        }
    }

    showDisabledAccountMessage() {
        // Clear the page content
        $('body').html(`
        <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <div style="
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 400px;
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">🚫</div>
                <h1 style="
                    color: #d32f2f;
                    font-size: 24px;
                    margin-bottom: 16px;
                    font-weight: 600;
                ">Account Disabled</h1>
                <p style="
                    color: #666;
                    font-size: 16px;
                    line-height: 1.6;
                    margin-bottom: 24px;
                ">
                    Your account has been disabled by an administrator. 
                    Please contact support for assistance.
                </p>
                <button onclick="window.location.href='../../admin/login/adminLogin.html'" style="
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                ">
                    Return to Login
                </button>
            </div>
        </div>
    `);
    }

    // Update your setupAuthListener method to include this check:
    setupAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Check if account is disabled
                const isActive = await this.checkAccountStatus(user.uid);

                if (!isActive) {
                    // Account is disabled, showDisabledAccountMessage already called
                    return;
                }

                // Continue with normal initialization
                this.parent.currentUser = user;
                await this.parent.initializeAdminPanel();

            } else {
                // Not authenticated
                window.location.href = '../../admin/login/adminLogin.html';
            }
        });
    }
}
export default AuthManager;