"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AdminPage() {
  return (
    <ProtectedRoute requireCommissioner>
      <h1 className="text-2xl font-bold mb-6">Commissioner Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-center transition"
        >
          <h3 className="font-semibold mb-1">Manage Users</h3>
          <p className="text-gray-400 text-sm">Add/remove league members</p>
        </Link>
        <Link
          href="/admin/tournaments"
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-center transition"
        >
          <h3 className="font-semibold mb-1">Tournaments</h3>
          <p className="text-gray-400 text-sm">Create and manage tournaments</p>
        </Link>
        <Link
          href="/admin/tournaments"
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-center transition"
        >
          <h3 className="font-semibold mb-1">Review Scores</h3>
          <p className="text-gray-400 text-sm">Approve ESPN results</p>
        </Link>
      </div>
    </ProtectedRoute>
  );
}
