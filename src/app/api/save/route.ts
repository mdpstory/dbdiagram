import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Define types for diagram data
interface DiagramData {
  dbml: string;
  tables: Record<string, { x: number; y: number }>;
  relationshipPaths?: Record<string, Array<{ x: number; y: number }>>;
}

// Store diagrams (export to make available to other routes)
export const diagrams: Record<string, DiagramData> = {};

export async function POST(request: Request) {
  const body: DiagramData = await request.json();
  const id = uuidv4();
  diagrams[id] = body;

  return NextResponse.json({ link: `/view/${id}` });
}
