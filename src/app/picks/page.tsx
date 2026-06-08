"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import GolferRow from "@/components/GolferRow";
import PickSummary from "@/components/PickSummary";
import type { Tournament } from "@/types";

interface GolferWithStatus {
  id: number;
  name: string;
  espn_id: string;
  in_field: boolean | null;
  used_in_week: string | null;
  fedex_rank: number | null;
}

interface PickSlot {
  golfer_id: number;
  pick_type: "starter" | "backup";
  pick_order: number;
}

export default function PicksPage() {
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [golfers, setGolfers] = useState<GolferWithStatus[]>([]);
  const [fieldLastUpdated, setFieldLastUpdated] = useState<string | null>(null);
  const [picks, setPicks] = useState<PickSlot[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "field" | "available">("all");
  const [sortBy, setSortBy] = useState<"name" | "fedex">("name");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/tournaments/current").then((r) => r.json()).then(setTournament);
  }, []);

  useEffect(() => {
    if (!tournament || !user) return;
    fetch(`/api/golfers?tournament_id=${tournament.id}&user_id=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setGolfers(data.golfers ?? []);
        setFieldLastUpdated(data.field_last_updated);
      });

    fetch(`/api/picks?tournament_id=${tournament.id}&user_id=${user.id}`)
      .then((r) => r.json())
      .then((existingPicks) => {
        if (Array.isArray(existingPicks) && existingPicks.length > 0) {
          setPicks(existingPicks.map((p: any) => ({
            golfer_id: p.golfer_id,
            pick_type: p.pick_type,
            pick_order: p.pick_order,
          })));
        }
      });
  }, [tournament, user]);

  const refreshField = async () => {
    if (!tournament || !user) return;
    setRefreshing(true);
    try {
      await fetch(`/api/field/${tournament.id}`, { method: "POST" });
      const res = await fetch(`/api/golfers?tournament_id=${tournament.id}&user_id=${user.id}`);
      const data = await res.json();
      setGolfers(data.golfers ?? []);
      setFieldLastUpdated(data.field_last_updated);
    } catch {
      setIsSuccess(false);
      setMessage("Could not refresh the field. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  // Normalize pick_order so starters are always a contiguous 1..4 (in selection
  // order) and the backup is 5. Renormalizing on every change prevents a
  // removed-then-added starter from colliding on pick_order.
  const normalize = (slots: PickSlot[]): PickSlot[] => {
    let order = 0;
    return slots.map((p) =>
      p.pick_type === "starter"
        ? { ...p, pick_order: ++order }
        : { ...p, pick_order: 5 }
    );
  };

  const toggleGolfer = (golferId: number) => {
    const existing = picks.find((p) => p.golfer_id === golferId);
    if (existing) {
      setPicks(normalize(picks.filter((p) => p.golfer_id !== golferId)));
      return;
    }

    const starterCount = picks.filter((p) => p.pick_type === "starter").length;
    const hasBackup = picks.some((p) => p.pick_type === "backup");

    if (starterCount < 4) {
      setPicks(normalize([...picks, { golfer_id: golferId, pick_type: "starter", pick_order: 0 }]));
    } else if (!hasBackup) {
      setPicks(normalize([...picks, { golfer_id: golferId, pick_type: "backup", pick_order: 5 }]));
    }
  };

  const submitPicks = async () => {
    if (!tournament || !user || picks.length !== 5) return;
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: tournament.id,
          user_id: user.id,
          picks: normalize(picks),
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setMessage("Picks submitted!");
      } else {
        const data = await res.json().catch(() => ({}));
        setIsSuccess(false);
        setMessage(data.error ?? "Failed to submit");
      }
    } catch {
      setIsSuccess(false);
      setMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGolfers = useMemo(() => {
    let result = golfers;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (filter === "field") {
      result = result.filter((g) => g.in_field === true);
    }
    if (filter === "available") {
      result = result.filter((g) => !g.used_in_week);
    }

    if (sortBy === "fedex") {
      result = [...result].sort((a, b) => (a.fedex_rank ?? 9999) - (b.fedex_rank ?? 9999));
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [golfers, search, filter, sortBy]);

  const starterCount = picks.filter((p) => p.pick_type === "starter").length;
  const hasBackup = picks.some((p) => p.pick_type === "backup");
  const isPastDeadline = tournament?.deadline ? new Date(tournament.deadline) < new Date() : false;
  const isLocked = tournament?.status !== "open" || isPastDeadline;

  const getPickSlot = (golferId: number) => {
    const pick = picks.find((p) => p.golfer_id === golferId);
    if (!pick) return null;
    if (pick.pick_type === "backup") return { type: "backup" as const };
    return { type: "starter" as const, order: pick.pick_order };
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  };

  return (
    <ProtectedRoute>
      {!tournament ? (
        <p className="text-gray-400">No tournament available.</p>
      ) : (
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold mb-1">{tournament.name}</h1>
          {tournament.deadline && (
            <p className="text-yellow-400 text-sm mb-4">
              Deadline: {new Date(tournament.deadline).toLocaleString()}
              {isPastDeadline && <span className="text-red-400 ml-2">(Passed)</span>}
            </p>
          )}

          <div className="flex items-center justify-between bg-gray-900 px-3 py-2 rounded-lg mb-3 text-sm">
            <span className="text-gray-400">Field updated: {timeAgo(fieldLastUpdated)}</span>
            <button
              onClick={refreshField}
              disabled={refreshing}
              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
            >
              {refreshing ? "Refreshing..." : "↻ Refresh Field"}
            </button>
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search golfers..."
              className="flex-1 min-w-[180px] px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white"
            />
            <div className="flex gap-1">
              {(["all", "field", "available"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                    filter === f ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {f === "all" ? "All" : f === "field" ? "In Field" : "Available"}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "fedex")}
              className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300"
            >
              <option value="name">Sort: A-Z</option>
              <option value="fedex">Sort: FedEx Rank</option>
            </select>
          </div>

          <PickSummary starterCount={starterCount} hasBackup={hasBackup} />

          <div className="flex flex-col gap-1 mt-3 max-h-[500px] overflow-y-auto">
            {filteredGolfers.map((g) => (
              <GolferRow
                key={g.id}
                golfer={g}
                pickSlot={getPickSlot(g.id)}
                onToggle={toggleGolfer}
                disabled={isLocked}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
            <button
              onClick={() => setPicks([])}
              disabled={isLocked || picks.length === 0}
              className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-30"
            >
              Clear Picks
            </button>
            <div className="flex items-center gap-3">
              {message && (
                <span className={`text-sm ${isSuccess ? "text-green-400" : "text-red-400"}`}>
                  {message}
                </span>
              )}
              <button
                onClick={submitPicks}
                disabled={isLocked || picks.length !== 5 || submitting}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg text-sm transition"
              >
                {submitting ? "Submitting..." : picks.length === 5 ? "Submit Picks" : `Submit Picks (${5 - picks.length} more needed)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
