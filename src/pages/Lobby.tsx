import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Copy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Lobby = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isJoining = searchParams.get("join") === "true";
  
  const [roomCode, setRoomCode] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [maxRounds, setMaxRounds] = useState(5);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  // Fetch and sync room players
  useEffect(() => {
    if (!currentRoomId) return;

    const fetchPlayers = async () => {
      console.log("👥 Fetching players for room:", currentRoomId);
      const { data: players } = await supabase
        .from("room_players")
        .select("*, profiles(username)")
        .eq("room_id", currentRoomId);

      if (players) {
        console.log("✅ Players loaded:", players);
        setRoomPlayers(players);
      }
    };

    fetchPlayers();

    // Real-time updates for players joining/leaving
    const playersChannel = supabase
      .channel(`room-players-${currentRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${currentRoomId}`,
        },
        (payload) => {
          console.log("👥 Player change detected:", payload);
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, [currentRoomId]);

  // Listen for game creation
  useEffect(() => {
    if (!createdRoomCode || !currentRoomId) return;

    console.log("👂 Setting up game creation listener for room:", createdRoomCode);

    const gamesChannel = supabase
      .channel(`room-games-${currentRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "games",
          filter: `room_id=eq.${currentRoomId}`,
        },
        (payload) => {
          console.log("🎮 Game created, navigating to game page...", payload);
          navigate(`/game/${createdRoomCode}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
    };
  }, [createdRoomCode, currentRoomId, navigate]);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    
    try {
      const code = generateRoomCode();
      console.log("🎮 Creating room with code:", code);
      
      const { data: room, error } = await supabase
        .from("rooms")
        .insert({
          room_code: code,
          host_id: user.id,
          max_players: maxPlayers,
          max_rounds: maxRounds,
        })
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Room created:", room);

      await supabase.from("room_players").insert({
        room_id: room.id,
        player_id: user.id,
        is_host: true,
      });

      setCreatedRoomCode(code);
      setCurrentRoomId(room.id);
      
      toast({
        title: "Room created!",
        description: "Share the code with your friends",
      });
    } catch (error: any) {
      console.error("❌ Error creating room:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStartGame = async () => {
    if (!createdRoomCode || !user) return;

    try {
      console.log("🎮 Starting game...");
      
      // Get room
      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", createdRoomCode)
        .single();

      if (!room) throw new Error("Room not found");
      console.log("✅ Room found:", room.room_code);

      // Get all players
      const { data: roomPlayers } = await supabase
        .from("room_players")
        .select("player_id")
        .eq("room_id", room.id);

      if (!roomPlayers || roomPlayers.length < 2) {
        toast({
          title: "Not enough players",
          description: "You need at least 2 players to start",
          variant: "destructive",
        });
        return;
      }
      console.log("👥 Players:", roomPlayers.length);

      // Select random trouble painter
      const troublePainterIndex = Math.floor(Math.random() * roomPlayers.length);
      const troublePainterId = roomPlayers[troublePainterIndex].player_id;
      console.log("🎭 Random Trouble Painter selected:", troublePainterId);

      // Import dynamically to avoid circular dependency
      const { getRandomWord } = await import("@/constants/gameWords");
      const keyword = getRandomWord();
      console.log("🎯 Random word generated:", keyword);

      // Create game
      const { error: gameError } = await supabase.from("games").insert({
        room_id: room.id,
        keyword,
        trouble_painter_id: troublePainterId,
        current_round: 1,
        current_turn: 0,
      });

      if (gameError) throw gameError;
      console.log("✅ Game created successfully");

      // Update room status
      await supabase
        .from("rooms")
        .update({ status: "in_progress" })
        .eq("id", room.id);

      toast({
        title: "Game started!",
        description: `Keyword: ${keyword}`,
      });

      navigate(`/game/${createdRoomCode}`);
    } catch (error: any) {
      console.error("❌ Error starting game:", error);
      toast({
        title: "Error starting game",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const testAI = async () => {
    try {
      console.log("🤖 Testing AI integration...");
      toast({
        title: "Testing AI...",
        description: "Sending test request to Lovable AI (Gemini)",
      });

      const testCanvas = document.createElement("canvas");
      testCanvas.width = 400;
      testCanvas.height = 400;
      const ctx = testCanvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = "black";
      ctx.font = "30px Arial";
      ctx.fillText("Test Drawing", 100, 200);

      const imageData = testCanvas.toDataURL("image/png");

      const { data, error } = await supabase.functions.invoke("analyze-drawing", {
        body: {
          imageData,
          keyword: "Butterfly",
          players: ["Player1", "Player2", "Player3"],
        },
      });

      if (error) throw error;

      console.log("✅ AI Response:", data);
      toast({
        title: "AI Test Successful! 🎉",
        description: `Hint: ${data.hint}`,
      });
    } catch (error: any) {
      console.error("❌ AI Test failed:", error);
      toast({
        title: "AI Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleJoinRoom = async () => {
    if (!user || !roomCode.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter room code",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("🚪 Attempting to join room:", roomCode.toUpperCase());
      
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode.toUpperCase())
        .maybeSingle();

      if (roomError || !room) {
        console.error("❌ Room not found:", roomError);
        throw new Error("Room not found. Please check the code and try again.");
      }

      console.log("✅ Room found:", room);

      // Check if already joined
      const { data: existingPlayer } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", room.id)
        .eq("player_id", user.id)
        .maybeSingle();

      if (!existingPlayer) {
        const { error: joinError } = await supabase.from("room_players").insert({
          room_id: room.id,
          player_id: user.id,
          is_host: false,
        });

        if (joinError) {
          console.error("❌ Error joining room:", joinError);
          throw joinError;
        }
        console.log("✅ Successfully joined room");
      } else {
        console.log("ℹ️ Already in this room");
      }

      // Set room info to show waiting screen
      setCreatedRoomCode(roomCode.toUpperCase());
      setCurrentRoomId(room.id);
      setRoomCode("");
      
      toast({
        title: "Joined room!",
        description: "Waiting for host to start the game...",
      });
    } catch (error: any) {
      console.error("❌ Join room error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="maxPlayers">Number of Players</Label>
                        <Select value={maxPlayers.toString()} onValueChange={(v) => setMaxPlayers(parseInt(v))}>
                          <SelectTrigger id="maxPlayers">
                            <SelectValue placeholder="Select players" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Players</SelectItem>
                            <SelectItem value="3">3 Players</SelectItem>
                            <SelectItem value="4">4 Players</SelectItem>
                            <SelectItem value="5">5 Players</SelectItem>
                            <SelectItem value="6">6 Players</SelectItem>
                            <SelectItem value="7">7 Players</SelectItem>
                            <SelectItem value="8">8 Players</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxRounds">Number of Rounds</Label>
                        <Select value={maxRounds.toString()} onValueChange={(v) => setMaxRounds(parseInt(v))}>
                          <SelectTrigger id="maxRounds">
                            <SelectValue placeholder="Select rounds" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Round</SelectItem>
                            <SelectItem value="2">2 Rounds</SelectItem>
                            <SelectItem value="3">3 Rounds</SelectItem>
                            <SelectItem value="4">4 Rounds</SelectItem>
                            <SelectItem value="5">5 Rounds</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleCreateRoom}
                      >
                        Create Room
                      </Button>
                    </>
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
                          <span className="font-medium">Players ({roomPlayers.length}/8)</span>
                        </div>
                        <div className="space-y-2">
                          {roomPlayers.map((player, index) => (
                            <div key={player.id} className="bg-card p-2 rounded flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                              <span>{player.profiles?.username || `Player ${index + 1}`}</span>
                              {player.is_host && (
                                <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                  Host
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          size="lg"
                          onClick={handleStartGame}
                        >
                          Start Game
                        </Button>
                        <Button 
                          variant="outline"
                          size="lg"
                          onClick={testAI}
                        >
                          Test AI
                        </Button>
                      </div>
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
