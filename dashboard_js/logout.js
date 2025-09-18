import {
    auth,
    signOut
} from '../firebase-config_js/firebase-config.js';

$('#logoutBtn').on('click', async function () {
    try {
        $(this).prop('disabled', true).text('Signing out...');

        await signOut(auth);

        window.location.href = "/login.html";

    } catch (error) {

        console.error('Logout error:', error);
        alert('Failed to sign out. Please try again.');

        // Reset button state
        $(this).prop('disabled', false).text('Logout');
    }
});