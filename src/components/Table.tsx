import React, { useEffect, useRef, useState } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Field } from "@/utils/types";

interface TableProps {
  name: string;
  position: { x: number; y: number };
  fields: Field[];
  updatePosition: (name: string, position: { x: number; y: number }) => void;
  onDragStart?: (name: string) => void;
  onDragEnd?: () => void;
  isSelected?: boolean;
  onSelect?: (name: string) => void;
  headerColor?: string; // Custom header color
}

const Table: React.FC<TableProps> = ({
  name,
  position,
  fields,
  updatePosition,
  onDragStart,
  onDragEnd,
  isSelected = false,
  onSelect,
  headerColor = "bg-blue-600", // Default header color
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(200);
  const [calculatingSize, setCalculatingSize] = useState(true);

  // Calculate the width needed for the content
  useEffect(() => {
    if (tableRef.current) {
      // Create an invisible div to measure content width
      const measureDiv = document.createElement("div");
      measureDiv.style.position = "absolute";
      measureDiv.style.visibility = "hidden";
      measureDiv.style.whiteSpace = "nowrap";
      measureDiv.style.fontFamily = window.getComputedStyle(tableRef.current).fontFamily;
      document.body.appendChild(measureDiv);

      // Find the maximum width needed
      let maxWidth = 0;

      // Check table name width
      measureDiv.style.fontWeight = "bold";
      measureDiv.style.fontSize = "0.875rem";
      measureDiv.textContent = name;
      maxWidth = Math.max(maxWidth, measureDiv.offsetWidth + 40);

      // Check field widths
      measureDiv.style.fontWeight = "normal";
      fields.forEach((field) => {
        let nameText = field.name;
        if (field.isPrimary) {
          nameText = "🔑 " + nameText;
        }
        measureDiv.textContent = nameText;
        const nameWidth = measureDiv.offsetWidth;

        measureDiv.textContent = field.type;
        const typeWidth = measureDiv.offsetWidth;

        const rowWidth = nameWidth + typeWidth + 50;
        maxWidth = Math.max(maxWidth, rowWidth);
      });

      document.body.removeChild(measureDiv);

      const minWidth = 200;
      const maxAllowedWidth = 400;
      setTableWidth(Math.min(Math.max(maxWidth, minWidth), maxAllowedWidth));
      setCalculatingSize(false);
    }
  }, [name, fields]);

  const [{ isDragging }, drag, preview] = useDrag({
    type: "table",
    item: () => {
      if (onDragStart) onDragStart(name);
      return {
        name,
        fields,
        width: tableWidth,
        height: 32 + fields.length * 27,
      };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        updatePosition(name, {
          x: Math.max(0, position.x + delta.x),
          y: Math.max(0, position.y + delta.y),
        });
      }
      if (onDragEnd) onDragEnd();
    },
  });

  // Use empty image as drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  // Handle table click to select it
  const handleTableClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent canvas click handling
    if (onSelect) {
      onSelect(name);
    }
  };

  return (
    <div
      ref={(node) => {
        drag(node);
        tableRef.current = node;
      }}
      className={`absolute shadow-md rounded-md overflow-hidden transition-all duration-200 ${
        isSelected ? "ring-2 ring-yellow-400" : ""
      }`}
      style={{
        top: position.y,
        left: position.x,
        opacity: isDragging ? 0.4 : 1,
        width: `${tableWidth}px`,
        visibility: calculatingSize ? "hidden" : "visible",
        cursor: "move",
      }}
      onClick={handleTableClick}
    >
      {/* Table header with custom color */}
      <div className={`${headerColor} text-white px-3 py-2 font-semibold text-sm`}>{name}</div>

      {/* Table fields */}
      <div className="bg-white">
        {fields.map((field, index) => (
          <div
            key={index}
            className="px-3 py-1.5 border-t border-gray-200 flex justify-between text-sm"
          >
            <div className="flex items-center">
              {field.isPrimary && (
                <span className="mr-1.5 text-amber-600 text-xs" title="Primary Key">
                  🔑
                </span>
              )}
              <span className={`${field.isPrimary ? "font-medium text-black" : "text-gray-800"}`}>
                {field.name}
              </span>
            </div>
            <span className="text-gray-700 text-xs ml-4">{field.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Table;
