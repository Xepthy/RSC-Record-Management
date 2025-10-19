import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    where,
    auth
} from '../../../firebase-config.js';

class CompletedManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    async setupCompletedListener() {
        try {
            console.log('Setting up completed listener...');
            this.parent.uiRenderer.showLoading();

            const completedQuery = query(
                collection(db, 'completed'),
                orderBy('read', 'asc'),
                orderBy('createdAt', 'desc')
            );


            this.parent.unsubscribeCompleted = onSnapshot(completedQuery, (snapshot) => {
                console.log('Completed snapshot received:', snapshot.size, 'documents');

                // Filter out _init document
                this.parent.completedItems = snapshot.docs
                    .filter(doc => doc.id !== '_init')
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                console.log('Processed completed items:', this.parent.completedItems.length);

                // Update notification count
                this.parent.updateCompletedNotificationCount();

                // Only update UI if we're currently viewing completed
                if ($('#completedNav').hasClass('active')) {
                    this.parent.uiRenderer.showCompletedItems();
                }

            }, (error) => {
                console.error('Error listening to completed:', error);
                this.parent.uiRenderer.showError('Failed to load completed: ' + error.message);
            });

        } catch (error) {
            console.error('Error setting up completed listener:', error);
            this.parent.uiRenderer.showError('Failed to initialize completed: ' + error.message);
        }
    }

    async markAsRead(itemId) {
        try {
            const item = this.parent.completedItems.find(item => item.id === itemId);
            if (!item || item.read) {
                return;
            }

            const itemDocRef = doc(db, 'completed', itemId);
            await updateDoc(itemDocRef, {
                read: true,
            });

            console.log('Completed item marked as read:', itemId);

        } catch (error) {
            console.error('Error marking completed item as read:', error);
        }
    }

    formatServices(services) {
        if (!services || services.length === 0) return 'None';

        if (services.length > 3) {
            return services.slice(0, 2).join(', ') + ` +${services.length - 2} more`;
        }

        return services.join(', ');
    }

    formatDateDisplay(dateString) {
        if (!dateString) return 'Not specified';

        // Assuming completedDate is stored as yyyy-mm-dd
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    showCompletedDetails(itemId) {
        const item = this.parent.completedItems.find(item => item.id === itemId);
        if (!item) return;

        // Build details modal (read-only)
        const clientName = item.clientInfo?.clientName || 'Unknown Client';
        const contact = item.clientInfo?.contact || 'Not provided';
        const location = item.clientInfo?.location || 'Not provided';
        const planName = item.planName || 'Not specified';
        const referenceCode = item.referenceCode || 'N/A';
        const completedDate = this.formatDateDisplay(item.completedDate);
        const services = item.selectedServices?.join(', ') || 'None';
        const contractorName = item.clientInfo?.contractorName || 'None';
        const companyName = item.clientInfo?.companyName || 'None';
        const representative = item.clientInfo?.representative || 'None';
        const repClassification = item.clientInfo?.repClassification || 'None';

        // Build project files HTML
        const projectFilesHTML = this.buildProjectFilesHTML(item.projectFiles);

        const modalHTML = `
        <div id="completedModal" class="modal-overlay">
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3>Completed Project Details</h3>
                    <button class="modal-close" id="modalCloseBtn">×</button>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        
                        <div class="detail-card full-width">
                            <div class="card-header">
                                <h4>Reference Code</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="value" style="font-weight: bold; font-size: 1.1em;">${referenceCode}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Client Information</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Client Name:</span>
                                    <span class="value">${clientName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Contact:</span>
                                    <span class="value">${contact}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Contractor Name:</span>
                                    <span class="value">${contractorName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Company Name:</span>
                                    <span class="value">${companyName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Rep Classification:</span>
                                    <span class="value">${repClassification}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Representative:</span>
                                    <span class="value">${representative}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Project Information</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Plan Name:</span>
                                    <span class="value">${planName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Completed Date:</span>
                                    <span class="value">${completedDate}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Services:</span>
                                    <span class="value">${services}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Location:</span>
                                    <span class="value">${location}</span>
                                </div>
                            </div>
                        </div>
                        <div class="detail-card full-width">
                            <div class="card-header">
                                <h4>Project Files</h4>
                            </div>
                            <div class="card-body">
                                ${projectFilesHTML}
                            </div>
                        </div>

                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" id="closeBtn">Close</button>
                </div>
            </div>
        </div>
        `;

        $('body').append(modalHTML);
        this.setupCompletedModalEventListeners();
    }

    buildProjectFilesHTML(projectFiles) {
        if (!projectFiles || (Array.isArray(projectFiles) && projectFiles.length === 0)) {
            return '<p>No project files available</p>';
        }

        if (!Array.isArray(projectFiles)) {
            projectFiles = [projectFiles];
        }

        // Allow both admin and super_admin to download
        const canDownload = this.parent.isAdmin || this.parent.isSuperAdmin;

        const filesHTML = projectFiles.map((file, index) => `
            <div class="project-file-item">
                <span>📄 ${file.name}</span>
                <div class="file-actions">
                    <button class="view-file-btn" data-storage="${file.storagePath || ''}" data-url="${file.url || ''}" data-name="${file.name}">View File</button>
                    ${canDownload ? `<button class="download-btn" onclick="window.completedManager.handleDownloadFile('${file.storagePath || ''}', '${file.url || ''}', '${file.name}')">Download</button>` : ''}
                </div>
            </div>
        `).join('');

        // Add event listener for view buttons
        setTimeout(() => {
            $('.view-file-btn').off('click').on('click', async function (e) {
                e.preventDefault();
                const storagePath = $(this).data('storage');
                const url = $(this).data('url');
                const name = $(this).data('name');
                await window.completedManager.handleViewFileModal(storagePath, url, name);
            });
        }, 0);

        return filesHTML;
    }

    setupCompletedModalEventListeners() {
        // Expose manager for onclick handlers
        window.completedManager = this;

        $('#modalCloseBtn, #closeBtn').on('click', () => {
            $('#completedModal').remove();
            delete window.completedManager; // Clean up
        });
    }

    async handleViewFileModal(storagePath, url, fileName) {
        try {
            let fileUrl = url;

            // If no direct URL, get it from storage path
            if (!fileUrl && storagePath) {
                try {
                    const { ref, getDownloadURL, storage } = await import('../../../firebase-config.js');
                    const storageRef = ref(storage, storagePath);
                    fileUrl = await getDownloadURL(storageRef);
                } catch (err) {
                    console.warn('getDownloadURL failed for', storagePath, err);
                    alert('Failed to load file URL');
                    return;
                }
            }

            if (!fileUrl) {
                alert("File URL not found.");
                return;
            }

            // Extract clean filename (remove timestamp prefix if exists)
            let cleanFileName = fileName;
            if (fileName.includes('_')) {
                const parts = fileName.split('_');
                // Check if first part is timestamp (numbers and dots)
                if (/^[\d.]+$/.test(parts[0])) {
                    cleanFileName = parts.slice(1).join('_');
                }
            }

            const fileExt = (cleanFileName.split('.').pop() || '').toLowerCase();

            // Only allow PDF files
            if (fileExt === 'pdf') {
                const viewerUrl = fileUrl.includes('#') ? fileUrl : (fileUrl + '#toolbar=0&navpanes=0');

                // Use window.showDocumentViewer if available
                if (typeof window.showDocumentViewer === 'function') {
                    window.showDocumentViewer(viewerUrl, cleanFileName, { autoSize: true });
                } else {
                    // Fallback: open in new tab
                    window.open(viewerUrl, '_blank');
                }
            } else {
                alert("Unsupported file type. Only PDF files are allowed.");
            }
        } catch (error) {
            console.error('Error opening document:', error);
            alert('Failed to open document. Please try again.');
        }
    }

    async handleViewFile(storagePath, legacyUrl) {
        try {
            let downloadURL;

            if (legacyUrl) {
                downloadURL = legacyUrl;
            } else if (storagePath) {
                const { ref, getDownloadURL } = await import('../../../firebase-config.js');
                const { storage } = await import('../../../firebase-config.js');
                const fileRef = ref(storage, storagePath);
                downloadURL = await getDownloadURL(fileRef);
            } else {
                throw new Error('No file path or URL available');
            }

            window.open(downloadURL, '_blank');
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Unable to open file');
        }
    }

    async handleDownloadFile(storagePath, legacyUrl, fileName) {
        try {
            if (!storagePath) {
                throw new Error('Storage path not available');
            }

            // Call Cloud Function to download with proper headers
            const functionUrl = `https://asia-southeast1-rsc-2025.cloudfunctions.net/downloadFile?storagePath=${encodeURIComponent(storagePath)}&fileName=${encodeURIComponent(fileName)}`;

            // Create link and trigger download
            const link = document.createElement('a');
            link.href = functionUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('File download initiated:', fileName);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file. Please try again.');
        }
    }

}



export default CompletedManager;