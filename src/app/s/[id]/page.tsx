"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CollaborativeDiagram from "@/components/CollaborativeDiagram";

export default function SharedWorkspace() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "view";
  const canEdit = mode === "edit";

  const { data: session, status } = useSession();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Socket related state
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // Fetch workspace details
    const fetchWorkspace = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/workspace/${id}/public?mode=${mode}`);
        const data = await response.json();

        if (data.success) {
          setWorkspace(data.workspace);
        } else {
          setError(data.error || "Failed to load workspace");
        }
      } catch (error) {
        setError("An error occurred while fetching workspace details");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [id, mode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-red-600 text-xl font-bold mb-4">Error</h2>
          <p className="mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-bold mb-4">Workspace not found</h2>
          <Link href="/" className="text-blue-600 hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-blue-600 text-white shadow-md z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">{workspace.name}</h1>
            {!canEdit && (
              <span className="ml-3 px-2 py-1 bg-yellow-500 text-white text-xs rounded-md">
                View Only
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                )}
                <span>{session.user?.name || session.user?.email}</span>
              </div>
            ) : (
              <Link
                href="/api/auth/signin"
                className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <CollaborativeDiagram
          workspace={workspace}
          canEdit={canEdit}
          userId={session?.user?.id || "anonymous"}
        />
      </main>
    </div>
  );
}
