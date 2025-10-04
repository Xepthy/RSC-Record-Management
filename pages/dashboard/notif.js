import { db, collection, query, onSnapshot, doc, updateDoc, auth, onAuthStateChanged } from '../../firebase-config.js';

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unsubscribe = null;
        this.currentUser = null;
        this.init();
    }

    init() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.setupNotificationListener();
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle notification dropdown
        $('.bell-icon').on('click', (e) => {
            e.stopPropagation();
            $('#notificationDropdown').toggle();
        });

        // Close dropdown when clicking outside
        $(document).on('click', (e) => {
            if (!$(e.target).closest('.notification-dropdown').length) {
                $('#notificationDropdown').hide();
            }
        });

        // Mark all as read
        $('#markAllRead').on('click', () => {
            this.markAllAsRead();
        });
    }

    async setupNotificationListener() {
        try {
            const pendingQuery = query(
                collection(db, 'client', this.currentUser.uid, 'pending')
            );

            this.unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
                this.notifications = [];

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.notifications && data.notifications.length > 0) {
                        data.notifications.forEach(notif => {
                            this.notifications.push({
                                ...notif,
                                docId: doc.id
                            });
                        });
                    }
                });

                this.notifications.sort((a, b) => {
                    const aTime = a.timestamp?.toMillis() || 0;
                    const bTime = b.timestamp?.toMillis() || 0;
                    return bTime - aTime;
                });

                this.updateUI();
            });

        } catch (error) {
            console.error('Error setting up notification listener:', error);
        }
    }

    updateUI() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const $badge = $('#notificationBadge');
        const $list = $('#notificationList');

        // Update badge
        if (unreadCount > 0) {
            $badge.text(unreadCount).show();
        } else {
            $badge.hide();
        }

        // Update list
        if (this.notifications.length === 0) {
            $list.html('<p class="no-notifications">No notifications</p>');
            return;
        }

        // 🔹 USE YOUR NEW notifHTML CODE HERE
        const notifHTML = this.notifications.map(notif => {
            const timeStr = this.formatTimestamp(notif.timestamp);
            const readClass = notif.read ? 'read' : 'unread';
            const statusClass = notif.status?.toLowerCase().replace(/\s+/g, '-') || '';

            return `
        <div class="notification-item ${readClass}" 
             data-inquiry-id="${notif.inquiryId}" 
             data-doc-id="${notif.docId}">
            <div class="notif-content">
                <span class="notif-badge ${statusClass}">${notif.status}</span>
                <p class="notif-title"><strong>${notif.requestTitle}</strong></p>
                <p class="notif-message">${notif.message}</p>
                <span class="notif-time">${timeStr}</span>
            </div>
            ${!notif.read ? '<span class="unread-dot"></span>' : ''}
        </div>
    `;
        }).join('');


        $list.html(notifHTML);

        // Add click handlers
        $('.notification-item').on('click', (e) => {
            const $item = $(e.currentTarget);
            const inquiryId = $item.data('inquiry-id');
            const docId = $item.data('doc-id');
            this.handleNotificationClick(inquiryId, docId);
        });
    }

    handleNotificationClick(inquiryId, docId) {
        console.log('Clicked inquiry:', inquiryId, 'DocId:', docId);

        const notif = this.notifications.find(n => n.inquiryId === inquiryId && n.docId === docId);

        if (notif) {
            // 🔹 Update badge count immediately
            const $badge = $('#notificationBadge');
            let count = parseInt($badge.text()) || 0;
            if (count > 0) {
                $badge.text(count - 1);
                if (count - 1 === 0) $badge.hide();
            }

            // 🔹 Mark as read in Firestore
            const docRef = doc(db, 'client', this.currentUser.uid, 'pending', docId);
            const updatedNotifs = this.notifications
                .filter(n => n.docId === docId)
                .map(n => n.inquiryId === inquiryId ? { ...n, read: true } : n);

            updateDoc(docRef, { notifications: updatedNotifs })
                .then(() => console.log(`Marked ${inquiryId} as read`))
                .catch(err => console.error('Error marking read:', err));

            // 🔹 Open the same modal as the dashboard table "View" button
            if (typeof window.viewInquiry === 'function') {
                window.viewInquiry(inquiryId);
            } else {
                console.warn('viewInquiry is not exposed globally.');
            }
        }

        $('#notificationDropdown').hide();
    }

    async markAllAsRead() {
        try {
            const updatePromises = [];

            // Group notifications by document
            const notifsByDoc = {};
            this.notifications.forEach(notif => {
                if (!notif.read && notif.docId) {
                    if (!notifsByDoc[notif.docId]) {
                        notifsByDoc[notif.docId] = [];
                    }
                    notifsByDoc[notif.docId].push(notif);
                }
            });

            // Update each document
            for (const [docId, notifs] of Object.entries(notifsByDoc)) {
                const docRef = doc(db, 'client', this.currentUser.uid, 'pending', docId);
                const updatedNotifs = this.notifications
                    .filter(n => n.docId === docId)
                    .map(n => ({ ...n, read: true }));

                updatePromises.push(
                    updateDoc(docRef, { notifications: updatedNotifs })
                );
            }

            await Promise.all(updatePromises);
            console.log('All notifications marked as read');

        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Just now';

        const date = timestamp.toDate();
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString();
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Initialize
$(document).ready(() => {
    window.notificationManager = new NotificationManager();
});

// Cleanup
$(window).on('beforeunload', () => {
    if (window.notificationManager) {
        window.notificationManager.destroy();
    }
});

export default NotificationManager;