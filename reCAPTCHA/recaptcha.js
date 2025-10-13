$(function () {
    $("#signupForm").submit(function (e) {
        e.preventDefault();

        const response = grecaptcha.getResponse();
        if (!response) {
            alert("Please complete the reCAPTCHA.");
            return;
        }

        alert("reCAPTCHA passed! You can now continue.");
        // Continue your logic here (e.g., sign-up or auth)
    });
});
