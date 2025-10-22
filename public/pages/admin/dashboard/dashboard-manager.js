import { db, collection, getDocs } from '../../../firebase-config.js';

class DashboardManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    // ADD this method after loadDashboardData
    getAvailableMonths() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-11

        const months = [];
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Generate months from January to current month
        for (let i = 0; i <= currentMonth; i++) {
            months.push({
                value: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
                label: `${monthNames[i]} ${currentYear}`
            });
        }

        return months.reverse(); // Most recent first
    }

    async loadDashboardData(viewType = 'yearly', selectedMonth = null) {
        try {
            const completed = await getDocs(collection(db, 'completed'));
            const inquiries = this.parent.inquiries.length;
            const inProgress = this.parent.inProgressItems.length;
            const completedCount = completed.size;

            const serviceCounts = {};
            const allServices = [
                'Relocation Survey',
                'Boundary Survey',
                'Subdivision Survey',
                'Engineering Services',
                'Topographic Survey',
                'As-Built Survey',
                'Titling Assistance',
                'Consolidation Survey',
                'Parcellary Survey'
            ];

            allServices.forEach(service => serviceCounts[service] = 0);

            const currentYear = new Date().getFullYear();

            completed.forEach(doc => {
                const data = doc.data();

                // Filter by year first
                if (data.completedDate) {
                    const [year] = data.completedDate.split('-');
                    if (parseInt(year) !== currentYear) return;
                }

                // If monthly view, filter by selected month
                if (viewType === 'monthly' && selectedMonth) {
                    if (data.completedDate) {
                        const [year, month] = data.completedDate.split('-');
                        if (`${year}-${month}` !== selectedMonth) return;
                    }
                }

                // Count services
                if (data.selectedServices) {
                    data.selectedServices.forEach(service => {
                        if (serviceCounts[service] !== undefined) {
                            serviceCounts[service]++;
                        }
                    });
                }
            });

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