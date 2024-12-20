export const config = {
  api: {
    bodyParser: true, // Ensures the request body is parsed
  },
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log("OPTIONS request received, returning 200.");
    return res.status(200).end();
  }

  // Debugging logs
  console.log("Request method:", req.method);
  console.log("Request headers:", req.headers);
  console.log("Request body:", req.body);

  // Attempt to destructure the body
  const { text, referenceData } = req.body || {};

  // If body or required fields are missing, return an error early
  if (!text || !referenceData) {
    console.error("Missing 'text' or 'referenceData' in request body.");
    return res.status(400).json({ error: "Missing text or referenceData in request body." });
  }

  const prompt = `
You are a data processing assistant.

Given the following text and reference data, identify matched codes and their decisions.

Text:
${text}

Reference Data:
${JSON.stringify(referenceData)}

Please respond only with a JSON array of objects, each containing the matched code and its decision, in the following format:

[
  {
    "code": "ABC123",
    "decision": "Approved"
  },
  {
    "code": "XYZ789",
    "decision": "Rejected"
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
        model: 'gpt-3.5-turbo', // Correct model name
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides only JSON data as instructed.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0
      })
    });

    console.log("OpenAI response status:", openaiRes.status);

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error("OpenAI API error:", errorText);
      return res.status(openaiRes.status).json({ error: "OpenAI API error", details: errorText });
    }

    const data = await openaiRes.json();
    console.log("OpenAI response data:", data);

    // Ensure the response structure is as expected
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Unexpected OpenAI response format.", data);
      return res.status(500).json({ error: "Unexpected OpenAI response format" });
    }

    const answer = data.choices[0].message.content.trim();

    console.log("Raw answer from OpenAI:", answer);

    let processedData;
    try {
      processedData = JSON.parse(answer);
    } catch (e) {
      console.error("Invalid JSON returned by the model:", answer);
      // Optionally, return the raw answer for further debugging
      return res.status(500).json({ error: "Invalid JSON returned by the model", raw: answer });
    }

    res.status(200).json(processedData);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
