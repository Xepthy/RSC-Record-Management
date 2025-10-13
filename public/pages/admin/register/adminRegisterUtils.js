// Admin Registration Utilities

// Security Utils for Admin Registration
export const AdminSecurityUtils = {
    /**
     * Sanitize input to prevent XSS attacks
     * @param {string} input - Raw input string
     * @returns {string} - Sanitized string
     */
    sanitizeInput(input) {
        if (!input || typeof input !== 'string') return '';
        return input.trim().replace(/[<>'"&]/g, '');
    },

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {boolean} - True if password meets requirements
     */
    validatePassword(password) {
        if (!password || password.length < 8) return false;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return hasUpper && hasLower && hasNumber && hasSpecial;
    },

    /**
     * Get password requirements message
     * @returns {string} - Password requirements text
     */
    getPasswordRequirements() {
        return "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.";
    },

    /**
     * Check if email domain is allowed for admin registration
     * @param {string} email - Email to check
     * @returns {boolean} - True if domain is allowed
     */
    isAdminDomainAllowed(email) {
        // Add your allowed admin domains here
        const allowedDomains = [
            'company.com',
            'admin.company.com',
            'test.company.com'
            // Add more domains as needed
        ];

        const domain = email.split('@')[1];
        return allowedDomains.includes(domain) || allowedDomains.length === 0; // Allow all if empty
    }
};

// Rate Limiter for Admin Registration
export const AdminRateLimiter = {
    attempts: 0,
    lastAttempt: 0,
    maxAttempts: 3, // Stricter for admin
    cooldownTime: 300000, // 5 minutes for admin

    /**
     * Check if user is currently rate limited
     * @returns {boolean} - True if rate limited
     */
    isLimited() {
        const now = Date.now();
        if (now - this.lastAttempt > this.cooldownTime) {
            this.attempts = 0;
        }
        return this.attempts >= this.maxAttempts;
    },

    /**
     * Record a failed attempt
     */
    recordAttempt() {
        this.attempts++;
        this.lastAttempt = Date.now();
    },

    /**
     * Get remaining cooldown time in minutes
     * @returns {number} - Minutes remaining
     */
    getRemainingTime() {
        const now = Date.now();
        const elapsed = now - this.lastAttempt;
        const remaining = Math.max(0, this.cooldownTime - elapsed);
        return Math.ceil(remaining / 60000); // Convert to minutes
    },

    /**
     * Reset rate limiter (for successful operations)
     */
    reset() {
        this.attempts = 0;
        this.lastAttempt = 0;
    }
};

// Error Handler for Admin Registration
export const AdminErrorHandler = {
    /**
     * Get user-friendly error message
     * @param {Error} error - Firebase error object
     * @returns {string} - User-friendly error message
     */
    getSecureMessage(error) {
        const errorCode = error.code;
        console.log('Admin registration error:', errorCode);

        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'This email is already registered. Please use a different email address.';
            case 'auth/weak-password':
                return 'Password is too weak. Please choose a stronger password.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection and try again.';
            case 'auth/user-disabled':
                return 'This account has been disabled. Please contact support.';
            case 'auth/operation-not-allowed':
                return 'Admin registration is currently not available.';
            case 'auth/requires-recent-login':
                return 'Please sign in again to complete this action.';
            default:
                console.error('Unhandled admin error:', error);
                return 'An unexpected error occurred. Please try again or contact support.';
        }
    },

    /**
     * Log error for admin monitoring
     * @param {string} operation - Operation being performed
     * @param {Error} error - Error object
     * @param {object} context - Additional context
     */
    logError(operation, error, context = {}) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            operation: operation,
            error: error.message,
            code: error.code,
            context: context,
            userAgent: navigator.userAgent
        };

        console.error('Admin Error Log:', errorLog);
        // In production, you might want to send this to a logging service
    }
};

// Input Utils for Admin Registration
export const AdminInputUtils = {
    /**
     * Clear sensitive input fields
     */
    clearSensitiveFields() {
        $('input[type="password"]').val('');
    },

    /**
     * Set validation styling on form elements
     * @param {HTMLElement} element - Form element
     * @param {boolean} isValid - Whether the input is valid
     */
    setValidationStyle(element, isValid) {
        const $element = $(element);
        if (isValid) {
            $element.removeClass('invalid').addClass('valid');
        } else {
            $element.removeClass('valid').addClass('invalid');
        }
    },

    /**
     * Show loading state on button
     * @param {string} buttonId - Button selector
     * @param {boolean} isLoading - Loading state
     * @param {string} loadingText - Text to show while loading
     */
    setButtonLoading(buttonId, isLoading, loadingText = 'Loading...') {
        const $button = $(buttonId);
        if (isLoading) {
            $button.data('original-text', $button.text());
            $button.prop('disabled', true).text(loadingText).addClass('loading');
        } else {
            const originalText = $button.data('original-text') || 'Submit';
            $button.prop('disabled', false).text(originalText).removeClass('loading');
        }
    },

    /**
     * Validate all form inputs
     * @param {string} formSelector - Form selector
     * @returns {boolean} - True if all inputs are valid
     */
    validateForm(formSelector) {
        const $form = $(formSelector);
        let isValid = true;

        $form.find('input[required]').each(function () {
            const $input = $(this);
            const value = $input.val().trim();
            const inputType = $input.attr('type');

            let inputValid = false;

            if (inputType === 'email') {
                inputValid = AdminSecurityUtils.validateEmail(value);
            } else if (inputType === 'password') {
                inputValid = AdminSecurityUtils.validatePassword(value);
            } else {
                inputValid = value.length > 0;
            }

            AdminInputUtils.setValidationStyle(this, inputValid);
            if (!inputValid) isValid = false;
        });

        return isValid;
    }
};

// Session Storage Manager for Admin Registration
export const AdminSessionManager = {
    /**
     * Store temporary admin data
     * @param {object} data - Data to store
     */
    storeTempData(data) {
        try {
            sessionStorage.setItem('tempAdminData', JSON.stringify({
                ...data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Failed to store admin data:', error);
        }
    },

    /**
     * Get temporary admin data
     * @returns {object|null} - Stored data or null
     */
    getTempData() {
        try {
            const data = sessionStorage.getItem('tempAdminData');
            if (!data) return null;

            const parsed = JSON.parse(data);
            const now = Date.now();
            const maxAge = 30 * 60 * 1000; // 30 minutes

            if (now - parsed.timestamp > maxAge) {
                this.clearTempData();
                return null;
            }

            return parsed;
        } catch (error) {
            console.error('Failed to get admin data:', error);
            return null;
        }
    },

    /**
     * Clear temporary admin data
     */
    clearTempData() {
        try {
            sessionStorage.removeItem('tempAdminData');
            sessionStorage.removeItem('adminEmailForVerification');
        } catch (error) {
            console.error('Failed to clear admin data:', error);
        }
    },

    /**
     * Store email for verification
     * @param {string} email - Email to store
     */
    storeVerificationEmail(email) {
        try {
            sessionStorage.setItem('adminEmailForVerification', email);
        } catch (error) {
            console.error('Failed to store verification email:', error);
        }
    },

    /**
     * Get email for verification
     * @returns {string|null} - Stored email or null
     */
    getVerificationEmail() {
        try {
            return sessionStorage.getItem('adminEmailForVerification');
        } catch (error) {
            console.error('Failed to get verification email:', error);
            return null;
        }
    }
};

// Admin Validation Handlers
export const AdminValidationHandlers = {
    /**
     * Initialize real-time validation for admin forms
     */
    initializeValidation() {
        // Email validation
        $('#adminEmail').on('blur', function () {
            const email = $(this).val().trim();
            const isValid = AdminSecurityUtils.validateEmail(email);
            AdminInputUtils.setValidationStyle(this, isValid);

            if (email && !isValid) {
                $(this).after('<div class="validation-error">Please enter a valid email address</div>');
            } else {
                $(this).siblings('.validation-error').remove();
            }
        });

        // Password validation
        $('#adminPassword, #adminVerifyPassword').on('blur', function () {
            const password = $(this).val();
            const isValid = AdminSecurityUtils.validatePassword(password);
            AdminInputUtils.setValidationStyle(this, isValid);

            if (password && !isValid) {
                const message = '<div class="validation-error">' + AdminSecurityUtils.getPasswordRequirements() + '</div>';
                $(this).after(message);
            } else {
                $(this).siblings('.validation-error').remove();
            }
        });

        // Clear validation errors on focus
        $('input').on('focus', function () {
            $(this).siblings('.validation-error').remove();
            $(this).removeClass('invalid');
        });
    }
};