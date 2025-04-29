import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Share workspace with a user
export async function POST(request: Request, { params }: { params: { id: string } }) {
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

    const { email, canEdit = false } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found. They need to sign up first." },
        { status: 404 },
      );
    }

    // Don't share with yourself
    if (user.id === session.user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot share with yourself" },
        { status: 400 },
      );
    }

    // Check if already shared
    const existingShare = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: id,
        userId: user.id,
      },
    });

    if (existingShare) {
      // Update existing share with new permissions
      const updatedShare = await prisma.workspaceUser.update({
        where: { id: existingShare.id },
        data: { canEdit },
      });

      return NextResponse.json({
        success: true,
        message: "Sharing permissions updated",
        workspaceUser: updatedShare,
      });
    }

    // Create new share
    const workspaceUser = await prisma.workspaceUser.create({
      data: {
        workspaceId: id,
        userId: user.id,
        canEdit,
      },
    });

    return NextResponse.json({
      success: true,
      workspaceUser,
    });
  } catch (error) {
    console.error("Failed to share workspace:", error);
    return NextResponse.json(
      { success: false, error: "Failed to share workspace" },
      { status: 500 },
    );
  }
}

// Update sharing permissions
export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    const { userId, canEdit } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    // Find the share record
    const workspaceUser = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: id,
        userId,
      },
    });

    if (!workspaceUser) {
      return NextResponse.json(
        { success: false, error: "Share record not found" },
        { status: 404 },
      );
    }

    // Update permissions
    const updatedWorkspaceUser = await prisma.workspaceUser.update({
      where: { id: workspaceUser.id },
      data: { canEdit },
    });

    return NextResponse.json({
      success: true,
      workspaceUser: updatedWorkspaceUser,
    });
  } catch (error) {
    console.error("Failed to update sharing permissions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update sharing permissions" },
      { status: 500 },
    );
  }
}

// Remove user access
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

    const { userId } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    // Delete the share record
    await prisma.workspaceUser.deleteMany({
      where: {
        workspaceId: id,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Access removed successfully",
    });
  } catch (error) {
    console.error("Failed to remove access:", error);
    return NextResponse.json({ success: false, error: "Failed to remove access" }, { status: 500 });
  }
}
