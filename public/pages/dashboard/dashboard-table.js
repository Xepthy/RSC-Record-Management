// dashboard-table.js (jQuery Version) - Updated with Document Viewer Modal
import {
    db,
    auth,
    collection,
    getDocs,
    doc,
    getDoc,
    onSnapshot,
    query,
    orderBy,
    updateDoc,
    ref,
    storage,
    uploadBytes,
    getDownloadURL
} from '../../firebase-config.js';

let currentUser = null;
let unsubscribe = null;
let userAccountData = null; // Cache user account data
window.userAccountData = null; // Make it globally accessible
// Initialize dashboard table
async function initDashboardTable() {
    try {
        currentUser = auth.currentUser;
        if (!currentUser) {
            console.error('User not authenticated');
            return;
        }

        // Load user account data first
        await loadUserAccountData();

        // Load initial data
        await loadInquiries();

        // Set up real-time listener
        setupRealtimeListener();

    } catch (error) {
        console.error('Error initializing dashboard table:', error);
        showError('Failed to load inquiries');
    }
}

// Load user account data
async function loadUserAccountData() {
    try {
        const userDocRef = doc(db, 'client', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            userAccountData = userDocSnap.data();
            window.userAccountData = userAccountData;
        } else {
            console.warn('User account data not found');
            userAccountData = null;
            window.userAccountData = null;
        }
    } catch (error) {
        console.error('Error loading user account data:', error);
        userAccountData = null;
        window.userAccountData = null;
    }
}

async function loadInquiries() {
    try {
        showLoading();

        const userDocRef = doc(db, 'client', currentUser.uid);
        const pendingCollectionRef = collection(userDocRef, 'pending');
        const q = query(pendingCollectionRef, orderBy('dateSubmitted', 'desc'));

        const querySnapshot = await getDocs(q);
        const inquiries = [];

        querySnapshot.forEach((doc) => {
            inquiries.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderTable(inquiries);

    } catch (error) {
        console.error('Error loading inquiries:', error);
        showError('Failed to load inquiries');
    }
}

function setupRealtimeListener() {
    try {
        const userDocRef = doc(db, 'client', currentUser.uid);
        const pendingCollectionRef = collection(userDocRef, 'pending');
        const q = query(pendingCollectionRef, orderBy('dateSubmitted', 'desc'));

        // Set up real-time listener
        unsubscribe = onSnapshot(q, (querySnapshot) => {
            const inquiries = [];
            querySnapshot.forEach((doc) => {
                inquiries.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            renderTable(inquiries);
        }, (error) => {
            console.error('Error in real-time listener:', error);
        });

    } catch (error) {
        console.error('Error setting up real-time listener:', error);
    }
}

function renderTable(inquiries) {
    // Clear all table bodies
    $('#pendingTableBody, #completedTableBody, #rejectedTableBody').empty();

    // If there are no inquiries at all
    if (inquiries.length === 0) {
        showEmptyState('#pendingTableBody'); // with sub message
        showEmptyState('#completedTableBody', 'No completed inquiries', ''); // no sub message
        showEmptyState('#rejectedTableBody', 'No rejected inquiries', ''); // no sub message
        return;
    }

    // Separate inquiries by status
    const pendingInquiries = inquiries.filter(inq =>
        inq.status === 'pending' ||
        inq.status === 'Reviewing' ||
        inq.status === 'Update Documents' ||
        inq.status === 'Approved'
    );
    const completedInquiries = inquiries.filter(inq =>
        inq.status === 'Completed' || inq.status === 'completed'
    );
    const rejectedInquiries = inquiries.filter(inq =>
        inq.status === 'Rejected'
    );

    // Pending
    if (pendingInquiries.length > 0) {
        pendingInquiries.forEach(inquiry => {
            const row = createTableRow(inquiry);
            $('#pendingTableBody').append(row);
        });
    } else {
        showEmptyState('#pendingTableBody', 'No pending inquiries');
    }

    // Completed
    if (completedInquiries.length > 0) {
        completedInquiries.forEach(inquiry => {
            const row = createTableRow(inquiry);
            $('#completedTableBody').append(row);
        });
    } else {
        showEmptyState('#completedTableBody', 'No completed inquiries', '');
    }

    // Rejected
    if (rejectedInquiries.length > 0) {
        rejectedInquiries.forEach(inquiry => {
            const row = createTableRow(inquiry);
            $('#rejectedTableBody').append(row);
        });
    } else {
        showEmptyState('#rejectedTableBody', 'No rejected inquiries', '');
    }
}

function createTableRow(inquiry) {
    const dateSubmitted = formatDate(inquiry.dateSubmitted);
    const lastUpdated = formatDate(inquiry.lastUpdated);
    const requestTitle = truncateText(inquiry.requestDescription, 50);

    // Assign special class for "In Progress"
    const statusClass = inquiry.status === 'In Progress' ? 'status-in-progress' : inquiry.status.toLowerCase();

    const buttons = inquiry.status === 'Update Documents' ?
        `<button class="edit-btn" data-inquiry-id="${inquiry.id}">Update</button>
         <button class="view-btn" data-inquiry-id="${inquiry.id}">View</button>` :
        `<button class="view-btn" data-inquiry-id="${inquiry.id}">View</button>`;

    const row = $(`
        <tr>
            <td title="${inquiry.requestDescription || ''}">${requestTitle}</td>
            <td>${dateSubmitted}</td>
            <td><span class="${statusClass}">${formatStatus(inquiry.status)}</span></td>
            <td>${lastUpdated}</td>
            <td>${inquiry.remarks || 'No remarks'}</td>
            <td>${buttons}</td>
        </tr>
    `);

    return row;
}

function formatDate(dateValue) {
    if (!dateValue) return 'N/A';

    try {
        let date;

        // Firestore Timestamp object (has .toDate())
        if (dateValue.toDate) {
            date = dateValue.toDate();
        }
        // Already a JS Date
        else if (dateValue instanceof Date) {
            date = dateValue;
        }
        // String or number
        else {
            date = new Date(dateValue);
        }

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Date formatting error:', error, dateValue);
        return 'Invalid Date';
    }
}


function formatStatus(status) {
    if (!status) return 'Unknown';

    // Capitalize first letter
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

async function viewInquiry(inquiryId) {
    try {
        // Debug: Check if userAccountData is available
        // console.log('userAccountData when viewing inquiry:', userAccountData);
        // console.log('userAccountData mobileNumber:', userAccountData?.mobileNumber);

        // Get inquiry details
        const userDocRef = doc(db, 'client', currentUser.uid);
        const pendingCollectionRef = collection(userDocRef, 'pending');
        const inquiryDoc = await getDocs(query(pendingCollectionRef));

        let inquiryData = null;
        inquiryDoc.forEach(doc => {
            if (doc.id === inquiryId) {
                inquiryData = { id: doc.id, ...doc.data() };
            }
        });

        if (!inquiryData) {
            alert('Inquiry not found');
            return;
        }

        // Show modal with both inquiry and account data
        showInquiryModal(inquiryData, userAccountData);

    } catch (error) {
        console.error('Error showing inquiry details:', error);
        alert('Failed to load inquiry details');
    }
}

function showInquiryModal(inquiry, accountData) {
    const servicesText = inquiry.selectedServices ? inquiry.selectedServices.join(', ') : 'None';
    const documentsText = inquiry.documents && inquiry.documents.length > 0
        ? inquiry.documents.map((doc, index) =>
            `<a href="#" class="document-link" data-doc-url="${doc.url}" data-doc-name="${doc.name}" data-doc-index="${index}">
                <i class="fas fa-file-pdf"></i> ${doc.name}
            </a>`
        ).join('<br>')
        : 'No documents';

    const projectFiles = (inquiry.status === 'Completed' || inquiry.status === 'completed') && inquiry.projectFiles && inquiry.projectFiles.length > 0
        ? inquiry.projectFiles.map(file => {
            return `<button class="view-project-file-btn" 
                        data-storage-path="${file.storagePath || ''}" 
                        data-file-url="${file.url || ''}" 
                        data-file-name="${file.name}">${file.name}</button>`;
        }).join('<br>')
        : (inquiry.status === 'Completed' ? 'No Project Files Yet' : ''); // empty for non-completed

    // Format account data with fallbacks
    const firstName = accountData?.firstName || 'N/A';
    const middleName = accountData?.middleName || 'N/A';
    const lastName = accountData?.lastName || 'N/A';
    const contactNo = accountData?.mobileNumber || 'N/A';
    const classification = accountData?.classification || 'N/A';
    const email = accountData?.email || 'N/A';
    const suffix = accountData?.suffix || 'N/A';

    const modalHtml = `
    <div class="modal inquiry-modal" id="inquiryDetailsModal">
    <div class="modal-content">
        <span class="close-btn inquiry-close">&times;</span>
        <h2>Inquiry Details</h2>

        <div class="inquiry-details">
        <h3 class="account-toggle">
            <span>Account Information</span>
            <span class="dropdown-arrow">▼</span>
        </h3>
        <div class="account-content">
            <div class="inquiry-grid">
            <p><strong>First Name:</strong> ${firstName}</p>
            <p><strong>Middle Name:</strong> ${middleName}</p>
            <p><strong>Last Name:</strong> ${lastName}</p>
            <p><strong>Suffix:</strong> ${suffix}</p>
            <p><strong>Contact No.:</strong> ${contactNo}</p>
            <p><strong>Classification:</strong> ${classification}</p>
            <p><strong>Email:</strong> ${email}</p>
            </div>
        </div>

        <h3>Client Basic Information</h3>
        <div class="inquiry-box">
            <p><strong>Client Name:</strong> ${inquiry.clientName || 'N/A'}</p>
            <p><strong>Classification:</strong> ${inquiry.classification || 'N/A'}</p>
            <p><strong>Representative:</strong> ${inquiry.representative || 'None'}</p>
            <p><strong>Rep. Classification:</strong> ${inquiry.repClassification || 'N/A'}</p>
            <p><strong>Contractor Name:</strong> ${inquiry.contractorName || 'None'}</p>
            <p><strong>Company Name:</strong> ${inquiry.companyName || 'None'}</p>
            <p><strong>Location:</strong> ${inquiry.location || 'N/A'}</p>
            <p><strong>Contact:</strong> ${inquiry.contact || 'N/A'}</p>
        </div>
          
        <h3>Request Details</h3>
        <p><strong>Description:</strong></p>
        <p class="inquiry-note">${inquiry.requestDescription || 'N/A'}</p>

        <p><strong>Selected Services:</strong></p>
        <div class="service-checkboxes">
            ${renderServiceCheckboxes(inquiry.selectedServices)}
        </div>

        <h3>Status Information</h3>
        <p><strong>Current Status:</strong> <span class="${inquiry.status}">${formatStatus(inquiry.status)}</span></p>
        <p><strong>Date Submitted:</strong> ${formatDate(inquiry.dateSubmitted)}</p>
        <p><strong>Last Updated:</strong> ${formatDate(inquiry.lastUpdated)}</p>

        <h3>Remarks</h3>
        <p class="inquiry-note">${inquiry.remarks || 'No remarks'}</p>

        <h3>Documents</h3>
        <div class="inquiry-box documents-list">
            ${documentsText}
        </div>
    
        ${projectFiles ? `<h3>Project Files</h3>
        <div class="inquiry-box documents-list">
            ${projectFiles}
        </div>` : ''}
    </div>
    </div>
    `;

    // Remove existing modal if any
    $('#inquiryDetailsModal').remove();

    // Add modal to body
    $('body').append(modalHtml);

    // Handle project file viewing
    $(document).on('click', '.view-project-file-btn', async function () {
        const storagePath = $(this).data('storage-path');
        const legacyUrl = $(this).data('file-url');
        const fileName = $(this).data('file-name');

        try {
            let downloadURL;

            if (legacyUrl) {
                // Use existing URL for backward compatibility
                downloadURL = legacyUrl;
            } else if (storagePath) {
                // Generate URL on demand (requires importing Firebase Storage)
                const { ref, getDownloadURL } = await import('../../firebase-config.js');
                const { storage } = await import('../../firebase-config.js');
                const fileRef = ref(storage, storagePath);
                downloadURL = await getDownloadURL(fileRef);
            } else {
                throw new Error('No file path available');
            }

            window.open(downloadURL, '_blank');
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Unable to open file. Please try again.');
        }
    });

    // Show modal
    $('#inquiryDetailsModal').show();

    $('body').addClass('modal-open');
}

// Corrected version without description field

async function editInquiry(inquiryId) {
    try {
        const userDocRef = doc(db, 'client', currentUser.uid);
        const pendingCollectionRef = collection(userDocRef, 'pending');
        const inquiryDoc = await getDocs(query(pendingCollectionRef));

        let inquiry = null;
        inquiryDoc.forEach(doc => {
            if (doc.id === inquiryId) inquiry = { id: doc.id, ...doc.data() };
        });

        if (!inquiry) return alert('Inquiry not found');
        if (inquiry.status !== 'Update Documents') return alert('This inquiry cannot be edited');

        showEditModal(inquiry);
    } catch (error) {
        console.error('Edit error:', error);
        alert('Failed to load inquiry');
    }
}

function showEditModal(inquiry, isAdmin = false) {
    const docs = inquiry.documents || [];

    const docsHtml = docs.length ? docs.map((doc, i) =>
        `<div class="existing-document" data-doc-index="${i}">
            <span class="doc-name">${doc.name}</span>
            ${isAdmin
            ? `<button type="button" class="remove-existing-doc" data-doc-index="${i}">×</button>`
            : ''}
        </div>`).join('') : '<p class="no-docs">No existing documents</p>';

    const modalHtml = `
    <div class="modal edit-modal" id="editInquiryModal">
        <div class="modal-content">
            <span class="close-btn edit-close">&times;</span>
            <h2>Update Documents</h2>
            <div class="edit-form">
                <div class="form-section">
                    <h3>Current Documents</h3>
                    <div id="existingDocuments">${docsHtml}</div>
                </div>
                <div class="form-section">
                    <h3>Add New Documents</h3>
                    <input type="file" id="editDocUpload" accept=".pdf" multiple style="display:none">
                    <button type="button" id="editUploadBtn" class="upload-btn">Choose Files</button>
                    <p class="upload-info">PDF only, max 3 total, 5MB each</p>
                    <div id="newDocsList"></div>
                </div>
                <div class="form-actions">
                    <button type="button" id="cancelEdit" class="cancel-btn">Cancel</button>
                    <button type="button" id="saveEdit" class="save-btn">Save</button>
                </div>
            </div>
        </div>
    </div>`;

    $('#editInquiryModal').remove();
    $('body').append(modalHtml).addClass('modal-open');
    $('#editInquiryModal').show();

    initEditHandlers(inquiry, isAdmin);
}

function initEditHandlers(inquiry, isAdmin = false) {
    let newFiles = [], removedIndices = [];

    // Upload button triggers hidden file input
    $('#editUploadBtn').click(() => $('#editDocUpload').click());

    // Handle newly selected files
    $('#editDocUpload').change((e) => {
        const files = Array.from(e.target.files);

        // FIXED: For edit mode, only check new files count (reset to 3 max for new uploads)
        const newFilesCount = newFiles.length + files.length;

        if (newFilesCount > 3) {
            alert('Maximum 3 new documents allowed for update');
            return;
        }

        files.forEach(file => {
            if (file.type !== 'application/pdf') {
                alert(`${file.name} is not a PDF file`);
                return;
            }
            if (file.size > 5242880) {
                alert(`${file.name} exceeds 5MB limit`);
                return;
            }

            // Check for duplicate names in new files
            if (newFiles.find(f => f.name === file.name)) {
                alert(`${file.name} is already selected`);
                return;
            }

            newFiles.push({
                id: Date.now() + Math.random(),
                file,
                name: file.name,
                size: file.size
            });
        });

        updateNewDocsList();
        $('#editDocUpload').val('');
    });

    if (isAdmin) {
        $(document).on('click', '.remove-existing-doc', function () {
            removedIndices.push(parseInt($(this).data('doc-index')));
            $(this).closest('.existing-document').remove();

            if ($('#existingDocuments .existing-document').length === 0) {
                $('#existingDocuments').html('<p class="no-docs">No existing documents</p>');
            }
        });
    }

    $(document).on('click', '.remove-new-doc', function () {
        const id = $(this).data('file-id');
        newFiles = newFiles.filter(f => f.id !== id);
        updateNewDocsList();
    });

    function updateNewDocsList() {
        const listHtml = newFiles.length === 0
            ? ''
            : newFiles.map(f =>
                `<div class="new-document">
                    <span class="doc-name">${f.name}</span>
                    <span class="doc-size">(${(f.size / 1048576).toFixed(2)}MB)</span>
                    <button type="button" class="remove-new-doc" data-file-id="${f.id}">×</button>
                </div>`
            ).join('');

        $('#newDocsList').html(listHtml);
    }

    // Save handler with double lock
    $('#saveEdit').click(() => {
        if (!isAdmin) {
            // Remove any attempted deletions for non-admin users
            removedIndices = [];
            $('#existingDocuments .remove-existing-doc').remove();
        }

        if (newFiles.length === 0 && removedIndices.length === 0) {
            alert('No changes made. Please add new documents to save.');
            return;
        }

        // No additional validation needed - users can upload up to 3 new docs

        saveChanges(inquiry, newFiles, removedIndices);
    });

    $('#cancelEdit, .edit-close').click(() => {
        $('#editInquiryModal').remove();
        $('body').removeClass('modal-open');
    });

    // Initialize the display
    updateNewDocsList();
}

async function saveChanges(inquiry, newFiles, removedIndices) {

    function normalizeFileName(name) {
        return name.replace(/\(\d+\)/, ''); // "food(1).pdf" -> "food.pdf"
    }

    try {
        $('#saveEdit').prop('disabled', true).text('Saving...');

        let docs = [...(inquiry.documents || [])];

        // STEP 1: Handle deletions
        for (const i of removedIndices.sort((a, b) => b - a)) {
            const removedDoc = docs[i];
            if (removedDoc && removedDoc.url) {
                try {
                    const oldPath = getStoragePathFromUrl(removedDoc.url);
                    await deleteObject(ref(storage, oldPath));
                    // console.log(`Deleted from storage: ${removedDoc.name}`);
                } catch (err) {
                    console.warn(`Failed to delete ${removedDoc?.name} from storage:`, err);
                }
            }
            docs.splice(i, 1);
        }

        // STEP 2: Handle new uploads (replace if same *base* name)
        for (const file of newFiles) {
            const baseName = normalizeFileName(file.name);

            const existingIndex = docs.findIndex(d => normalizeFileName(d.name) === baseName);
            if (existingIndex !== -1) {
                const oldDoc = docs[existingIndex];
                if (oldDoc && oldDoc.url) {
                    try {
                        const oldPath = getStoragePathFromUrl(oldDoc.url);
                        await deleteObject(ref(storage, oldPath));
                        // console.log(`Replaced old file in storage: ${oldDoc.name}`);
                    } catch (err) {
                        console.warn(`Failed to delete old file ${oldDoc?.name}:`, err);
                    }
                }
                docs.splice(existingIndex, 1);
            }

            // Upload new file
            const fileRef = ref(storage, `documents/${currentUser.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file.file);
            const url = await getDownloadURL(fileRef);

            docs.push({
                name: file.name,
                size: file.size,
                url,
                uploadDate: new Date().toISOString()
            });
        }

        // STEP 3: Update Firestore
        const updates = {
            documents: docs,
            documentCount: docs.length,
            lastUpdated: new Date().toISOString(),
            status: 'pending',
            userId: currentUser.uid,
            read: false
        };

        const userDocRef = doc(db, 'client', currentUser.uid);
        const inquiryDocRef = doc(collection(userDocRef, 'pending'), inquiry.id);
        await updateDoc(inquiryDocRef, updates);

        if (inquiry.pendingDocId) {
            await updateDoc(doc(db, 'inquiries', inquiry.pendingDocId), updates);
        }

        alert('Updated successfully!');
        $('#editInquiryModal').remove();
        $('body').removeClass('modal-open');
        if (typeof refreshTable === 'function') refreshTable();

    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save changes');
    } finally {
        $('#saveEdit').prop('disabled', false).text('Save');
    }
}


// Helper: extract path from Firebase Storage URL
function getStoragePathFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname.split('/o/')[1];
        return decodeURIComponent(path.split('?')[0]);
    } catch {
        const match = url.match(/\/o\/(.+?)\?/);
        return match ? decodeURIComponent(match[1]) : '';
    }
}



// Document viewer function
function showDocumentViewer(docUrl, options = {}) {
    const defaults = {
        width: 800,
        height: 600,
        autoSize: false,
        showControls: true
    };

    const settings = { ...defaults, ...options };

    // FIXED: Don't disable scrollbar - only remove toolbar and navpanes
    const cleanUrl = docUrl.includes('#') ? docUrl : docUrl + '#toolbar=0&navpanes=0';

    const autoSizeClass = settings.autoSize ? 'auto-size' : '';

    const documentModalHtml = `
    <div class="modal document-modal" id="documentViewerModal">
        <div class="modal-content document-viewer-content ${autoSizeClass}">
            <span class="close-btn document-close" title="Close">&times;</span>
            <div class="document-content ${autoSizeClass}">
                <div id="documentLoader" class="document-loader">
                    <div class="loader-spinner"></div>
                    <p>Loading document...</p>
                </div>
                <!-- Use iframe instead of embed for better scrolling -->
                <iframe id="documentIframe" 
                       src="${cleanUrl}" 
                       style="display: none; width: ${settings.width}px; height: ${settings.height}px; border: none;"
                       class="${autoSizeClass}">
                </iframe>
                <div id="documentError" class="document-error" style="display: none;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to display PDF. <a href="${docUrl}" target="_blank">Open in new tab</a></p>
                </div>
            </div>
        </div>
    </div>
    `;

    $('#documentViewerModal').remove();
    $('body').append(documentModalHtml);
    $('#documentViewerModal').show();
    $('body').addClass('modal-open');

    const iframe = $('#documentIframe');
    const loader = $('#documentLoader');
    const error = $('#documentError');

    // Show iframe after loading
    setTimeout(() => {
        loader.hide();
        iframe.show();
    }, 1500);

    // Close handlers
    $('.document-close').on('click', function () {
        $('#documentViewerModal').hide().remove();
        $('body').removeClass('modal-open');
    });

    $('#documentViewerModal').on('click', function (e) {
        if (e.target === this) {
            $(this).hide().remove();
            $('body').removeClass('modal-open');
        }
    });
}

function showLoading() {
    $('table tbody').html(`
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 10px;">Loading inquiries...</p>
            </td>
        </tr>
    `);
}

function showEmptyState(targetSelector, message = "No inquiries found.", subMessage = 'Click "Submit Inquiry" to create your first inquiry.') {
    const subText = subMessage ? `<p>${subMessage}</p>` : '';
    $(targetSelector).html(`
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                <p>${message}</p>
                ${subText}
            </td>
        </tr>
    `);
}


function showError(message) {
    $('table tbody').html(`
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #e74c3c;">
                <p>⚠️ ${message}</p>
                <button id="retryLoadBtn" style="margin-top: 10px; padding: 5px 15px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Retry
                </button>
            </td>
        </tr>
    `);
}

// Method to refresh table (can be called from form submission)
async function refreshTable() {
    await loadInquiries();
}

function renderServiceCheckboxes(selectedServices = []) {
    const allServices = [
        'Relocation Survey',
        'Boundary Survey',
        'Subdivision Survey',
        'Topographic Survey',
        'Consolidation Survey',
        'Engineering Services',
        'Parcellary Survey',
        'As-Built Survey',
        'Titling Assistance',
        'All'
    ];

    return allServices.map(service => {
        const checked = selectedServices.includes(service) ? 'checked' : '';
        return `
            <label class="fake-checkbox-label">
                <span class="fake-checkbox ${checked}"></span> ${service}
            </label>
        `;
    }).join('');
}

// Cleanup method
function destroyDashboardTable() {
    if (unsubscribe) {
        unsubscribe();
    }
}

// jQuery Document Ready
$(document).ready(function () {
    // Event delegation for view buttons (since they're dynamically created)
    $('table tbody').on('click', '.view-btn', function () {
        const inquiryId = $(this).data('inquiry-id');
        viewInquiry(inquiryId);
    });

    $('table tbody').on('click', '.edit-btn', function () {
        const inquiryId = $(this).data('inquiry-id');
        editInquiry(inquiryId);
    });

    // Event delegation for close modal - ONLY for inquiry detail modals
    $(document).on('click', '.inquiry-close', function () {
        $(this).closest('.inquiry-modal').remove();
        $('body').removeClass('modal-open');
    });

    // Event delegation for document viewer close button
    $(document).on('click', '.document-close', function () {
        $(this).closest('.document-modal').remove();
        $('body').removeClass('modal-open');
    });

    // Event delegation for document links - NEW
    $(document).on('click', '.document-link', function (e) {
        e.preventDefault();
        const docUrl = $(this).data('doc-url');
        const docName = $(this).data('doc-name');
        showDocumentViewer(docUrl, docName);
    });

    // Event delegation for account information toggle
    $(document).on('click', '.account-toggle', function () {
        const $content = $(this).next('.account-content');
        const $arrow = $(this).find('.dropdown-arrow');

        $content.slideToggle(150, function () {
            if ($content.is(':visible')) {
                // Expanded → arrow down
                $arrow.css('transform', 'rotate(0deg)');
            } else {
                // Collapsed → arrow right
                $arrow.css('transform', 'rotate(-90deg)');
            }
        });
    });

    // Event delegation for retry button
    $(document).on('click', '#retryLoadBtn', function () {
        loadInquiries();
    });

    // Close inquiry modal when clicking outside - ONLY for inquiry modals
    $(document).on('click', '.inquiry-modal', function (e) {
        if (e.target === this) {
            $(this).remove();
            $('body').removeClass('modal-open');
        }
    });

    // Close document modal when clicking outside - NEW
    $(document).on('click', '.document-modal', function (e) {
        if (e.target === this) {
            $(this).remove();
        }
    });

    // Initialize when auth is ready
    auth.onAuthStateChanged((user) => {
        if (user) {
            initDashboardTable();
        }
    });
});

// Export functions for global use
window.refreshTable = refreshTable;
window.dashboardTable = {
    init: initDashboardTable,
    refresh: refreshTable,
    destroy: destroyDashboardTable
};
window.viewInquiry = viewInquiry;
export { refreshTable, };