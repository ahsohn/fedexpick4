"use client";

interface GolferRowProps {
  golfer: {
    id: number;
    name: string;
    in_field: boolean | null;
    used_in_week: string | null;
    fedex_rank: number | null;
  };
  pickSlot: { type: "starter"; order: number } | { type: "backup" } | null;
  onToggle: (golferId: number) => void;
  disabled: boolean;
}

export default function GolferRow({ golfer, pickSlot, onToggle, disabled }: GolferRowProps) {
  const isUsed = !!golfer.used_in_week;
  const isSelected = !!pickSlot;

  return (
    <button
      onClick={() => !isUsed && onToggle(golfer.id)}
      disabled={isUsed || disabled}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition border ${
        isUsed
          ? "opacity-35 cursor-not-allowed bg-gray-900 border-transparent"
          : isSelected && pickSlot?.type === "backup"
          ? "bg-purple-950 border-purple-700"
          : isSelected
          ? "bg-blue-950 border-blue-700"
          : "bg-gray-900 border-transparent hover:border-gray-700 cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-100">{golfer.name}</span>
        {golfer.fedex_rank && (
          <span className="text-xs text-gray-500">#{golfer.fedex_rank}</span>
        )}
        {isUsed ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-900/50 text-red-400">
            USED {golfer.used_in_week}
          </span>
        ) : golfer.in_field ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">
            IN FIELD
          </span>
        ) : golfer.in_field === false ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400">
            NOT IN FIELD
          </span>
        ) : null}
      </div>
      <div>
        {isSelected ? (
          <span className={`text-xs font-semibold px-2 py-1 rounded ${
            pickSlot.type === "backup"
              ? "bg-purple-900 text-purple-300"
              : "bg-blue-900 text-blue-300"
          }`}>
            {pickSlot.type === "backup" ? "Backup" : `Starter ${pickSlot.order}`}
          </span>
        ) : !isUsed ? (
          <span className="text-xs text-gray-600">+ Add</span>
        ) : null}
      </div>
    </button>
  );
}
