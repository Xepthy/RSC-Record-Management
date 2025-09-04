// document-upload.js
// Handle document upload functionality for PDF files only

class DocumentUpload {
    constructor() {
        this.uploadedFiles = [];
        this.maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
        this.allowedTypes = ['application/pdf'];
        this.maxFiles = 3; // Maximum number of files allowed

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Upload button click event
        $('#uploadDocumentsBtn').on('click', () => {
            $('#documentUpload').click();
        });

        // File input change event
        $('#documentUpload').on('change', (e) => {
            this.handleFileSelection(e.target.files);
        });
    }

    handleFileSelection(files) {
        const newFiles = Array.from(files);
        const validFiles = [];
        const errors = [];

        // Check each file
        newFiles.forEach((file, index) => {
            const validation = this.validateFile(file);

            if (validation.isValid) {
                // Check if file already exists
                const existingFile = this.uploadedFiles.find(f =>
                    f.name === file.name && f.size === file.size
                );

                if (!existingFile) {
                    validFiles.push(file);
                } else {
                    errors.push(`File "${file.name}" is already uploaded`);
                }
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        });

        // Check total file count
        if (this.uploadedFiles.length + validFiles.length > this.maxFiles) {
            const allowedNewFiles = this.maxFiles - this.uploadedFiles.length;
            errors.push(`Maximum ${this.maxFiles} files allowed. You can add ${allowedNewFiles} more files.`);
            return;
        }

        // Add valid files
        validFiles.forEach(file => {
            this.addFileToList(file);
        });

        // Show errors if any
        if (errors.length > 0) {
            alert('Upload errors:\n• ' + errors.join('\n• '));
        }

        // Clear the input
        $('#documentUpload').val('');

        // Update display
        this.updateFileDisplay();
    }

    validateFile(file) {
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            return {
                isValid: false,
                error: 'Only PDF files are allowed'
            };
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            const sizeMB = (this.maxFileSize / (1024 * 1024)).toFixed(1);
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

        return { isValid: true };
    }

    addFileToList(file) {
        const fileData = {
            id: Date.now() + Math.random(), // Simple unique ID
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            uploadDate: new Date()
        };

        this.uploadedFiles.push(fileData);
    }

    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(file => file.id !== fileId);
        this.updateFileDisplay();
    }

    updateFileDisplay() {
        const container = $('#uploadedFilesList');
        container.empty();

        if (this.uploadedFiles.length === 0) {
            container.html('<p class="no-files">No documents uploaded</p>');
            return;
        }

        const fileListHtml = this.uploadedFiles.map(file => {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            return `
                <div class="uploaded-file-item" data-file-id="${file.id}">
                    <div class="file-info">
                        <span class="file-name" title="${file.name}">${this.truncateFileName(file.name, 30)}</span>
                        <span class="file-size">${fileSizeMB} MB</span>
                    </div>
                    <button type="button" class="remove-file-btn" data-file-id="${file.id}">×</button>
                </div>
            `;
        }).join('');

        container.html(`
            <div class="files-header">
                <span>Uploaded Documents (${this.uploadedFiles.length}/${this.maxFiles})</span>
            </div>
            ${fileListHtml}
        `);

        // Add remove button event listeners
        container.find('.remove-file-btn').on('click', (e) => {
            const fileId = parseInt(e.target.dataset.fileId);
            this.removeFile(fileId);
        });
    }

    truncateFileName(fileName, maxLength) {
        if (fileName.length <= maxLength) return fileName;

        const extension = fileName.substring(fileName.lastIndexOf('.'));
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';

        return truncatedName + extension;
    }

    getUploadedFiles() {
        return this.uploadedFiles.map(fileData => ({
            name: fileData.name,
            size: fileData.size,
            type: fileData.type,
            uploadDate: fileData.uploadDate,
            file: fileData.file 
        }));
    }

    // Clear all uploaded files (for form reset)
    clearAllFiles() {
        this.uploadedFiles = [];
        this.updateFileDisplay();
    }

    // Get total size of all uploaded files
    getTotalSize() {
        return this.uploadedFiles.reduce((total, file) => total + file.size, 0);
    }

    // Get formatted total size
    getFormattedTotalSize() {
        const totalBytes = this.getTotalSize();
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        return `${totalMB} MB`;
    }
}

// Initialize document upload when DOM is ready
$(document).ready(function () {
    // Create global instance
    window.documentUpload = new DocumentUpload();

    // Add some basic styles if they don't exist
    if (!$('#documentUploadStyles').length) {
        $('head').append(`
            <style id="documentUploadStyles">
                .upload-btn {
                    background-color: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-bottom: 10px;
                }
                
                .upload-btn:hover {
                    background-color: #0056b3;
                }
                
                .uploaded-files-list {
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    min-height: 50px;
                    padding: 10px;
                    margin-top: 5px;
                }
                
                .files-header {
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #333;
                }
                
                .uploaded-file-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    border: 1px solid #eee;
                    border-radius: 3px;
                    margin-bottom: 5px;
                    background-color: #f9f9f9;
                }
                
                .file-info {
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                }
                
                .file-name {
                    font-weight: 500;
                    color: #333;
                }
                
                .file-size {
                    font-size: 0.85em;
                    color: #666;
                }
                
                .remove-file-btn {
                    background-color: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    font-size: 16px;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .remove-file-btn:hover {
                    background-color: #c82333;
                }
                
                .no-files {
                    text-align: center;
                    color: #666;
                    font-style: italic;
                    margin: 20px 0;
                }
                
                .file-info {
                    font-size: 0.85em;
                    color: #666;
                    margin-top: 5px;
                }
            </style>
        `);
    }
});

// Export the class if needed
export { DocumentUpload };