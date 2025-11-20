import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, keyword, players } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    console.log("🔑 API Key present:", !!GEMINI_API_KEY);
    console.log("🎯 Keyword:", keyword);
    console.log("👥 Players:", players);
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Extract base64 data from data URL
    const base64Data = imageData.split(',')[1];
    
    console.log("📸 Calling Gemini API for image analysis...");

    // Retry logic with exponential backoff
    let lastError;
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retry attempt ${attempt + 1} after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Call Google Gemini API with gemini-2.0-flash-exp (supports vision)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: `You are analyzing a collaborative drawing game called "Trouble Painter". The actual keyword that players are trying to draw is: "${keyword}".

Players in this game: ${players.join(", ")}

Your task:
1. Provide a subtle hint about what the drawing shows (don't reveal the keyword directly)
2. Give your top 3 guesses of what this drawing represents
3. Analyze each player's suspicion level (0.0 to 1.0, where 1.0 means highly suspicious of being the impostor who doesn't know the word)

Respond ONLY with valid JSON in this exact format:
{
  "hint": "A subtle hint about the drawing",
  "topGuesses": ["guess1", "guess2", "guess3"],
  "suspicionScores": {
    "${players[0]}": 0.1,
    "${players[1]}": 0.3,
    "${players[2]}": 0.7
  }
}`
                  },
                  {
                    inline_data: {
                      mime_type: "image/png",
                      data: base64Data
                    }
                  }
                ]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
              }
            }),
          }
        );

        if (response.status === 429 && attempt < maxRetries - 1) {
          lastError = new Error("Rate limit exceeded");
          console.log(`⚠️ Rate limited, will retry...`);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Gemini API Error:", response.status, errorText);
          
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("📊 Raw Gemini response:", JSON.stringify(data, null, 2));
        
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textContent) {
          throw new Error("No text content in Gemini response");
        }

        console.log("📝 Gemini text response:", textContent);

        // Extract JSON from the response (it might be wrapped in markdown code blocks)
        let jsonText = textContent.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.slice(7, -3).trim();
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.slice(3, -3).trim();
        }

        const analysis = JSON.parse(jsonText);
        
        console.log("✅ Parsed analysis:", JSON.stringify(analysis, null, 2));

        return new Response(JSON.stringify(analysis), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error: any) {
        lastError = error;
        if (attempt === maxRetries - 1) {
          throw error;
        }
      }
    }

    // Fallback in case all retries failed
    throw lastError || new Error("Failed to analyze drawing after multiple attempts");
  } catch (error: any) {
    console.error("Error analyzing drawing:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});