// api/openai.js

const admin = require('firebase-admin');
const fetch = require('node-fetch');

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
    bodyParser: true, // Enable body parsing
  },
};

export default async function handler(req, res) {
  // Add CORS headers
// New code for api/uploadBusinessData.js
res.setHeader('Access-Control-Allow-Origin', 'https://azelisshipping.github.io');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
res.setHeader('Access-Control-Allow-Credentials', 'true');

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
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // or 'gpt-4' if you have access
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
    res.status(500).json({ error: 'Something went wrong' });
  }
}
