const SecurityUtils = {
    sanitizeInput: function (input) {
        return input.trim().replace(/[<>]/g, '');
    },

    validateEmail: function (email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email) && email.length <= 254 &&
            !email.includes('..') && !email.startsWith('.') && !email.endsWith('.');
    },

    validatePassword: function (password) {
        return password.length >= 8 && password.length <= 128 &&
            /[a-z]/.test(password) && /[A-Z]/.test(password) &&
            /[0-9]/.test(password) && /[_!@#$%^&*(),.?":{}|<>]/.test(password);
    },

    getPasswordRequirements: function () {
        return "Password must be 8-15 characters and contain at least one lowercase letter, one uppercase letter, one number, and one special character.";
    },

    validateName: function (name) {
        return /^[a-zA-Z\s\-\.\']{1,50}$/.test(name) && name.trim().length > 0;
    },

    validateMobileNumber: function (mobile) {
        return /^09[0-9]{9}$/.test(mobile);
    },

    validateClassification: function (classification) {
        return classification && classification !== "" && classification !== null;
    }
};

const RateLimiter = {
    lastAttemptTime: 0,
    limitMs: 3000,

    isLimited: function () {
        const now = Date.now();
        if (now - this.lastAttemptTime < this.limitMs) {
            return true;
        }
        this.lastAttemptTime = now;
        return false;
    }
};

const ErrorHandler = {
    getSecureMessage: function (error) {
        console.error("Authentication error:", error);

        const messages = {
            'auth/email-already-in-use': 'This email is already registered.',
            'auth/weak-password': SecurityUtils.getPasswordRequirements(),
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-not-found': 'Invalid email or password.',
            'auth/wrong-password': 'Invalid email or password.',
            'auth/invalid-credential': 'Password does not match.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again in a few minutes.',
            'auth/network-request-failed': 'Network error. Please check your connection and try again.'
        };

        return messages[error.code] || 'Registration failed. Please try again.';
    }
};

const InputUtils = {
    setValidationStyle: function (element, isValid) {
        element.style.border = isValid ? "" : "2px solid red";
    },

    clearSensitiveFields: function () {
        const passwordFields = document.querySelectorAll("input[type='password']");
        passwordFields.forEach(field => field.value = "");
    }
};

const ValidationHandlers = {
    initializeValidation: function () {
        // Email validation - only visual feedback (red border), no toast
        $('#email').on('blur', function () {
            const email = $(this).val();
            if (email && !SecurityUtils.validateEmail(email)) {
                $(this)[0].setCustomValidity('Please enter a valid email address');
            } else {
                $(this)[0].setCustomValidity('');
            }
        });

        // Password validation - only visual feedback, no toast on input
        $('#password, #verifyPassword').on('input', function () {
            const password = $(this).val();
            if (password && !SecurityUtils.validatePassword(password)) {
                $(this)[0].setCustomValidity(SecurityUtils.getPasswordRequirements());
            } else {
                $(this)[0].setCustomValidity('');
            }
        });

        // Mobile number input & formatting only - no validation toast
        $('#mobileNumber').on('input', function () {
            let mobile = $(this).val().replace(/[^0-9]/g, '');
            if (mobile.length > 11) mobile = mobile.substring(0, 11);
            $(this).val(mobile);
        });

        // Name validation - only visual feedback, no toast
        $('#firstName, #lastName').on('blur', function () {
            const name = $(this).val();
            if (name && !SecurityUtils.validateName(name)) {
                $(this)[0].setCustomValidity('Name should contain only letters, spaces, hyphens, dots, and apostrophes.');
            } else {
                $(this)[0].setCustomValidity('');
            }
        });

        // Optional fields: middleName, suffix - only visual feedback
        $('#middleName, #suffix').on('blur', function () {
            const value = $(this).val();
            if (value && !SecurityUtils.validateName(value)) {
                $(this)[0].setCustomValidity('Should contain only letters, spaces, hyphens, dots, and apostrophes.');
            } else {
                $(this)[0].setCustomValidity('');
            }
        });

        // Classification dropdown - only visual feedback
        $('#classification').on('change', function () {
            if (!$(this).val()) {
                $(this)[0].setCustomValidity('Please select a classification');
            } else {
                $(this)[0].setCustomValidity('');
            }
        });
    }
};

export { SecurityUtils, RateLimiter, ErrorHandler, InputUtils, ValidationHandlers };