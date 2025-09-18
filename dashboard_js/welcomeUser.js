import {
    auth,
    onAuthStateChanged,
    db,
    doc,
    getDoc
} from '../firebase-config_js/firebase-config.js';

onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        try {
            // Try sessionStorage first
            const cachedUser = sessionStorage.getItem("clientProfile");

            if (cachedUser) {
                const userData = JSON.parse(cachedUser);
                $("#welcomeText").html(`Welcome ${userData.firstName || "User"}!`);
                return; // ✅ Skip Firestore read
            }

            // Not cached → fetch from Firestore
            const userRef = doc(db, 'client', user.uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                userData.firstName = userData.firstName
                    ? userData.firstName.replace(/[<>]/g, '').trim()
                    : 'User';

                // Save to sessionStorage
                sessionStorage.setItem("clientProfile", JSON.stringify(userData));

                $("#welcomeText").html(`Welcome ${userData.firstName}!`);
            } else {
                $("#welcomeText").html(`Welcome User!`);
            }

        } catch (error) {
            console.error('Error fetching client data:', error);
            $("#welcomeText").html(`Welcome User!`);
        }
    } else {
        $("#welcomeText").html(`Welcome Guest!`);
        sessionStorage.removeItem("clientProfile"); // clear cache on logout
    }
});