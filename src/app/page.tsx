"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StandingsTable from "@/components/StandingsTable";
import type { Tournament } from "@/types";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [hasPicks, setHasPicks] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/tournaments/current")
      .then((r) => r.json())
      .then((t) => setTournament(t && typeof t.id === "number" ? t : null))
      .catch(() => {});
    fetch("/api/standings").then((r) => r.json()).then((d) => setStandings(Array.isArray(d) ? d : [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!tournament || !user) return;
    fetch(`/api/picks?tournament_id=${tournament.id}&user_id=${user.id}`)
      .then((r) => r.json())
      .then((picks) => setHasPicks(Array.isArray(picks) && picks.length > 0))
      .catch(() => {});
  }, [tournament, user]);

  if (isLoading || !user) return null;

  const isPastDeadline = tournament?.deadline ? new Date(tournament.deadline) < new Date() : false;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Welcome, {user.name}</h1>

      {tournament && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">{tournament.name}</h2>
          {tournament.deadline && (
            <p className="text-sm text-yellow-400 mb-4">
              Deadline: {new Date(tournament.deadline).toLocaleString()}
              {isPastDeadline && <span className="text-red-400 ml-2">(Passed)</span>}
            </p>
          )}
          {!isPastDeadline && tournament.status === "open" ? (
            <Link
              href="/picks"
              className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-sm transition"
            >
              {hasPicks ? "Edit Your Picks →" : "Make Your Picks →"}
            </Link>
          ) : hasPicks ? (
            <span className="text-green-400 text-sm">✓ Picks submitted</span>
          ) : (
            <span className="text-gray-500 text-sm">Picks are locked</span>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Standings</h2>
      <StandingsTable standings={standings} currentUserId={user.id} compact />
      <Link href="/standings" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
        View full standings →
      </Link>
    </div>
  );
}
