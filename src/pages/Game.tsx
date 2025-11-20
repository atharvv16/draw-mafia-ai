import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Eye } from "lucide-react";
import DrawingCanvas from "@/components/game/DrawingCanvas";
import PlayerList from "@/components/game/PlayerList";
import AIAnalysis from "@/components/game/AIAnalysis";
import GameInfo from "@/components/game/GameInfo";
import { useGameState } from "@/hooks/useGameState";
import { useDrawingSync } from "@/hooks/useDrawingSync";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Game = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const { gameState, players, currentUserId, loading, advanceTurn, saveStroke } = useGameState(roomCode || "");
  const strokes = useDrawingSync(gameState?.id || null, gameState?.currentRound || 1);
  
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzingDrawing, setAnalyzingDrawing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);

  const isMyTurn = gameState && currentUserId && players[gameState.currentTurn]?.id === currentUserId;
  const isTroublePainter = gameState?.troublePainterId === currentUserId;
  const currentPlayer = players[gameState?.currentTurn || 0];

  // Timer effect
  useEffect(() => {
    if (!isMyTurn || !gameState) return;

    const timer = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          advanceTurn();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMyTurn, gameState, advanceTurn]);

  // Redraw canvas when strokes change
  useEffect(() => {
    if (!canvasRef.current || strokes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      const { points, color, width } = stroke.stroke_data;
      if (points.length === 0) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
  }, [strokes]);

  const handleStrokeComplete = async (strokeData: any) => {
    await saveStroke(strokeData);
  };

  const handleSubmitTurn = async () => {
    if (!gameState || !canvasRef.current) return;

    // Rate limiting: prevent requests within 5 seconds of last request
    const now = Date.now();
    const timeSinceLastAnalysis = now - lastAnalysisTime;
    if (timeSinceLastAnalysis < 5000) {
      toast({
        title: "Please wait",
        description: `Wait ${Math.ceil((5000 - timeSinceLastAnalysis) / 1000)} seconds before analyzing again`,
        variant: "destructive",
      });
      return;
    }

    setAnalyzingDrawing(true);
    setLastAnalysisTime(now);
    
    try {
      console.log("🎨 Submitting turn for AI analysis...");
      console.log("🎯 Current keyword:", gameState.keyword);
      
      const imageData = canvasRef.current.toDataURL("image/png");
      const playerNames = players.map(p => p.name);
      console.log("👥 Players:", playerNames);

      console.log("🤖 Calling Lovable AI (Gemini)...");
      const { data, error } = await supabase.functions.invoke("analyze-drawing", {
        body: {
          imageData,
          keyword: gameState.keyword,
          players: playerNames,
        },
      });

      if (error) {
        console.error("❌ AI Error:", error);
        throw error;
      }

      console.log("✅ AI Analysis received:", data);
      setAiAnalysis(data);
      await advanceTurn();
      setTurnTimeLeft(30);

      toast({
        title: "Turn submitted!",
        description: "AI analysis complete",
      });
    } catch (error: any) {
      console.error("❌ Error analyzing drawing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze drawing",
        variant: "destructive",
      });
    } finally {
      setAnalyzingDrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-game-bg to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-game-bg to-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Game not found</h2>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </Card>
      </div>
    );
  }

  const roleInfo = {
    isTroublePainter,
    keyword: isTroublePainter ? null : gameState.keyword,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-game-bg to-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Leave Game
          </Button>
          
          <Card className="px-4 py-2 font-mono text-lg font-bold">
            {roomCode}
          </Card>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-bold">{turnTimeLeft}s</span>
            </div>
            <div className="text-muted-foreground">
              Round {gameState.currentRound}/5
            </div>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="grid lg:grid-cols-[300px_1fr_300px] gap-6">
          {/* Left Sidebar - Players */}
          <div className="space-y-4">
            <PlayerList players={players} currentPlayer={currentPlayer?.name || ""} />
            <GameInfo role={roleInfo} round={gameState.currentRound} isMyTurn={!!isMyTurn} />
          </div>

          {/* Center - Canvas */}
          <div className="space-y-4">
            <Card className="p-4 border-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
                  <span className="font-medium">
                    {isMyTurn ? "Your turn!" : `${currentPlayer?.name || "..."}'s turn`}
                  </span>
                </div>
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Replay
                </Button>
              </div>
              
              <DrawingCanvas 
                disabled={!isMyTurn} 
                onStrokeComplete={handleStrokeComplete}
                ref={canvasRef}
              />
              
              {isMyTurn && (
                <div className="flex gap-2 mt-4">
                  <Button 
                    className="flex-1" 
                    onClick={handleSubmitTurn}
                    disabled={analyzingDrawing}
                  >
                    {analyzingDrawing ? "Analyzing..." : "Submit Turn"}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Right Sidebar - AI Analysis */}
          <div>
            {aiAnalysis ? (
              <AIAnalysis analysis={aiAnalysis} />
            ) : (
              <Card className="p-4 border-2">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">AI analysis will appear after the first turn</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
