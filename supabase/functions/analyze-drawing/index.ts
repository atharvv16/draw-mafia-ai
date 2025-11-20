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
You are analyzing a collaborative drawing game called Trouble Painter where players take turns drawing.

CRITICAL RULES:
1. One player is a "trouble painter" who doesn't know the keyword and tries to blend in
2. DO NOT reveal the keyword "${keyword}" in your guesses unless the drawing CLEARLY shows it
3. Make realistic guesses based ONLY on what's actually visible in the drawing
4. Early in the game, drawings are incomplete - be vague and uncertain
5. If the drawing is just lines or basic shapes, guess generic things like "abstract", "lines", "shape", "scribble"
6. Your guesses should progress from vague to specific as drawings become more detailed

Players: ${players.join(", ")}

Analyze the drawing and provide ONLY this JSON (no markdown, no explanation):
{
  "hint": "brief observation about what's visible (not the keyword)",
  "topGuesses": ["guess1", "guess2", "guess3"],
  "suspicionScores": { "PlayerName": 0.3 }
}

Suspicion scores (0.0 to 1.0):
- 0.0-0.2: normal drawing behavior
- 0.3-0.5: slightly suspicious (vague or odd strokes)
- 0.6-0.8: very suspicious (inconsistent with keyword)
- 0.9-1.0: likely the trouble painter
    `;

    // Use v1beta API with gemini-2.5-flash (current stable model)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`;

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
