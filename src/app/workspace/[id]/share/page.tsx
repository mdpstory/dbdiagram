"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ShareWorkspace() {
  const { id } = useParams();
  const { data: session, status } = useSession();
  const [workspace, setWorkspace] = useState(null);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewUrl, setViewUrl] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetchWorkspaceDetails();
    }
  }, [status, id]);

  const fetchWorkspaceDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspace/${id}`);
      const data = await response.json();

      if (data.success) {
        setWorkspace(data.workspace);
        setSharedUsers(data.users);

        // Generate view and edit links
        const baseUrl = window.location.origin;
        setViewUrl(`${baseUrl}/s/${id}?mode=view`);
        setEditUrl(`${baseUrl}/s/${id}?mode=edit`);
      } else {
        setError(data.error || "Failed to load workspace");
      }
    } catch (error) {
      setError("An error occurred while fetching workspace details");
    } finally {
      setIsLoading(false);
    }
  };

  const shareWithUser = async (e) => {
    e.preventDefault();

    if (!email.trim()) return;

    try {
      setError("");
      setSuccessMessage("");

      const response = await fetch(`/api/workspace/${id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          canEdit,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEmail("");
        setCanEdit(false);
        setSuccessMessage(`Workspace shared with ${email.trim()}`);
        fetchWorkspaceDetails();
      } else {
        setError(data.error || "Failed to share workspace");
      }
    } catch (error) {
      setError("An error occurred while sharing the workspace");
    }
  };

  const removeAccess = async (userId) => {
    try {
      setError("");

      const response = await fetch(`/api/workspace/${id}/share`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Access removed successfully");
        fetchWorkspaceDetails();
      } else {
        setError(data.error || "Failed to remove access");
      }
    } catch (error) {
      setError("An error occurred while removing access");
    }
  };

  const updatePermission = async (userId, newCanEdit) => {
    try {
      setError("");

      const response = await fetch(`/api/workspace/${id}/share`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          canEdit: newCanEdit,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Permission updated successfully");
        fetchWorkspaceDetails();
      } else {
        setError(data.error || "Failed to update permission");
      }
    } catch (error) {
      setError("An error occurred while updating permission");
    }
  };

  if (isLoading) {
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
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
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
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-blue-600 text-white">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">Share Workspace: {workspace.name}</h1>
              <Link
                href="/dashboard"
                className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 mx-6 mt-4">
              <p>{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 mx-6 mt-4">
              <p>{error}</p>
            </div>
          )}

          {/* Shareable Links */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium mb-4">Shareable Links</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">View Only Link</h3>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={viewUrl}
                    readOnly
                    className="flex-1 p-2 border rounded-l-md bg-gray-50"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewUrl);
                      setSuccessMessage("View link copied to clipboard");
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Edit Link</h3>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={editUrl}
                    readOnly
                    className="flex-1 p-2 border rounded-l-md bg-gray-50"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(editUrl);
                      setSuccessMessage("Edit link copied to clipboard");
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Anyone with this link can edit your workspace. Share carefully.
                </p>
              </div>
            </div>
          </div>

          {/* Share with user form */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium mb-4">Share with User</h2>
            <form onSubmit={shareWithUser} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="canEdit"
                  checked={canEdit}
                  onChange={(e) => setCanEdit(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="canEdit" className="ml-2 block text-sm text-gray-700">
                  Allow editing
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Share
              </button>
            </form>
          </div>

          {/* Users with access */}
          <div className="p-6">
            <h2 className="text-lg font-medium mb-4">Users with Access</h2>

            {sharedUsers.length === 0 ? (
              <p className="text-gray-500">You haven't shared this workspace with anyone yet.</p>
            ) : (
              <ul className="divide-y">
                {sharedUsers.map((user) => (
                  <li key={user.id} className="py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{user.email}</h3>
                      <p className="text-sm text-gray-500">
                        Current access: {user.canEdit ? "Editor" : "Viewer"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={user.canEdit ? "edit" : "view"}
                        onChange={(e) => updatePermission(user.id, e.target.value === "edit")}
                        className="p-2 border rounded-md bg-white"
                      >
                        <option value="view">Viewer</option>
                        <option value="edit">Editor</option>
                      </select>
                      <button
                        onClick={() => removeAccess(user.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
