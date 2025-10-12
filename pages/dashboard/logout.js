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
        // Show confirmation modal
        const confirmModal = `
            <div id="logoutConfirmModal" class="modal-overlay">
                <div class="modal-content small-modal">
                    <h3>Confirm Logout</h3>
                    <p>Are you sure you want to logout?</p>
                    <div class="modal-actions">
                        <button id="confirmLogout" class="btn btn-danger">Logout</button>
                        <button id="cancelLogout" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        $('body').append(confirmModal);

        // Handle confirmation buttons
        $('#confirmLogout').on('click', async () => {
            try {
                $('#profileDropdown').removeClass('show');
                $('#confirmLogout').html('<i class="fas fa-spinner fa-spin"></i> Signing out...').prop('disabled', true);
                $('#cancelLogout').prop('disabled', true);

                await signOut(auth);

                $('#logoutConfirmModal').remove();
                window.location.href = "../login/login.html";
            } catch (error) {
                console.error('Logout error:', error);
                alert('Failed to sign out. Please try again.');
                $('#logoutConfirmModal').remove();
            }
        });

        $('#cancelLogout').on('click', () => {
            $('#logoutConfirmModal').remove();
        });
    });
});
