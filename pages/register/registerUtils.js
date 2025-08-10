// Input sanitization and validation
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
            /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
    },

    getPasswordRequirements: function () {
        return "Password must be 8-128 characters and contain at least one letter and one number.";
    },

    validateName: function (name) {
        return /^[a-zA-Z\s\-\.\']{1,50}$/.test(name) && name.trim().length > 0;
    },

    validateMobileNumber: function (mobile) {
        return /^09[0-9]{9}$/.test(mobile);
    }
};

// Rate limiting
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

// Secure error handling
const ErrorHandler = {
    getSecureMessage: function (error) {
        console.error('Authentication error:', error);

        const messages = {
            'auth/email-already-in-use': 'This email is already registered.',
            'auth/weak-password': SecurityUtils.getPasswordRequirements(),
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-not-found': 'Invalid email or password.',
            'auth/wrong-password': 'Invalid email or password.',
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again in a few minutes.',
            'auth/network-request-failed': 'Network error. Please check your connection and try again.'
        };

        return messages[error.code] || 'Registration failed. Please try again.';
    }
};

// Input styling functions
const InputUtils = {
    setValidationStyle: function (element, isValid) {
        element.style.border = isValid ? '' : '2px solid red';
    },

    clearSensitiveFields: function () {
        const passwordFields = document.querySelectorAll('input[type="password"]');
        passwordFields.forEach(field => field.value = '');
    }
};

// Real-time validation handlers
const ValidationHandlers = {
    initializeValidation: function () {
        // Real-time email validation feedback
        $('#email').on('blur', function () {
            const email = $(this).val();
            if (email && !SecurityUtils.validateEmail(email)) {
                $(this)[0].setCustomValidity('Please enter a valid email address');
            } else {
                $(this)[0].setCustomValidity('');
            }
        });

        // Real-time password validation feedback  
        $('#password, #verifyPassword').on('input', function () {
            const password = $(this).val();
            if (password && !SecurityUtils.validatePassword(password)) {
                $(this)[0].setCustomValidity(SecurityUtils.getPasswordRequirements());
            } else {
                $(this)[0].setCustomValidity('');
            }
        });

        // Format mobile number as user types
        $('#mobileNumber').on('input', function () {
            let mobile = $(this).val().replace(/[^0-9]/g, '');
            if (mobile.length > 11) {
                mobile = mobile.substring(0, 11);
            }
            $(this).val(mobile);
        });

        // Real-time validation for name fields
        $('#firstName, #lastName').on('blur', function () {
            const name = $(this).val();
            if (name && !SecurityUtils.validateName(name)) {
                $(this)[0].setCustomValidity('Name should contain only letters, spaces, hyphens, dots, and apostrophes');
            } else {
                $(this)[0].setCustomValidity('');
            }
        });

        // Optional: Middle name and suffix validation (less strict since they're optional)
        $('#middleName, #suffix').on('blur', function () {
            const value = $(this).val();
            if (value && value.length > 0 && !SecurityUtils.validateName(value)) {
                $(this)[0].setCustomValidity('Should contain only letters, spaces, hyphens, dots, and apostrophes');
            } else {
                $(this)[0].setCustomValidity('');
            }
        });

        // Classification dropdown validation
        $('#classification').on('change', function () {
            if (!$(this).val()) {
                $(this)[0].setCustomValidity('Please select a classification');
            } else {
                $(this)[0].setCustomValidity('');
            }
        });
    }
};

// Export as ES6 modules
export { SecurityUtils, RateLimiter, ErrorHandler, InputUtils, ValidationHandlers };