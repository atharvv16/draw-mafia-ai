import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Copy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Lobby = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isJoining = searchParams.get("join") === "true";
  
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }
    
    const code = generateRoomCode();
    setCreatedRoomCode(code);
    toast({
      title: "Room created!",
      description: "Share the code with your friends",
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your name and room code",
        variant: "destructive",
      });
      return;
    }
    
    // Navigate to game room (will be implemented)
    navigate(`/game/${roomCode}`);
  };

  const handleStartGame = () => {
    if (createdRoomCode) {
      navigate(`/game/${createdRoomCode}`);
    }
  };

  const copyRoomCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      toast({
        title: "Copied!",
        description: "Room code copied to clipboard",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-game-bg to-background">
      <div className="container mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="max-w-md mx-auto">
          <Card className="p-8 border-2 shadow-xl">
            <h1 className="text-3xl font-bold mb-6 text-center">
              {isJoining ? "Join Room" : "Create Room"}
            </h1>

            <div className="space-y-6">
              {/* Player Name Input */}
              <div className="space-y-2">
                <Label htmlFor="playerName">Your Name</Label>
                <Input
                  id="playerName"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="border-2"
                />
              </div>

              {isJoining ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="roomCode">Room Code</Label>
                    <Input
                      id="roomCode"
                      placeholder="Enter 6-digit code"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="border-2 uppercase text-center text-2xl tracking-wider"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleJoinRoom}
                  >
                    Join Game
                  </Button>
                </>
              ) : (
                <>
                  {!createdRoomCode ? (
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleCreateRoom}
                    >
                      Create Room
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-game-bg p-6 rounded-lg border-2 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Room Code</p>
                        <div className="flex items-center justify-center gap-3">
                          <p className="text-4xl font-bold tracking-wider">
                            {createdRoomCode}
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={copyRoomCode}
                          >
                            <Copy className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">Players (1/8)</span>
                        </div>
                        <div className="space-y-2">
                          <div className="bg-card p-2 rounded flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <span>{playerName}</span>
                            <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              Host
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleStartGame}
                      >
                        Start Game
                      </Button>
                    </div>
                  )}
                </>
              )}

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => navigate(isJoining ? "/lobby" : "/lobby?join=true")}
                >
                  {isJoining ? "Create a room instead" : "Join an existing room"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
