"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="text-sm">Loading...</div>;
  }

  if (status === "authenticated") {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">{session.user?.name || session.user?.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
    >
      Sign in
    </Link>
  );
}
