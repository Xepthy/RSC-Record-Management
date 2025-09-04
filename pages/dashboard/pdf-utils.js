// pdf-utils.js
// Utility functions for PDF document handling and validation

/**
 * PDF validation configuration
 */
export const PDF_CONFIG = {
    maxFileSize: 5 * 1024 * 1024, // 5MB in bytes
    maxFiles: 10,
    allowedMimeTypes: ['application/pdf'],
    allowedExtensions: ['.pdf']
};

/**
 * Validates a single PDF file
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export function validatePDFFile(file) {
    // Check if file exists
    if (!file) {
        return {
            isValid: false,
            error: 'No file provided'
        };
    }

    // Check file type by MIME type
    if (!PDF_CONFIG.allowedMimeTypes.includes(file.type)) {
        return {
            isValid: false,
            error: 'Only PDF files are allowed'
        };
    }

    // Check file extension as backup validation
    const fileName = file.name.toLowerCase();
    const hasValidExtension = PDF_CONFIG.allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
        return {
            isValid: false,
            error: 'File must have .pdf extension'
        };
    }

    // Check file size
    if (file.size > PDF_CONFIG.maxFileSize) {
        const sizeMB = (PDF_CONFIG.maxFileSize / (1024 * 1024)).toFixed(1);
        return {
            isValid: false,
            error: `File size must be less than ${sizeMB}MB`
        };
    }

    // Check if file is empty
    if (file.size === 0) {
        return {
            isValid: false,
            error: 'File is empty'
        };
    }

    // Additional checks for potentially corrupted files
    if (file.size < 100) { // PDFs are rarely smaller than 100 bytes
        return {
            isValid: false,
            error: 'File appears to be corrupted or too small'
        };
    }

    return { isValid: true };
}

/**
 * Validates multiple PDF files
 * @param {Array} files - Array of files to validate
 * @returns {Object} - Validation result with valid files and errors
 */
export function validatePDFFiles(files) {
    const validFiles = [];
    const errors = [];

    if (!files || files.length === 0) {
        return {
            validFiles: [],
            errors: ['No files provided'],
            isValid: false
        };
    }

    // Check total file count
    if (files.length > PDF_CONFIG.maxFiles) {
        errors.push(`Maximum ${PDF_CONFIG.maxFiles} files allowed. You selected ${files.length} files.`);
    }

    // Validate each file
    files.forEach((file, index) => {
        const validation = validatePDFFile(file);

        if (validation.isValid) {
            validFiles.push(file);
        } else {
            errors.push(`File ${index + 1} (${file.name}): ${validation.error}`);
        }
    });

    // Check for duplicate files
    const fileSignatures = new Map();
    const duplicateErrors = [];

    validFiles.forEach((file, index) => {
        const signature = `${file.name}-${file.size}-${file.lastModified || 'unknown'}`;

        if (fileSignatures.has(signature)) {
            duplicateErrors.push(`Duplicate file detected: ${file.name}`);
        } else {
            fileSignatures.set(signature, index);
        }
    });

    errors.push(...duplicateErrors);

    return {
        validFiles: validFiles.filter((file, index) => {
            const signature = `${file.name}-${file.size}-${file.lastModified || 'unknown'}`;
            return fileSignatures.get(signature) === index; // Keep only first occurrence
        }),
        errors,
        isValid: errors.length === 0 && validFiles.length > 0
    };
}

/**
 * Validates document data for form submission
 * @param {Array} documents - Array of document objects from form data
 * @returns {Object} - Validation result with isValid and errors
 */
export function validateDocumentData(documents) {
    const errors = [];

    if (!documents || !Array.isArray(documents)) {
        return {
            isValid: true, // Documents are optional
            errors: []
        };
    }

    // Check file count
    if (documents.length > PDF_CONFIG.maxFiles) {
        errors.push(`Maximum ${PDF_CONFIG.maxFiles} documents allowed`);
    }

    // Validate each document's metadata
    documents.forEach((doc, index) => {
        if (!doc.name || typeof doc.name !== 'string') {
            errors.push(`Document ${index + 1}: Invalid or missing filename`);
        }

        if (!doc.size || typeof doc.size !== 'number' || doc.size <= 0) {
            errors.push(`Document ${index + 1}: Invalid file size`);
        }

        if (doc.size > PDF_CONFIG.maxFileSize) {
            const sizeMB = (PDF_CONFIG.maxFileSize / (1024 * 1024)).toFixed(1);
            errors.push(`Document "${doc.name}" exceeds ${sizeMB}MB limit`);
        }

        if (!doc.type || doc.type !== 'application/pdf') {
            errors.push(`Document "${doc.name}" must be a PDF file`);
        }

        // Validate filename extension
        if (doc.name && !doc.name.toLowerCase().endsWith('.pdf')) {
            errors.push(`Document "${doc.name}" must have .pdf extension`);
        }
    });

    // Check for duplicate document names
    const documentNames = documents.map(doc => doc.name.toLowerCase());
    const duplicateNames = documentNames.filter((name, index) =>
        documentNames.indexOf(name) !== index
    );

    if (duplicateNames.length > 0) {
        const uniqueDuplicates = [...new Set(duplicateNames)];
        errors.push(`Duplicate document names found: ${uniqueDuplicates.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Sanitizes document metadata for safe storage
 * @param {Array} documents - Array of document objects
 * @returns {Array} - Sanitized document array
 */
export function sanitizeDocumentData(documents) {
    if (!documents || !Array.isArray(documents)) {
        return [];
    }

    return documents.map(doc => ({
        name: sanitizeFileName(doc.name),
        size: parseInt(doc.size) || 0,
        type: doc.type || 'application/pdf',
        uploadDate: doc.uploadDate || new Date().toISOString()
    }));
}

/**
 * Sanitizes filename to prevent path traversal and injection attacks
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFileName(filename) {
    if (!filename || typeof filename !== 'string') {
        return 'unnamed_document.pdf';
    }

    return filename
        // Remove path separators
        .replace(/[\/\\]/g, '')
        // Remove dangerous characters
        .replace(/[<>:"|?*]/g, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Limit length
        .substring(0, 255)
        // Ensure it's not empty
        .trim() || 'unnamed_document.pdf';
}

/**
 * Calculates total size of all documents
 * @param {Array} documents - Array of document objects
 * @returns {number} - Total size in bytes
 */
export function calculateTotalSize(documents) {
    if (!documents || !Array.isArray(documents)) {
        return 0;
    }

    return documents.reduce((total, doc) => {
        return total + (parseInt(doc.size) || 0);
    }, 0);
}

/**
 * Formats file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Creates a document summary for form submission
 * @param {Array} documents - Array of document objects
 * @returns {Object} - Document summary
 */
export function createDocumentSummary(documents) {
    const sanitizedDocs = sanitizeDocumentData(documents);
    const totalSize = calculateTotalSize(sanitizedDocs);

    return {
        documents: sanitizedDocs,
        documentCount: sanitizedDocs.length,
        totalDocumentSize: totalSize,
        totalDocumentSizeFormatted: formatFileSize(totalSize)
    };
}