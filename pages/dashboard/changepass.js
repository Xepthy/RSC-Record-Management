import {
  auth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from '../../firebase-config.js';

$(document).ready(function () {
  
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

  
  $('#changePasswordBtn').on('click', function () {
    $('#profileDropdown').removeClass('show');
    $('#changePasswordModal').fadeIn(200);
    $('#changePasswordForm')[0].reset();
    $('#currentPassword, #newPassword, #confirmPassword').attr('type', 'password');
    $('#toggleCurrentPassword, #toggleNewPassword, #toggleConfirmPassword')
      .removeClass('fa-eye')
      .addClass('fa-eye-slash');
  });

 
  $('#changePasswordModal .close-btn').on('click', function () {
    $('#changePasswordModal').fadeOut(200);
  });

  
  $('#changePasswordForm').on('submit', async function (event) {
    event.preventDefault();

    const currentPassword = $('#currentPassword').val();
    const newPassword = $('#newPassword').val();
    const confirmPassword = $('#confirmPassword').val();

    
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('warning', 'Missing Fields', 'Please fill in all fields.', 4000);
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'Password Mismatch', 'New passwords do not match.', 4000);
      return;
    }

    if (newPassword.length < 6) {
      showToast('warning', 'Weak Password', 'Password must be at least 6 characters.', 4000);
      return;
    }

    if (currentPassword === newPassword) {
      showToast('info', 'Duplicate Password', 'New password must differ from the old one.', 4000);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      showToast('error', 'Not Signed In', 'No user is currently signed in.', 4000);
      return;
    }

    const submitBtn = $('#changePasswordForm button[type="submit"]');
    submitBtn.prop('disabled', true).text('Updating...');

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      // 🌟 Smooth toast + modal fade
      showToast('success', 'Password Updated', 'Your password has been changed successfully.', 2500);
      setTimeout(() => {
        $('#changePasswordModal').fadeOut(300);
        $('#changePasswordForm')[0].reset();
      }, 1600);
    } catch (error) {
      console.error('Error updating password:', error);

      if (error.code === 'auth/wrong-password') {
        showToast('error', 'Incorrect Password', 'Your current password is incorrect.', 4000);
      } else if (error.code === 'auth/weak-password') {
        showToast('warning', 'Weak Password', 'Please choose a stronger password.', 4000);
      } else {
        showToast('error', 'Error', error.message || 'Failed to update password.', 4000);
      }
    } finally {
      submitBtn.prop('disabled', false).text('Update Password');
    }
  });
});
