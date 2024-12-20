// Project information (for reference only):
// Project name: pricelistscanner
// Project ID: pricelistscanner
// App nickname: pricelistmatchapp
// App ID: 1:925350073765:web:4c6f0d1c0471df1df0c44c

// Firebase web app configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX89iKbSulLbxz3qPxLlcuKCMF-qqptwA",
  authDomain: "pricelistscanner.firebaseapp.com",
  projectId: "pricelistscanner",
  storageBucket: "pricelistscanner.firebasestorage.app",
  messagingSenderId: "925350073765",
  appId: "1:925350073765:web:4c6f0d1c0471df1df0c44c"
};

// Initialize Firebase (using v8 SDK)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Get references to DOM elements
const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const processBtn = document.getElementById('processBtn');

let selectedFiles = [];

// Handle file selection
fileInput.addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files);
  statusEl.textContent = 'Selected files: ' + selectedFiles.map(f => f.name).join(', ');
});

// When "Process Files" is clicked
processBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    alert('Please select a file first.');
    return;
  }

  try {
    statusEl.textContent = 'Loading reference data...';
    const referenceData = await loadReferenceData();

    statusEl.textContent = 'Extracting text...';
    let extractedText = '';
    for (const file of selectedFiles) {
      extractedText += (await extractFileText(file)) + '\n';
    }

    statusEl.textContent = 'Sending to OpenAI...';
    const processedData = await callFunctionForOpenAI(extractedText, referenceData);

    statusEl.textContent = 'Generating Excel...';
    downloadExcel(processedData);

    statusEl.textContent = 'Done!';
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'Error: ' + error.message;
  }
});

async function loadReferenceData() {
  const snapshot = await db.collection('referenceData').get();
  return snapshot.docs.map(doc => doc.data());
}

async function extractFileText(file) {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return await extractExcelText(file);
  } else if (fileName.endsWith('.pdf')) {
    return await extractPDFText(file);
  } else {
    // Treat unknown files as text
    return await file.text();
  }
}

async function extractExcelText(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {header:1});
  return jsonData.map(row => row.join(' ')).join('\n');
}

async function extractPDFText(file) {
  const pdfData = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

async function callFunctionForOpenAI(text, referenceData) {
  const url = "https://pricelistscanner.vercel.app/api/openai";
  
  const response = await fetch(url, {
    method: 'POST', // Ensure POST is used
    headers: {
      'Content-Type': 'application/json' // Ensure JSON headers are set
    },
    body: JSON.stringify({ text, referenceData }) // Ensure body is stringified JSON
  });

  return response.json();
}


function downloadExcel(data) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Processed");
  const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  const blob = new Blob([wbout], {type:'application/octet-stream'});
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'processed_data.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
