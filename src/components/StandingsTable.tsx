"use client";

interface StandingRow {
  rank: number;
  user_id: number;
  user_name: string;
  total_points: number;
}

interface Props {
  standings: StandingRow[];
  currentUserId?: number;
  compact?: boolean;
}

export default function StandingsTable({ standings, currentUserId, compact }: Props) {
  const rows = compact ? standings.slice(0, 5) : standings;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 text-gray-400">
          <tr>
            <th className="text-left px-4 py-2 w-12">Rank</th>
            <th className="text-left px-4 py-2">Player</th>
            <th className="text-right px-4 py-2">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.user_id}
              className={`border-t border-gray-800 ${
                row.user_id === currentUserId ? "bg-blue-950/30" : ""
              }`}
            >
              <td className="px-4 py-2 text-gray-400">{row.rank}</td>
              <td className="px-4 py-2">
                {row.user_name}
                {row.user_id === currentUserId && (
                  <span className="text-blue-400 text-xs ml-1">(You)</span>
                )}
              </td>
              <td className="px-4 py-2 text-right font-semibold">{row.total_points.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
