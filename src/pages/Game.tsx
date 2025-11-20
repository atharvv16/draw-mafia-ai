import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Clock, Eye } from "lucide-react";
import DrawingCanvas from "@/components/game/DrawingCanvas";
import PlayerList from "@/components/game/PlayerList";
import AIAnalysis from "@/components/game/AIAnalysis";
import GameInfo from "@/components/game/GameInfo";

const Game = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  
  const [currentPlayer, setCurrentPlayer] = useState("Player1");
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
  const [round, setRound] = useState(1);
  const [isMyTurn, setIsMyTurn] = useState(true);

  // Mock data for demonstration
  const players = [
    { id: "1", name: "Player1", isActive: true, suspicionScore: 0 },
    { id: "2", name: "Player2", isActive: false, suspicionScore: 0.3 },
    { id: "3", name: "Player3", isActive: false, suspicionScore: 0.7 },
    { id: "4", name: "Player4", isActive: false, suspicionScore: 0.2 },
  ];

  const mockRole = {
    isTroublePainter: false,
    keyword: "BUTTERFLY",
  };

  const mockAIAnalysis = {
    hint: "The drawing shows elements that could be wings or petals",
    topGuesses: ["Butterfly", "Flower", "Bird"],
    suspicionScores: {
      "Player1": 0.1,
      "Player2": 0.3,
      "Player3": 0.7,
      "Player4": 0.2,
    },
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
              Round {round}/5
            </div>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="grid lg:grid-cols-[300px_1fr_300px] gap-6">
          {/* Left Sidebar - Players */}
          <div className="space-y-4">
            <PlayerList players={players} currentPlayer={currentPlayer} />
            <GameInfo role={mockRole} round={round} isMyTurn={isMyTurn} />
          </div>

          {/* Center - Canvas */}
          <div className="space-y-4">
            <Card className="p-4 border-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
                  <span className="font-medium">
                    {isMyTurn ? "Your turn!" : `${currentPlayer}'s turn`}
                  </span>
                </div>
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Replay
                </Button>
              </div>
              
              <DrawingCanvas disabled={!isMyTurn} />
              
              {isMyTurn && (
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1">
                    Submit Stroke
                  </Button>
                  <Button variant="outline">
                    Undo
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Right Sidebar - AI Analysis */}
          <div>
            <AIAnalysis analysis={mockAIAnalysis} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
