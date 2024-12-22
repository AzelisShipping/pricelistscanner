const admin = require('firebase-admin');
const fetch = require('node-fetch');

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
    bodyParser: true,
    maxDuration: 300
  },
};

export default async function handler(req, res) {
  // Add CORS headers
  const allowedOrigins = ['https://azelisshipping.github.io'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, referenceData } = req.body;

  if (!text || !referenceData) {
    return res.status(400).json({ error: 'Missing text or referenceData in request body.' });
  }

  const prompt = `
You are a data processing assistant.

Given the following text and reference data, identify **all** matched product SKUs and provide their details.

**Text:**
${text}

**Reference Data:**
${JSON.stringify(referenceData)}

**Instructions:**
1. Identify all instances where a product SKU from the reference data appears in the text.
2. For each matched SKU, return an object containing the "sku", "description", and "weight".
3. Ensure that the response is a valid JSON array without any additional text or explanations.

**Expected Format:**
[
  {
    "sku": "ABC123",
    "description": "High-quality widget for industrial use.",
    "weight": 2.5
  },
  {
    "sku": "XYZ789",
    "description": "Compact gadget for everyday tasks.",
    "weight": 0.75
  }
]
`;

  try {
    console.log('Sending request to OpenAI...');
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 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`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides only JSON data as instructed.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0
      })
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error("OpenAI API error:", errorText);
      return res.status(openaiRes.status).json({ error: "OpenAI API error", details: errorText });
    }

    const data = await openaiRes.json();
    console.log('Received response from OpenAI');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Unexpected OpenAI response format.", data);
      return res.status(500).json({ error: "Unexpected OpenAI response format" });
    }

    const answer = data.choices[0].message.content.trim();
    
    let processedData;
    try {
      processedData = JSON.parse(answer);
      if (!Array.isArray(processedData)) {
        throw new Error("Response is not an array");
      }
    } catch (e) {
      console.error("Invalid JSON returned by the model:", answer);
      return res.status(500).json({ error: "Invalid JSON returned by the model", raw: answer });
    }

    res.status(200).json(processedData);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
}
