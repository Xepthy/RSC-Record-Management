// document-upload.js
// Simplified PDF upload handling

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

            // Store minimal data only
            this.uploadedFiles.push({
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                uploadDate: new Date().toISOString()
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
            <div class="uploaded-file-item">
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button type="button" class="remove-file-btn" onclick="window.documentUpload.removeFile(${file.id})">×</button>
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

    clearAllFiles() {
        this.uploadedFiles = [];
        this.updateDisplay();
    }
}

// Initialize
$(document).ready(() => {
    window.documentUpload = new DocumentUpload();

    // Add minimal styles
    if (!$('#documentUploadStyles').length) {
        $('head').append(`
            <style id="documentUploadStyles">
                .upload-btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-bottom: 10px; }
                .upload-btn:hover { background: #0056b3; }
                .uploaded-files-list { border: 1px solid #ddd; border-radius: 4px; min-height: 50px; padding: 10px; margin-top: 5px; }
                .files-header { font-weight: bold; margin-bottom: 10px; color: #333; }
                .uploaded-file-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #eee; border-radius: 3px; margin-bottom: 5px; background: #f9f9f9; }
                .file-info { display: flex; flex-direction: column; flex-grow: 1; }
                .file-name { font-weight: 500; color: #333; }
                .file-size { font-size: 0.85em; color: #666; }
                .remove-file-btn { background: #dc3545; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; }
                .remove-file-btn:hover { background: #c82333; }
                .no-files { text-align: center; color: #666; font-style: italic; margin: 20px 0; }
            </style>
        `);
    }
});

export { DocumentUpload };