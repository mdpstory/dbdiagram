import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Get public access to a workspace via shared link
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "view";

    // Fetch the workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        dbml: true,
        tablePositions: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      workspace,
      canEdit: mode === "edit",
    });
  } catch (error) {
    console.error("Failed to fetch public workspace:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch workspace" },
      { status: 500 },
    );
  }
}
