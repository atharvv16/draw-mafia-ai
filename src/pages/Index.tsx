import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Paintbrush, Users, Sparkles, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-game-bg to-background">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-block mb-6">
            <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-secondary p-4 rounded-2xl shadow-lg">
              <Paintbrush className="w-10 h-10 text-primary-foreground" />
              <h1 className="text-5xl font-bold text-primary-foreground">Trouble Painter</h1>
            </div>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A multiplayer drawing game with a twist! One player is the imposter who doesn't know the secret word. 
            Can you spot the Trouble Painter?
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate("/lobby")}
            >
              Create Room
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate("/lobby?join=true")}
            >
              Join Room
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="p-6 hover:shadow-lg transition-shadow border-2">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Multiplayer Fun</h3>
            <p className="text-muted-foreground">Play with 4-8 friends in real-time</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow border-2">
            <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Social Deduction</h3>
            <p className="text-muted-foreground">Find the imposter before time runs out</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow border-2">
            <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-bold text-lg mb-2">AI Analysis</h3>
            <p className="text-muted-foreground">Get hints and suspicion scores</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow border-2">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Paintbrush className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Turn-Based Drawing</h3>
            <p className="text-muted-foreground">One stroke at a time keeps it fair</p>
          </Card>
        </div>

        {/* How to Play */}
        <Card className="p-8 border-2 shadow-xl">
          <h2 className="text-3xl font-bold mb-6 text-center">How to Play</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h4 className="font-bold mb-2">Get Your Role</h4>
              <p className="text-sm text-muted-foreground">
                Real Painters see the keyword. The Trouble Painter doesn't!
              </p>
            </div>

            <div className="text-center">
              <div className="bg-secondary text-secondary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h4 className="font-bold mb-2">Draw Together</h4>
              <p className="text-sm text-muted-foreground">
                Take turns adding ONE stroke each to the shared canvas
              </p>
            </div>

            <div className="text-center">
              <div className="bg-accent text-accent-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h4 className="font-bold mb-2">AI Helps</h4>
              <p className="text-sm text-muted-foreground">
                After each round, get hints and suspicion scores
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h4 className="font-bold mb-2">Vote & Win</h4>
              <p className="text-sm text-muted-foreground">
                Vote out the Trouble Painter to win!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
