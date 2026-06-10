"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function HistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [usedGolfers, setUsedGolfers] = useState<any[]>([]);
  const [usedCount, setUsedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/picks/history?user_id=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setHistory(data.history ?? []);
        setUsedGolfers(data.used_golfers ?? []);
        setUsedCount(data.used_count ?? 0);
      })
      .catch(() => {});
  }, [user]);

  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-bold mb-4">Pick History</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-2">Used Golfers ({usedCount})</h2>
        <div className="flex flex-wrap gap-1.5">
          {usedGolfers.map((g: any) => (
            <span key={g.id} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
              {g.name}
            </span>
          ))}
          {usedGolfers.length === 0 && <span className="text-gray-500 text-sm">No golfers used yet</span>}
        </div>
      </div>

      <div className="space-y-4">
        {history.map((week: any) => (
          <div key={week.tournament_id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">{week.tournament_name}</h3>
            <div className="space-y-1 text-sm">
              {week.picks.map((pick: any) => (
                <div key={pick.id} className={`flex justify-between ${pick.was_subbed_out ? "opacity-40" : ""}`}>
                  <span>
                    <span className={`text-xs mr-2 ${pick.pick_type === "backup" ? "text-purple-400" : "text-blue-400"}`}>
                      {pick.pick_type === "backup"
                        ? pick.was_activated ? "BACKUP ✓" : "BACKUP"
                        : `S${pick.pick_order}`}
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
        {history.length === 0 && <p className="text-gray-400">No picks yet this season.</p>}
      </div>
    </ProtectedRoute>
  );
}
