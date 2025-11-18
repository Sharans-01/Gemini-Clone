// File: netlify/functions/geminiProxy.js

exports.handler = async (event) => {
  try {
    const fetch = (await import("node-fetch")).default;

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in environment variables");
    }

    // Parse incoming body
    const body = JSON.parse(event.body || "{}");
    const userMessage = body.message;

    if (!userMessage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Message is required" }),
      };
    }

    // Gemini API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: userMessage }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gemini API Error");
    }

    // Success — send Gemini response back to frontend
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("Server Error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
