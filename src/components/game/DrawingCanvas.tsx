import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface DrawingCanvasProps {
  disabled?: boolean;
  onStrokeComplete?: (stroke: any) => void;
}

const COLORS = [
  "#000000", "#FFFFFF", "#EF4444", "#F59E0B", "#10B981", 
  "#3B82F6", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"
];

const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(
  ({ disabled = false, onStrokeComplete }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useImperativeHandle(ref, () => canvasRef.current!);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [currentStroke, setCurrentStroke] = useState<any[]>([]);
  const [hasDrawnStroke, setHasDrawnStroke] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set drawing style
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    setContext(ctx);

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (context) {
      context.strokeStyle = currentColor;
      context.lineWidth = brushSize;
    }
  }, [currentColor, brushSize, context]);

  // Reset stroke count when it becomes your turn
  useEffect(() => {
    if (!disabled) {
      setHasDrawnStroke(false);
    }
  }, [disabled]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !context || hasDrawnStroke) return;
    
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    setCurrentStroke([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled || !context || hasDrawnStroke) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
    setCurrentStroke(prev => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (isDrawing && currentStroke.length > 0) {
      const strokeData = {
        points: currentStroke,
        color: currentColor,
        width: brushSize,
      };
      onStrokeComplete?.(strokeData);
      setHasDrawnStroke(true);
    }
    setIsDrawing(false);
    setCurrentStroke([]);
  };

  return (
    <div className="space-y-3">
      {!disabled && (
        <Card className="p-3 border-2">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Colors</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      currentColor === color ? "border-primary ring-2 ring-primary/50 scale-110" : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Brush Size: {brushSize}px</p>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex-1 h-2 bg-muted rounded-full relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary rounded-full"
                    style={{ width: `${(brushSize / 10) * 100}%` }}
                  />
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setBrushSize(Math.min(10, brushSize + 1))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      <Card className="relative overflow-hidden bg-game-canvas border-2" style={{ aspectRatio: "4/3" }}>
        <canvas
          ref={canvasRef}
          className={`w-full h-full ${disabled || hasDrawnStroke ? "cursor-not-allowed opacity-75" : "cursor-crosshair"}`}
          style={{ cursor: disabled || hasDrawnStroke ? "not-allowed" : "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"8\" fill=\"%23000\" stroke=\"%23fff\" stroke-width=\"2\"/></svg>') 12 12, crosshair" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        {(disabled || hasDrawnStroke) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
            <p className="text-lg font-medium text-muted-foreground">
              {hasDrawnStroke ? "Stroke drawn! Submit your turn." : "Wait for your turn..."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
});

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;
