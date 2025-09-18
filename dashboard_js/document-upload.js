// document-upload.js
// Enhanced PDF upload handling with raw file storage

class DocumentUpload {
    constructor() {
        this.uploadedFiles = [];
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.maxFiles = 3;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        $('#uploadDocumentsBtn').on('click', () => {
            $('#documentUpload').click();
        });

        $('#documentUpload').on('change', (e) => {
            this.handleFileSelection(e.target.files);
        });
    }

    handleFileSelection(files) {
        const newFiles = Array.from(files);
        const errors = [];

        // Check file count first
        if (this.uploadedFiles.length + newFiles.length > this.maxFiles) {
            errors.push(`Maximum ${this.maxFiles} files allowed`);
            return this.showErrors(errors);
        }

        // Validate and add files
        newFiles.forEach(file => {
            const error = this.validateFile(file);
            if (error) {
                errors.push(`${file.name}: ${error}`);
                return;
            }

            // Check for duplicates
            if (this.uploadedFiles.find(f => f.name === file.name && f.size === file.size)) {
                errors.push(`${file.name} is already uploaded`);
                return;
            }

            // Store file data INCLUDING raw file for upload
            this.uploadedFiles.push({
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                uploadDate: new Date().toISOString(),
                rawFile: file // Store the actual File object for upload
            });
        });

        if (errors.length > 0) {
            this.showErrors(errors);
        }

        $('#documentUpload').val('');
        this.updateDisplay();
    }

    validateFile(file) {
        if (file.type !== 'application/pdf') return 'Only PDF files allowed';
        if (file.size === 0) return 'File is empty';
        if (file.size > this.maxFileSize) return 'File exceeds 5MB limit';
        if (!file.name.toLowerCase().endsWith('.pdf')) return 'Must be a PDF file';
        return null;
    }

    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
        this.updateDisplay();
    }

    updateDisplay() {
        const container = $('#uploadedFilesList');

        if (this.uploadedFiles.length === 0) {
            container.html('<p class="no-files">No documents uploaded</p>');
            return;
        }

        const html = this.uploadedFiles.map(file => `
        <div class="file-item">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            <button type="button" class="remove-btn" onclick="window.documentUpload.removeFile(${file.id})">×</button>
        </div>
    `).join('');

        container.html(`
        <div class="files-header">Uploaded Documents (${this.uploadedFiles.length}/${this.maxFiles})</div>
        ${html}
    `);
    }

    showErrors(errors) {
        alert('Upload errors:\n• ' + errors.join('\n• '));
    }

    getUploadedFiles() {
        return this.uploadedFiles;
    }

    // Get files count for validation
    getFileCount() {
        return this.uploadedFiles.length;
    }

    clearAllFiles() {
        this.uploadedFiles = [];
        this.updateDisplay();
    }

    // Check if any files are uploaded
    hasFiles() {
        return this.uploadedFiles.length > 0;
    }
}

// Initialize
$(document).ready(() => {
    window.documentUpload = new DocumentUpload();
});

export { DocumentUpload };