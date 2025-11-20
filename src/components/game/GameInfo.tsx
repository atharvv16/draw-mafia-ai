import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Info } from "lucide-react";

interface GameInfoProps {
  role: {
    isTroublePainter: boolean;
    keyword: string;
  };
  round: number;
  isMyTurn: boolean;
}

const GameInfo = ({ role, round, isMyTurn }: GameInfoProps) => {
  return (
    <Card className="p-4 border-2">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-secondary" />
        <h3 className="font-bold text-lg">Your Role</h3>
      </div>

      <div className="space-y-4">
        {/* Role Card */}
        <div
          className={`p-4 rounded-lg border-2 ${
            role.isTroublePainter
              ? "bg-destructive/10 border-destructive"
              : "bg-primary/10 border-primary"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {role.isTroublePainter ? (
              <EyeOff className="w-5 h-5 text-destructive" />
            ) : (
              <Eye className="w-5 h-5 text-primary" />
            )}
            <span className="font-bold">
              {role.isTroublePainter ? "Trouble Painter" : "Real Painter"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {role.isTroublePainter
              ? "You don't know the word! Try to blend in without being obvious."
              : "Draw the keyword without making it too easy for the imposter."}
          </p>
          {!role.isTroublePainter && (
            <div className="bg-card p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Secret Word</p>
              <p className="text-2xl font-bold tracking-wider">{role.keyword}</p>
            </div>
          )}
        </div>

        {/* Turn Status */}
        {isMyTurn && (
          <div className="bg-accent/10 p-3 rounded-lg border border-accent">
            <p className="text-sm font-medium text-center">
              🎨 It's your turn! Draw one stroke.
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-xs font-medium mb-2">💡 Tips</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Only one stroke per turn</li>
            <li>• Watch other players carefully</li>
            <li>• Vote after {5 - round} more rounds</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default GameInfo;
