import {
    auth,
    signOut
} from '../../firebase-config.js';

$(document).ready(function() {
    // Toggle dropdown on profile click
    $('.profile-dropdown .profile').on('click', function(e) {
        e.stopPropagation();
        $('#profileDropdown').toggleClass('show');
    });

    // Close dropdown when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.profile-dropdown').length) {
            $('#profileDropdown').removeClass('show');
        }
    });

    // Logout handler
    $('#logoutBtn').on('click', async function() {
        try {
            // Close dropdown
            $('#profileDropdown').removeClass('show');
            
            // Show loading state
            $(this).html('<i class="fas fa-spinner fa-spin"></i> Signing out...').css('pointer-events', 'none');

            await signOut(auth);

            window.location.href = "../login/login.html";

        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to sign out. Please try again.');

            // Reset button state
            $(this).html('<i class="fas fa-sign-out-alt"></i> Logout').css('pointer-events', 'auto');
        }
    });
});