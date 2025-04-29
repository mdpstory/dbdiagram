import { NextResponse } from "next/server";

// In-memory store (would be a database in production)
import { diagrams } from "../../save/route";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (diagrams[id]) {
    return NextResponse.json(diagrams[id]);
  } else {
    return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
  }
}
