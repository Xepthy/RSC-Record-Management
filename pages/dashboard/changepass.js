import {
    auth,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from '../../firebase-config.js';

$(document).ready(function () {
    // Toggle password visibility handlers
    $('#toggleCurrentPassword').on('click', function () {
        const input = $('#currentPassword');
        const type = input.attr('type') === 'password' ? 'text' : 'password';
        input.attr('type', type);
        $(this).toggleClass('fa-eye-slash fa-eye');
    });

    $('#toggleNewPassword').on('click', function () {
        const input = $('#newPassword');
        const type = input.attr('type') === 'password' ? 'text' : 'password';
        input.attr('type', type);
        $(this).toggleClass('fa-eye-slash fa-eye');
    });

    $('#toggleConfirmPassword').on('click', function () {
        const input = $('#confirmPassword');
        const type = input.attr('type') === 'password' ? 'text' : 'password';
        input.attr('type', type);
        $(this).toggleClass('fa-eye-slash fa-eye');
    });

    // Open change password modal
    $('#changePasswordBtn').on('click', function () {
        $('#profileDropdown').removeClass('show');
        $('#changePasswordModal').show();
        // Reset form
        $('#changePasswordForm')[0].reset();
        // Reset input types to password
        $('#currentPassword, #newPassword, #confirmPassword').attr('type', 'password');
        // Reset eye icons to default (eye-slash = hidden)
        $('#toggleCurrentPassword, #toggleNewPassword, #toggleConfirmPassword')
            .removeClass('fa-eye').addClass('fa-eye-slash');
    });

    // Close modal
    $('#changePasswordModal .close-btn').on('click', function () {
        $('#changePasswordModal').hide();
    });

    // Handle form submission
    $('#changePasswordForm').on('submit', async function (event) {
        event.preventDefault();

        const currentPassword = $('#currentPassword').val();
        const newPassword = $('#newPassword').val();
        const confirmPassword = $('#confirmPassword').val();

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert("Please fill in all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            alert("New password must be at least 6 characters long.");
            return;
        }

        if (currentPassword === newPassword) {
            alert("New password must be different from current password.");
            return;
        }

        const user = auth.currentUser;

        if (!user) {
            alert("No user is currently signed in.");
            return;
        }

        try {
            // Disable submit button
            const submitBtn = $('#changePasswordForm button[type="submit"]');
            submitBtn.prop('disabled', true).text('Updating...');

            // Reauthenticate user with current password
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );

            await reauthenticateWithCredential(user, credential);

           
            await updatePassword(user, newPassword);

            alert("Password updated successfully!");
            $('#changePasswordModal').hide();
            $('#changePasswordForm')[0].reset();

        } catch (error) {
            console.error("Error updating password:", error);

            if (error.code === 'auth/wrong-password') {
                alert("Current password is incorrect.");
            } else if (error.code === 'auth/weak-password') {
                alert("New password is too weak. Please choose a stronger password.");
            } else {
                alert("Error: Current password is incorrect.");
            }
        } finally {
            // Re-enable submit button
            const submitBtn = $('#changePasswordForm button[type="submit"]');
            submitBtn.prop('disabled', false).text('Update Password');
        }
    });
});