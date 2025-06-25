import {
    db,
    collection,
    addDoc,
    getDocs
} from './firebase-config.js';

$(document).ready(() => {

    // 🔘 Submit test data to Firestore
    $('#testSubmitBtn').click(async () => {
        const firstName = $('#firstName').val().trim();
        const middleName = $('#middleName').val().trim();
        const lastName = $('#lastName').val().trim();
        const age = $('#age').val().trim();

        // Basic validations
        const nameRegex = /^[A-Za-z\s'-]+$/;
        const ageRegex = /^\d+$/;

        if (!firstName || !middleName || !lastName || !age) {
            alert('All fields are required.');
            return;
        }

        if (!nameRegex.test(firstName)) {
            alert('First name must contain only letters.');
            return;
        }
        if (!nameRegex.test(middleName)) {
            alert('Middle name must contain only letters.');
            return;
        }
        if (!nameRegex.test(lastName)) {
            alert('Last name must contain only letters.');
            return;
        }
        if (!ageRegex.test(age) || parseInt(age) < 1 || parseInt(age) > 120) {
            alert('Age must be a number between 1 and 120.');
            return;
        }

        // If all is good, save to Firestore
        try {
            const entriesRef = collection(db, 'client', 'testDoc', 'entries');
            await addDoc(entriesRef, {
                firstName,
                middleName,
                lastName,
                age
            });

            alert('Saved! Click Refresh to view in table.');
        } catch (error) {
            alert('Failed to save: ' + error.message);
            console.error(error);
        }
    });


    // 🔄 Load and safely render entries to the table
    async function loadEntries() {
        const entriesRef = collection(db, 'client', 'testDoc', 'entries');
        const snapshot = await getDocs(entriesRef);

        $('#entriesTable tbody').empty();

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            const row = $('<tr>');
            $('<td>').text(data.firstName).appendTo(row);
            $('<td>').text(data.middleName).appendTo(row);
            $('<td>').text(data.lastName).appendTo(row);
            $('<td>').text(data.age).appendTo(row);

            $('#entriesTable tbody').append(row);
        });
    }

    // 🔘 Refresh button to reload the table
    $('#refresh').click(() => {
        loadEntries();
    });

    // Optional: auto-load on page start
    loadEntries();
});
