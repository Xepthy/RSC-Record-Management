import {
  db,
  collection,
  getDocs
} from './firebase-config.js';

$(document).ready(() => {
  loadDocuments();
});

async function loadDocuments() {
  try {
    const docsRef = collection(db, 'client', 'testDoc', 'entries'); // Adjust path if needed
    const snapshot = await getDocs(docsRef);

    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderCards(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    $('#cardContainer').html(`
        <div class="alert alert-danger">Failed to load documents.</div>
      `);
  }
}

function renderCards(documents) {
  const html = documents.map(doc => `
      <div class="card shadow-sm border rounded-4 m-3" style="width: 20rem;">
        <div class="card-body pb-2">
          <h5 class="card-title fw-bold text-info text-capitalize">
            ${doc.document_type?.replace(/_/g, ' ') || 'Unknown Type'}
          </h5>
        </div>
        <div class="d-flex align-items-center justify-content-center" style="height: 200px;">
          ${doc.file_path
      ? `<img src="${doc.file_path}" class="img-fluid rounded border" style="max-height: 180px;" alt="${doc.document_type}">`
      : `<span class="text-muted fst-italic">No file uploaded</span>`
    }
        </div>
        <div class="card-footer bg-white border-0 text-end small text-secondary px-3 pb-3">
          ${doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : ''}
        </div>
      </div>
    `).join('');

  $('#cardContainer').html(html);
}
