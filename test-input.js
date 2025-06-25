import {
    db,
    collection,
    addDoc,
    getDocs,
} from './firebase-config.js';

$(document).ready(() => {

    $('#testSubmitBtn').click(async () => {
        const firstName = $('#firstName').val();
        const middleName = $('#middleName').val();
        const lastName = $('#lastName').val();
        const age = $('#age').val();

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

    async function loadEntries() {
        console.log('Loading entries...'); // <-- Add this

        const entriesRef = collection(db, 'client', 'testDoc', 'entries');
        const snapshot = await getDocs(entriesRef);

        $('#entriesTable tbody').empty();

        snapshot.forEach(doc => {
            const data = doc.data();
            $('#entriesTable tbody').append(`
            <tr>
              <td>${data.firstName}</td>
              <td>${data.middleName}</td>
              <td>${data.lastName}</td>
              <td>${data.age}</td>
            </tr>
          `);
        });
    }


    $('#refresh').click(() => {
        loadEntries();
    });

});
