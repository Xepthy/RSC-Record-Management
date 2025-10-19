import { auth, sendPasswordResetEmail, functions } from '../../firebase-config.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-functions.js";

const reset = document.getElementById("reset");

// Centered overlay toast
function showToast(message, type = 'info') {
  // Remove existing
  $('.auth-toast-overlay').remove();

  const overlay = document.createElement('div');
  overlay.className = 'auth-toast-overlay';
  overlay.innerHTML = `
    <div class="auth-toast ${type}">
      <div class="auth-toast-message">${message}</div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Show with animation
  setTimeout(() => overlay.classList.add('show'), 10);

  // Click overlay to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeToast(overlay);
    }
  });

  // Auto close
  setTimeout(() => closeToast(overlay), 3000);
}

function closeToast(overlay) {
  overlay.classList.remove('show');
  setTimeout(() => overlay.remove(), 300);
}

function showLoading() {
  const link = $('#reset');
  link.data('original-text', link.text());
  link.html('<span class="auth-forgot-loading"></span>Checking...');
  link.css({ 'pointer-events': 'none', 'opacity': '0.7' });
}

function hideLoading() {
  const link = $('#reset');
  link.text(link.data('original-text') || 'Forgot Password?');
  link.css({ 'pointer-events': 'auto', 'opacity': '1' });
}

reset.addEventListener("click", async function (event) {
  event.preventDefault();

  const email = $("#loginEmail").val();

  if (!email) {
    showToast('Please enter your email address first.', 'warning');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  showLoading();

  try {
    const checkEmailType = httpsCallable(functions, 'checkEmailType');
    const result = await checkEmailType({ email });

    const { exists, type } = result.data;

    hideLoading();

    if (!exists) {
      showToast('No account exists with this email address.', 'error');
      return;
    }

    if (type === 'admin') {
      showToast('This is an admin account. Please use the Admin Login page.', 'warning');
      return;
    }

    await sendPasswordResetEmail(auth, email);
    showToast('Password reset link sent! Check your inbox.', 'success');

  } catch (error) {
    console.error("ERROR CODE:", error.code);
    console.error("ERROR MESSAGE:", error.message);

    hideLoading();

    if (error.code === 'auth/invalid-email') {
      showToast('Please enter a valid email address.', 'error');
    } else if (error.code === 'auth/too-many-requests') {
      showToast('Too many attempts. Please try again later.', 'error');
    } else {
      showToast('An error occurred. Please try again.', 'error');
    }
  }
});