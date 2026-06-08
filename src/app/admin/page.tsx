"use client";

import { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AdminPage() {
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExport = () => {
    window.open("/api/admin/export", "_blank");
  };

  const handleReset = async () => {
    const confirmed = prompt('Type "RESET" to confirm season reset. This deletes all picks, standings, tournaments, and tournament fields. Users and golfers are kept.');
    if (confirmed !== "RESET") return;

    const newSeason = prompt("Enter new season year (e.g., 2027):", String(new Date().getFullYear() + 1));

    setResetting(true);
    setResetMessage("");
    try {
      const res = await fetch("/api/admin/season-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET", new_season: newSeason ? parseInt(newSeason) : null }),
      });
      if (res.ok) {
        setIsSuccess(true);
        setResetMessage("Season reset complete!");
      } else {
        const data = await res.json().catch(() => ({}));
        setIsSuccess(false);
        setResetMessage(data.error ?? "Reset failed");
      }
    } catch {
      setIsSuccess(false);
      setResetMessage("Network error. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <ProtectedRoute requireCommissioner>
      <h1 className="text-2xl font-bold mb-6">Commissioner Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link href="/admin/users" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-center transition">
          <h3 className="font-semibold mb-1">Manage Users</h3>
          <p className="text-gray-400 text-sm">Add/remove league members</p>
        </Link>
        <Link href="/admin/tournaments" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-center transition">
          <h3 className="font-semibold mb-1">Tournaments</h3>
          <p className="text-gray-400 text-sm">Create, lock, and score tournaments</p>
        </Link>
        <button onClick={handleExport} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-center transition">
          <h3 className="font-semibold mb-1">Export CSV</h3>
          <p className="text-gray-400 text-sm">Download all picks</p>
        </button>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="bg-red-950 hover:bg-red-900 border border-red-800 rounded-lg p-6 text-center transition disabled:opacity-50"
        >
          <h3 className="font-semibold mb-1 text-red-400">{resetting ? "Resetting..." : "Season Reset"}</h3>
          <p className="text-red-400/60 text-sm">Clear all season data</p>
        </button>
      </div>
      {resetMessage && (
        <p className={`mt-4 text-sm ${isSuccess ? "text-green-400" : "text-red-400"}`}>
          {resetMessage}
        </p>
      )}
    </ProtectedRoute>
  );
}
