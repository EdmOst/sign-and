import React, { useRef, useEffect, useState } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, RotateCcw, Check } from "lucide-react";

interface SignaturePadProps {
  onComplete: (signatureDataUrl: string) => void;
  onCancel: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onComplete, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (canvasRef.current) {
      const signaturePad = new SignaturePadLib(canvasRef.current, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
        minWidth: 1,
        maxWidth: 3,
        throttle: 16,
        minDistance: 5,
      });

      signaturePadRef.current = signaturePad;

      const updateEmptyState = () => {
        setIsEmpty(signaturePad.isEmpty());
      };

      signaturePad.addEventListener("beginStroke", updateEmptyState);
      signaturePad.addEventListener("endStroke", updateEmptyState);

      // Set canvas size
      const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          canvas.getContext("2d")?.scale(ratio, ratio);
          signaturePad.clear();
        }
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      return () => {
        window.removeEventListener("resize", resizeCanvas);
        signaturePad.off();
      };
    }
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
  };

  const handleComplete = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const dataUrl = signaturePadRef.current.toDataURL("image/png");
      onComplete(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl shadow-large">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Digital Signature</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Please sign in the box below using your mouse or touch screen.
          </div>
          
          <div className="border-2 border-dashed border-border rounded-lg bg-document-bg">
            <canvas
              ref={canvasRef}
              className="w-full h-48 rounded-lg cursor-crosshair"
              style={{ touchAction: "none" }}
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isEmpty}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant="professional"
                onClick={handleComplete}
                disabled={isEmpty}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Apply Signature
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};