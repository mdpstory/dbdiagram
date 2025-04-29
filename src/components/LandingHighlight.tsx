import React from "react";

interface LandingHighlightProps {
  position: { x: number; y: number } | null;
  width: number;
  height: number;
  isValid: boolean;
  zoom?: number;
}

const LandingHighlight: React.FC<LandingHighlightProps> = ({
  position,
  width,
  height,
  isValid,
  zoom = 1,
}) => {
  if (!position) return null;

  return (
    <div
      className={`absolute border-2 rounded-md ${isValid ? "border-green-500" : "border-red-500"}`}
      style={{
        top: position.y,
        left: position.x,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: isValid ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
};

export default LandingHighlight;
