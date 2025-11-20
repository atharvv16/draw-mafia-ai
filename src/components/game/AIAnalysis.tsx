import { Card } from "@/components/ui/card";
import { Sparkles, Lightbulb } from "lucide-react";

interface AIAnalysisProps {
  analysis: {
    hint: string;
    topGuesses: string[];
    suspicionScores: Record<string, number>;
  };
}

const AIAnalysis = ({ analysis }: AIAnalysisProps) => {
  return (
    <Card className="p-4 border-2">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-accent" />
        <h3 className="font-bold text-lg">AI Analysis</h3>
      </div>

      <div className="space-y-4">
        {/* Hint */}
        <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
          <div className="flex items-start gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-accent mt-0.5" />
            <span className="text-sm font-medium">Hint</span>
          </div>
          <p className="text-sm text-foreground/90">{analysis.hint}</p>
        </div>

        {/* Top Guesses */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            AI's Top Guesses
          </h4>
          <div className="space-y-2">
            {analysis.topGuesses.map((guess, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-muted rounded-lg"
              >
                <span className="font-bold text-primary w-6">{index + 1}.</span>
                <span className="font-medium">{guess}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suspicion Ranking */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Most Suspicious
          </h4>
          <div className="space-y-2">
            {Object.entries(analysis.suspicionScores)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([player, score]) => (
                <div
                  key={player}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <span className="text-sm font-medium">{player}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-card rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          score < 0.3
                            ? "bg-suspicion-low"
                            : score < 0.6
                            ? "bg-suspicion-med"
                            : "bg-suspicion-high"
                        }`}
                        style={{ width: `${score * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium w-10 text-right">
                      {Math.round(score * 100)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AIAnalysis;
