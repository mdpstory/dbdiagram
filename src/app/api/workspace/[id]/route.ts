import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Get workspace details
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        OR: [
          { ownerId: session.user.id },
          {
            users: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Check if user is the owner
    const isOwner = workspace.ownerId === session.user.id;

    // If not owner, check if user has edit permissions
    const userAccess = workspace.users.find((u) => u.userId === session.user.id);
    const canEdit = isOwner || userAccess?.canEdit === true;

    // Format shared users data (only visible to owner)
    const sharedUsers = isOwner
      ? workspace.users.map((u) => ({
          id: u.id,
          userId: u.userId,
          email: u.user.email,
          name: u.user.name,
          canEdit: u.canEdit,
        }))
      : [];

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        dbml: workspace.dbml,
        tablePositions: workspace.tablePositions,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        owner: workspace.owner,
      },
      isOwner,
      canEdit,
      users: sharedUsers,
    });
  } catch (error) {
    console.error("Failed to fetch workspace:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch workspace" },
      { status: 500 },
    );
  }
}

// Update workspace
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access and can edit
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        OR: [
          { ownerId: session.user.id },
          {
            users: {
              some: {
                userId: session.user.id,
                canEdit: true,
              },
            },
          },
        ],
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found or you don't have edit permission" },
        { status: 404 },
      );
    }

    const { name, dbml, tablePositions } = await request.json();

    // Update workspace with validated data
    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dbml && { dbml }),
        ...(tablePositions && { tablePositions }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      workspace: updatedWorkspace,
    });
  } catch (error) {
    console.error("Failed to update workspace:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update workspace" },
      { status: 500 },
    );
  }
}

// Delete workspace
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is the owner
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found or you're not the owner" },
        { status: 404 },
      );
    }

    // Delete the workspace
    await prisma.workspace.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete workspace:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete workspace" },
      { status: 500 },
    );
  }
}
