"use client";

interface PickSummaryProps {
  starterCount: number;
  hasBackup: boolean;
}

export default function PickSummary({ starterCount, hasBackup }: PickSummaryProps) {
  const total = starterCount + (hasBackup ? 1 : 0);

  return (
    <div className="bg-green-900/30 border border-green-800 rounded-lg px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-green-200">
        Starters: <span className="font-bold text-white">{starterCount} / 4</span>
        {" — "}
        Backup: <span className="font-bold text-white">{hasBackup ? "1" : "0"} / 1</span>
      </span>
      <span className="text-xs text-green-400">{total} of 5 picks made</span>
    </div>
  );
}
