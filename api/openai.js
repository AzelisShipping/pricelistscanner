export default async function handler(req, res) {
  const { text, referenceData } = req.body;

  const prompt = `
  Text: ${text}
  Reference Data: ${JSON.stringify(referenceData)}
  Return a JSON array of matched codes and decisions.
  `;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4', // or 'gpt-3.5-turbo' if you don't have GPT-4 access
        messages: [
          { role: 'system', content: 'You return only JSON of matched codes and decisions.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0
      })
    });

    const data = await openaiRes.json();
    const answer = data.choices[0].message.content.trim();

    let processedData;
    try {
      processedData = JSON.parse(answer);
    } catch {
      processedData = [{error: "Invalid JSON returned by the model"}];
    }

    res.status(200).json(processedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Something went wrong'});
  }
}

