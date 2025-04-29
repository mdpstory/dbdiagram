import React, { useRef, useEffect } from "react";

interface MinimapProps {
  tables: Record<string, any>;
  canvasOffset: { x: number; y: number };
  zoom: number;
  onViewportChange: (x: number, y: number) => void;
  canvasSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  isVisible?: boolean;
}

const Minimap: React.FC<MinimapProps> = ({
  tables,
  canvasOffset,
  zoom,
  onViewportChange,
  canvasSize,
  viewportSize,
  isVisible = true,
}) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  const isDraggingViewport = useRef(false);

  // Calculate minimap dimensions
  const MINIMAP_WIDTH = 180;
  const minimapScale = MINIMAP_WIDTH / canvasSize.width;
  const MINIMAP_HEIGHT = canvasSize.height * minimapScale;

  // Calculate visible viewport in minimap
  const viewportWidth = (viewportSize.width * minimapScale) / zoom;
  const viewportHeight = (viewportSize.height * minimapScale) / zoom;

  // Calculate viewport position within minimap
  const viewportX = -canvasOffset.x * minimapScale;
  const viewportY = -canvasOffset.y * minimapScale;

  // Handle dragging the viewport indicator
  const handleMinimapClick = (e: React.MouseEvent) => {
    if (!minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / minimapScale;
    const y = (e.clientY - rect.top) / minimapScale;

    // Center the viewport on the clicked point
    const newX = -x + viewportSize.width / (2 * zoom);
    const newY = -y + viewportSize.height / (2 * zoom);

    onViewportChange(newX, newY);
  };

  // Handle mouse down on viewport indicator
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent minimap click handler
    isDraggingViewport.current = true;
  };

  // Handle dragging the viewport indicator
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingViewport.current || !minimapRef.current) return;

      const rect = minimapRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / minimapScale;
      const y = (e.clientY - rect.top) / minimapScale;

      // Adjust for viewport center
      const newX = -x + viewportSize.width / (2 * zoom);
      const newY = -y + viewportSize.height / (2 * zoom);

      onViewportChange(newX, newY);
    };

    const handleMouseUp = () => {
      isDraggingViewport.current = false;
    };

    if (isDraggingViewport.current) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingViewport.current, minimapScale, onViewportChange, viewportSize, zoom]);

  // If minimap is not visible, don't render it
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="absolute top-4 right-4 z-20 shadow-lg rounded overflow-hidden"
      style={{
        width: `${MINIMAP_WIDTH}px`,
        height: `${MINIMAP_HEIGHT}px`,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        border: "1px solid rgba(0, 0, 0, 0.2)",
      }}
    >
      {/* Minimap container */}
      <div
        ref={minimapRef}
        className="relative w-full h-full overflow-hidden"
        onClick={handleMinimapClick}
      >
        {/* Tables representation */}
        {Object.values(tables).map((table: any) => (
          <div
            key={`minimap-${table.name}`}
            className="absolute bg-blue-500"
            style={{
              left: `${table.position.x * minimapScale}px`,
              top: `${table.position.y * minimapScale}px`,
              width: `${200 * minimapScale}px`, // TABLE_WIDTH = 200
              height: `${(32 + table.fields.length * 27) * minimapScale}px`, // Calculate table height
            }}
          />
        ))}

        {/* Current viewport indicator */}
        <div
          className="absolute border-2 border-red-500 cursor-move"
          style={{
            left: `${viewportX}px`,
            top: `${viewportY}px`,
            width: `${viewportWidth}px`,
            height: `${viewportHeight}px`,
            backgroundColor: "rgba(255, 0, 0, 0.1)",
          }}
          onMouseDown={handleViewportMouseDown}
        />
      </div>
    </div>
  );
};

export default Minimap;
