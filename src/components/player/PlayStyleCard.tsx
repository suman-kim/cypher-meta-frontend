import type { PlayStyle } from "@/lib/profile";

function Bar({
  label,
  pct,
  count,
  color,
}: {
  label: string;
  pct: number;
  count: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-300">{label}</span>
        <span>
          <span className="font-bold text-gray-100">{pct}%</span>{" "}
          <span className="text-gray-500">({count})</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function PlayStyleCard({ style }: { style: PlayStyle }) {
  if (style.classified === 0) return null;
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-100">플레이 스타일</h3>
      <div className="space-y-3">
        <Bar label="근거리" pct={style.meleePct} count={style.melee} color="#4f8ff0" />
        <Bar label="원거리" pct={style.rangedPct} count={style.ranged} color="#ef6a95" />
      </div>
      <div className="mt-3 text-right text-xs text-gray-500">총 {style.classified}게임</div>
    </div>
  );
}
