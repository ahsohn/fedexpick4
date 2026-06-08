"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

interface ScoredPick {
  pick_id: number;
  golfer_id: number;
  golfer_name: string;
  pick_type: string;
  pick_order: number;
  fedex_points: number;
  was_subbed_out: boolean;
  was_activated: boolean;
}

interface UserResult {
  user_id: number;
  user_name: string;
  picks: ScoredPick[];
  week_total: number;
}

export default function ScoreReviewPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const [tournamentName, setTournamentName] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchScores = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/scores/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournament_id: parseInt(tournamentId) }),
      });
      const data = await res.json();
      if (res.ok) {
        setTournamentName(data.tournament);
        setResults(data.results);
      } else {
        setIsSuccess(false);
        setMessage(data.error ?? "Failed to fetch");
      }
    } catch {
      setIsSuccess(false);
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const approveScores = async () => {
    setApproving(true);
    try {
      const res = await fetch("/api/admin/scores/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournament_id: parseInt(tournamentId), results }),
      });
      if (res.ok) {
        setIsSuccess(true);
        setMessage("Scores approved and standings updated!");
      } else {
        const data = await res.json().catch(() => ({}));
        setIsSuccess(false);
        setMessage(data.error ?? "Failed to approve");
      }
    } catch {
      setIsSuccess(false);
      setMessage("Network error. Please try again.");
    } finally {
      setApproving(false);
    }
  };

  const updatePoints = (userIndex: number, pickIndex: number, points: number) => {
    // Immutable update so React reliably re-renders (no in-place mutation).
    setResults((prev) =>
      prev.map((u, ui) => {
        if (ui !== userIndex) return u;
        const picks = u.picks.map((p, pi) =>
          pi === pickIndex ? { ...p, fedex_points: points } : p
        );
        const week_total = picks
          .filter((p) => (p.pick_type === "starter" && !p.was_subbed_out) || (p.pick_type === "backup" && p.was_activated))
          .reduce((sum, p) => sum + p.fedex_points, 0);
        return { ...u, picks, week_total };
      })
    );
  };

  return (
    <ProtectedRoute requireCommissioner>
      <h1 className="text-2xl font-bold mb-2">Score Review</h1>
      <p className="text-gray-400 mb-4">{tournamentName || `Tournament #${tournamentId}`}</p>

      {results.length === 0 && (
        <button
          onClick={fetchScores}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-semibold transition"
        >
          {loading ? "Fetching from ESPN..." : "Fetch Results from ESPN"}
        </button>
      )}

      {message && <p className={`mt-4 text-sm ${isSuccess ? "text-green-400" : "text-red-400"}`}>{message}</p>}

      {results.length > 0 && (
        <div className="space-y-4 mt-4">
          {results.map((userResult, ui) => (
            <div key={userResult.user_id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">{userResult.user_name}</h3>
                <span className="text-green-400 font-bold">{userResult.week_total} pts</span>
              </div>
              <div className="space-y-1">
                {userResult.picks.map((pick, pi) => (
                  <div key={pick.pick_id} className={`flex items-center justify-between text-sm px-2 py-1.5 rounded ${
                    pick.was_subbed_out ? "opacity-40" : ""
                  } ${pick.was_activated ? "bg-purple-900/20" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold w-16 ${
                        pick.pick_type === "backup" ? "text-purple-400" : "text-blue-400"
                      }`}>
                        {pick.pick_type === "backup" ? (pick.was_activated ? "BACKUP ✓" : "BACKUP") : `Starter ${pick.pick_order}`}
                      </span>
                      <span className="text-gray-300">{pick.golfer_name}</span>
                      {pick.was_subbed_out && <span className="text-red-400 text-xs">(Subbed Out)</span>}
                    </div>
                    <input
                      type="number"
                      value={pick.fedex_points}
                      onChange={(e) => updatePoints(ui, pi, parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-right text-sm text-white"
                      disabled={pick.was_subbed_out}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={approveScores}
            disabled={approving}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg font-semibold transition mt-4"
          >
            {approving ? "Approving..." : "Approve & Update Standings"}
          </button>
        </div>
      )}
    </ProtectedRoute>
  );
}
