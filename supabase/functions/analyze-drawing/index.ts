import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResp(obj: any, status = 200) {
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
    const body = await req.json().catch(() => null);
    if (!body) return jsonResp({ error: "Invalid JSON body" }, 400);

    const { imageData, keyword, players } = body;
    if (!imageData) return jsonResp({ error: "Missing imageData" }, 400);
    if (!Array.isArray(players) || players.length === 0) return jsonResp({ error: "Missing players array" }, 400);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return jsonResp({ error: "Missing GEMINI_API_KEY" }, 500);

    const base64Data = imageData.split(",")[1] ?? "";
    if (!base64Data) return jsonResp({ error: "Invalid imageData format" }, 400);

    const GEMINI_API_BASE = Deno.env.get("GEMINI_API_BASE") || "https://generativelanguage.googleapis.com/v1beta";
    const candidateModels = [
      "gemini-2.0-flash-001",
      "gemini-2.0-flash",
      "gemini-1.5-pro-001",
      "gemini-1.5-pro",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash"
    ];

    let lastError: any = null;
    for (const mod of candidateModels) {
      const endpoint = `${GEMINI_API_BASE}/models/${encodeURIComponent(mod)}:generateContent`;
      const prompt = `
You are analyzing a collaborative drawing game called "Trouble Painter".
Keyword: "${keyword}"
Players: ${players.join(", ")}

Your task:
1) Provide a subtle hint about what the drawing shows (don't reveal the keyword directly)
2) Give your top 3 guesses
3) Provide suspicionScores for each player (0.0-1.0)

Respond ONLY with JSON:
{ "hint": "...", "topGuesses": ["g1","g2","g3"], "suspicionScores": { "${players[0]}":0.1 } }
`;

      try {
        const resp = await fetch(endpoint + `?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { parts: [ { text: prompt } ] },
              { parts: [ { inline_data: { mime_type: "image/png", data: base64Data } } ] }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
          }),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          lastError = { model: mod, status: resp.status, body: txt };
          console.warn(`Model ${mod} failed with status ${resp.status}: ${txt}`);
          // if status is 404, model wrong
          if (resp.status === 404) {
            continue; // try next model
          } else {
            // unexpected other error — break
            return jsonResp({ error: `Model ${mod} failed: ${resp.status}`, details: txt, model: mod }, resp.status);
          }
        }

        const data = await resp.json();
        console.log("Raw response from model", mod, data);

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
                    || data?.candidates?.[0]?.content?.[0]?.text
                    || "";
        if (!text) {
          return jsonResp({ error: "No text output from model", raw: data, model: mod }, 502);
        }
        // strip ``` if exists
        let clean = text.trim();
        if (clean.startsWith("```")) clean = clean.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
        let parsed;
        try { parsed = JSON.parse(clean); }
        catch {
          return jsonResp({ error: "Could not parse JSON from model output", raw: clean, model: mod }, 502);
        }

        return jsonResp(parsed);
      } catch (e) {
        lastError = { model: mod, error: String(e) };
        console.error("Fetch error with model", mod, e);
        // keep trying next
      }
    }

    return jsonResp({ error: "All models failed", lastError }, 500);
  } catch (e) {
    console.error("Unhandled error", e);
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
