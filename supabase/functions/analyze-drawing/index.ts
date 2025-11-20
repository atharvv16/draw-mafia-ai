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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Lovable AI (Gemini) to analyze the drawing
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are analyzing a collaborative drawing game. The actual keyword is "${keyword}". Players are trying to draw this keyword together. Analyze the drawing and provide: 1) A subtle hint that helps without giving it away, 2) Top 3 guesses of what the drawing might be, 3) Suspicion scores (0-1) for each player indicating how suspicious their contributions are (higher = more suspicious of being the impostor).`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this drawing. Players: ${players.join(", ")}`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_drawing",
              description: "Analyze the drawing and return hints, guesses, and suspicion scores",
              parameters: {
                type: "object",
                properties: {
                  hint: { type: "string", description: "A subtle hint about the keyword" },
                  topGuesses: {
                    type: "array",
                    items: { type: "string" },
                    description: "Top 3 guesses of what the drawing represents",
                    minItems: 3,
                    maxItems: 3
                  },
                  suspicionScores: {
                    type: "object",
                    description: "Suspicion scores for each player (0-1, where 1 is most suspicious)",
                    additionalProperties: { type: "number", minimum: 0, maximum: 1 }
                  }
                },
                required: ["hint", "topGuesses", "suspicionScores"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_drawing" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response format");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error analyzing drawing:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});