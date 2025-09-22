
import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc
} from '../../../firebase-config.js';
class InProgressManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    async setupInProgressListener() {
        try {
            console.log('Setting up in-progress listener...');
            this.parent.uiRenderer.showLoading();

            const inProgressQuery = query(
                collection(db, 'inProgress'),
                orderBy('createdAt', 'desc')
            );

            this.parent.unsubscribeInProgress = onSnapshot(inProgressQuery, (snapshot) => {
                console.log('InProgress snapshot received:', snapshot.size, 'documents');

                // Filter out the _init document
                this.parent.inProgressItems = snapshot.docs
                    .filter(doc => doc.id !== '_init')
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                console.log('Processed in-progress items:', this.parent.inProgressItems.length);

                // Always update notification count
                this.parent.updateInProgressNotificationCount();

                // Only update UI if we're currently viewing in-progress
                if ($('#inProgressNav').hasClass('active')) {
                    this.parent.uiRenderer.showInProgressItems();
                }

            }, (error) => {
                console.error('Error listening to in-progress:', error);
                this.parent.uiRenderer.showError('Failed to load in-progress: ' + error.message);
            });

        } catch (error) {
            console.error('Error setting up in-progress listener:', error);
            this.parent.uiRenderer.showError('Failed to initialize in-progress: ' + error.message);
        }
    }

    async markInProgressAsRead(itemId) {
        try {
            const item = this.parent.inProgressItems.find(item => item.id === itemId);
            if (!item || item.read) {
                return;
            }

            const itemDocRef = doc(db, 'inProgress', itemId);
            await updateDoc(itemDocRef, {
                read: true,
            });

            console.log('InProgress item marked as read:', itemId);

        } catch (error) {
            console.error('Error marking in-progress item as read:', error);
        }
    }

    formatServices(services) {
        if (!services || services.length === 0) return 'None';

        // If more than 3 services, show first 2 and "X more"
        if (services.length > 3) {
            return services.slice(0, 2).join(', ') + ` +${services.length - 2} more`;
        }

        return services.join(', ');
    }











}

export default InProgressManager;