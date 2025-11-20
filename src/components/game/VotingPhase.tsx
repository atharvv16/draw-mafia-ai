import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vote, AlertCircle } from "lucide-react";

interface Player {
  id: string;
  name: string;
  suspicionScore: number;
}

interface VotingPhaseProps {
  players: Player[];
  currentUserId: string;
  onVote: (suspectedId: string) => void;
  hasVoted: boolean;
}

const VotingPhase = ({ players, currentUserId, onVote, hasVoted }: VotingPhaseProps) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const handleVote = () => {
    if (selectedPlayer) {
      onVote(selectedPlayer);
    }
  };

  const sortedPlayers = [...players].sort((a, b) => b.suspicionScore - a.suspicionScore);

  return (
    <Card className="p-6 border-2 border-primary">
      <div className="flex items-center gap-2 mb-4">
        <Vote className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Voting Phase</h2>
      </div>

      <div className="mb-4 p-3 bg-muted rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
          <p className="text-sm">
            Who do you think is the <span className="font-bold text-primary">Trouble Painter</span>?
            <br />
            Vote for the player you think doesn't know the keyword!
          </p>
        </div>
      </div>

      {hasVoted ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Vote className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-medium">Vote submitted!</p>
          <p className="text-sm text-muted-foreground">Waiting for other players...</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {sortedPlayers
              .filter(p => p.id !== currentUserId)
              .map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayer(player.id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedPlayer === player.id
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{player.name}</span>
                    {player.suspicionScore > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {Math.round(player.suspicionScore * 100)}% suspicious
                      </span>
                    )}
                  </div>
                </button>
              ))}
          </div>

          <Button
            onClick={handleVote}
            disabled={!selectedPlayer}
            className="w-full"
            size="lg"
          >
            <Vote className="w-4 h-4 mr-2" />
            Cast Vote
          </Button>
        </>
      )}
    </Card>
  );
};

export default VotingPhase;
