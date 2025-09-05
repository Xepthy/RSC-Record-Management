// inquiry-submit-utils.js
// Simplified form validation and security

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

    // Required fields
    ['requestDescription', 'clientName', 'location', 'contact'].forEach(field => {
        if (!formData[field]?.trim()) {
            errors.push(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`);
        }
    });

    // Classification
    if (!formData.classification?.trim()) {
        errors.push('Classification is required');
    }

    // Phone validation
    if (formData.contact && !/^\d{11}$/.test(formData.contact)) {
        errors.push('Contact must be exactly 11 digits');
    }

    // Name validation
    const nameRegex = /^[a-zA-Z\s\-\'\.]+$/;
    if (formData.clientName && !nameRegex.test(formData.clientName)) {
        errors.push('Client name contains invalid characters');
    }

    // Representative validation
    if (formData.representative && formData.representative !== 'None' && formData.representative.trim()) {
        if (!nameRegex.test(formData.representative)) {
            errors.push('Representative name contains invalid characters');
        }
        if (!formData.repClassification || formData.repClassification === 'None') {
            errors.push('Representative classification is required');
        }
    }

    // Services
    if (!formData.selectedServices?.length) {
        errors.push('At least one service must be selected');
    }

    // Documents validation
    if (formData.documents?.length) {
        if (formData.documents.length > 3) {
            errors.push('Maximum 3 documents allowed');
        }

        formData.documents.forEach(doc => {
            if (!doc.name?.endsWith('.pdf')) {
                errors.push(`${doc.name} must be a PDF file`);
            }
            if (doc.size > 5 * 1024 * 1024) {
                errors.push(`${doc.name} exceeds 5MB limit`);
            }
        });
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
    ['selectedServices', 'dateSubmitted', 'status', 'lastUpdated', 'documents', 'documentCount'].forEach(field => {
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