import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(obj: any, status = 200) {
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
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return jsonResponse({ error: "Expected application/json" }, 400);
    }

    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);

    const { imageData, keyword } = body;
    const players: string[] = Array.isArray(body.players) ? body.players : [];

    if (!Array.isArray(players) || players.length === 0) {
      return jsonResponse({ error: "Missing or invalid 'players' array" }, 400);
    }
    if (!imageData || typeof imageData !== "string") {
      return jsonResponse({ error: "Missing or invalid 'imageData' (data URL expected)" }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-1.5";
    const GEMINI_API_BASE = Deno.env.get("GEMINI_API_BASE") || "https://generativelanguage.googleapis.com/v1beta";

    console.log("🔑 API Key present:", !!GEMINI_API_KEY);
    console.log("🎯 Keyword:", keyword ?? "(none)");
    console.log("👥 Players:", players);

    // Extract base64 from data URL
    const commaIndex = imageData.indexOf(",");
    if (commaIndex === -1) {
      return jsonResponse({ error: "imageData must be a data URL (data:...;base64,....)" }, 400);
    }
    const base64Data = imageData.slice(commaIndex + 1);

    // If no key -> immediate helpful fallback (so frontend remains usable)
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY missing - returning fallback analysis");
      const fallback = {
        hint: "Look for repeated symmetric shapes — they often indicate wings or petals.",
        topGuesses: keyword ? [keyword, "flower", "butterfly"] : ["butterfly", "flower", "bird"],
        suspicionScores: players.reduce((acc: any, p: string, i: number) => {
          acc[p] = Math.min(1, 0.15 + i * 0.2);
          return acc;
        }, {}),
        note: "FALLBACK - set GEMINI_API_KEY in environment for real AI analysis",
      };
      return jsonResponse(fallback);
    }

    // Helper function to generate fallback when quota exceeded
    const generateQuotaFallback = () => {
      console.warn("Gemini API quota exceeded - returning fallback analysis");
      return {
        hint: keyword ? `Think about what defines a ${keyword}...` : "Consider the overall shape and details.",
        topGuesses: keyword ? [keyword.toLowerCase(), "drawing", "sketch"] : ["drawing", "sketch", "art"],
        suspicionScores: players.reduce((acc: any, p: string, i: number) => {
          acc[p] = Math.random() * 0.3 + 0.1; // Random low suspicion
          return acc;
        }, {}),
        note: "Quota exceeded - Please upgrade your Gemini API plan or wait for quota reset at https://ai.google.dev/gemini-api/docs/rate-limits",
      };
    };

    // Build prompt
    const promptText = [
      `You are analyzing a collaborative drawing game called "Trouble Painter".`,
      keyword ? `Keyword: "${keyword}" (do not reveal it directly).` : "Keyword: unknown",
      `Players: ${players.join(", ")}`,
      "Task:\n1) Give a subtle hint (do NOT reveal the exact keyword).\n2) Provide top 3 guesses (short phrases).\n3) Provide suspicionScores for each player as a map playerName -> number 0.0..1.0.\n\nRespond ONLY with valid JSON in this shape:\n{ \"hint\": \"...\", \"topGuesses\": [\"g1\",\"g2\",\"g3\"], \"suspicionScores\": { \"Player1\": 0.1 } }"
    ].join("\n\n");

    // Prepare request
    const MODEL = encodeURIComponent(GEMINI_MODEL);
    const endpoint = `${GEMINI_API_BASE}/models/${MODEL}:generateContent`;

    // Retry loop (exponential backoff)
    let lastError: Error | null = null;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.log(`⏳ retry ${attempt} waiting ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
        }

        const requestBody = {
          // Correct structure: single content object with multiple parts
          contents: [{
            parts: [
              { text: promptText },
              { inline_data: { mime_type: "image/png", data: base64Data } }
            ]
          }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
        };

        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GEMINI_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (resp.status === 429) {
          const errorText = await resp.text();
          console.error(`❌ Gemini API Error: 429 ${errorText}`);
          lastError = new Error("Rate limited by Gemini API (429)");
          
          // Check if it's a quota issue (not just rate limiting)
          if (errorText.includes("quota") || errorText.includes("RESOURCE_EXHAUSTED")) {
            console.warn("⚠️ Quota exceeded - providing fallback response");
            return jsonResponse(generateQuotaFallback());
          }
          
          console.warn("⚠️ Rate limited, will retry...");
          if (attempt === maxRetries - 1) {
            // Final retry failed, return fallback instead of error
            return jsonResponse(generateQuotaFallback());
          }
          continue; // retry
        }

        if (!resp.ok) {
          const txt = await resp.text();
          console.error("Gemini API error:", resp.status, txt);
          // For payment error or model not found bubble up helpful message
          if (resp.status === 402) return jsonResponse({ error: "Payment required." }, 402);
          if (resp.status === 404) {
            // helpful guidance for 404 (model/method mismatch)
            return jsonResponse({
              error: "Model or method not found. Check GEMINI_MODEL and API version. See ListModels for available models.",
              details: txt,
            }, 502);
          }
          throw new Error(`Gemini API error: ${resp.status} - ${txt}`);
        }

        const data = await resp.json();
        console.log("📊 raw Gemini response (truncated):", JSON.stringify(data).slice(0, 4000));

        // tolerant extraction of text output from common shapes
        let textOut = "";
        try {
          if (Array.isArray(data?.candidates) && data.candidates[0]) {
            const c = data.candidates[0];
            if (c?.content) {
              // content might be array or object
              if (Array.isArray(c.content) && c.content[0]?.text) textOut = c.content[0].text;
              else if (c.content?.parts?.[0]?.text) textOut = c.content.parts[0].text;
              else if (typeof c.content === "string") textOut = c.content;
            } else if (c?.message?.content?.[0]?.text) {
              textOut = c.message.content[0].text;
            }
          } else if (typeof data?.outputText === "string") {
            textOut = data.outputText;
          } else if (typeof data?.text === "string") {
            textOut = data.text;
          }
        } catch (ex) {
          console.warn("Response parsing fallback triggered", ex);
        }

        if (!textOut) {
          // return raw response for debugging
          return jsonResponse({ error: "No textual output found in model response", raw: data }, 502);
        }

        // strip Markdown fences if present
        let jsonText = textOut.trim();
        if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
        }

        // attempt to parse JSON
        let parsed: any = null;
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          // try to extract first {...} substring
          const s = jsonText.indexOf("{");
          const e = jsonText.lastIndexOf("}");
          if (s !== -1 && e !== -1 && e > s) {
            try {
              parsed = JSON.parse(jsonText.slice(s, e + 1));
            } catch {
              // final fallback: return the text as explanation
              return jsonResponse({
                hint: "",
                topGuesses: [],
                suspicionScores: {},
                explanation: jsonText.slice(0, 2000),
                note: "Model output was not valid JSON; returning text in 'explanation'.",
              });
            }
          } else {
            return jsonResponse({
              hint: "",
              topGuesses: [],
              suspicionScores: {},
              explanation: jsonText.slice(0, 2000),
              note: "Model output was not valid JSON; returning text in 'explanation'.",
            });
          }
        }

        // normalize fields
        const hint = parsed.hint ?? parsed.Hint ?? parsed.hints ?? parsed.hint_text ?? "";
        const topGuesses = parsed.topGuesses ?? parsed.top_guesses ?? parsed.guesses ?? [];
        const suspicionRaw = parsed.suspicionScores ?? parsed.suspicion_scores ?? parsed.suspicion ?? {};

        // normalize suspicion into players list with 0..1
        const suspicionScores: Record<string, number> = {};
        for (const p of players) {
          let v = suspicionRaw?.[p];
          if (v == null) {
            // try lowercase match
            v = suspicionRaw?.[p.toLowerCase()] ?? suspicionRaw?.[p.trim()] ?? 0;
          }
          const n = Number(v);
          suspicionScores[p] = isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
        }

        return jsonResponse({ hint, topGuesses: Array.isArray(topGuesses) ? topGuesses.slice(0, 3) : [], suspicionScores });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error("Attempt error:", lastError);
        if (attempt === maxRetries - 1) {
          // no more retries
          return jsonResponse({ error: lastError.message ?? String(lastError) }, 500);
        }
        // else loop to retry
      }
    }

    // final fallback
    return jsonResponse({ error: "Failed to analyze drawing after retries" }, 500);
  } catch (outerErr) {
    console.error("Unhandled error:", outerErr);
    return jsonResponse({ error: (outerErr as Error).message ?? String(outerErr) }, 500);
  }
});
