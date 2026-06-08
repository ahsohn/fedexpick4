"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import StandingsTable from "@/components/StandingsTable";

export default function StandingsPage() {
  const { user } = useAuth();
  const [standings, setStandings] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/standings").then((r) => r.json()).then((d) => setStandings(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-bold mb-6">Season Standings</h1>
      <StandingsTable standings={standings} currentUserId={user?.id} />
    </ProtectedRoute>
  );
}
