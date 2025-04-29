import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Get all workspaces for current user (owned and shared)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get workspaces owned by user
    const ownedWorkspaces = await prisma.workspace.findMany({
      where: {
        ownerId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Get workspaces shared with user
    const sharedWorkspaces = await prisma.workspaceUser.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        workspace: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        workspace: {
          updatedAt: "desc",
        },
      },
    });

    // Format shared workspaces
    const formattedSharedWorkspaces = sharedWorkspaces.map((workspaceUser) => ({
      id: workspaceUser.workspace.id,
      name: workspaceUser.workspace.name,
      updatedAt: workspaceUser.workspace.updatedAt,
      owner: workspaceUser.workspace.owner,
      canEdit: workspaceUser.canEdit,
    }));

    return NextResponse.json({
      success: true,
      ownedWorkspaces,
      sharedWorkspaces: formattedSharedWorkspaces,
    });
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch workspaces" },
      { status: 500 },
    );
  }
}

// Create a new workspace
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Workspace name is required" },
        { status: 400 },
      );
    }

    // Create a new workspace with default DBML content
    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: session.user.id,
        dbml: `Table users {
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
        tablePositions: {},
      },
    });

    return NextResponse.json({
      success: true,
      workspace,
    });
  } catch (error) {
    console.error("Failed to create workspace:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create workspace" },
      { status: 500 },
    );
  }
}
