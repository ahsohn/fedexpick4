"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { Tournament } from "@/types";

export default function ManageTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [name, setName] = useState("");
  const [espnEventId, setEspnEventId] = useState("");
  const [deadline, setDeadline] = useState("");

  const fetchTournaments = async () => {
    const res = await fetch("/api/tournaments");
    setTournaments(await res.json());
  };

  useEffect(() => { fetchTournaments(); }, []);

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    const season = new Date().getFullYear();
    await fetch("/api/admin/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        espn_event_id: espnEventId || null,
        season_year: season,
        deadline: deadline || null,
      }),
    });
    setName("");
    setEspnEventId("");
    setDeadline("");
    fetchTournaments();
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch("/api/admin/tournaments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchTournaments();
  };

  return (
    <ProtectedRoute requireCommissioner>
      <h1 className="text-2xl font-bold mb-6">Tournament Management</h1>

      <form onSubmit={createTournament} className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-400 mb-1">Tournament Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">ESPN Event ID</label>
            <input value={espnEventId} onChange={(e) => setEspnEventId(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm w-36" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Deadline</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold transition">Create</button>
        </div>
      </form>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Deadline</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id} className="border-t border-gray-800">
                <td className="px-4 py-2">{t.name}</td>
                <td className="px-4 py-2 text-gray-400">{t.deadline ? new Date(t.deadline).toLocaleString() : "—"}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    t.status === "open" ? "bg-green-900 text-green-400" :
                    t.status === "locked" ? "bg-yellow-900 text-yellow-400" :
                    "bg-blue-900 text-blue-400"
                  }`}>{t.status}</span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  {t.status === "open" && (
                    <button onClick={() => updateStatus(t.id, "locked")} className="text-yellow-400 hover:text-yellow-300 text-xs">Lock</button>
                  )}
                  {t.status === "locked" && (
                    <>
                      <button onClick={() => updateStatus(t.id, "open")} className="text-green-400 hover:text-green-300 text-xs">Unlock</button>
                      <a href={`/admin/results/${t.id}`} className="text-blue-400 hover:text-blue-300 text-xs">Score</a>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedRoute>
  );
}
