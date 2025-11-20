import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

interface Player {
  id: string;
  name: string;
  isActive: boolean;
  suspicionScore: number;
}

interface PlayerListProps {
  players: Player[];
  currentPlayer: string;
}

const PlayerList = ({ players, currentPlayer }: PlayerListProps) => {
  const getSuspicionColor = (score: number) => {
    if (score < 0.3) return "bg-suspicion-low";
    if (score < 0.6) return "bg-suspicion-med";
    return "bg-suspicion-high";
  };

  return (
    <Card className="p-4 border-2">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">Players</h3>
        <span className="ml-auto text-sm text-muted-foreground">
          {players.length}/8
        </span>
      </div>

      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`p-3 rounded-lg border-2 transition-all ${
              player.name === currentPlayer
                ? "bg-primary/10 border-primary"
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    player.isActive ? "bg-primary animate-pulse" : "bg-muted"
                  }`}
                ></div>
                <span className="font-medium">{player.name}</span>
              </div>
              {player.suspicionScore > 0 && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(player.suspicionScore * 100)}%
                </span>
              )}
            </div>
            {player.suspicionScore > 0 && (
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getSuspicionColor(player.suspicionScore)}`}
                  style={{ width: `${player.suspicionScore * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PlayerList;
