import { Field, TableData, Relationship } from "@/utils/types";

const GRID_SIZE = 20;
const TABLE_WIDTH = 200;
const HEADER_HEIGHT = 32;
const FIELD_HEIGHT = 27;
const MIN_TABLE_SPACING = 60; // Increased spacing between tables

// Canvas bounds (default values - these could be passed in as parameters)
const CANVAS_BOUNDS = {
  minX: GRID_SIZE, // Minimum left position
  minY: GRID_SIZE, // Minimum top position
  width: 3000, // Increased canvas width to allow for more spacing
  height: 2000, // Default canvas height
  padding: 40, // Padding from edges
};

// Check if a potential table position would overlap with existing tables
const checkOverlap = (
  position: { x: number; y: number },
  fields: Field[],
  existingTables: Record<string, TableData>,
): boolean => {
  // Calculate height for this table
  const height = HEADER_HEIGHT + fields.length * FIELD_HEIGHT;

  // Check against all existing tables
  for (const table of Object.values(existingTables)) {
    const tableHeight = HEADER_HEIGHT + table.fields.length * FIELD_HEIGHT;

    // Check for overlap (including spacing buffer)
    if (
      position.x < table.position.x + TABLE_WIDTH + MIN_TABLE_SPACING &&
      position.x + TABLE_WIDTH + MIN_TABLE_SPACING > table.position.x &&
      position.y < table.position.y + tableHeight + MIN_TABLE_SPACING &&
      position.y + height + MIN_TABLE_SPACING > table.position.y
    ) {
      return true; // There's an overlap
    }
  }

  return false; // No overlap
};

// Ensure a position is within the canvas bounds
const ensureWithinCanvas = (
  position: { x: number; y: number },
  fields: Field[],
): { x: number; y: number } => {
  const tableHeight = HEADER_HEIGHT + fields.length * FIELD_HEIGHT;

  const maxX = CANVAS_BOUNDS.minX + CANVAS_BOUNDS.width - TABLE_WIDTH - CANVAS_BOUNDS.padding;
  const maxY = CANVAS_BOUNDS.minY + CANVAS_BOUNDS.height - tableHeight - CANVAS_BOUNDS.padding;

  return {
    x: Math.max(CANVAS_BOUNDS.minX + CANVAS_BOUNDS.padding, Math.min(position.x, maxX)),
    y: Math.max(CANVAS_BOUNDS.minY + CANVAS_BOUNDS.padding, Math.min(position.y, maxY)),
  };
};

// Function to find a non-overlapping position for a new table
const findSafePosition = (
  startX: number,
  startY: number,
  fields: Field[],
  existingTables: Record<string, TableData>,
): { x: number; y: number } => {
  // If no tables exist yet, return the starting position (but ensure it's within canvas)
  if (Object.keys(existingTables).length === 0) {
    return ensureWithinCanvas({ x: startX, y: startY }, fields);
  }

  // Try to place tables in a grid-like pattern with sufficient spacing
  const tableHeight = HEADER_HEIGHT + fields.length * FIELD_HEIGHT;
  const numExistingTables = Object.keys(existingTables).length;

  // Calculate grid positions with good spacing
  const columns = 3; // Number of columns in our virtual grid
  const columnWidth = TABLE_WIDTH + MIN_TABLE_SPACING * 2;
  const rowHeight = tableHeight + MIN_TABLE_SPACING * 2;

  const col = numExistingTables % columns;
  const row = Math.floor(numExistingTables / columns);

  let posX = CANVAS_BOUNDS.minX + CANVAS_BOUNDS.padding + col * columnWidth;
  let posY = CANVAS_BOUNDS.minY + CANVAS_BOUNDS.padding + row * rowHeight;

  // Ensure the position is within canvas
  let position = ensureWithinCanvas({ x: posX, y: posY }, fields);

  // If this position overlaps with existing tables, try spiral search
  if (checkOverlap(position, fields, existingTables)) {
    const spiralSearch = () => {
      const MAX_ATTEMPTS = 400;
      let attempts = 0;

      // Try expanding spiral
      for (let radius = 1; radius <= 20 && attempts < MAX_ATTEMPTS; radius++) {
        // Try positions in a spiral
        for (let angle = 0; angle < 360 && attempts < MAX_ATTEMPTS; angle += 15) {
          attempts++;

          const radians = angle * (Math.PI / 180);
          const testX = posX + radius * columnWidth * Math.cos(radians);
          const testY = posY + radius * rowHeight * Math.sin(radians);

          const testPosition = ensureWithinCanvas({ x: testX, y: testY }, fields);

          if (!checkOverlap(testPosition, fields, existingTables)) {
            return testPosition;
          }
        }
      }

      // If we still couldn't find a spot, try a different approach
      return findFallbackPosition(fields, existingTables);
    };

    position = spiralSearch();
  }

  return position;
};

// Fallback position finder as a last resort
const findFallbackPosition = (
  fields: Field[],
  existingTables: Record<string, TableData>,
): { x: number; y: number } => {
  // Find the rightmost and bottommost positions of existing tables
  let maxRight = CANVAS_BOUNDS.minX + CANVAS_BOUNDS.padding;
  let maxBottom = CANVAS_BOUNDS.minY + CANVAS_BOUNDS.padding;

  Object.values(existingTables).forEach((table) => {
    const tableRight = table.position.x + TABLE_WIDTH;
    const tableBottom = table.position.y + HEADER_HEIGHT + table.fields.length * FIELD_HEIGHT;

    maxRight = Math.max(maxRight, tableRight);
    maxBottom = Math.max(maxBottom, tableBottom);
  });

  // Try positioning to the right of all tables first
  const rightPosition = ensureWithinCanvas(
    {
      x: maxRight + MIN_TABLE_SPACING,
      y: CANVAS_BOUNDS.minY + CANVAS_BOUNDS.padding,
    },
    fields,
  );

  if (!checkOverlap(rightPosition, fields, existingTables)) {
    return rightPosition;
  }

  // If that doesn't work, try below all tables
  const bottomPosition = ensureWithinCanvas(
    {
      x: CANVAS_BOUNDS.minX + CANVAS_BOUNDS.padding,
      y: maxBottom + MIN_TABLE_SPACING,
    },
    fields,
  );

  if (!checkOverlap(bottomPosition, fields, existingTables)) {
    return bottomPosition;
  }

  // Last resort: find any open space with random placement
  for (let attempt = 0; attempt < 50; attempt++) {
    const randomX =
      CANVAS_BOUNDS.minX +
      CANVAS_BOUNDS.padding +
      Math.random() * (CANVAS_BOUNDS.width - 2 * CANVAS_BOUNDS.padding - TABLE_WIDTH);
    const randomY =
      CANVAS_BOUNDS.minY +
      CANVAS_BOUNDS.padding +
      Math.random() *
        (CANVAS_BOUNDS.height -
          2 * CANVAS_BOUNDS.padding -
          HEADER_HEIGHT -
          fields.length * FIELD_HEIGHT);

    const position = ensureWithinCanvas(
      {
        x: Math.round(randomX / GRID_SIZE) * GRID_SIZE,
        y: Math.round(randomY / GRID_SIZE) * GRID_SIZE,
      },
      fields,
    );

    if (!checkOverlap(position, fields, existingTables)) {
      return position;
    }
  }

  // Absolute last resort: return a position and let the user move it
  return ensureWithinCanvas(
    {
      x: CANVAS_BOUNDS.minX + CANVAS_BOUNDS.padding + Object.keys(existingTables).length * 10,
      y: CANVAS_BOUNDS.minY + CANVAS_BOUNDS.padding + Object.keys(existingTables).length * 10,
    },
    fields,
  );
};

export const parseDBML = (dbml: string): Record<string, TableData> => {
  const tables: Record<string, TableData> = {};

  try {
    // Basic regex pattern to match table definitions
    const tablePattern = /Table\s+(\w+)\s+{([^}]*)}/g;
    let match;

    while ((match = tablePattern.exec(dbml)) !== null) {
      const tableName = match[1];
      const tableContent = match[2];

      // Find fields in the table definition
      const fields: Field[] = tableContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          // Safely extract name and rest of the line
          const parts = line.split(/\s+/);
          if (parts.length < 2) {
            return {
              name: parts[0] || "unnamed",
              type: "unknown",
              isPrimary: false,
              isRequired: false,
            };
          }

          const name = parts[0];
          const rest = parts.slice(1).join(" ");

          // Check for primary key and type more safely
          const isPrimary = rest ? rest.includes("[primary key]") : false;
          const type = parts[1] || "unknown";
          const isRequired = rest ? !rest.includes("nullable") || rest.includes("not null") : true;

          // Look for inline reference
          const refMatch = rest.match(/\[ref:\s*([<>])\s*(\w+)\.(\w+)\]/);
          if (refMatch) {
            // Store reference details in the field for later use
            return {
              name,
              type,
              isPrimary,
              isRequired,
              reference: {
                direction: refMatch[1] === ">" ? "to" : "from",
                tableName: refMatch[2],
                fieldName: refMatch[3],
              },
            };
          }

          return {
            name,
            type,
            isPrimary,
            isRequired,
          };
        });

      // Base position - snap to grid and ensure it's not at the edge
      const baseX =
        Math.round((CANVAS_BOUNDS.minX + CANVAS_BOUNDS.padding) / GRID_SIZE) * GRID_SIZE;
      const baseY =
        Math.round((CANVAS_BOUNDS.minY + CANVAS_BOUNDS.padding) / GRID_SIZE) * GRID_SIZE;

      // Find a position that doesn't overlap with existing tables
      const position = findSafePosition(baseX, baseY, fields, tables);

      tables[tableName] = {
        name: tableName,
        position,
        fields,
      };
    }
  } catch (error) {
    console.error("Error parsing DBML:", error);
    // Return at least an empty object to avoid breaking the UI
  }

  return tables;
};

export const parseRelationships = (dbml: string): Relationship[] => {
  const relationships: Relationship[] = [];

  try {
    // 1. First parse the explicit relationships
    const refPattern = /Ref:\s+(\w+)\.(\w+)\s+([<>])\s+(\w+)\.(\w+)/g;
    let match;

    while ((match = refPattern.exec(dbml)) !== null) {
      const [_, fromTable, fromField, relationType, toTable, toField] = match;

      relationships.push({
        fromTable,
        fromField,
        toTable,
        toField,
        type: relationType === ">" ? "one-to-many" : "many-to-one",
      });
    }

    // 2. Then parse inline relationships from the table fields
    const tablePattern = /Table\s+(\w+)\s+{([^}]*)}/g;
    while ((match = tablePattern.exec(dbml)) !== null) {
      const tableName = match[1];
      const tableContent = match[2];

      // Look for field definitions with inline references
      const fieldLines = tableContent.split("\n");
      for (const line of fieldLines) {
        const refMatch = line.match(/(\w+)\s+\w+.*\[ref:\s*([<>])\s*(\w+)\.(\w+)\]/);
        if (refMatch) {
          const [_, fieldName, direction, targetTable, targetField] = refMatch;

          if (direction === ">") {
            // This field points to another table
            relationships.push({
              fromTable: tableName,
              fromField: fieldName,
              toTable: targetTable,
              toField: targetField,
              type: "one-to-many", // Default relationship type
            });
          } else {
            // Another table points to this field
            relationships.push({
              fromTable: targetTable,
              fromField: targetField,
              toTable: tableName,
              toField: fieldName,
              type: "many-to-one", // Default relationship type
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error parsing relationships:", error);
  }

  return relationships;
};
