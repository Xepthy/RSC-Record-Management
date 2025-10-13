import { auth, sendPasswordResetEmail } from '../../firebase-config.js';

const reset = document.getElementById("reset");

reset.addEventListener("click", async function(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value; 

  if (!email) {
    alert("Please enter your email first.");
    return;
  }

  try {
    // Just send the reset email - Firebase handles the validation
    await sendPasswordResetEmail(auth, email);
    
    // Generic message for security (doesn't reveal if email exists)
    alert("If an account exists with this email, a password reset link has been sent. Please check your inbox or spam folder.");
    
  } catch (error) {
    console.error("ERROR CODE:", error.code);
    console.error("ERROR MESSAGE:", error.message);
    
    // Only show error for invalid format, not for user-not-found
    if (error.code === 'auth/invalid-email') {
      alert("Please enter a valid email address.");
    } else {
      // For all other errors, show generic message
      alert("If an account exists with this email, a password reset link has been sent. Please check your inbox or spam folder.");
    }
  }
});