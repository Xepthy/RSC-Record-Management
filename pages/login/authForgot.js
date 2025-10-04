import { auth, sendPasswordResetEmail } from '../../firebase-config.js';

const reset = document.getElementById("reset");
reset.addEventListener("click", function(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value; 

  if (!email) {
    alert("Please enter your email first.");
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      alert("Password reset email sent! Please check your inbox.");
    })
    .catch((error) => {
      alert("Error: " + error.message);
    });
});
