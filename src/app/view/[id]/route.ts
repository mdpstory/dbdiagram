import { NextResponse } from "next/server";

// Reuse the DiagramData type from the save route
interface DiagramData {
  [tableName: string]: { x: number; y: number };
}

// Ensure the diagrams object has proper typing
const diagrams: Record<string, DiagramData> = {};

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (diagrams[id]) {
    return NextResponse.json(diagrams[id]); // Return the specific diagram if it exists
  } else {
    return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
  }
}
