import React from "react";
import { cn } from "@/lib/utils";

interface SignaturePosition {
  id: string;
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
  signature?: string;
  timestamp?: string;
}

interface SignatureAreaProps {
  position: SignaturePosition;
  onClick: () => void;
}

export const SignatureArea: React.FC<SignatureAreaProps> = ({ position, onClick }) => {
  const { x, y, width, height, signature, timestamp } = position;

  return (
    <div
      className={cn(
        "absolute border-2 border-dashed border-signature-area rounded cursor-pointer transition-all duration-200",
        "hover:border-signature-area-hover hover:bg-signature-area/10",
        signature ? "bg-success/10 border-success" : "bg-signature-area/5"
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      onClick={onClick}
    >
      {signature ? (
        <div className="w-full h-full flex items-center justify-center bg-white/90 rounded">
          <img
            src={signature}
            alt="Signature"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-signature-area font-medium">
          Click to Sign
        </div>
      )}
      
      {timestamp && (
        <div className="absolute -bottom-5 left-0 text-xs text-muted-foreground bg-white px-1 rounded">
          {new Date(timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
};