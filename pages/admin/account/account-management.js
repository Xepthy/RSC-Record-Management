import {
    auth,
    db,
    firebaseConfig,
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    sendPasswordResetEmail,
    getAuth,
    createUserWithEmailAndPassword,
    signOut,
    functions
} from '../../../firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-functions.js";

export default class AccountManager {
    constructor(parent) {
        this.parent = parent;
        this.accounts = [];
        this.collectionName = 'accounts';
        this.functions = functions;

        this.secondaryApp = initializeApp(firebaseConfig, "Secondary");
        this.secondaryAuth = getAuth(this.secondaryApp);
    }

    async loadAccounts() {
        try {
            const snapshot = await getDocs(collection(db, this.collectionName));
            this.accounts = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            return this.accounts;
        } catch (error) {
            console.error('Error loading accounts:', error);
            this.parent.inquiryManager.showToast('Failed to load accounts', 'error');
            return [];
        }
    }

    openCreateForm() {
        const modalHTML = `
            <div class="modal-overlay" id="createAccountModal">
                <div class="modal-content account-modal">
                    <div class="modal-header">
                        <h2>🔐 Create New Account</h2>
                        <button class="close-modal" id="closeCreateModal">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="createAccountForm">
                            <div class="form-group">
                                <label>First Name *</label>
                                <input type="text" id="newFirst" placeholder="Enter first name" required>
                            </div>
                            <div class="form-group">
                                <label>Last Name *</label>
                                <input type="text" id="newLast" placeholder="Enter last name" required>
                            </div>
                            <div class="form-group">
                                <label>Email *</label>
                                <input type="email" id="newEmail" placeholder="user@example.com" required>
                                <small class="form-hint">User will receive a password setup email</small>
                            </div>
                            <div class="form-group">
                                <label>Role *</label>
                                <select id="newRole" required>
                                    <option value="">Select Role</option>
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" id="cancelCreate">Cancel</button>
                                <button type="submit" class="btn-primary">Create Account</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        $('body').append(modalHTML);

        $('#closeCreateModal, #cancelCreate').on('click', () => {
            $('#createAccountModal').remove();
        });

        $('#createAccountForm').on('submit', async (e) => {
            e.preventDefault();
            await this.createAccount();
        });
    }

    async createAccount() {
        const firstName = $('#newFirst').val().trim();
        const lastName = $('#newLast').val().trim();
        const email = $('#newEmail').val().trim();
        const role = $('#newRole').val();

        if (!firstName || !lastName || !email || !role) {
            alert('Please fill all required fields.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }

        try {
            $('#createAccountForm button[type="submit"]').text('Creating...').prop('disabled', true);

            const tempPassword = this.generateTemporaryPassword();

            const staffCredential = await createUserWithEmailAndPassword(
                this.secondaryAuth,
                email,
                tempPassword
            );
            const uid = staffCredential.user.uid;

            const accountData = {
                firstName,
                lastName,
                email,
                role,
                uid,
                isDisabled: false,
                createdAt: serverTimestamp(),
                createdBy: this.parent.currentUser?.uid || 'system'
            };
            await setDoc(doc(db, this.collectionName, uid), accountData);

            await sendPasswordResetEmail(this.secondaryAuth, email);
            await signOut(this.secondaryAuth);

            this.parent.inquiryManager.showToast(
                `✅ Account created! Password setup email sent to ${email}`,
                'success'
            );

            $('#createAccountModal').remove();

            await this.loadAccounts();
            this.parent.uiRenderer.showAccountManagement(this.accounts);

        } catch (error) {
            console.error('Error creating account:', error);

            $('#createAccountForm button[type="submit"]').text('Create Account').prop('disabled', false);

            if (error.code === 'auth/email-already-in-use') {
                alert('This email is already registered. Please use a different email.');
            } else if (error.code === 'auth/invalid-email') {
                alert('Invalid email address. Please check and try again.');
            } else {
                alert('Failed to create account: ' + error.message);
            }
        }
    }

    generateTemporaryPassword() {
        const length = 16;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }

    openActionsMenu(account, buttonElement) {
        // Close any existing menu
        $('.account-actions-menu').remove();

        const isDisabled = account.isDisabled || false;
        const isSuperAdmin = account.role === 'super_admin';

        const menuHTML = `
            <div class="account-actions-menu" data-account-id="${account.id}">
                <button class="menu-item" data-action="reset">
                    <span class="menu-icon">🔑</span>
                    Reset Password
                </button>
                ${!isSuperAdmin ? `
                    <button class="menu-item" data-action="toggle-disable">
                        <span class="menu-icon">${isDisabled ? '✅' : '🚫'}</span>
                        ${isDisabled ? 'Enable Account' : 'Disable Account'}
                    </button>
                    <button class="menu-item danger" data-action="delete">
                        <span class="menu-icon">🗑️</span>
                        Delete Account
                    </button>
                ` : ''}
            </div>
        `;

        $('body').append(menuHTML);

        const $menu = $('.account-actions-menu');
        const $button = $(buttonElement);
        const buttonOffset = $button.offset();
        const buttonHeight = $button.outerHeight();

        $menu.css({
            top: buttonOffset.top + buttonHeight + 5,
            left: buttonOffset.left - $menu.outerWidth() + $button.outerWidth()
        });

        // Handle menu clicks
        $menu.find('[data-action="reset"]').on('click', () => {
            this.resetPassword(account.email);
            $('.account-actions-menu').remove();
        });

        $menu.find('[data-action="toggle-disable"]').on('click', () => {
            this.toggleDisableAccount(account);
            $('.account-actions-menu').remove();
        });

        $menu.find('[data-action="delete"]').on('click', () => {
            this.deleteAccount(account);
            $('.account-actions-menu').remove();
        });

        // Close menu when clicking outside
        setTimeout(() => {
            $(document).one('click', () => {
                $('.account-actions-menu').remove();
            });
        }, 0);
    }

    async toggleDisableAccount(account) {
        const isCurrentlyDisabled = account.isDisabled || false;
        const action = isCurrentlyDisabled ? 'enable' : 'disable';
        const actionVerb = isCurrentlyDisabled ? 'Enable' : 'Disable';

        if (!confirm(`${actionVerb} account for ${account.firstName} ${account.lastName}?`)) {
            return;
        }

        try {
            const toggleDisableFunction = httpsCallable(this.functions, 'toggleDisableAccount');
            await toggleDisableFunction({
                uid: account.id,
                disable: !isCurrentlyDisabled
            });

            this.parent.inquiryManager.showToast(
                `✅ Account ${action}d successfully`,
                'success'
            );

            await this.loadAccounts();
            this.parent.uiRenderer.showAccountManagement(this.accounts);

        } catch (error) {
            console.error(`Error ${action}ing account:`, error);
            alert(`Failed to ${action} account: ${error.message}`);
        }
    }

    async deleteAccount(account) {
        const confirmText = `DELETE ${account.email}`;
        const userInput = prompt(
            `⚠️ WARNING: This will permanently delete the account.\n\n` +
            `Type "${confirmText}" to confirm deletion:`
        );

        if (userInput !== confirmText) {
            if (userInput !== null) {
                alert('Deletion cancelled - text did not match.');
            }
            return;
        }

        try {
            const deleteUserFunction = httpsCallable(this.functions, 'deleteUserAccount');
            await deleteUserFunction({ uid: account.id });

            this.parent.inquiryManager.showToast(
                `✅ Account deleted successfully`,
                'success'
            );

            await this.loadAccounts();
            this.parent.uiRenderer.showAccountManagement(this.accounts);

        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Failed to delete account: ' + error.message);
        }
    }

    async resetPassword(email) {
        if (!confirm(`Send password reset email to ${email}?`)) return;

        try {
            await sendPasswordResetEmail(auth, email);
            this.parent.inquiryManager.showToast(
                `✅ Password reset email sent to ${email}`,
                'success'
            );
        } catch (error) {
            console.error('Error resetting password:', error);

            if (error.code === 'auth/user-not-found') {
                alert('No user found with this email. They may need to set up their account first.');
            } else {
                alert('Failed to send password reset email: ' + error.message);
            }
        }
    }
}