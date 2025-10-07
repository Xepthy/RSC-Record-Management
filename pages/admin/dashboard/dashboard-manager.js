import { db, collection, getDocs } from '../../../firebase-config.js';

class DashboardManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    async loadDashboardData() {
        try {
            const completed = await getDocs(collection(db, 'completed'));
            const inquiries = this.parent.inquiries.length;
            const inProgress = this.parent.inProgressItems.length;
            const completedCount = completed.size;

            // Count services from completed items
            const serviceCounts = {};
            const allServices = [
                'Relocation Survey',
                'Boundary Survey',
                'Subdivision Survey',
                'Engineering Services',
                'Topographic Survey',
                'As-Built Survey',
                'Tilting Assistance'
            ];

            allServices.forEach(service => serviceCounts[service] = 0);

            completed.forEach(doc => {
                const data = doc.data();
                if (data.selectedServices) {
                    data.selectedServices.forEach(service => {
                        if (serviceCounts[service] !== undefined) {
                            serviceCounts[service]++;
                        }
                    });
                }
            });

            console.log('Service counts:', serviceCounts); // DEBUG LINE

            return {
                inquiries,
                inProgress,
                completed: completedCount,
                serviceCounts
            };
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            return null;
        }
    }

    getResetDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0 = Jan, 5 = June
        const day = now.getDate();

        // Check if we've passed June 20 this year
        if (month > 5 || (month === 5 && day >= 20)) {
            // Next reset is January 20 next year
            return `January 20, ${year + 1}`;
        }

        // Check if we've passed January 20 this year
        if (month > 0 || (month === 0 && day >= 20)) {
            // Next reset is June 20 this year
            return `June 20, ${year}`;
        }

        // We're before January 20, so next reset is January 20 this year
        return `January 20, ${year}`;
    }
}

export default DashboardManager;