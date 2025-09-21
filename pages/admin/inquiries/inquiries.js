import {
    db,
    auth,
    onAuthStateChanged
} from '../../../firebase-config.js';
import AuthManager from './auth-manager.js';
import InquiryManager from './inquiry-manager.js';
import UIRenderer from './ui-renderer.js';
import InProgressManager from '../inProgress/in-progress-manager.js';

class InquiriesPage {
    constructor() {
        this.inquiries = [];
        this.unsubscribe = null;
        this.isAdmin = false;
        this.currentUser = null;
        this.currentInquiryId = null;
        this.inProgressItems = [];
        this.archivedInquiries = [];
        this.unsubscribeArchive = null;
        this.unsubscribeInProgress = null;

        // Initialize sub-modules
        this.authManager = new AuthManager(this);
        this.inquiryManager = new InquiryManager(this);
        this.uiRenderer = new UIRenderer(this);
        this.inProgressManager = new InProgressManager(this);

        this.init();
    }

    async init() {
        try {
            // Wait for DOM to be ready
            await this.waitForDOM();

            // Clear default values immediately
            $('#userName').text('Loading...');
            $('#userEmail').text('Checking authentication...');

            // Check authentication status
            this.authManager.setupAuthListener();

        } catch (error) {
            console.error('Error initializing inquiries page:', error);
            this.uiRenderer.showError('Failed to initialize admin panel');
        }
    }

    waitForDOM() {
        return new Promise((resolve) => {
            $(document).ready(() => {
                resolve();
            });
        });
    }

    async initializeAdminPanel() {
        try {
            this.updateUserInfo();
            this.setupEventListeners();

            // Setup both listeners to show notification counts
            await this.inquiryManager.setupInquiryListener();
            await this.inProgressManager.setupInProgressListener();

        } catch (error) {
            console.error('Error initializing admin panel:', error);
            this.uiRenderer.showError('Failed to initialize admin panel');
        }
    }

    updateUserInfo() {
        if (this.currentUser) {
            $('#userName').text(this.currentUser.displayName || 'Admin User');
            $('#userEmail').text(this.currentUser.email);
        }
    }

    showInProgressSection() {
        // Update nav states
        $('.nav-item').removeClass('active');
        $('#inProgressNav').addClass('active');

        // Update header
        $('.content-header h1').text('In Progress Management');
        $('.content-header p').text('Monitor ongoing projects and track their progress. Click on any item to view details and mark as read.');

        // Setup listener if not already done
        if (!this.unsubscribeInProgress) {
            this.inProgressManager.setupInProgressListener();
        } else {
            this.uiRenderer.showInProgressItems();
        }
    }

    updateInProgressNotificationCount() {
        const unreadCount = this.inProgressItems.filter(item => !item.read).length;
        const $countElement = $('#inProgressCount');

        if (unreadCount > 0) {
            $countElement.text(unreadCount).show();
        } else {
            $countElement.hide();
        }
    }

    showArchiveSection() {
        // Update nav states
        $('.nav-item').removeClass('active');
        $('#archiveNav').addClass('active');

        $('.content-header h1').text('Archive Inquiry');
        $('.content-header p').text('View processed inquiries and their final decisions. All archived items are read-only.');

        // Setup archive listener if not already done
        if (!this.unsubscribeArchive) {
            this.inquiryManager.setupArchiveListener();
        } else {
            this.uiRenderer.showArchivedInquiries();
        }
    }

    setupEventListeners() {
        // Inquiries navigation click
        $('#inquiriesNav').on('click', () => {
            this.showInquiriesSection();
        });

        $('#archiveNav').on('click', () => {
            this.showArchiveSection();
        });

        $('#inProgressNav').on('click', () => {
            this.showInProgressSection();
        });

        // Logout button click
        $('#logoutBtn').on('click', async () => {
            await this.authManager.handleLogout();
        });
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

    showInquiriesSection() {
        $('.nav-item').removeClass('active');
        $('#inquiriesNav').addClass('active');

        $('.content-header h1').text('Inquiry Management');
        $('.content-header p').text('Manage and respond to customer inquiries. Click on any inquiry to view details and automatically mark it as read.');

        this.uiRenderer.showInquiriesLoaded();
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
        if (this.unsubscribeArchive) {  // ADD THIS
            this.unsubscribeArchive();
            this.unsubscribeArchive = null;
        }

        if (this.unsubscribeInProgress) {  // ADD THIS
            this.unsubscribeInProgress();
            this.unsubscribeInProgress = null;
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