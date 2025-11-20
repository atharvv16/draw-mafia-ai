import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Stroke {
  id: string;
  player_id: string;
  round: number;
  turn: number;
  stroke_data: {
    points: { x: number; y: number }[];
    color: string;
    width: number;
  };
  created_at: string;
}

export const useDrawingSync = (gameId: string | null, currentRound: number) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  useEffect(() => {
    if (!gameId) return;

    const fetchStrokes = async () => {
      const { data } = await supabase
        .from("strokes")
        .select("*")
        .eq("game_id", gameId)
        .eq("round", currentRound)
        .order("created_at", { ascending: true });

      if (data) {
        setStrokes(data.map(s => ({
          ...s,
          stroke_data: s.stroke_data as { points: { x: number; y: number }[]; color: string; width: number; }
        })));
      }
    };

    fetchStrokes();

    const channel = supabase
      .channel(`strokes-${gameId}-${currentRound}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "strokes",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const newStroke = payload.new;
          if (newStroke.round === currentRound) {
            setStrokes((prev) => [...prev, {
              ...newStroke,
              stroke_data: newStroke.stroke_data as { points: { x: number; y: number }[]; color: string; width: number; }
            } as Stroke]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, currentRound]);

  return strokes;
};