import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function respond(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const { imageData, keyword, players } = body;

    if (!imageData) return respond({ error: "Missing imageData" }, 400);
    if (!players || !players.length) return respond({ error: "Missing players array" }, 400);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return respond({ error: "Missing GEMINI_API_KEY" }, 500);

    // Extract base64
    const base64Data = imageData.split(",")[1];

    // -------------------------------
    // ⭐ WORKING MODEL + ENDPOINT ⭐
    // -------------------------------
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
You are analyzing a collaborative drawing for the game Trouble Painter.
Keyword: "${keyword}"
Players: ${players.join(", ")}

Respond ONLY with JSON in this format:
{
  "hint": "...",
  "topGuesses": ["g1","g2","g3"],
  "suspicionScores": { "player1": 0.2, "player2": 0.7 }
}
`;

    const geminiResp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    if (!geminiResp.ok) {
      const err = await geminiResp.text();
      console.error("❌ Gemini Error:", err);
      return respond({ error: err }, 500);
    }

    const data = await geminiResp.json();

    // Extract AI text
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.[0]?.text ||
      "";

    if (!text) return respond({ error: "Gemini returned no text" }, 500);

    // Remove ```
    let clean = text.trim();
    clean = clean.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "");

    let jsonResult;

    try {
      jsonResult = JSON.parse(clean);
    } catch (e) {
      console.error("❌ JSON Parsing Error", clean);
      return respond({ error: "Invalid JSON from AI", raw: clean }, 500);
    }

    return respond(jsonResult);
  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    return respond({ error: err.message }, 500);
  }
});
