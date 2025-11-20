import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
  isActive: boolean;
  suspicionScore: number;
}

interface GameState {
  id: string;
  roomId: string;
  keyword: string;
  troublePainterId: string;
  currentRound: number;
  currentTurn: number;
  startedAt: string;
  endedAt: string | null;
}

export const useGameState = (roomCode: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const initGame = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setCurrentUserId(user.id);

        // Get room
        const { data: room } = await supabase
          .from("rooms")
          .select("*")
          .eq("room_code", roomCode.toUpperCase())
          .single();

        if (!room) {
          toast({
            title: "Room not found",
            variant: "destructive",
          });
          return;
        }

        // Get game
        const { data: game } = await supabase
          .from("games")
          .select("*")
          .eq("room_id", room.id)
          .single();

        if (game) {
          setGameState({
            id: game.id,
            roomId: game.room_id,
            keyword: game.keyword,
            troublePainterId: game.trouble_painter_id,
            currentRound: game.current_round || 1,
            currentTurn: game.current_turn || 0,
            startedAt: game.started_at || new Date().toISOString(),
            endedAt: game.ended_at || null,
          });
        }

        // Get players
        const { data: roomPlayers } = await supabase
          .from("room_players")
          .select("*, profiles(username)")
          .eq("room_id", room.id);

        if (roomPlayers) {
          setPlayers(
            roomPlayers.map((rp, index) => ({
              id: rp.player_id || "",
              name: rp.profiles?.username || `Player ${index + 1}`,
              isActive: game ? index === (game.current_turn || 0) : false,
              suspicionScore: 0,
            }))
          );
        }

        setLoading(false);
      } catch (error: any) {
        console.error("Error initializing game:", error);
        toast({
          title: "Error loading game",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    initGame();

    // Subscribe to game changes
    const gameChannel = supabase
      .channel(`game-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
        },
        (payload) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            const game = payload.new;
            setGameState({
              id: game.id,
              roomId: game.room_id,
              keyword: game.keyword,
              troublePainterId: game.trouble_painter_id,
              currentRound: game.current_round || 1,
              currentTurn: game.current_turn || 0,
              startedAt: game.started_at || new Date().toISOString(),
              endedAt: game.ended_at || null,
            });
            
            // Update player active states when turn changes
            setPlayers(prev => prev.map((p, index) => ({
              ...p,
              isActive: index === (game.current_turn || 0)
            })));
          }
        }
      )
      .subscribe();

    // Subscribe to player changes
    const playersChannel = supabase
      .channel(`players-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
        },
        () => {
          // Refetch players
          initGame();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [roomCode, toast]);

  const advanceTurn = async () => {
    if (!gameState) return;

    const nextTurn = (gameState.currentTurn + 1) % players.length;
    const nextRound = nextTurn === 0 ? gameState.currentRound + 1 : gameState.currentRound;

    // Don't advance beyond round 5
    if (nextRound > 5) {
      return;
    }

    await supabase
      .from("games")
      .update({
        current_turn: nextTurn,
        current_round: nextRound,
      })
      .eq("id", gameState.id);
  };

  const saveStroke = async (strokeData: any) => {
    if (!gameState || !currentUserId) return;

    await supabase.from("strokes").insert({
      game_id: gameState.id,
      player_id: currentUserId,
      round: gameState.currentRound,
      turn: gameState.currentTurn,
      stroke_data: strokeData,
    });
  };

  return {
    gameState,
    players,
    currentUserId,
    loading,
    advanceTurn,
    saveStroke,
    setPlayers,
  };
};