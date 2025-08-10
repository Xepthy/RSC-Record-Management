// securityUtils.js
// Utility functions for input validation and security

/**
 * Sanitizes user input by removing potentially harmful content
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    return input
        .trim()
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove other potentially harmful tags
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*>/gi, '')
        // Remove javascript: protocols
        .replace(/javascript:/gi, '')
        // Remove on* event handlers
        .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
}

/**
 * Validates form data with comprehensive checks
 * @param {Object} formData - The form data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export function validateFormData(formData) {
    const errors = [];

    // Required field validation
    const requiredFields = ['requestDescription', 'clientName', 'location', 'contact'];
    requiredFields.forEach(field => {
        if (!formData[field] || formData[field].trim() === '') {
            errors.push(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`);
        }
    });

    // Length validation
    const lengthLimits = {
        requestDescription: 500,
        clientName: 100,
        representative: 100,
        location: 200,
        contact: 11,
        remarks: 1000
    };

    Object.keys(lengthLimits).forEach(field => {
        if (formData[field] && formData[field].length > lengthLimits[field]) {
            errors.push(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} must be less than ${lengthLimits[field]} characters`);
        }
    });

    // Phone number validation - only numbers, exactly 11 digits
    if (formData.contact) {
        const phoneRegex = /^\d{11}$/;
        if (!phoneRegex.test(formData.contact)) {
            errors.push('Contact number must be exactly 11 digits (numbers only)');
        }
    }

    // Name validation (no numbers or special chars except spaces, hyphens, apostrophes)
    if (formData.clientName) {
        const nameRegex = /^[a-zA-Z\s\-\'\.]+$/;
        if (!nameRegex.test(formData.clientName)) {
            errors.push('Client name contains invalid characters');
        }
    }

    // Representative name validation (only if representative field is not empty/disabled)
    if (formData.representative && formData.representative.trim() !== '' && formData.representative !== 'None') {
        const nameRegex = /^[a-zA-Z\s\-\'\.]+$/;
        if (!nameRegex.test(formData.representative)) {
            errors.push('Representative name contains invalid characters');
        }
    }

    // Services validation
    if (!formData.selectedServices || formData.selectedServices.length === 0) {
        errors.push('At least one service must be selected');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Sanitizes all form data fields
 * @param {Object} formData - The form data to sanitize
 * @returns {Object} - Sanitized form data
 */
export function sanitizeFormData(formData) {
    const sanitized = {};

    // Sanitize string fields
    const stringFields = ['requestDescription', 'clientName', 'representative', 'location', 'contact', 'remarks'];
    stringFields.forEach(field => {
        if (formData[field]) {
            sanitized[field] = sanitizeInput(formData[field]);
        } else {
            sanitized[field] = formData[field];
        }
    });

    // Copy non-string fields as is
    const otherFields = ['classification', 'repClassification', 'selectedServices', 'dateSubmitted', 'status', 'lastUpdated'];
    otherFields.forEach(field => {
        sanitized[field] = formData[field];
    });

    return sanitized;
}

/**
 * Rate limiting utility using local storage alternative (in-memory)
 */
class RateLimiter {
    constructor() {
        this.attempts = new Map();
        this.maxAttempts = 5;
        this.timeWindow = 60000; // 1 minute
    }

    /**
     * Check if user can make a request
     * @param {string} userId - User identifier
     * @returns {Object} - Rate limit status
     */
    canMakeRequest(userId) {
        const now = Date.now();
        const userAttempts = this.attempts.get(userId) || [];

        // Remove old attempts outside the time window
        const recentAttempts = userAttempts.filter(time => now - time < this.timeWindow);

        if (recentAttempts.length >= this.maxAttempts) {
            const oldestAttempt = Math.min(...recentAttempts);
            const timeUntilReset = this.timeWindow - (now - oldestAttempt);

            return {
                allowed: false,
                timeUntilReset: Math.ceil(timeUntilReset / 1000), // in seconds
                message: `Too many requests. Please wait ${Math.ceil(timeUntilReset / 1000)} seconds.`
            };
        }

        return { allowed: true };
    }

    /**
     * Record a request attempt
     * @param {string} userId - User identifier
     */
    recordAttempt(userId) {
        const now = Date.now();
        const userAttempts = this.attempts.get(userId) || [];

        // Add current attempt and clean old ones
        userAttempts.push(now);
        const recentAttempts = userAttempts.filter(time => now - time < this.timeWindow);

        this.attempts.set(userId, recentAttempts);
    }
}

// Create a singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Generic error handler for user-facing messages
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
export function handleError(error) {
    console.error('Error details:', error);

    // Firebase-specific errors
    if (error.code) {
        switch (error.code) {
            case 'permission-denied':
                return 'You do not have permission to perform this action.';
            case 'unavailable':
                return 'Service is temporarily unavailable. Please try again later.';
            case 'unauthenticated':
                return 'Please log in to continue.';
            case 'quota-exceeded':
                return 'Service limit exceeded. Please try again later.';
            default:
                return 'An error occurred while processing your request.';
        }
    }

    // Network errors
    if (error.name === 'NetworkError' || error.message.includes('network')) {
        return 'Network error. Please check your connection and try again.';
    }

    // Default generic message
    return 'Something went wrong. Please try again.';
}

/**
 * Validates specific field types
 */
export const fieldValidators = {
    email: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    phone: (phone) => {
        const phoneRegex = /^\d{11}$/;
        return phoneRegex.test(phone);
    },

    name: (name) => {
        const nameRegex = /^[a-zA-Z\s\-\'\.]+$/;
        return nameRegex.test(name);
    }
};