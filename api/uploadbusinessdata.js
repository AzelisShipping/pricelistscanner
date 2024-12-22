const admin = require('firebase-admin');
const XLSX = require('xlsx');
const formidable = require('formidable');
const fs = require('fs');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: "pricelistscanner",
      private_key_id: "776723b5298d8464de20a87832132ecb48a73fe5",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDqkNNzfHA2baLQ\nFU+C64oS7zv8Zv8BiXD8m51yP4bqLbGW+3o7SoicMBrhjE+BYxkUpW2jLM3lM3gw\nkF+3RQ+q8ovWXj6uB472G9YfskVIB2ocnMHadUvVUVlDve+yn4t5GzNFyx09LGiS\nq9t0HjinJKH8rLLI8J8k60EOUfhD46ghIX0ZrnTq+8KTUx3WZFOl1VL8/60ZIt7P\n0agnRPV6ZpgLbLB5DuH7nQUEn/7uslnnh2ob8sq93eMKTj7HJZay+Z9EP7D8lVRz\nP/0BD4yRAGRCaUySuAzGehQf/FeyO7LAFdQnOFHmpGXLe8CdcyfJuaUMPGXCSTQl\n6mJGoFODAgMBAAECggEAHXyYQD/H4We13F+Zb7VJVakCSu/tpZVQAUlUqQyIWr7k\nwLybOIHdm3jGoEzhn7vD5t8G4cjblzD5rm0vwxuo5Q35ezi8u2bS12hXagOghvX7\npl4kVmCBaG8CACyLydIZl99N+juW0N5YxPtaqoW0DHrj7B4PmYf6EYuLUZAHXA0w\nM9pzJP+rdjyWe+rK8qUoCveqPkWAJhnrTFVE9s12P9mACTpWU6GCjzzKUn/8AjbA\nGSy0HTyUE8HRiJErHsmbwRqmwAPpKoExD/2c7PZ/LiVqg7jxbOIF3E49il5dLqbJ\nA07WDLCesVfKyHsEbd6Qpxx/ueYHOQQKtYnCFCluQQKBgQD31N5acAC3Dm86yxnb\nDurkJiCGj7NadQUVjM+JfCAUBRJL1A8nJ25p3HIidc+frQ/Wb32k52tjQlllmdqm\nDJiXZQDkOsGab8teE4HLQAW9yKYsnwsQYYg1ydBIyS3gBQ8VNaqzZskp/t4brYua\nGzEpb7fOXthXXsUsQZ/JXrthwwKBgQDyTAZDIucS3cZZ/rfb5XkCnPCnwxW2ogBQ\n4+fGkpUp4Zj5VfoRbBtMHSMJe+1dDz2rgnQ4NePilfLqpqsyb4woMNvKQgqg4HWE\ni7Dts1JcNbKN/MikYyufKyVw5VwVe7y21OwShOhMznM11Ttl4xFc10qSSZcLU50F\nxrnSWRBrQQKBgQCEFu7UIPIgnw7ltS54tQC4zSF01s5vHgOxsrVCv+eRBAr2Y3YY\nFkohHh+vAj/BCUpxrka3R6jS5KAlKNWCvx/tQSYyfqaFm6Q25gq9u8fTmUgIbFRH\nTNR+Zqwevys2RTv+v/XVXKlHOtJCykKnxmpzfVnoImEIYDiTF/8EIvuYZQKBgAis\nZAT/ONpaCgGqtpYujrhjOdInj51sCyraHa/kC2bmZn12cG8zOX7uBBUQ1JxiMUj0\ncIialT/FMl7n/HTfvVqq9RM2bf74Sfymq3y20JnwaiXfCKepzSPzfXGfJD64oTbC\nRHkdPNuTAFjK+0dYa4SxSEAYVknXgmV0ia5X9diBAoGBAOO05/V7S5XnJ8cHERcV\nUAqk859YXbQZytmwW5jz+PlaEHEtp8yoQe3m37JBX+ui08Hppg4HxFfJ+69aem7O\n1FXGhkcLNYy3iVOW0JCW/rxDB8RclFj90DEYFlQHhDH4CdoOOjexL7sFg0qSwbFo\nRcqJJEbJ8t/1NIpIXTPXIJRb",
      client_email: "firebase-adminsdk-597tu@pricelistscanner.iam.gserviceaccount.com",
      client_id: "116038222910798065177",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-597tu%40pricelistscanner.iam.gserviceaccount.com"
    }),
    databaseURL: "https://pricelistscanner.firebaseio.com"
  });
}

const db = admin.firestore();

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 300
  },
};

export default async function handler(req, res) {
  // Update CORS headers to specifically allow your GitHub Pages domain
  const allowedOrigins = ['https://azelisshipping.github.io'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse the incoming form with formidable
  const form = new formidable.IncomingForm({
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
  });

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
      console.log('Reading file:', file.filepath);
      // Read the uploaded Excel file
      const workbook = XLSX.readFile(file.filepath, {
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        defval: '',
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });

      console.log('Parsed Excel data:', jsonData[0]); // Log first row for debugging

      // Validate and transform the data
      const requiredHeaders = [
        'Account Selection',
        'Product Number',
        'Product Description',
        'Search Description',
        'Pack Weight'
      ];

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      const headers = Object.keys(jsonData[0]);
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

      if (missingHeaders.length > 0) {
        return res.status(400).json({ error: `Missing headers: ${missingHeaders.join(', ')}` });
      }

      // Prepare batch write to Firestore
      const batch = db.batch();
      let processedCount = 0;
      let skippedCount = 0;

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
          skippedCount++;
          return;
        }

        const docRef = db.collection('products').doc(productNumber.toString().trim());

        batch.set(docRef, {
          accountSelection: accountSelection ? accountSelection.toString().trim() : '',
          sku: productNumber.toString().trim(),
          description: productDescription ? productDescription.toString().trim() : '',
          searchDescription: searchDescription ? searchDescription.toString().trim() : '',
          packWeight: typeof packWeight === 'number' ? packWeight : parseFloat(packWeight) || 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        processedCount++;
      });

      console.log(`Attempting to commit batch with ${processedCount} items`);
      await batch.commit();
      
      res.status(200).json({ 
        message: 'Business data uploaded successfully!',
        processed: processedCount,
        skipped: skippedCount
      });

    } catch (error) {
      console.error('Detailed error:', {
        error: error.message,
        stack: error.stack,
        requestBody: req.body,
        filepath: file?.filepath,
        filename: file?.originalFilename
      });
      res.status(500).json({ error: 'Error processing the file', details: error.message });
    } finally {
      // Remove the uploaded file from the server
      if (file?.filepath) {
        fs.unlink(file.filepath, (err) => {
          if (err) console.error("Error deleting uploaded file:", err);
        });
      }
    }
  });
}
