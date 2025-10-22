// document-upload.js
// Enhanced PDF upload handling with toast notifications

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
        const warnings = [];

        // Check file count first
        if (this.uploadedFiles.length + newFiles.length > this.maxFiles) {
            window.showToast('error', 'Upload Limit', `Maximum ${this.maxFiles} files allowed`);
            return;
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
                warnings.push(`${file.name} is already uploaded`);
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

        // Show errors first
        if (errors.length > 0) {
            errors.forEach(error => {
                window.showToast('error', 'Upload Error', error, 5000);
            });
        }

        // Show warnings
        if (warnings.length > 0) {
            warnings.forEach(warning => {
                window.showToast('warning', 'Duplicate File', warning, 4000);
            });
        }

        // Show success if files were added
        if (newFiles.length > 0 && newFiles.length - errors.length - warnings.length > 0) {
            const added = newFiles.length - errors.length - warnings.length;
            window.showToast('success', 'Files Added', `${added} file${added > 1 ? 's' : ''} uploaded successfully`, 3000);
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
        const file = this.uploadedFiles.find(f => f.id === fileId);
        if (file) {
            this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
            window.showToast('info', 'File Removed', `${file.name} has been removed`, 3000);
            this.updateDisplay();
        }
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

    getUploadedFiles() {
        return this.uploadedFiles;
    }

    // Get files count for validation
    getFileCount() {
        return this.uploadedFiles.length;
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