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
    }
};

// Rate limiting for login attempts
const LoginRateLimiter = {
    attempts: 0,
    lastAttemptTime: 0,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    attemptInterval: 60 * 1000, // 1 minute between attempts

    isBlocked: function () {
        const now = Date.now();

        // Reset attempts if lockout period has passed
        if (this.attempts >= this.maxAttempts) {
            if (now - this.lastAttemptTime > this.lockoutDuration) {
                this.attempts = 0;
                return false;
            }
            return true;
        }

        // Rate limit individual attempts
        if (now - this.lastAttemptTime < this.attemptInterval) {
            return true;
        }

        return false;
    },

    recordAttempt: function (failed = false) {
        this.lastAttemptTime = Date.now();
        if (failed) {
            this.attempts++;
        } else {
            this.attempts = 0; // Reset on successful login
        }
    },

    getRemainingLockoutTime: function () {
        if (this.attempts < this.maxAttempts) return 0;
        const elapsed = Date.now() - this.lastAttemptTime;
        const remaining = Math.max(0, this.lockoutDuration - elapsed);
        return Math.ceil(remaining / 60000); // Return minutes
    }
};

// Secure error handling for login
const LoginErrorHandler = {
    getSecureMessage: function (error) {
        console.error('Login error:', error);

        const messages = {
            'auth/invalid-email': 'Invalid email or password.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'Invalid email or password.',
            'auth/wrong-password': 'Invalid email or password.',
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection and try again.'
        };

        return messages[error.code] || 'Login failed. Please try again.';
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

// Real-time validation handlers for login
const LoginValidationHandlers = {
    initializeValidation: function () {
        // Real-time email validation
        $('#loginEmail').on('blur', function () {
            const email = $(this).val();
            if (email && !SecurityUtils.validateEmail(email)) {
                InputUtils.setValidationStyle(this, false);
            } else {
                InputUtils.setValidationStyle(this, true);
            }
        });

        // Password field validation (don't show detailed requirements for login)
        $('#loginPassword').on('input', function () {
            const password = $(this).val();
            if (password.length > 0 && password.length < 8) {
                InputUtils.setValidationStyle(this, false);
            } else {
                InputUtils.setValidationStyle(this, true);
            }
        });

        // Clear validation styles when user starts typing
        $('#loginEmail, #loginPassword').on('input', function () {
            if ($(this).val().length > 0) {
                InputUtils.setValidationStyle(this, true);
            }
        });
    }
};

// Export as ES6 modules
export { SecurityUtils, LoginRateLimiter, LoginErrorHandler, InputUtils, LoginValidationHandlers };