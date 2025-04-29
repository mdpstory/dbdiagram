import React from "react";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  minZoom?: number;
  maxZoom?: number;
  isMinimapVisible?: boolean;
  onToggleMinimap?: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  minZoom = 0.5,
  maxZoom = 2,
  isMinimapVisible,
  onToggleMinimap,
}) => {
  // Calculate if buttons should be disabled
  const zoomInDisabled = zoom >= maxZoom;
  const zoomOutDisabled = zoom <= minZoom;

  return (
    <div className="absolute bottom-4 right-4 flex items-center bg-white shadow-md rounded-md overflow-hidden z-10">
      <button
        onClick={onZoomOut}
        disabled={zoomOutDisabled}
        className={`px-3 py-2 text-lg ${
          zoomOutDisabled ? "text-gray-400" : "text-gray-700 hover:bg-gray-100"
        }`}
        title="Zoom Out"
      >
        −
      </button>

      <div className="px-3 py-1 text-sm text-gray-700 border-l border-r border-gray-200">
        {Math.round(zoom * 100)}%
      </div>

      <button
        onClick={onZoomIn}
        disabled={zoomInDisabled}
        className={`px-3 py-2 text-lg ${
          zoomInDisabled ? "text-gray-400" : "text-gray-700 hover:bg-gray-100"
        }`}
        title="Zoom In"
      >
        +
      </button>

      {/* Improved minimap toggle button */}
      {onToggleMinimap && (
        <button
          onClick={onToggleMinimap}
          className="px-3 py-2 text-gray-700 hover:bg-gray-100 border-l border-gray-200"
          title={isMinimapVisible ? "Hide Minimap" : "Show Minimap"}
        >
          {isMinimapVisible ? (
            // Eye-slash icon (hide minimap)
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            // Eye icon (show minimap)
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default ZoomControls;
