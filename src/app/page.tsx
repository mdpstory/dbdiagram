"use client";

import React, { useState, useEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDrop } from "react-dnd";
import Table from "@/components/Table";
import Relationship from "@/components/Relationship";
import CodeEditor from "@/components/CodeEditor";
import GridBackground from "@/components/GridBackground";
import LandingHighlight from "@/components/LandingHighlight";
import ZoomControls from "@/components/ZoomControls";
import CustomDragLayer from "@/components/CustomDragLayer";
import ResizableSplitPane from "@/components/ResizableSplitPane";
import Minimap from "@/components/Minimap";
import { Field, TableData, Relationship as RelationshipType } from "@/utils/types";
import { parseDBML, parseRelationships } from "@/utils/dbmlParser";

const GRID_SIZE = 20; // Grid cell size in pixels
const TABLE_WIDTH = 200; // Default table width
const HEADER_HEIGHT = 32; // Table header height
const FIELD_HEIGHT = 27; // Height per field row
const MIN_TABLE_SPACING = 40; // Minimum space between tables

// Zoom settings
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

// Custom drop target component to constrain dragging
const DiagramDropArea = ({
  children,
  onDrop,
  onDragOver,
  zoom = 1,
  canvasOffset,
  onCanvasDrag,
  viewportSize,
}) => {
  const [, drop] = useDrop({
    accept: "table",
    drop: (item, monitor) => {
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
  const dropAreaRef = useRef(null);

  // Get the current viewport size
  useEffect(() => {
    if (dropAreaRef.current) {
      const rect = dropAreaRef.current.getBoundingClientRect();
      viewportSize.current = {
        width: rect.width,
        height: rect.height,
      };
    }
  }, []);

  // Handle mouse down for panning
  const handleMouseDown = (e) => {
    // Only start panning with left button (button 0)
    if (e.button === 0) {
      // Check if the click target is the diagram-drop-area itself or its direct children
      // that aren't part of a table or UI element
      const target = e.target;

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
  const handleMouseMove = (e) => {
    if (isPanning) {
      const deltaX = (e.clientX - startPanPoint.x) / zoom;
      const deltaY = (e.clientY - startPanPoint.y) / zoom;

      onCanvasDrag(deltaX, deltaY);
      setStartPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse up to end panning
  const handleMouseUp = (e) => {
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
          <GridBackground gridSize={GRID_SIZE} zoom={zoom} />
          {children}
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const [dbmlCode, setDbmlCode] = useState<string>(
    `Table users {
  id integer [primary key]
  username varchar
  email varchar
  created_at timestamp
}

Table posts {
  id integer [primary key]
  title varchar
  body text
  user_id integer
  created_at timestamp
}

Ref: posts.user_id > users.id`,
  );

  const [tables, setTables] = useState<Record<string, TableData>>({});
  const [relationships, setRelationships] = useState<RelationshipType[]>([]);
  const [zoom, setZoom] = useState<number>(1);

  // State for drag highlighting
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [landingPosition, setLandingPosition] = useState<{ x: number; y: number } | null>(null);
  const [isValidLanding, setIsValidLanding] = useState<boolean>(true);

  // Add canvas offset state for panning
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Add minimap visibility state
  const [isMinimapVisible, setIsMinimapVisible] = useState<boolean>(true);

  // Canvas size and viewport size refs
  const canvasSize = { width: 5000, height: 5000 }; // Large canvas
  const viewportSize = useRef({ width: 0, height: 0 });

  // Use a ref to store table positions that should persist
  const tablePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  };

  // Toggle minimap visibility
  const toggleMinimapVisibility = () => {
    setIsMinimapVisible(!isMinimapVisible);
  };

  // Handle direct viewport change from minimap
  const handleViewportChange = (x: number, y: number) => {
    setCanvasOffset({ x, y });
  };

  // Handle canvas dragging (panning)
  const handleCanvasDrag = (deltaX: number, deltaY: number) => {
    setCanvasOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
  };

  // Parse DBML when code changes
  useEffect(() => {
    try {
      // Parse the DBML code to get new table structure
      const parsedTables = parseDBML(dbmlCode);
      const parsedRelationships = parseRelationships(dbmlCode);

      // Create a new tables object with preserved positions
      const updatedTables = { ...parsedTables };

      // Apply saved positions for existing tables
      Object.keys(updatedTables).forEach((tableName) => {
        // If we have a saved position for this table
        if (tablePositionsRef.current[tableName]) {
          updatedTables[tableName].position = tablePositionsRef.current[tableName];
        }
        // Otherwise save the current position if available
        else if (tables[tableName]?.position) {
          updatedTables[tableName].position = tables[tableName].position;
        }
        // For completely new tables, positions are already assigned by parseDBML
      });

      // Update the state with the new tables that maintain positions
      setTables(updatedTables);
      setRelationships(parsedRelationships);

      // Update our position ref with all current positions
      Object.keys(updatedTables).forEach((tableName) => {
        tablePositionsRef.current[tableName] = updatedTables[tableName].position;
      });
    } catch (error) {
      console.error("Error parsing DBML:", error);
    }
  }, [dbmlCode]);

  const updatePosition = (name: string, position: { x: number; y: number }) => {
    // Update both the state and our persistent ref
    setTables((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        position,
      },
    }));

    // Save this position to our ref for persistence
    tablePositionsRef.current[name] = position;
  };

  // Check if two tables overlap (including the minimum spacing buffer)
  const tablesOverlap = (
    tableA: { name: string; position: { x: number; y: number }; fields: Field[] },
    tableB: { name: string; position: { x: number; y: number }; fields: Field[] },
    newPositionA?: { x: number; y: number },
  ) => {
    // Use new position for tableA if provided, otherwise use current position
    const posA = newPositionA || tableA.position;
    const posB = tableB.position;

    // Calculate table heights based on number of fields
    const heightA = HEADER_HEIGHT + tableA.fields.length * FIELD_HEIGHT;
    const heightB = HEADER_HEIGHT + tableB.fields.length * FIELD_HEIGHT;

    // Check if the tables overlap (including minimum spacing)
    return (
      posA.x < posB.x + TABLE_WIDTH + MIN_TABLE_SPACING &&
      posA.x + TABLE_WIDTH + MIN_TABLE_SPACING > posB.x &&
      posA.y < posB.y + heightB + MIN_TABLE_SPACING &&
      posA.y + heightA + MIN_TABLE_SPACING > posB.y
    );
  };

  // Calculate if a position would overlap with any other table
  const wouldOverlap = (tableName: string, newPosition: { x: number; y: number }) => {
    const table = tables[tableName];
    if (!table) return false;

    let hasOverlap = false;
    Object.values(tables).forEach((otherTable) => {
      if (otherTable.name !== tableName) {
        // Calculate table heights
        const heightA = HEADER_HEIGHT + table.fields.length * FIELD_HEIGHT;
        const heightB = HEADER_HEIGHT + otherTable.fields.length * FIELD_HEIGHT;

        // Check with increased spacing
        if (
          newPosition.x < otherTable.position.x + TABLE_WIDTH + MIN_TABLE_SPACING &&
          newPosition.x + TABLE_WIDTH + MIN_TABLE_SPACING > otherTable.position.x &&
          newPosition.y < otherTable.position.y + heightB + MIN_TABLE_SPACING &&
          newPosition.y + heightA + MIN_TABLE_SPACING > otherTable.position.y
        ) {
          hasOverlap = true;
        }
      }
    });
    return hasOverlap;
  };

  // Handler for when drag starts
  const handleDragStart = (name: string) => {
    setDraggingTable(name);
  };

  // Handler for when drag ends
  const handleDragEnd = () => {
    setDraggingTable(null);
    setLandingPosition(null);
  };

  // Handle drag over the diagram area
  const handleDragOver = (item, delta) => {
    if (delta && item.name) {
      const table = tables[item.name];
      if (table) {
        // Calculate new position and snap to grid
        const newPosition = {
          x: Math.max(0, Math.round((table.position.x + delta.x) / GRID_SIZE) * GRID_SIZE),
          y: Math.max(0, Math.round((table.position.y + delta.y) / GRID_SIZE) * GRID_SIZE),
        };

        // Update the landing position state
        setLandingPosition(newPosition);

        // Check if this would be a valid position (no overlaps)
        const valid = !wouldOverlap(item.name, newPosition);
        setIsValidLanding(valid);
      }
    }
  };

  // Handle drops inside the diagram area
  const handleDrop = (item, delta) => {
    if (delta && item.name) {
      const table = tables[item.name];
      if (table) {
        // Calculate new position and snap to grid
        const newPosition = {
          x: Math.max(0, Math.round((table.position.x + delta.x) / GRID_SIZE) * GRID_SIZE),
          y: Math.max(0, Math.round((table.position.y + delta.y) / GRID_SIZE) * GRID_SIZE),
        };

        // Only update position if there's no overlap
        if (!wouldOverlap(item.name, newPosition)) {
          updatePosition(item.name, newPosition);
        } else {
          console.log("Cannot move table to that position: overlap detected");
        }
      }
    }

    // Clear drag state
    setDraggingTable(null);
    setLandingPosition(null);
  };

  const saveDiagram = async () => {
    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbml: dbmlCode,
          tables: Object.fromEntries(
            Object.entries(tables).map(([name, table]) => [
              name,
              { x: table.position.x, y: table.position.y },
            ]),
          ),
        }),
      });
      const data = await response.json();
      alert(`Diagram saved! Shareable link: ${window.location.origin}${data.link}`);
    } catch (error) {
      console.error("Error saving diagram:", error);
      alert("Failed to save diagram");
    }
  };

  // Calculate the height of the table being dragged (for the highlight)
  const getTableHeight = (tableName: string) => {
    if (!tableName || !tables[tableName]) return 0;
    return HEADER_HEIGHT + tables[tableName].fields.length * FIELD_HEIGHT;
  };

  // Create components for left and right panes
  const codeEditorPane = (
    <div className="h-full border-r overflow-hidden">
      <CodeEditor value={dbmlCode} onChange={setDbmlCode} />
    </div>
  );

  const diagramPane = (
    <div className="h-full relative">
      <DndProvider backend={HTML5Backend}>
        <CustomDragLayer zoom={zoom} canvasOffset={canvasOffset} />

        <DiagramDropArea
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          zoom={zoom}
          canvasOffset={canvasOffset}
          onCanvasDrag={handleCanvasDrag}
          viewportSize={viewportSize}
        >
          {/* Landing highlight when dragging */}
          {draggingTable && landingPosition && (
            <LandingHighlight
              position={landingPosition}
              width={TABLE_WIDTH}
              height={getTableHeight(draggingTable)}
              isValid={isValidLanding}
              zoom={zoom}
            />
          )}

          {/* Render relationships first (lower z-index) */}
          {relationships.map((rel, index) => (
            <Relationship
              key={`${rel.fromTable}-${rel.fromField}-${rel.toTable}-${rel.toField}-${index}`}
              fromTable={rel.fromTable}
              fromField={rel.fromField}
              toTable={rel.toTable}
              toField={rel.toField}
              type={rel.type}
              tables={tables}
            />
          ))}

          {/* Render tables on top */}
          {Object.values(tables).map((table) => (
            <Table
              key={table.name}
              name={table.name}
              position={table.position}
              fields={table.fields}
              updatePosition={updatePosition}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </DiagramDropArea>

        {/* Minimap (conditionally rendered based on isMinimapVisible) */}
        <Minimap
          tables={tables}
          canvasOffset={canvasOffset}
          zoom={zoom}
          onViewportChange={handleViewportChange}
          canvasSize={canvasSize}
          viewportSize={viewportSize.current}
          isVisible={isMinimapVisible}
        />

        {/* Zoom Controls with minimap toggle */}
        <ZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          isMinimapVisible={isMinimapVisible}
          onToggleMinimap={toggleMinimapVisibility}
        />
      </DndProvider>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden">
      <ResizableSplitPane
        leftComponent={codeEditorPane}
        rightComponent={diagramPane}
        initialLeftWidth="40%"
        minLeftWidth="20%"
        minRightWidth="30%"
      />
    </div>
  );
};

export default HomePage;
