import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiRequest } from "next";
import { NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import prisma from "./prisma";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function socketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Join workspace room
      socket.on("join-workspace", async (workspaceId, callback) => {
        try {
          const session = await getSession({ req });
          if (!session?.user?.id) {
            callback({ success: false, error: "Unauthorized" });
            return;
          }

          // Check if user has access to workspace
          const workspace = await prisma.workspace.findFirst({
            where: {
              id: workspaceId,
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
          });

          if (!workspace) {
            callback({ success: false, error: "Workspace not found" });
            return;
          }

          socket.join(`workspace:${workspaceId}`);
          callback({ success: true });
        } catch (error) {
          console.error("Error joining workspace:", error);
          callback({ success: false, error: "Server error" });
        }
      });

      // Handle DBML updates
      socket.on("update-dbml", async (data) => {
        try {
          const { workspaceId, dbml, tablePositions, userId } = data;

          // Broadcast changes to all clients in the workspace except sender
          socket.to(`workspace:${workspaceId}`).emit("dbml-updated", {
            dbml,
            tablePositions,
            updatedBy: userId,
          });

          // Save to database
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
              dbml,
              tablePositions,
              updatedAt: new Date(),
            },
          });
        } catch (error) {
          console.error("Error updating DBML:", error);
        }
      });

      // Handle table position updates
      socket.on("update-table-position", async (data) => {
        try {
          const { workspaceId, tableName, position, userId } = data;

          // Get the workspace
          const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { tablePositions: true },
          });

          if (!workspace) return;

          // Update the table position
          const tablePositions =
            (workspace.tablePositions as Record<string, { x: number; y: number }>) || {};
          tablePositions[tableName] = position;

          // Broadcast to other clients
          socket.to(`workspace:${workspaceId}`).emit("table-position-updated", {
            tableName,
            position,
            updatedBy: userId,
          });

          // Save to database
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: { tablePositions },
          });
        } catch (error) {
          console.error("Error updating table position:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });
  }

  res.end();
}
