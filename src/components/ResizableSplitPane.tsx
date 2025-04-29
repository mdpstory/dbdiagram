import React, { useState, useCallback, useEffect } from "react";

interface ResizableSplitPaneProps {
  leftComponent: React.ReactNode;
  rightComponent: React.ReactNode;
  initialLeftWidth?: string;
  minLeftWidth?: string;
  minRightWidth?: string;
}

const ResizableSplitPane: React.FC<ResizableSplitPaneProps> = ({
  leftComponent,
  rightComponent,
  initialLeftWidth = "50%",
  minLeftWidth = "30%",
  minRightWidth = "30%",
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Handle mouse down on the divider
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);

    // Calculate the current width in pixels
    const leftPane = document.getElementById("left-pane");
    if (leftPane) {
      setStartWidth(leftPane.offsetWidth);
    }

    // Prevent text selection during dragging
    e.preventDefault();
  }, []);

  // Handle mouse move for resizing
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const container = document.getElementById("split-pane-container");
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const minLeft = (parseFloat(minLeftWidth) * containerWidth) / 100;
      const minRight = (parseFloat(minRightWidth) * containerWidth) / 100;

      // Calculate new width
      const delta = e.clientX - startX;
      const newWidth = Math.max(minLeft, Math.min(startWidth + delta, containerWidth - minRight));

      // Set new width as a percentage of container
      setLeftWidth(`${(newWidth / containerWidth) * 100}%`);
    },
    [isDragging, startX, startWidth, minLeftWidth, minRightWidth],
  );

  // Handle mouse up to finish dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div id="split-pane-container" className="flex h-full w-full overflow-hidden">
      {/* Left pane */}
      <div
        id="left-pane"
        className="h-full overflow-hidden"
        style={{ width: leftWidth, minWidth: minLeftWidth }}
      >
        {leftComponent}
      </div>

      {/* Resizer */}
      <div
        className={`w-1 h-full cursor-col-resize bg-gray-300 hover:bg-blue-500 active:bg-blue-700 transition-colors ${
          isDragging ? "bg-blue-700" : ""
        }`}
        onMouseDown={handleMouseDown}
      ></div>

      {/* Right pane */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `calc(100% - ${leftWidth} - 0.25rem)` }}
      >
        {rightComponent}
      </div>
    </div>
  );
};

export default ResizableSplitPane;
