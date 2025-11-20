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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

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

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64}`,
              },
            },
          ],
        },
      ],
    };

    // Retry logic with exponential backoff
    let lastError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
      
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      // Success case
      if (resp.ok) {
        const text = data?.choices?.[0]?.message?.content || "";

        if (!text) return json({ error: "No text returned by model" }, 500);

        let clean = text.trim();
        if (clean.startsWith("```")) clean = clean.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");

        let parsed;
        try {
          parsed = JSON.parse(clean);
        } catch (e) {
          return json({
            error: "Invalid JSON from AI",
            raw: clean,
          }, 500);
        }

        return json(parsed);
      }

      // Handle specific error cases
      lastError = data;
      
      // Handle rate limits (429) and payment required (402)
      if (resp.status === 429) {
        return json({
          error: "Rate limit exceeded. Please try again in a moment.",
          details: data,
        }, 429);
      }
      
      if (resp.status === 402) {
        return json({
          error: "AI service requires payment. Please contact support.",
          details: data,
        }, 402);
      }
      
      // If 503 (overloaded), retry with exponential backoff
      if (resp.status === 503 && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ API overloaded, waiting ${waitTime/1000}s before retry ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // For other errors, return immediately
      if (resp.status !== 503) {
        return json(
          { error: "AI service error", details: data },
          resp.status
        );
      }
    }

    // All retries failed
    return json({
      error: "AI service is temporarily unavailable. Please try again in a moment.",
      details: lastError,
    }, 503);

  } catch (err) {
    console.error("Edge function error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
