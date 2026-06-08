"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { Tournament } from "@/types";

export default function ResultsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    fetch("/api/tournaments").then((r) => r.json()).then((data) => {
      const scored = (Array.isArray(data) ? data : []).filter((t: Tournament) => t.status === "scored");
      setTournaments(scored);
      if (scored.length > 0) setSelectedId(scored[scored.length - 1].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/results/${selectedId}`).then((r) => r.json()).then(setResults).catch(() => {});
  }, [selectedId]);

  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-bold mb-4">Weekly Results</h1>

      {tournaments.length === 0 ? (
        <p className="text-gray-400">No scored tournaments yet.</p>
      ) : (
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(parseInt(e.target.value))}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white mb-6"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      {results && (
        <div className="space-y-4">
          {results.results?.map((userResult: any) => (
            <div key={userResult.user_id} className={`bg-gray-900 border rounded-lg p-4 ${
              userResult.user_id === user?.id ? "border-blue-700" : "border-gray-800"
            }`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">
                  {userResult.user_name}
                  {userResult.user_id === user?.id && <span className="text-blue-400 text-xs ml-1">(You)</span>}
                </h3>
                <span className="text-green-400 font-bold">{userResult.week_total} pts</span>
              </div>
              <div className="space-y-1 text-sm">
                {userResult.picks.map((pick: any) => (
                  <div key={pick.id} className={`flex justify-between ${pick.was_subbed_out ? "opacity-40" : ""}`}>
                    <span>
                      <span className={`text-xs mr-2 ${pick.pick_type === "backup" ? "text-purple-400" : "text-blue-400"}`}>
                        {pick.pick_type === "backup" ? (pick.was_activated ? "BACKUP ✓" : "BACKUP") : `S${pick.pick_order}`}
                      </span>
                      {pick.golfer_name}
                      {pick.was_subbed_out && <span className="text-red-400 text-xs ml-1">(Subbed Out)</span>}
                    </span>
                    <span className="text-gray-400">{pick.fedex_points ?? "—"} pts</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
