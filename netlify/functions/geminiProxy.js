exports.handler = async (event) => {
  const fetch = (await import('node-fetch')).default; // ✅ dynamic import for ESM compatibility

  try {
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY not defined");
    }

    const body = JSON.parse(event.body || '{}');
    const userMessage = body.message;

    if (!userMessage) {
      throw new Error("No message provided in body");
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
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

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      throw new Error(geminiData.error?.message || "Gemini API Error");
    }

    return {
      statusCode: 200,
      body: JSON.stringify(geminiData),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown server error" }),
    };
  }
};
