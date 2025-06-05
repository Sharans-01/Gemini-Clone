// netlify/functions/geminiProxy.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) throw new Error("API key is missing");

    const body = JSON.parse(event.body || '{}');
    const userMessage = body.message;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: userMessage }] }
        ]
      })
    });

    const result = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Proxy Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
};
