"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "./CharacterAvatar";
import { kdaColor } from "@/lib/format";
import { TIER_META, type TieredCharacter } from "@/lib/meta";

type SortKey = "score" | "pickRate" | "winRate" | "kda" | "picks";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "pickRate", label: "픽률" },
  { key: "winRate", label: "승률" },
  { key: "kda", label: "KDA" },
  { key: "picks", label: "표본", className: "hidden sm:table-cell" },
];

/** S~D 미니 티어 뱃지 */
export function TierPill({ tier, size = "sm" }: { tier: keyof typeof TIER_META; size?: "sm" | "md" }) {
  const m = TIER_META[tier];
  const px = size === "md" ? "h-7 w-7 text-sm" : "h-5 w-5 text-[11px]";
  return (
    <span
      className={`inline-grid ${px} shrink-0 place-items-center rounded font-black text-white`}
      style={{ backgroundColor: m.color }}
      title={m.desc}
    >
      {m.label}
    </span>
  );
}

export default function MetaTable({ rows }: { rows: TieredCharacter[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const maxPick = useMemo(() => Math.max(1, ...rows.map((r) => r.pickRate)), [rows]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const d = (b[sortKey] as number) - (a[sortKey] as number);
      return d !== 0 ? d : b.picks - a.picks;
    });
    return arr;
  }, [rows, sortKey]);

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
            <th className="w-12 px-3 py-3 text-left">#</th>
            <th className="px-3 py-3 text-left">캐릭터</th>
            {COLUMNS.map((c) => {
              const active = sortKey === c.key;
              return (
                <th key={c.key} className={`px-3 py-3 text-right ${c.className ?? ""}`}>
                  <button
                    type="button"
                    onClick={() => setSortKey(c.key)}
                    className={`inline-flex items-center gap-1 transition-colors hover:text-gray-200 ${
                      active ? "text-primary" : ""
                    }`}
                  >
                    {c.label}
                    <span className={active ? "opacity-100" : "opacity-30"}>▾</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={r.characterId}
              className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
            >
              <td className="px-3 py-2.5 font-medium text-gray-400">{i + 1}</td>
              <td className="px-3 py-2.5">
                <Link
                  href={`/characters/${r.characterId}`}
                  className="inline-flex items-center gap-2 font-semibold text-gray-100 hover:text-primary"
                >
                  <TierPill tier={r.tier} />
                  <Avatar characterId={r.characterId} characterName={r.characterName ?? undefined} size={30} />
                  <span className="truncate">{r.characterName ?? r.characterId}</span>
                </Link>
              </td>

              {/* 픽률 (최대값 기준 바) */}
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-3 sm:block">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(r.pickRate / maxPick) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-semibold text-primary">{r.pickRate}%</span>
                </div>
              </td>

              {/* 승률 (50% 기준선 바) */}
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <div className="relative hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-3 sm:block">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(r.winRate, 100)}%`,
                        backgroundColor: r.winRate >= 50 ? "rgb(var(--win))" : "rgb(var(--lose))",
                      }}
                    />
                    <span className="absolute inset-y-0 left-1/2 w-px bg-gray-500/50" />
                  </div>
                  <span
                    className="w-12 text-right font-semibold"
                    style={{ color: r.winRate >= 50 ? "rgb(var(--win))" : "rgb(var(--lose))" }}
                  >
                    {r.winRate}%
                  </span>
                </div>
              </td>

              {/* KDA */}
              <td className="px-3 py-2.5 text-right font-bold" style={{ color: kdaColor(r.kda) }}>
                {r.kda.toFixed(2)}
              </td>

              {/* 표본 */}
              <td className="hidden px-3 py-2.5 text-right text-gray-500 sm:table-cell">
                {r.picks.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
