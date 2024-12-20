// api/uploadBusinessData.js

const admin = require('firebase-admin');
const XLSX = require('xlsx');
const formidable = require('formidable');
const fs = require('fs');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    }),
    databaseURL: "https://pricelistscanner.firebaseio.com"
  });
}

const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust as needed
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse the incoming form with formidable
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parsing error:", err);
      return res.status(500).json({ error: 'Error parsing the file' });
    }

    const file = files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Read the uploaded Excel file
      const workbook = XLSX.readFile(file.filepath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      // Validate and transform the data
      const requiredHeaders = [
        'Account Selection',
        'Product Number',
        'Product Description',
        'Search Description',
        'Pack Weight'
      ];

      // Check if all required headers are present
      const headers = Object.keys(jsonData[0]);
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

      if (missingHeaders.length > 0) {
        return res.status(400).json({ error: `Missing headers: ${missingHeaders.join(', ')}` });
      }

      // Prepare batch write to Firestore
      const batch = db.batch();

      jsonData.forEach((row, index) => {
        const {
          'Account Selection': accountSelection,
          'Product Number': productNumber,
          'Product Description': productDescription,
          'Search Description': searchDescription,
          'Pack Weight': packWeight
        } = row;

        if (!productNumber) {
          console.warn(`Row ${index + 2}: Missing Product Number, skipping.`);
          return; // Skip rows without Product Number
        }

        const docRef = db.collection('products').doc(productNumber.trim());

        batch.set(docRef, {
          accountSelection: accountSelection.trim(),
          sku: productNumber.trim(),
          description: productDescription.trim(),
          searchDescription: searchDescription.trim(),
          packWeight: parseFloat(packWeight),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          // uploadedBy field can be removed or set to a default value if not tracking users
        }, { merge: true });
      });

      // Commit the batch
      await batch.commit();

      res.status(200).json({ message: 'Business data uploaded successfully!' });
    } catch (error) {
      console.error("Error processing the file:", error);
      res.status(500).json({ error: 'Error processing the file', details: error.message });
    } finally {
      // Remove the uploaded file from the server
      fs.unlink(file.filepath, (err) => {
        if (err) console.error("Error deleting uploaded file:", err);
      });
    }
  });
}
