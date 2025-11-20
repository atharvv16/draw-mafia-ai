import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { imageData, keyword, players } = await req.json();

    if (!imageData) return json({ error: "Missing imageData" }, 400);
    if (!players || !players.length) return json({ error: "Missing players" }, 400);

    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) return json({ error: "Missing GEMINI_API_KEY" }, 500);

    const base64 = imageData.split(",")[1];

    const prompt = `
You are analyzing a collaborative drawing game called Trouble Painter.

Keyword: "${keyword}"
Players: ${players.join(", ")}

Provide ONLY this JSON:
{
  "hint": "...",
  "topGuesses": ["g1","g2","g3"],
  "suspicionScores": { "player": 0.1 }
}
    `;

    // Use v1beta API with latest flash model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${KEY}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/png",
                data: base64,
              },
            },
          ],
        },
      ],
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return json(
        { error: "Gemini error", details: data },
        resp.status
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.[0]?.text ||
      "";

    if (!text) return json({ error: "No text returned by model" });

    let clean = text.trim();
    if (clean.startsWith("```")) clean = clean.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return json({
        error: "Invalid JSON from AI",
        raw: clean,
      });
    }

    return json(parsed);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
