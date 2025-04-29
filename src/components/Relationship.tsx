import React from "react";
import { Field, TableData } from "@/utils/types";

interface RelationshipProps {
  id?: string;
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
  type: "one-to-many" | "many-to-one" | "one-to-one" | "many-to-many";
  tables: Record<string, TableData>;
}

// These values can be adjusted to fine-tune the connections
const SETTINGS = {
  // Vertical offset for field - adjust if lines aren't vertically centered on fields
  FIELD_Y_OFFSET: 13,

  // Horizontal settings
  TABLE_WIDTH: 200,
  FIELD_HEIGHT: 27,
  HEADER_HEIGHT: 32,

  // Routing settings
  PADDING: 35,
  CURVE_RADIUS: 5, // Controls the "smoothness" of the curves

  // Offset to make sure arrow endpoints don't overlap with tables
  ENDPOINT_OFFSET: 3,

  // Marker sizes - smaller, more compact markers
  MARKER_SIZE: 6,
};

const Relationship: React.FC<RelationshipProps> = ({
  fromTable,
  fromField,
  toTable,
  toField,
  type,
  tables,
}) => {
  // Skip rendering if tables don't exist
  if (!tables[fromTable] || !tables[toTable]) {
    return null;
  }

  // Get table positions
  const fromPos = tables[fromTable].position;
  const toPos = tables[toTable].position;

  // Find field indices
  const fromFieldIndex = tables[fromTable].fields.findIndex((f) => f.name === fromField);
  const toFieldIndex = tables[toTable].fields.findIndex((f) => f.name === toField);

  // If fields not found, exit
  if (fromFieldIndex === -1 || toFieldIndex === -1) {
    console.warn(`Fields not found: ${fromField} in ${fromTable} or ${toField} in ${toTable}`);
    return null;
  }

  // Calculate Y position of each field
  const fromFieldY =
    fromPos.y +
    SETTINGS.HEADER_HEIGHT +
    fromFieldIndex * SETTINGS.FIELD_HEIGHT +
    SETTINGS.FIELD_Y_OFFSET;
  const toFieldY =
    toPos.y +
    SETTINGS.HEADER_HEIGHT +
    toFieldIndex * SETTINGS.FIELD_HEIGHT +
    SETTINGS.FIELD_Y_OFFSET;

  // Table dimensions
  const fromTableRight = fromPos.x + SETTINGS.TABLE_WIDTH;
  const toTableRight = toPos.x + SETTINGS.TABLE_WIDTH;

  // Determine connection points
  let path = "";
  let fromX, toX;
  let fromMarkerRotation = 0,
    toMarkerRotation = 0;

  // Generate a curved path from points
  const generateCurvedPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return "";

    const r = SETTINGS.CURVE_RADIUS; // curve radius

    let pathStr = `M ${points[0].x} ${points[0].y} `;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      if (i < points.length - 2) {
        const afterNext = points[i + 2];

        // For horizontal to vertical transitions
        if (
          Math.abs(current.x - next.x) > Math.abs(current.y - next.y) &&
          Math.abs(next.y - afterNext.y) > Math.abs(next.x - afterNext.x)
        ) {
          // Determine curve direction based on point relationships
          if (next.x > current.x) {
            // going right then up/down
            if (afterNext.y > next.y) {
              // going down
              pathStr += `L ${next.x - r} ${next.y} Q ${next.x} ${next.y} ${next.x} ${next.y + r} `;
            } else {
              // going up
              pathStr += `L ${next.x - r} ${next.y} Q ${next.x} ${next.y} ${next.x} ${next.y - r} `;
            }
          } else {
            // going left then up/down
            if (afterNext.y > next.y) {
              // going down
              pathStr += `L ${next.x + r} ${next.y} Q ${next.x} ${next.y} ${next.x} ${next.y + r} `;
            } else {
              // going up
              pathStr += `L ${next.x + r} ${next.y} Q ${next.x} ${next.y} ${next.x} ${next.y - r} `;
            }
          }
        }
        // For vertical to horizontal transitions
        else if (
          Math.abs(current.y - next.y) > Math.abs(current.x - next.x) &&
          Math.abs(next.x - afterNext.x) > Math.abs(next.y - afterNext.y)
        ) {
          if (next.y > current.y) {
            // going down then left/right
            if (afterNext.x > next.x) {
              // going right
              pathStr += `L ${next.x} ${next.y - r} Q ${next.x} ${next.y} ${next.x + r} ${next.y} `;
            } else {
              // going left
              pathStr += `L ${next.x} ${next.y - r} Q ${next.x} ${next.y} ${next.x - r} ${next.y} `;
            }
          } else {
            // going up then left/right
            if (afterNext.x > next.x) {
              // going right
              pathStr += `L ${next.x} ${next.y + r} Q ${next.x} ${next.y} ${next.x + r} ${next.y} `;
            } else {
              // going left
              pathStr += `L ${next.x} ${next.y + r} Q ${next.x} ${next.y} ${next.x - r} ${next.y} `;
            }
          }
        }
        // For straight segments
        else {
          pathStr += `L ${next.x} ${next.y} `;
        }
      } else {
        // For the last segment, just draw a line
        pathStr += `L ${next.x} ${next.y} `;
      }
    }

    return pathStr;
  };

  // For horizontal connections, connect to the sides
  if (fromPos.x + SETTINGS.TABLE_WIDTH < toPos.x) {
    // From is to the left of To
    fromX = fromTableRight + SETTINGS.ENDPOINT_OFFSET;
    toX = toPos.x - SETTINGS.ENDPOINT_OFFSET;
    fromMarkerRotation = 0; // Right
    toMarkerRotation = 180; // Left

    // Curved path from right to left
    const points = [
      { x: fromX, y: fromFieldY },
      { x: fromX + (toX - fromX) / 2, y: fromFieldY },
      { x: fromX + (toX - fromX) / 2, y: toFieldY },
      { x: toX, y: toFieldY },
    ];
    path = generateCurvedPath(points);
  } else if (toPos.x + SETTINGS.TABLE_WIDTH < fromPos.x) {
    // From is to the right of To
    fromX = fromPos.x - SETTINGS.ENDPOINT_OFFSET;
    toX = toTableRight + SETTINGS.ENDPOINT_OFFSET;
    fromMarkerRotation = 180; // Left
    toMarkerRotation = 0; // Right

    // Curved path from left to right
    const points = [
      { x: fromX, y: fromFieldY },
      { x: fromX - (fromX - toX) / 2, y: fromFieldY },
      { x: fromX - (fromX - toX) / 2, y: toFieldY },
      { x: toX, y: toFieldY },
    ];
    path = generateCurvedPath(points);
  }
  // For tables that overlap horizontally, route around the right
  else {
    // Route around the right side
    const rightEdge = Math.max(fromTableRight, toTableRight) + SETTINGS.PADDING;

    fromX = fromTableRight + SETTINGS.ENDPOINT_OFFSET;
    toX = toTableRight + SETTINGS.ENDPOINT_OFFSET;
    fromMarkerRotation = 0; // Right
    toMarkerRotation = 0; // Right

    // Curved path that goes around
    const points = [
      { x: fromX, y: fromFieldY },
      { x: rightEdge, y: fromFieldY },
      { x: rightEdge, y: toFieldY },
      { x: toX, y: toFieldY },
    ];
    path = generateCurvedPath(points);
  }

  // Main background color for relationship elements
  const relationshipColor = "rgba(59, 130, 246, 0.9)"; // Blue with high opacity

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }} // Higher z-index to appear on top of tables
    >
      {/* Main connection path */}
      <path
        d={path}
        fill="none"
        stroke={relationshipColor}
        strokeWidth="1.5" // Slightly thinner line
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* FROM Marker */}
      <g transform={`translate(${fromX},${fromFieldY}) rotate(${fromMarkerRotation})`}>
        {type === "one-to-many" && (
          // "One" marker (solid bar)
          <rect x="-3" y="-6" width="2" height="12" fill={relationshipColor} stroke="none" />
        )}
        {type === "many-to-one" && (
          // "Many" marker (solid crow's foot)
          <g>
            <path d="M -1 0 L 7 -6 L 7 6 Z" fill={relationshipColor} stroke="none" />
            <rect x="-3" y="-6" width="2" height="12" fill={relationshipColor} stroke="none" />
          </g>
        )}
        {type === "one-to-one" && (
          // "One" marker with circle (solid)
          <g>
            <rect x="-3" y="-6" width="2" height="12" fill={relationshipColor} stroke="none" />
            <circle
              cx="-7"
              cy="0"
              r="3"
              fill="white"
              stroke={relationshipColor}
              strokeWidth="1.5"
            />
          </g>
        )}
        {type === "many-to-many" && (
          // "Many" marker (solid crow's foot)
          <g>
            <path d="M -1 0 L 7 -6 L 7 6 Z" fill={relationshipColor} stroke="none" />
            <rect x="-3" y="-6" width="2" height="12" fill={relationshipColor} stroke="none" />
          </g>
        )}
      </g>

      {/* TO Marker */}
      <g transform={`translate(${toX},${toFieldY}) rotate(${toMarkerRotation})`}>
        {type === "many-to-one" && (
          // "One" marker (solid bar)
          <rect x="-3" y="-6" width="2" height="12" fill={relationshipColor} stroke="none" />
        )}
        {type === "one-to-many" && (
          // "Many" marker (solid crow's foot)
          <g>
            <path d="M -1 0 L 7 -6 L 7 6 Z" fill={relationshipColor} stroke="none" />
            <rect x="-3" y="-6" width="2" height="12" fill={relationshipColor} stroke="none" />
          </g>
        )}
        {type === "one-to-one" && (
          // "One" marker with circle (solid)
          <g>
            <rect x="-3" y="-6" width="2" height="12" fill={relationshipColor} stroke="none" />
            <circle
              cx="-7"
              cy="0"
              r="3"
              fill="white"
              stroke={relationshipColor}
              strokeWidth="1.5"
            />
          </g>
        )}
        {type === "many-to-many" && (
          // "Many" marker (solid crow's foot)
          <g>
            <path d="M -1 0 L 7 -6 L 7 6 Z" fill={relationshipColor} stroke="none" />
            <rect x="-3" y="-6" width="2" height="12" fill={relationshipColor} stroke="none" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default Relationship;
