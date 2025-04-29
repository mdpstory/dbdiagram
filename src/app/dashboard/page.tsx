"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthButton from "@/components/AuthButton";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [workspaces, setWorkspaces] = useState([]);
  const [sharedWorkspaces, setSharedWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    // Fetch workspaces if authenticated
    if (status === "authenticated") {
      fetchWorkspaces();
    }
  }, [status, router]);

  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/workspace");
      const data = await response.json();

      if (data.success) {
        setWorkspaces(data.ownedWorkspaces);
        setSharedWorkspaces(data.sharedWorkspaces);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkspace = async (e) => {
    e.preventDefault();

    console.log(newWorkspaceName);

    if (!newWorkspaceName.trim()) return;

    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewWorkspaceName("");
        fetchWorkspaces();
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Workspaces</h1>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
        {/* Create new workspace form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium mb-4">Create New Workspace</h2>
          <form onSubmit={createWorkspace} className="flex gap-4">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              className="flex-1 px-4 py-2 border rounded-md"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Create
            </button>
          </form>
        </div>

        {/* My workspaces */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">My Workspaces</h2>
          </div>

          {workspaces.length === 0 ? (
            <p className="p-6 text-gray-500">You don't have any workspaces yet.</p>
          ) : (
            <ul className="divide-y">
              {workspaces.map((workspace) => (
                <li key={workspace.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{workspace.name}</h3>
                    <p className="text-sm text-gray-500">
                      Last updated: {new Date(workspace.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/workspace/${workspace.id}`}
                      className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => window.open(`/workspace/${workspace.id}/share`, "_blank")}
                      className="px-3 py-1.5 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition"
                    >
                      Share
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Shared with me */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">Shared With Me</h2>
          </div>

          {sharedWorkspaces.length === 0 ? (
            <p className="p-6 text-gray-500">No workspaces have been shared with you.</p>
          ) : (
            <ul className="divide-y">
              {sharedWorkspaces.map((workspace) => (
                <li key={workspace.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{workspace.name}</h3>
                    <p className="text-sm text-gray-500">
                      Owned by: {workspace.owner.name || workspace.owner.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      Access: {workspace.canEdit ? "Editor" : "Viewer"}
                    </p>
                  </div>
                  <Link
                    href={`/workspace/${workspace.id}`}
                    className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition"
                  >
                    {workspace.canEdit ? "Edit" : "View"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
