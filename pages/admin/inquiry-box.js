import { db, collection, onSnapshot, query, orderBy }
    from "../../firebase-config.js";

const inquiryList = document.getElementById("inquiryList");

// Live listener on inquiries collection
const q = query(collection(db, "inquiries"), orderBy("dateSubmitted", "desc"));

onSnapshot(q, (snapshot) => {
    inquiryList.innerHTML = ""; // clear list each update
    snapshot.forEach((doc) => {
        const inquiry = doc.data();
        const div = document.createElement("div");
        div.classList.add("inquiry-box");

        div.innerHTML = `
      <div class="inquiry-header">${inquiry.clientName} – ${inquiry.classification}</div>
      <div><strong>Description:</strong> ${inquiry.requestDescription}</div>
      <div><strong>Location:</strong> ${inquiry.location}</div>
      <div><strong>Contact:</strong> ${inquiry.contact}</div>
      <div><strong>Submitted:</strong> ${new Date(inquiry.dateSubmitted).toLocaleString()}</div>
      <div class="status ${inquiry.status}">Status: ${inquiry.status}</div>
    `;

        inquiryList.appendChild(div);
    });
});
