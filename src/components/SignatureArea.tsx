import React, { useState, useRef } from "react";
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
  onDrag?: (deltaX: number, deltaY: number) => void;
}

export const SignatureArea: React.FC<SignatureAreaProps> = ({ position, onClick, onDelete, onMove, onDrag }) => {
  const { x, y, width, height, signature, timestamp } = position;
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const isSigned = !!signature;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSigned || !onDrag) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !onDrag) return;
      
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      onDrag(deltaX, deltaY);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={cn(
        "absolute border-2 border-dashed border-signature-area rounded transition-all duration-200 group",
        "hover:border-signature-area-hover hover:bg-signature-area/10",
        signature ? "bg-success/10 border-success cursor-pointer" : "bg-signature-area/5",
        !signature && onDrag ? "cursor-move" : "cursor-pointer",
        isDragging && "opacity-80"
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      onClick={!isDragging ? onClick : undefined}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete button for unsigned areas */}
      {!isSigned && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-6 h-6 rounded-full hover:bg-destructive/90 transition-colors flex items-center justify-center z-10"
          title="Remove signature area"
        >
          <X className="h-3 w-3" />
        </button>
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
          {new Date(timestamp).toLocaleString('en-GB', { hour12: false })}
        </div>
      )}
    </div>
  );
};