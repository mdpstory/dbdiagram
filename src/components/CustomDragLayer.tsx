import React from "react";
import { useDragLayer } from "react-dnd";
import { Field } from "@/utils/types";

interface CustomDragLayerProps {
  zoom?: number;
  canvasOffset?: { x: number; y: number };
}

const CustomDragLayer: React.FC<CustomDragLayerProps> = ({
  zoom = 1,
  canvasOffset = { x: 0, y: 0 },
}) => {
  const { isDragging, item, initialOffset, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset || !initialOffset || !item) {
    return null;
  }

  // Apply zoom and canvas offset to the item's position
  const { x, y } = currentOffset;

  // Check if item.fields exists before rendering fields
  const hasFields = item.fields && Array.isArray(item.fields);

  return (
    <div className="fixed top-0 left-0 pointer-events-none z-50" style={{ zIndex: 9999 }}>
      <div
        style={{
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
          transformOrigin: "top left",
        }}
      >
        <div
          className="shadow-lg rounded-md overflow-hidden"
          style={{
            width: "200px",
          }}
        >
          {/* Table header */}
          <div className="bg-blue-600 text-white px-3 py-2 font-bold">{item.name || "Table"}</div>

          {/* Table fields - only render if fields array exists */}
          <div className="bg-white border border-gray-200">
            {hasFields ? (
              item.fields.map((field: Field, index: number) => (
                <div
                  key={index}
                  className="px-3 py-1 border-b border-gray-200 flex justify-between"
                >
                  <div className="flex items-center">
                    {field.isPrimary ? (
                      <span className="mr-1.5 text-amber-600 font-bold" title="Primary Key">
                        🔑
                      </span>
                    ) : null}
                    <span
                      className={field.isPrimary ? "font-semibold text-black" : "text-gray-800"}
                    >
                      {field.name}
                    </span>
                  </div>
                  <span className="text-gray-600 text-sm">{field.type}</span>
                </div>
              ))
            ) : (
              // Fallback content if no fields exist
              <div className="px-3 py-1 border-b border-gray-200">
                <span className="text-gray-400">No fields</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomDragLayer;
