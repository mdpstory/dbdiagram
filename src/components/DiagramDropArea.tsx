import React, { useState, useRef } from "react";
import { useDrop } from "react-dnd";
import GridBackground from "@/components/GridBackground";

interface DiagramDropAreaProps {
  children: React.ReactNode;
  onDrop: (item: any, delta: { x: number; y: number }) => void;
  onDragOver: (item: any, delta: { x: number; y: number }) => void;
  zoom?: number;
  canvasOffset: { x: number; y: number };
  onCanvasDrag: (deltaX: number, deltaY: number) => void;
  viewportSize: React.MutableRefObject<{ width: number; height: number }>;
  isReadOnly?: boolean;
}

const DiagramDropArea: React.FC<DiagramDropAreaProps> = ({
  children,
  onDrop,
  onDragOver,
  zoom = 1,
  canvasOffset,
  onCanvasDrag,
  viewportSize,
  isReadOnly = false,
}) => {
  const [, drop] = useDrop({
    accept: "table",
    drop: (item, monitor) => {
      if (isReadOnly) return undefined;

      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        // Adjust delta for zoom level
        const adjustedDelta = {
          x: delta.x / zoom,
          y: delta.y / zoom,
        };
        onDrop(item, adjustedDelta);
      }
      return undefined;
    },
    hover: (item, monitor) => {
      if (isReadOnly) return;

      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        // Adjust delta for zoom level
        const adjustedDelta = {
          x: delta.x / zoom,
          y: delta.y / zoom,
        };
        onDragOver(item, adjustedDelta);
      }
    },
  });

  // Canvas panning state
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });

  // Track if click was directly on an element or on empty canvas
  const isClickOnEmptyCanvas = useRef(true);
  const dropAreaRef = useRef<HTMLDivElement | null>(null);

  // Get the current viewport size
  React.useEffect(() => {
    if (dropAreaRef.current) {
      const rect = dropAreaRef.current.getBoundingClientRect();
      viewportSize.current = {
        width: rect.width,
        height: rect.height,
      };
    }
  }, [viewportSize]);

  // Handle mouse down for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start panning with left button (button 0)
    if (e.button === 0) {
      // Check if the click target is the diagram-drop-area itself or its direct children
      // that aren't part of a table or UI element
      const target = e.target as HTMLElement;

      // Check if the click was on the canvas (not on a table or other UI element)
      isClickOnEmptyCanvas.current =
        target.id === "diagram-drop-area" ||
        target.classList.contains("grid-background") ||
        target.classList.contains("canvas-container");

      if (isClickOnEmptyCanvas.current) {
        setIsPanning(true);
        setStartPanPoint({ x: e.clientX, y: e.clientY });
        e.preventDefault(); // Prevent text selection during panning

        // Change cursor to grabbing
        e.currentTarget.style.cursor = "grabbing";
      }
    }
  };

  // Handle mouse move for panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = (e.clientX - startPanPoint.x) / zoom;
      const deltaY = (e.clientY - startPanPoint.y) / zoom;

      onCanvasDrag(deltaX, deltaY);
      setStartPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse up to end panning
  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      e.currentTarget.style.cursor = "default";
    }
  };

  return (
    <div
      id="diagram-drop-area"
      ref={(node) => {
        drop(node);
        dropAreaRef.current = node;
      }}
      className="relative w-full h-full bg-gray-100 overflow-auto"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // Stop panning if mouse leaves the area
      style={{ cursor: isPanning ? "grabbing" : "default" }}
    >
      <div
        className="absolute"
        style={{
          transformOrigin: "top left",
          transform: `scale(${zoom})`,
          width: `${100 / zoom}%`,
          height: `${100 / zoom}%`,
        }}
      >
        <div
          className="absolute canvas-container"
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
            width: "5000px", // Large canvas width
            height: "5000px", // Large canvas height
          }}
        >
          <GridBackground gridSize={20} zoom={zoom} />
          {children}
        </div>
      </div>
    </div>
  );
};

export default DiagramDropArea;
