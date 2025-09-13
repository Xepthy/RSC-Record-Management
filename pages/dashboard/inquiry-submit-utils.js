// inquiry-submit-utils.js
// Improved form validation and security

export function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
}

export function validateFormData(formData) {
    const errors = [];

    // Required text fields validation
    const requiredFields = {
        requestDescription: 'Request Description',
        clientName: 'Client Name',
        location: 'Location',
        contact: 'Contact No.'
    };

    Object.entries(requiredFields).forEach(([field, displayName]) => {
        if (!formData[field] || !formData[field].trim()) {
            errors.push(`${displayName} is required`);
        }
    });

    // Classification validation - must not be empty or "noValue"
    if (!formData.classification ||
        formData.classification.trim() === '' ||
        formData.classification === 'noValue') {
        errors.push('Classification is required');
    }

    // If classification is "Others", check if custom value is provided
    if (formData.classification === 'Others') {
        const customClassification = $('#classificationCustom').val();
        if (!customClassification || !customClassification.trim()) {
            errors.push('Please specify the classification when "Others" is selected');
        }
    }

    // Representative validation logic
    const isRepEnabled = !$('#representative').prop('disabled');
    const hasRepresentative = formData.representative &&
        formData.representative !== 'None' &&
        formData.representative.trim();

    if (isRepEnabled) {
        // If representative checkbox is enabled, representative field is required
        if (!hasRepresentative) {
            errors.push('Representative name is required when representative is enabled');
        }

        // Rep classification validation when representative is enabled
        if (!formData.repClassification ||
            formData.repClassification === 'noValue' ||
            formData.repClassification === 'None') {
            errors.push('Representative Classification is required when representative is enabled');
        }

        // If rep classification is "Others", check custom value
        if (formData.repClassification === 'Others') {
            const customRepClassification = $('#repClassificationCustom').val();
            if (!customRepClassification || !customRepClassification.trim()) {
                errors.push('Please specify the representative classification when "Others" is selected');
            }
        }
    }

    // Phone validation - must be exactly 11 digits
    if (formData.contact) {
        const contactTrimmed = formData.contact.trim();
        if (!/^\d{11}$/.test(contactTrimmed)) {
            errors.push('Contact number must be exactly 11 digits');
        }
    }

    // Name validation - only letters, spaces, hyphens, apostrophes, and dots
    const nameRegex = /^[a-zA-Z\s\-\'\.]+$/;

    if (formData.clientName && formData.clientName.trim()) {
        if (!nameRegex.test(formData.clientName.trim())) {
            errors.push('Client name contains invalid characters (only letters, spaces, hyphens, apostrophes, and dots allowed)');
        }
    }

    // Representative name validation (only if representative is provided)
    if (hasRepresentative) {
        if (!nameRegex.test(formData.representative.trim())) {
            errors.push('Representative name contains invalid characters (only letters, spaces, hyphens, apostrophes, and dots allowed)');
        }
    }

    // Services validation - at least one service must be selected
    if (!formData.selectedServices || formData.selectedServices.length === 0) {
        errors.push('At least one service must be selected');
    }

    // Documents validation - AT LEAST ONE DOCUMENT IS REQUIRED
    if (!formData.documents || formData.documents.length === 0) {
        errors.push('At least one document must be uploaded');
    } else {
        if (formData.documents.length > 3) {
            errors.push('Maximum 3 documents allowed');
        }

        formData.documents.forEach((doc, index) => {
            if (!doc.name || !doc.name.toLowerCase().endsWith('.pdf')) {
                errors.push(`Document ${index + 1} must be a PDF file`);
            }
            if (doc.size && doc.size > 5 * 1024 * 1024) { // 5MB limit
                errors.push(`Document "${doc.name}" exceeds 5MB size limit`);
            }
        });
    }

    // Request description length validation (optional - you can adjust or remove)
    if (formData.requestDescription && formData.requestDescription.trim().length < 10) {
        errors.push('Request description must be at least 10 characters long');
    }

    // Location validation (basic check)
    if (formData.location && formData.location.trim().length < 3) {
        errors.push('Location must be at least 3 characters long');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export function sanitizeFormData(formData) {
    const sanitized = {};

    // Sanitize text fields
    ['requestDescription', 'clientName', 'representative', 'location', 'contact', 'remarks', 'classification', 'repClassification'].forEach(field => {
        sanitized[field] = formData[field] ? sanitizeInput(formData[field]) : formData[field];
    });

    // Copy other fields as-is
    ['selectedServices', 'dateSubmitted', 'status', 'lastUpdated', 'documents', 'documentCount', 'projectFiles'].forEach(field => {
        sanitized[field] = formData[field];
    });

    return sanitized;
}

// Simple rate limiter
class RateLimiter {
    constructor() {
        this.attempts = new Map();
        this.maxAttempts = 5;
        this.timeWindow = 60000; // 1 minute
    }

    canMakeRequest(userId) {
        const now = Date.now();
        const userAttempts = this.attempts.get(userId) || [];
        const recentAttempts = userAttempts.filter(time => now - time < this.timeWindow);

        if (recentAttempts.length >= this.maxAttempts) {
            const timeUntilReset = Math.ceil((this.timeWindow - (now - Math.min(...recentAttempts))) / 1000);
            return {
                allowed: false,
                message: `Too many requests. Please wait ${timeUntilReset} seconds.`
            };
        }

        return { allowed: true };
    }

    recordAttempt(userId) {
        const now = Date.now();
        const userAttempts = this.attempts.get(userId) || [];
        userAttempts.push(now);
        const recentAttempts = userAttempts.filter(time => now - time < this.timeWindow);
        this.attempts.set(userId, recentAttempts);
    }
}

export const rateLimiter = new RateLimiter();

export function handleError(error) {
    console.error('Error:', error);

    if (error.code) {
        switch (error.code) {
            case 'permission-denied': return 'Permission denied';
            case 'unavailable': return 'Service temporarily unavailable';
            case 'unauthenticated': return 'Please log in';
            default: return 'An error occurred';
        }
    }

    return 'Something went wrong. Please try again.';
}