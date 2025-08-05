import {
    db,
    collection,
    addDoc,
    getDocs
} from './firebase-config.js';

$(document).ready(() => {
    $('#testSubmitBtn').click(async () => {
        const firstName = $('#firstName').val().trim();
        const middleName = $('#middleName').val().trim();
        const lastName = $('#lastName').val().trim();
        const age = $('#age').val().trim();

        const nameRegex = /^[A-Za-z\s'-]+$/;
        const ageRegex = /^\d+$/;

        if (!firstName || !middleName || !lastName || !age) {
            alert('All fields are required.');
            return;
        }

        if (!nameRegex.test(firstName) || !nameRegex.test(middleName) || !nameRegex.test(lastName)) {
            alert('Names must contain only letters, spaces, or hyphens.');
            return;
        }

        if (!ageRegex.test(age) || parseInt(age) < 1 || parseInt(age) > 120) {
            alert('Age must be a valid number between 1 and 120.');
            return;
        }

        try {
            const entriesRef = collection(db, 'client', 'testDoc', 'entries');
            await addDoc(entriesRef, {
                firstName,
                middleName,
                lastName,
                age
            });

            alert('Saved! Click Refresh to view in table.');
            $('#firstName, #middleName, #lastName, #age').val('');
        } catch (error) {
            alert('Failed to save: ' + error.message);
            console.error(error);
        }
    });

    let dataTableInstance;

    async function loadEntries() {
        const entriesRef = collection(db, 'client', 'testDoc', 'entries');
        const snapshot = await getDocs(entriesRef);

        if ($.fn.DataTable.isDataTable('#entriesTable')) {
            $('#entriesTable').DataTable().clear().destroy();
        }

        const tableBody = $('#entriesTable tbody');
        tableBody.empty();

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const viewBtn = `<button class="viewBtn" data-firstname="${data.firstName}" data-lastname="${data.lastName}">View</button>`;

            const row = `
            <tr>
                <td>${data.firstName}</td>
                <td>${data.middleName}</td>
                <td>${data.lastName}</td>
                <td>${data.age}</td>
                <td>${viewBtn}</td>
            </tr>
        `;

            tableBody.append(row);
        });

        dataTableInstance = $('#entriesTable').DataTable({
            pageLength: 5,
            lengthMenu: [5, 10, 20],
            ordering: true,
            searching: true
        });
    }

    $('#refresh').click(() => {
        loadEntries();
    });


    $(document).on('click', '.viewBtn', function () {
        const firstName = $(this).data('firstname');
        const lastName = $(this).data('lastname');
        alert(`First Name: ${firstName}\nLast Name: ${lastName}`);
    });

    loadEntries();
});
