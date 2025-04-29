// src/components/CollaborativeDiagram.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { io } from "socket.io-client";
import Table from "@/components/Table";
import Relationship from "@/components/Relationship";
import CodeEditor from "@/components/CodeEditor";
import GridBackground from "@/components/GridBackground";
import ZoomControls from "@/components/ZoomControls";
import Minimap from "@/components/Minimap";
import { Field, TableData, Relationship as RelationshipType } from "@/utils/types";
import { parseDBML, parseRelationships } from "@/utils/dbmlParser";
import ResizableSplitPane from "@/components/ResizableSplitPane";
import LandingHighlight from "@/components/LandingHighlight";
import CustomDragLayer from "@/components/CustomDragLayer";
import DiagramDropArea from "@/components/DiagramDropArea";

// Zoom settings
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

interface CollaborativeDiagramProps {
  workspace: {
    id: string;
    name: string;
    dbml: string;
    tablePositions: any;
  };
  canEdit: boolean;
  userId: string;
}

const CollaborativeDiagram: React.FC<CollaborativeDiagramProps> = ({
  workspace,
  canEdit,
  userId,
}) => {
  const [dbmlCode, setDbmlCode] = useState<string>(workspace.dbml);
  const [tables, setTables] = useState<Record<string, TableData>>({});
  const [relationships, setRelationships] = useState<RelationshipType[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMinimapVisible, setIsMinimapVisible] = useState<boolean>(true);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [landingPosition, setLandingPosition] = useState<{ x: number; y: number } | null>(null);
  const [isValidLanding, setIsValidLanding] = useState<boolean>(true);
  const [activeUsers, setActiveUsers] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // References
  const socketRef = useRef<any>(null);
  const canvasSize = { width: 5000, height: 5000 };
  const viewportSize = useRef({ width: 0, height: 0 });
  const tablePositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const savingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    // Fetch initial socket endpoint
    fetch("/api/socket");

    // Set up socket connection
    socketRef.current = io();

    // Join the workspace room
    socketRef.current.emit("join-workspace", workspace.id, (response: any) => {
      if (!response.success) {
        console.error("Failed to join workspace:", response.error);
      }
    });

    socketRef.current.on("dbml-updated", (data: any) => {
      if (data.updatedBy !== userId) {
        setDbmlCode(data.dbml);

        // Update table positions from the received data
        if (data.tablePositions) {
          Object.entries(data.tablePositions).forEach(([tableName, position]) => {
            tablePositionsRef.current[tableName] = position as { x: number; y: number };
          });
        }
      }
    });

    // Listen for table position updates
    socketRef.current.on("table-position-updated", (data: any) => {
      if (data.updatedBy !== userId) {
        const { tableName, position } = data;

        // Update the position in our reference
        tablePositionsRef.current[tableName] = position;

        // Update the tables state
        setTables((prev) => ({
          ...prev,
          [tableName]: {
            ...prev[tableName],
            position,
          },
        }));
      }
    });

    // Clean up on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
      }
    };
  }, [workspace.id, userId]);

  // Parse DBML when code changes
  useEffect(() => {
    try {
      // Parse the DBML code to get new table structure
      const parsedTables = parseDBML(dbmlCode);
      const parsedRelationships = parseRelationships(dbmlCode);

      // Create a new tables object with preserved positions
      const updatedTables = { ...parsedTables };

      // Apply saved positions from workspace or from our reference
      Object.keys(updatedTables).forEach((tableName) => {
        // First check our reference for any recently updated positions
        if (tablePositionsRef.current[tableName]) {
          updatedTables[tableName].position = tablePositionsRef.current[tableName];
        }
        // Then check workspace.tablePositions
        else if (workspace.tablePositions && workspace.tablePositions[tableName]) {
          updatedTables[tableName].position = workspace.tablePositions[tableName];
          tablePositionsRef.current[tableName] = workspace.tablePositions[tableName];
        }
        // Otherwise keep the position assigned by the parser
        else if (updatedTables[tableName].position) {
          tablePositionsRef.current[tableName] = updatedTables[tableName].position;
        }
      });

      // Update the state with the new tables
      setTables(updatedTables);
      setRelationships(parsedRelationships);
    } catch (error) {
      console.error("Error parsing DBML:", error);
    }
  }, [dbmlCode, workspace.tablePositions]);

  // Save changes to server with debounce
  useEffect(() => {
    if (!canEdit) return;

    // Don't save on initial load
    if (dbmlCode === workspace.dbml && Object.keys(tablePositionsRef.current).length === 0) {
      return;
    }

    // Clear previous timeout
    if (savingTimeoutRef.current) {
      clearTimeout(savingTimeoutRef.current);
    }

    // Set saving indicator
    setIsSaving(true);

    // Debounce save operation
    savingTimeoutRef.current = setTimeout(() => {
      const saveChanges = async () => {
        try {
          // Emit changes to other clients
          socketRef.current?.emit("update-dbml", {
            workspaceId: workspace.id,
            dbml: dbmlCode,
            tablePositions: tablePositionsRef.current,
            userId,
          });

          // Also save to server via API
          const response = await fetch(`/api/workspace/${workspace.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              dbml: dbmlCode,
              tablePositions: tablePositionsRef.current,
            }),
          });

          const data = await response.json();

          if (data.success) {
            setLastSaved(new Date());
          }
        } catch (error) {
          console.error("Error saving changes:", error);
        } finally {
          setIsSaving(false);
        }
      };

      saveChanges();
    }, 1000); // 1 second debounce

    return () => {
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
      }
    };
  }, [dbmlCode, workspace.id, canEdit, userId]);

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

  // Update table position
  const updatePosition = (name: string, position: { x: number; y: number }) => {
    // Update both state and reference
    setTables((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        position,
      },
    }));

    // Update reference for persistence
    tablePositionsRef.current[name] = position;

    // Emit position change to other clients
    socketRef.current?.emit("update-table-position", {
      workspaceId: workspace.id,
      tableName: name,
      position,
      userId,
    });
  };

  // Handle table drag start
  const handleDragStart = (name: string) => {
    if (!canEdit) return;
    setDraggingTable(name);
  };

  // Handle table drag end
  const handleDragEnd = () => {
    setDraggingTable(null);
    setLandingPosition(null);
  };

  // Handle drag over
  const handleDragOver = (item: any, delta: { x: number; y: number }) => {
    if (!canEdit || !delta || !item.name) return;

    const table = tables[item.name];
    if (table) {
      // Calculate new position and snap to grid
      const GRID_SIZE = 20;
      const newPosition = {
        x: Math.max(0, Math.round((table.position.x + delta.x) / GRID_SIZE) * GRID_SIZE),
        y: Math.max(0, Math.round((table.position.y + delta.y) / GRID_SIZE) * GRID_SIZE),
      };

      // Update landing position
      setLandingPosition(newPosition);

      // Check if landing position is valid
      setIsValidLanding(!wouldOverlap(item.name, newPosition));
    }
  };

  // Handle drop
  const handleDrop = (item: any, delta: { x: number; y: number }) => {
    if (!canEdit || !delta || !item.name) return;

    const table = tables[item.name];
    if (table) {
      // Calculate new position and snap to grid
      const GRID_SIZE = 20;
      const newPosition = {
        x: Math.max(0, Math.round((table.position.x + delta.x) / GRID_SIZE) * GRID_SIZE),
        y: Math.max(0, Math.round((table.position.y + delta.y) / GRID_SIZE) * GRID_SIZE),
      };

      // Only update if valid
      if (!wouldOverlap(item.name, newPosition)) {
        updatePosition(item.name, newPosition);
      }
    }

    // Clear drag state
    setDraggingTable(null);
    setLandingPosition(null);
  };

  // Check for table overlap
  const wouldOverlap = (tableName: string, newPosition: { x: number; y: number }): boolean => {
    const table = tables[tableName];
    if (!table) return false;

    const TABLE_WIDTH = 200;
    const HEADER_HEIGHT = 32;
    const FIELD_HEIGHT = 27;
    const MIN_TABLE_SPACING = 40;

    let hasOverlap = false;
    Object.values(tables).forEach((otherTable) => {
      if (otherTable.name !== tableName) {
        // Calculate table heights
        const heightA = HEADER_HEIGHT + table.fields.length * FIELD_HEIGHT;
        const heightB = HEADER_HEIGHT + otherTable.fields.length * FIELD_HEIGHT;

        // Check with spacing
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

  // Get table height for highlight
  const getTableHeight = (tableName: string) => {
    if (!tableName || !tables[tableName]) return 0;
    return 32 + tables[tableName].fields.length * 27;
  };

  // Create components for left and right panes
  const codeEditorPane = (
    <div className="h-full border-r overflow-hidden relative">
      <CodeEditor
        value={dbmlCode}
        onChange={canEdit ? setDbmlCode : () => {}}
        readOnly={!canEdit}
      />
      {/* Status indicator */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-500 flex items-center">
        {isSaving ? (
          <span className="flex items-center">
            <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Saving...
          </span>
        ) : lastSaved ? (
          <span>Saved {lastSaved.toLocaleTimeString()}</span>
        ) : null}
      </div>
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
          isReadOnly={!canEdit}
        >
          {/* Landing highlight when dragging */}
          {draggingTable && landingPosition && (
            <LandingHighlight
              position={landingPosition}
              width={200}
              height={getTableHeight(draggingTable)}
              isValid={isValidLanding}
              zoom={zoom}
            />
          )}

          {/* Render relationships */}
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

          {/* Render tables */}
          {Object.values(tables).map((table) => (
            <Table
              key={table.name}
              name={table.name}
              position={table.position}
              fields={table.fields}
              updatePosition={canEdit ? updatePosition : () => {}}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </DiagramDropArea>

        {/* Minimap */}
        <Minimap
          tables={tables}
          canvasOffset={canvasOffset}
          zoom={zoom}
          onViewportChange={handleViewportChange}
          canvasSize={canvasSize}
          viewportSize={viewportSize.current}
          isVisible={isMinimapVisible}
        />

        {/* Zoom Controls */}
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
    <div className="h-full overflow-hidden">
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

export default CollaborativeDiagram;
