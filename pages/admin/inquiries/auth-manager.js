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
                return userDoc.data().role || 'staff';
            }
            return 'staff';
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'staff';
        }
    }

    async checkAccountStatus(uid) {
        try {
            const accountDoc = await getDoc(doc(db, 'accounts', uid));

            if (accountDoc.exists()) {
                const accountData = accountDoc.data();

                if (accountData.isDisabled === true) {
                    await signOut(auth);
                    this.showDisabledAccountMessage();
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error('Error checking account status:', error);
            return true;
        }
    }

    setupAuthListener() {
        console.log('Setting up auth listener...');
        onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed:', user ? 'User logged in' : 'No user');
            
            if (user) {
                console.log('User details:', { 
                    uid: user.uid, 
                    email: user.email, 
                    displayName: user.displayName 
                });

                // Check if account is disabled first
                const isActive = await this.checkAccountStatus(user.uid);
                if (!isActive) {
                    return;
                }

                // Set current user
                this.parent.currentUser = user;
                
                // Handle authenticated user with role check
                await this.handleUserAuthenticated(user);
            } else {
                console.log('No authenticated user found');
                this.handleUserNotAuthenticated();
            }
        });
    }

    async handleUserAuthenticated(user) {
        try {
            const userRole = await this.getUserRole(user.uid);

            if (['super_admin', 'admin', 'staff'].includes(userRole)) {
                this.parent.isAdmin = (userRole === 'admin');
                this.parent.isSuperAdmin = (userRole === 'super_admin');
                this.parent.isStaff = (userRole === 'staff');
                
                console.log('User role:', userRole);
                await this.parent.initializeAdminPanel();
            } else {
                console.log('Access denied - invalid role:', userRole);
                this.parent.uiRenderer.showAccessDenied();
            }
        } catch (error) {
            console.error('Error handling authenticated user:', error);
            this.parent.uiRenderer.showError('Failed to verify permissions');
        }
    }

    handleUserNotAuthenticated() {
        console.log('User not authenticated - redirecting to login');
        sessionStorage.removeItem('adminUser');

        // Update UI if elements exist
        if ($('#userName').length) {
            $('#userName').text('Not logged in');
        }
        if ($('#userEmail').length) {
            $('#userEmail').text('Authentication required');
        }

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
            const $logoutBtn = $('#logoutBtn');
            $logoutBtn.prop('disabled', true).text('Logging out...');

            await signOut(auth);
            sessionStorage.removeItem('adminUser');

        } catch (error) {
            console.error('Logout error:', error);

            const $logoutBtn = $('#logoutBtn');
            $logoutBtn.prop('disabled', false).html('<span>Logout</span>');

            this.parent.uiRenderer.showError('Failed to logout. Please try again.');
        }
    }

    redirectToLogin() {
        // Update the path to match your actual login page location
        const loginPath = '../login/adminLogin.html'; // Adjust this path as needed

        if ($('#inquiryContent').length) {
            $('#inquiryContent').html(`
                <div class="error-state">
                    <h3>Authentication Required</h3>
                    <p>Redirecting to login page...</p>
                </div>
            `);
        }

        setTimeout(() => {
            window.location.href = loginPath;
        }, 1500);
    }

    showDisabledAccountMessage() {
        // Update the path to match your actual login page location
        const loginPath = '../login/adminLogin.html'; // Adjust this path as needed

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
                <button onclick="window.location.href='${loginPath}'" style="
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
}

export default AuthManager;