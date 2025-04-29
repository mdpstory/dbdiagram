"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Table from "@/components/Table";
import Relationship from "@/components/Relationship";
import GridBackground from "@/components/GridBackground";
import ZoomControls from "@/components/ZoomControls";
import Minimap from "@/components/Minimap";
import { TableData, Relationship as RelationshipType } from "@/utils/types";
import { parseDBML, parseRelationships } from "@/utils/dbmlParser";

// Zoom settings
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

const ViewDiagram = () => {
  const params = useParams();
  const id = params.id as string;

  const [diagram, setDiagram] = useState<any>(null);
  const [parsedTables, setParsedTables] = useState<Record<string, TableData>>({});
  const [relationships, setRelationships] = useState<RelationshipType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);

  // Add canvas offset state for panning
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });

  // Add minimap visibility state
  const [isMinimapVisible, setIsMinimapVisible] = useState<boolean>(true);

  // Canvas size and viewport size
  const canvasSize = { width: 5000, height: 5000 }; // Large canvas
  const viewportSize = useRef({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const fetchDiagram = async () => {
      try {
        const response = await fetch(`/api/diagram/${id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch diagram");
        }

        const data = await response.json();
        setDiagram(data);

        if (data.dbml) {
          const tables = parseDBML(data.dbml);

          // Apply saved positions
          Object.keys(tables).forEach((tableName) => {
            if (data.tables && data.tables[tableName]) {
              tables[tableName].position = data.tables[tableName];
            }
          });

          setParsedTables(tables);
          setRelationships(parseRelationships(data.dbml));
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load diagram");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDiagram();
    }
  }, [id]);

  // Get the current viewport size
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      viewportSize.current = {
        width: rect.width,
        height: rect.height,
      };
    }
  }, []);

  // Handle direct viewport change from minimap
  const handleViewportChange = (x: number, y: number) => {
    setCanvasOffset({ x, y });
  };

  // Track if click was directly on an element or on empty canvas
  const isClickOnEmptyCanvas = useRef(true);

  // Handle mouse down for panning
  const handleMouseDown = (e) => {
    // Only start panning with left button (button 0)
    if (e.button === 0) {
      // Check if the click target is the diagram container itself or the grid background
      const target = e.target;

      // Check if the click was on empty canvas space
      isClickOnEmptyCanvas.current =
        target.id === "diagram-container" ||
        target.classList.contains("grid-background") ||
        target.classList.contains("canvas-container");

      if (isClickOnEmptyCanvas.current) {
        setIsPanning(true);
        setStartPanPoint({ x: e.clientX, y: e.clientY });
        e.preventDefault();

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

      setCanvasOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

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

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!diagram) return <div className="p-4">Diagram not found</div>;

  return (
    <div className="h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Database Diagram</h1>
      <div
        id="diagram-container"
        ref={containerRef}
        className="relative h-[calc(100vh-100px)] border rounded bg-gray-50 overflow-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? "grabbing" : "default" }}
      >
        {/* Scaled container */}
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

            {/* Render relationships */}
            {relationships.map((rel, index) => (
              <Relationship
                key={`rel-${index}`}
                fromTable={rel.fromTable}
                fromField={rel.fromField}
                toTable={rel.toTable}
                toField={rel.toField}
                type={rel.type}
                tables={parsedTables}
              />
            ))}

            {/* Render tables */}
            {Object.values(parsedTables).map((table) => (
              <Table
                key={table.name}
                name={table.name}
                position={table.position}
                fields={table.fields}
                updatePosition={() => {}} // Read-only in view mode
              />
            ))}
          </div>
        </div>

        {/* Minimap (conditionally rendered based on isMinimapVisible) */}
        <Minimap
          tables={parsedTables}
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
      </div>
    </div>
  );
};

export default ViewDiagram;
