// script.js

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX89iKbSulLbxz3qPxLlcuKCMF-qqptwA",
  authDomain: "pricelistscanner.firebaseapp.com",
  projectId: "pricelistscanner",
  storageBucket: "pricelistscanner.appspot.com",
  messagingSenderId: "925350073765",
  appId: "1:925350073765:web:4c6f0d1c0471df1df0c44c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Get references to DOM elements
const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const processBtn = document.getElementById('processBtn');

const bulkUploadInput = document.getElementById('bulkUploadInput');
const bulkUploadBtn = document.getElementById('bulkUploadBtn');
const bulkStatusEl = document.getElementById('bulkStatus');

// Handle file selection for processing
fileInput.addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files);
  statusEl.textContent = 'Selected files: ' + selectedFiles.map(f => f.name).join(', ');
});

// Handle "Process Files" button click
processBtn.addEventListener('click', async () => {
  const selectedFiles = Array.from(fileInput.files);
  if (selectedFiles.length === 0) {
    alert('Please select a file first.');
    return;
  }

  try {
    statusEl.textContent = 'Loading reference data...';
    const referenceData = await loadReferenceData();

    statusEl.textContent = 'Extracting text from files...';
    let extractedText = '';
    for (const file of selectedFiles) {
      extractedText += (await extractFileText(file)) + '\n';
    }

    statusEl.textContent = 'Sending data to OpenAI for processing...';
    const processedData = await callFunctionForOpenAI(extractedText, referenceData);

    statusEl.textContent = 'Generating processed Excel file...';
    downloadExcel(processedData);

    statusEl.textContent = 'Process completed successfully!';
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'Error: ' + error.message;
    alert('An error occurred: ' + error.message);
  }
});

// Handle bulk upload button click
bulkUploadBtn.addEventListener('click', async () => {
  const bulkFiles = bulkUploadInput.files;
  if (bulkFiles.length === 0) {
    alert('Please select an Excel file to upload.');
    return;
  }

  const bulkFile = bulkFiles[0];
  bulkStatusEl.textContent = 'Uploading business data...';

  try {
    // Validate the Excel file before uploading
    await validateBulkExcel(bulkFile);
  } catch (validationError) {
    bulkStatusEl.textContent = 'Error: ' + validationError;
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', bulkFile);

    const response = await fetch('https://pricelistscanner.vercel.app/api/uploadBusinessData', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to upload business data.');
    }

    bulkStatusEl.textContent = 'Business data uploaded successfully!';
  } catch (error) {
    console.error(error);
    bulkStatusEl.textContent = 'Error: ' + error.message;
  }
});

// Function to load reference data from Firestore
async function loadReferenceData() {
  const snapshot = await db.collection('products').get();
  return snapshot.docs.map(doc => ({
    sku: doc.data().sku.trim().toUpperCase(),
    description: doc.data().description.trim(),
    weight: doc.data().packWeight, // Ensure the field name matches your Firestore schema
    // Include other fields if needed
  }));
}

// Function to extract text from a file (Excel or PDF)
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

// Function to extract text from Excel files
async function extractExcelText(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Assuming 'Code' is the second column (index 1)
  return jsonData.map(row => {
    if (row.length >= 2) {
      return row.map((cell, index) => index === 1 ? String(cell).trim().toUpperCase() : cell).join(' ');
    }
    return row.join(' ');
  }).join('\n');
}

// Function to extract text from PDF files
async function extractPDFText(file) {
  const pdfData = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

// Function to call the OpenAI API
async function callFunctionForOpenAI(text, referenceData) {
  const url = "https://pricelistscanner.vercel.app/api/openai";

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, referenceData })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unknown error occurred.');
    }

    return response.json();
  } catch (error) {
    console.error("Error in callFunctionForOpenAI:", error);
    throw error; // Rethrow to be caught in the main try-catch
  }
}

// Function to download processed data as an Excel file
function downloadExcel(data) {
  if (!Array.isArray(data)) {
    console.error("Data is not an array:", data);
    alert('Error: Processed data is not in the correct format.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Processed");
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'processed_data.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Function to validate the structure of the bulk upload Excel file
function validateBulkExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const requiredHeaders = [
        'Account Selection',
        'Product Number',
        'Product Description',
        'Search Description',
        'Pack Weight'
      ];

      const headers = jsonData[0];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

      if (missingHeaders.length > 0) {
        reject(`Missing headers: ${missingHeaders.join(', ')}`);
      } else {
        resolve(true);
      }
    };

    reader.onerror = (error) => {
      reject('Error reading the file');
    };

    reader.readAsArrayBuffer(file);
  });
}
