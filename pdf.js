// // pdf-extract.js

// // Wait for DOM to be ready
// document.addEventListener('DOMContentLoaded', function () {
//     // Get DOM elements
//     const pdfInput = document.getElementById('pdfInput');
//     const extractBtn = document.getElementById('extractPdfBtn');
//     const keyPointsDiv = document.getElementById('pdfKeyPoints');

//     if (!pdfInput || !extractBtn || !keyPointsDiv) return; // If not present, do nothing

//     extractBtn.addEventListener('click', async function () {
//         const file = pdfInput.files[0];
//         if (!file) {
//             keyPointsDiv.innerHTML = '<span style="color:red;">Please select a PDF file first.</span>';
//             return;
//         }
//         keyPointsDiv.innerHTML = 'Extracting text... Please wait.';

//         try {
//             // Read file as arrayBuffer
//             const arrayBuffer = await file.arrayBuffer();

//             // Load PDF
//             const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

//             let fullText = '';
//             for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
//                 const page = await pdf.getPage(pageNum);
//                 const txt = await page.getTextContent();
//                 fullText += txt.items.map(item => item.str).join(' ') + '\n';
//             }

//             // Extract key points (simple heuristic: long sentences, up to 10)
//             const sentences = fullText
//                 .split(/[\.\n]/)
//                 .map(s => s.trim())
//                 .filter(s => s.length > 40);
//             const keyPoints = sentences.slice(0, 10);

//             if (keyPoints.length === 0) {
//                 keyPointsDiv.innerHTML = '<em>No key points detected. Try another PDF or use a summary tool.</em>';
//                 return;
//             }

//             keyPointsDiv.innerHTML = `
//                 <strong>Key Points to Learn:</strong>
//                 <ul style="padding-left: 18px;">
//                     ${keyPoints.map(pt => `<li>${pt}</li>`).join('')}
//                 </ul>
//             `;
//         } catch (err) {
//             keyPointsDiv.innerHTML = '<span style="color:red;">Failed to extract PDF. Please try another file.</span>';
//             console.error(err);
//         }
//     });
// });




// 1. Load pdf.js library (add this to your HTML or load dynamically)
const pdfjsLibUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve();
    const script = document.createElement('script');
    script.src = pdfjsLibUrl;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 2. UI for PDF upload
function setupPdfUpload() {
  const uploadDiv = document.createElement('div');
  uploadDiv.innerHTML = `
    <input type="file" id="pdfInput" accept="application/pdf" style="margin:10px 0;">
    <button id="extractPdfBtn">Extract Key Points</button>
    <div id="pdfKeyPoints" style="margin-top:15px;"></div>
  `;
  document.body.insertBefore(uploadDiv, document.body.firstChild);

  document.getElementById('extractPdfBtn').onclick = async () => {
    const file = document.getElementById('pdfInput').files[0];
    if (!file) return alert("Please select a PDF file.");
    await loadPdfJs();
    extractPdfKeyPoints(file);
  };
}

// 3. Extract text from PDF
async function extractPdfKeyPoints(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textContent = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const txt = await page.getTextContent();
    textContent += txt.items.map(item => item.str).join(' ') + '\n';
  }
  displayKeyPoints(textContent);
}

// 4. Simple heuristic-based key point extraction
function displayKeyPoints(text) {
  // Split into sentences, pick those that look like main points
  const sentences = text.split(/[\.\n]/).map(s => s.trim()).filter(s => s.length > 40);
  // Optionally, filter for lines starting with numbers/bullets or containing "important", etc.
  const keyPoints = sentences.slice(0, 10); // Limit to top 10 for brevity

  const container = document.getElementById('pdfKeyPoints');
  if (keyPoints.length === 0) {
    container.innerHTML = "<em>No key points detected. Try another PDF or use a summary tool.</em>";
    return;
  }
  container.innerHTML = `
    <h4>Points to Learn:</h4>
    <ul>${keyPoints.map(pt => `<li>${pt}</li>`).join('')}</ul>
  `;
}

// 5. Initialize on page load
window.addEventListener('DOMContentLoaded', setupPdfUpload);

