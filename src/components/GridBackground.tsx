import React from "react";

interface GridBackgroundProps {
  gridSize?: number;
  zoom?: number;
}

const GridBackground: React.FC<GridBackgroundProps> = ({ gridSize = 20, zoom = 1 }) => {
  // Apply zoom to grid size
  const scaledGridSize = gridSize * zoom;

  return (
    <div
      className="absolute inset-0 grid-background"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
        zIndex: 0,
      }}
    />
  );
};

export default GridBackground;
