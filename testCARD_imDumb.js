import {
  db,
  auth,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  signOut,
  onAuthStateChanged
} from '../../firebase-config.js';

class InquiriesPage {
  constructor() {
    this.inquiries = [];
    this.unsubscribe = null;
    this.isAdmin = false;
    this.currentUser = null;
    this.currentInquiryId = null;

    this.init();
  }

  async init() {
    try {
      // Wait for DOM to be ready
      await this.waitForDOM();

      // Check authentication status
      this.setupAuthListener();

    } catch (error) {
      console.error('Error initializing inquiries page:', error);
      this.showError('Failed to initialize admin panel');
    }
  }

  waitForDOM() {
    return new Promise((resolve) => {
      $(document).ready(() => {
        resolve();
      });
    });
  }

  setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.handleUserAuthenticated(user);
      } else {
        this.handleUserNotAuthenticated();
      }
    });
  }

  async handleUserAuthenticated(user) {
    try {
      // Check if user is admin
      const isAdmin = await this.checkAdminStatus(user.uid);

      // 🔎 Debugging: confirm Firestore role
      console.log("Admin check UID:", user.uid);
      const snap = await getDoc(doc(db, "accounts", user.uid));
      console.log("Doc exists?", snap.exists(), "Role:", snap.data()?.role);

      if (isAdmin) {
        this.isAdmin = true;
        await this.initializeAdminPanel();
      } else {
        this.showAccessDenied();
      }
    } catch (error) {
      console.error('Error handling authenticated user:', error);
      this.showError('Failed to verify admin permissions');
    }
  }

  handleUserNotAuthenticated() {
    // Clear any stored user data
    sessionStorage.removeItem('adminUser');

    // Redirect to login page
    this.redirectToLogin();
  }

  async checkAdminStatus(uid) {
    try {
      const accountDocRef = doc(db, 'accounts', uid);
      const accountDoc = await getDoc(accountDocRef);

      return accountDoc.exists() && accountDoc.data().role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  async initializeAdminPanel() {
    try {
      // Update user info in header
      this.updateUserInfo();

      // Setup event listeners
      this.setupEventListeners();

      // Setup inquiry listener
      await this.setupInquiryListener();

    } catch (error) {
      console.error('Error initializing admin panel:', error);
      this.showError('Failed to initialize admin panel');
    }
  }

  updateUserInfo() {
    if (this.currentUser) {
      $('#userName').text(this.currentUser.displayName || 'Admin User');
      $('#userEmail').text(this.currentUser.email);
    }
  }

  setupEventListeners() {
    // Inquiries navigation click
    $('#inquiriesNav').on('click', () => {
      this.showInquiriesSection();
    });

    // Header Mark as read button click
    $('#markReadBtn').on('click', async () => {
      if (this.currentInquiryId) {
        await this.markAsRead(this.currentInquiryId);
      }
    });

    // Logout button click
    $('#logoutBtn').on('click', async () => {
      await this.handleLogout();
    });
  }

  async setupInquiryListener() {
    try {
      // Show loading state
      this.showLoading();

      // Query inquiries collection ordered by submission date (newest first)
      const inquiriesQuery = query(
        collection(db, 'inquiries'),
        orderBy('dateSubmitted', 'desc')
      );

      // Set up real-time listener
      this.unsubscribe = onSnapshot(inquiriesQuery, (snapshot) => {
        this.inquiries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        this.updateNotificationCount();
        this.updateHeaderMarkReadButton();
        this.showInquiriesLoaded();
      }, (error) => {
        console.error('Error listening to inquiries:', error);
        this.showError('Failed to load inquiries');
      });

    } catch (error) {
      console.error('Error setting up inquiry listener:', error);
      this.showError('Failed to initialize inquiry system');
    }
  }

  async handleLogout() {
    try {
      // Show loading state on logout button
      const $logoutBtn = $('#logoutBtn');
      $logoutBtn.prop('disabled', true).text('🔄 Logging out...');

      // Sign out from Firebase
      await signOut(auth);

      // Clear session storage
      sessionStorage.removeItem('adminUser');

      // Redirect will be handled by auth state change

    } catch (error) {
      console.error('Logout error:', error);

      // Reset logout button
      const $logoutBtn = $('#logoutBtn');
      $logoutBtn.prop('disabled', false).html('<span>🚪 Logout</span>');

      this.showError('Failed to logout. Please try again.');
    }
  }

  updateNotificationCount() {
    const unreadCount = this.inquiries.filter(inquiry => inquiry.read === false || inquiry.read === undefined).length;
    const $countElement = $('#inquiryCount');

    if (unreadCount > 0) {
      $countElement.text(unreadCount).show();
    } else {
      $countElement.hide();
    }
  }

  updateHeaderMarkReadButton() {
    const $markReadBtn = $('#markReadBtn');

    if (this.currentInquiryId) {
      const currentInquiry = this.inquiries.find(inq => inq.id === this.currentInquiryId);
      if (currentInquiry) {
        if (currentInquiry.read) {
          $markReadBtn.prop('disabled', true).text('Already Read');
        } else {
          $markReadBtn.prop('disabled', false).text('Mark as Read');
        }
      }
    } else {
      $markReadBtn.prop('disabled', true).text('Mark as Read');
    }
  }

  showInquiryDetails(inquiryId) {
    const inquiry = this.inquiries.find(inq => inq.id === inquiryId);
    if (!inquiry) return;

    // Set current inquiry for header button
    this.currentInquiryId = inquiryId;
    this.updateHeaderMarkReadButton();

    const clientName = inquiry.accountInfo ?
      `${inquiry.accountInfo.firstName} ${inquiry.accountInfo.lastName}`.trim() || inquiry.clientName :
      inquiry.clientName || 'Unknown Client';

    const services = inquiry.selectedServices ?
      inquiry.selectedServices.join(', ') : 'None specified';

    const dateStr = inquiry.dateSubmitted ?
      (typeof inquiry.dateSubmitted === 'string' ?
        new Date(inquiry.dateSubmitted).toLocaleString() :
        inquiry.dateSubmitted.toDate ? inquiry.dateSubmitted.toDate().toLocaleString() : 'Unknown') :
      'Unknown';

    let documentsHTML = '';
    if (inquiry.documents && inquiry.documents.length > 0) {
      documentsHTML = inquiry.documents.map(doc =>
        `<li><a href="${doc.url}" target="_blank">${doc.name}</a></li>`
      ).join('');
      documentsHTML = `<ul>${documentsHTML}</ul>`;
    } else {
      documentsHTML = '<p>No documents attached</p>';
    }

    // Status badge based on read status
    const statusBadge = inquiry.read ?
      '<span class="status-badge read">Read</span>' :
      '<span class="status-badge unread">Unread</span>';

    const detailsHTML = `
            <div class="inquiry-details">
                <div class="details-header">
                    <div class="header-content">
                        <h3>Inquiry Details</h3>
                        ${statusBadge}
                    </div>
                    <button class="back-btn" onclick="window.inquiriesPage.showInquiriesSection()">← Back to List</button>
                </div>
                
                <div class="details-content">
                    <div class="details-grid">
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Client Information</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Name:</span>
                                    <span class="value">${clientName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Email:</span>
                                    <span class="value">${inquiry.accountInfo?.email || 'Not provided'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Mobile:</span>
                                    <span class="value">${inquiry.accountInfo?.mobileNumber || 'Not provided'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Contact:</span>
                                    <span class="value">${inquiry.contact || 'Not provided'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Location:</span>
                                    <span class="value">${inquiry.location || 'Not provided'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Request Information</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Classification:</span>
                                    <span class="value">${inquiry.classification || 'Not specified'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Representative:</span>
                                    <span class="value">${inquiry.representative || 'None'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Rep. Classification:</span>
                                    <span class="value">${inquiry.repClassification || 'None'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Services:</span>
                                    <span class="value services-list">${services}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Submitted:</span>
                                    <span class="value">${dateStr}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-card description-card">
                            <div class="card-header">
                                <h4>Request Description</h4>
                            </div>
                            <div class="card-body">
                                <div class="description-text">
                                    ${inquiry.requestDescription || 'No description provided'}
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-card documents-card">
                            <div class="card-header">
                                <h4>Documents (${inquiry.documentCount || 0})</h4>
                            </div>
                            <div class="card-body">
                                <div class="documents-list">
                                    ${documentsHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="details-actions">
                    <button class="btn-mark-read ${inquiry.read ? 'disabled' : ''}" 
                            onclick="window.inquiriesPage.markAsRead('${inquiryId}')"
                            ${inquiry.read ? 'disabled' : ''}>
                        <span class="btn-icon">${inquiry.read ? '✓' : '📧'}</span>
                        ${inquiry.read ? 'Already Read' : 'Mark as Read'}
                    </button>
                </div>
            </div>
        `;

    $('#inquiryContent').html(detailsHTML);

    // Auto-mark as read when viewing details if it's unread
    if (!inquiry.read) {
      setTimeout(() => {
        this.markAsRead(inquiryId);
      }, 1000); // Mark as read after 1 second of viewing
    }
  }

  async markAsRead(inquiryId) {
    try {
      const inquiry = this.inquiries.find(inq => inq.id === inquiryId);
      if (!inquiry || inquiry.read) {
        return; // Already read or doesn't exist
      }

      // Update Firestore
      const inquiryDocRef = doc(db, 'inquiries', inquiryId);
      await updateDoc(inquiryDocRef, {
        read: true,
      });

      console.log('Inquiry marked as read:', inquiryId);

      // Update header button immediately
      this.updateHeaderMarkReadButton();

    } catch (error) {
      console.error('Error marking inquiry as read:', error);
      // Could show a toast notification here
    }
  }

  showLoading() {
    $('#inquiryContent').html(`
            <div class="loading-state">
                <h3>⏳ Loading inquiries...</h3>
                <p>Please wait while we fetch the latest inquiries.</p>
            </div>
        `);
  }

  showInquiriesLoaded() {
    // Clear current inquiry when showing list
    this.currentInquiryId = null;
    this.updateHeaderMarkReadButton();

    if (this.inquiries.length === 0) {
      $('#inquiryContent').html(`
                <div class="empty-state">
                    <h3>🔭 No inquiries yet</h3>
                    <p>New inquiries from clients will appear here.</p>
                </div>
            `);
    } else {
      this.displayInquiriesTable();
    }
  }

  displayInquiriesTable() {
    const tableRows = this.inquiries.map(inquiry => {
      // Column 1: From (firstName + lastName)
      const fromName = inquiry.accountInfo ?
        `${inquiry.accountInfo.firstName || ''} ${inquiry.accountInfo.lastName || ''}`.trim() :
        'Unknown Client';

      // Column 2: Subject (requestDescription with truncation)
      const subject = inquiry.requestDescription ?
        (inquiry.requestDescription.length > 50 ?
          inquiry.requestDescription.substring(0, 50) + '...' :
          inquiry.requestDescription) :
        'No subject';

      // Column 3: Sent (dateSubmitted formatted)
      let sentDate = 'Unknown date';
      if (inquiry.dateSubmitted) {
        try {
          let date;
          if (typeof inquiry.dateSubmitted === 'string') {
            date = new Date(inquiry.dateSubmitted);
          } else if (inquiry.dateSubmitted.toDate) {
            // Firestore Timestamp
            date = inquiry.dateSubmitted.toDate();
          } else {
            date = inquiry.dateSubmitted;
          }

          const time = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
          });
          sentDate = `${time}<br>${dateStr}`;
        } catch (error) {
          console.error('Error formatting date:', error);
          sentDate = 'Invalid date';
        }
      }

      // Read status class - unread is now grayish
      const readClass = inquiry.read ? 'read' : 'unread';

      return `
                <tr class="inquiry-row ${readClass}" data-inquiry-id="${inquiry.id}">
                    <td class="from-column">
                        <div class="client-name">${fromName}</div>
                        ${inquiry.accountInfo?.email ? `<div class="client-email">${inquiry.accountInfo.email}</div>` : ''}
                    </td>
                    <td class="subject-column">
                        <div class="subject-text">${subject}</div>
                        ${inquiry.read ? '' : '<span class="unread-indicator">●</span>'}
                    </td>
                    <td class="sent-column">
                        <div class="sent-date">${sentDate}</div>
                    </td>
                </tr>
            `;
    }).join('');

    const tableHTML = `
            <div class="inquiries-table-container">
                <div class="table-header">
                    <div class="table-stats">
                        <span class="total-count">${this.inquiries.length} Total</span>
                        <span class="unread-count">${this.inquiries.filter(inq => !inq.read).length} Unread</span>
                    </div>
                </div>
                
                <div class="table-wrapper">
                    <table class="inquiries-table">
                        <thead>
                            <tr>
                                <th class="from-header">From</th>
                                <th class="subject-header">Subject</th>
                                <th class="sent-header">Sent</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    $('#inquiryContent').html(tableHTML);
    this.setupTableEventListeners();
  }

  setupTableEventListeners() {
    // Click event for inquiry rows
    $('.inquiry-row').on('click', (e) => {
      const inquiryId = $(e.currentTarget).data('inquiry-id');
      this.showInquiryDetails(inquiryId);
    });

    // Hover effects
    $('.inquiry-row').on('mouseenter', function () {
      $(this).addClass('hovered');
    }).on('mouseleave', function () {
      $(this).removeClass('hovered');
    });
  }

  showInquiriesSection() {
    this.showInquiriesLoaded();
  }

  showError(message) {
    $('#inquiryContent').html(`
            <div class="error-state">
                <h3>⚠ Error</h3>
                <p>${message}</p>
            </div>
        `);
  }

  showAccessDenied() {
    $('#inquiryContent').html(`
            <div class="error-state">
                <h3>🚫 Access Denied</h3>
                <p>You need admin privileges to view inquiries.</p>
                <button onclick="window.location.href='adminLogin.html'" style="margin-top: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Back to Login
                </button>
            </div>
        `);
  }

  redirectToLogin() {
    // Show message briefly before redirect
    $('#inquiryContent').html(`
            <div class="error-state">
                <h3>🔐 Authentication Required</h3>
                <p>Redirecting to login page...</p>
            </div>
        `);

    setTimeout(() => {
      window.location.href = 'adminLogin.html';
    }, 1500);
  }

  // Public methods
  getInquiries() {
    return this.inquiries;
  }

  getUnreadCount() {
    return this.inquiries.filter(inquiry => !inquiry.read).length;
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Initialize when DOM is ready
$(document).ready(async () => {
  window.inquiriesPage = new InquiriesPage();
});

// Cleanup when page unloads
$(window).on('beforeunload', () => {
  if (window.inquiriesPage) {
    window.inquiriesPage.destroy();
  }
});

export default InquiriesPage;