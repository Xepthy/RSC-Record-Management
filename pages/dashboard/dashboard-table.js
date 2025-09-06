// dashboard-table.js (jQuery Version)
import {
    db,
    auth,
    collection,
    getDocs,
    doc,
    onSnapshot,
    query,
    orderBy
} from '../../firebase-config.js';

let currentUser = null;
let unsubscribe = null;

// Initialize dashboard table
async function initDashboardTable() {
    try {
        currentUser = auth.currentUser;
        if (!currentUser) {
            console.error('User not authenticated');
            return;
        }

        // Load initial data
        await loadInquiries();

        // Set up real-time listener
        setupRealtimeListener();

    } catch (error) {
        console.error('Error initializing dashboard table:', error);
        showError('Failed to load inquiries');
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
    // Clear existing content
    $('table tbody').empty();

    if (inquiries.length === 0) {
        showEmptyState();
        return;
    }

    inquiries.forEach(inquiry => {
        const row = createTableRow(inquiry);
        $('table tbody').append(row);
    });
}

function createTableRow(inquiry) {
    // Format dates
    const dateSubmitted = formatDate(inquiry.dateSubmitted);
    const lastUpdated = formatDate(inquiry.lastUpdated);

    // Create request title from description (truncated)
    const requestTitle = truncateText(inquiry.requestDescription, 50);

    // Status styling
    const statusClass = inquiry.status.toLowerCase();

    const row = $(`
        <tr>
            <td title="${inquiry.requestDescription || ''}">${requestTitle}</td>
            <td>${dateSubmitted}</td>
            <td><span class="${statusClass}">${formatStatus(inquiry.status)}</span></td>
            <td>${lastUpdated}</td>
            <td>${inquiry.remarks || 'No remarks'}</td>
            <td>
                <button class="view-btn" data-inquiry-id="${inquiry.id}" title="View Details">
                    View
                </button>
            </td>
        </tr>
    `);

    return row;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
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

        // Create and show modal
        showInquiryModal(inquiryData);

    } catch (error) {
        console.error('Error showing inquiry details:', error);
        alert('Failed to load inquiry details');
    }
}

function showInquiryModal(inquiry) {
    const servicesText = inquiry.selectedServices ? inquiry.selectedServices.join(', ') : 'None';
    const documentsText = inquiry.documents && inquiry.documents.length > 0
        ? inquiry.documents.map(doc => `<a href="${doc.url}" target="_blank">${doc.name}</a>`).join('<br>')
        : 'No documents';

    const modalHtml = `
        <div class="modal" id="inquiryDetailsModal">
            <div class="modal-content">
                <span class="close-btn">&times;</span>
                <h2>Inquiry Details</h2>
                
                <div class="inquiry-details">
                    <h3>Basic Information</h3>
                    <p><strong>Client Name:</strong> ${inquiry.clientName || 'N/A'}</p>
                    <p><strong>Classification:</strong> ${inquiry.classification || 'N/A'}</p>
                    <p><strong>Representative:</strong> ${inquiry.representative || 'None'}</p>
                    <p><strong>Rep. Classification:</strong> ${inquiry.repClassification || 'N/A'}</p>
                    <p><strong>Location:</strong> ${inquiry.location || 'N/A'}</p>
                    <p><strong>Contact:</strong> ${inquiry.contact || 'N/A'}</p>
                    
                    <h3>Request Details</h3>
                    <p><strong>Description:</strong></p>
                    <p style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${inquiry.requestDescription || 'N/A'}</p>
                    
                    <p><strong>Selected Services:</strong></p>
                    <p style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${servicesText}</p>
                    
                    <h3>Status Information</h3>
                    <p><strong>Current Status:</strong> <span class="${inquiry.status}">${formatStatus(inquiry.status)}</span></p>
                    <p><strong>Date Submitted:</strong> ${formatDate(inquiry.dateSubmitted)}</p>
                    <p><strong>Last Updated:</strong> ${formatDate(inquiry.lastUpdated)}</p>
                    <p><strong>Remarks:</strong></p>
                    <p style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${inquiry.remarks || 'No remarks'}</p>
                    
                    <h3>Documents</h3>
                    <div style="background: #f5f5f5; padding: 10px; border-radius: 4px;">
                        ${documentsText}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    $('#inquiryDetailsModal').remove();

    // Add modal to body
    $('body').append(modalHtml);

    // Show modal
    $('#inquiryDetailsModal').show();
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

function showEmptyState() {
    $('table tbody').html(`
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                <p>No inquiries found.</p>
                <p>Click "Submit Form" to create your first inquiry.</p>
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

    // Event delegation for close modal
    $(document).on('click', '.close-btn', function () {
        $(this).closest('.modal').remove();
    });

    // Event delegation for retry button
    $(document).on('click', '#retryLoadBtn', function () {
        loadInquiries();
    });

    // Close modal when clicking outside
    $(document).on('click', '.modal', function (e) {
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

export { refreshTable };