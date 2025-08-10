import {
    auth,
    onAuthStateChanged,
    db,
    doc,
    getDoc
} from '../../firebase-config.js';

onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        try {
            const userRef = doc(db, 'client', user.uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();

                const firstName = userData.firstName ?
                    userData.firstName.replace(/[<>]/g, '').trim() : 'User';

                $("#welcomeText").html(`Welcome ${firstName}!`);
            } else {
                // User document doesn't exist
                $("#welcomeText").html(`Welcome User!`);
            }

        } catch (error) {
            console.error('Error fetching user data:', error);

            $("#welcomeText").html(`Welcome User!`);
        }
    } else {
        // Not signed in or email not verified
        $("#welcomeText").html(`Welcome Guest!`);
    }
});