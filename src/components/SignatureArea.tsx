import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Move } from "lucide-react";

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
  onDelete?: () => void;
  onMove?: () => void;
}

export const SignatureArea: React.FC<SignatureAreaProps> = ({ position, onClick, onDelete, onMove }) => {
  const { x, y, width, height, signature, timestamp } = position;
  const [isHovered, setIsHovered] = useState(false);

  const isSigned = !!signature;

  return (
    <div
      className={cn(
        "absolute border-2 border-dashed border-signature-area rounded cursor-pointer transition-all duration-200 group",
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Action buttons for unsigned areas */}
      {!isSigned && isHovered && (onDelete || onMove) && (
        <div className="absolute -top-8 left-0 flex gap-1 z-10">
          {onMove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove();
              }}
              className="bg-professional text-professional-foreground p-1 rounded-sm hover:bg-professional/90 transition-colors"
              title="Move signature area"
            >
              <Move className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground p-1 rounded-sm hover:bg-destructive/90 transition-colors"
              title="Remove signature area"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

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
          {isHovered && !isSigned ? "Click to Sign" : "Click to Sign"}
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