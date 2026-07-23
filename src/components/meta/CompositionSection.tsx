"use client";

import { useState } from "react";
import { Avatar } from "@/components/CharacterAvatar";
import type { Composition, CompositionsResult } from "@/lib/meta";

type Basis = "freq" | "win" | "both";

const BASIS_TABS: { key: Basis; label: string }[] = [
  { key: "freq", label: "빈도" },
  { key: "win", label: "승률" },
  { key: "both", label: "빈도+승률" },
];

function rankColor(rank: number): string {
  if (rank === 1) return "bg-primary text-white";
  if (rank === 2) return "bg-surface-3 text-gray-100";
  if (rank === 3) return "bg-[#c07b3f] text-white";
  return "bg-surface-2 text-gray-400";
}

function ComboCard({ combo, rank }: { combo: Composition; rank: number }) {
  const wr = combo.winRate;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2.5">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm font-black ${rankColor(rank)}`}
      >
        {rank}
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {combo.ids.map((id, i) => (
          <span key={`${id}-${i}`} className="flex flex-col items-center gap-0.5" title={combo.names[i]}>
            <Avatar characterId={id} characterName={combo.names[i]} size={34} zoom={1} />
            <span className="w-10 truncate text-center text-[9px] leading-tight text-gray-500">
              {combo.names[i]}
            </span>
          </span>
        ))}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold" style={{ color: wr >= 50 ? "rgb(var(--primary))" : "#9aa7b4" }}>
          {wr}%
        </div>
        <div className="text-[11px] text-gray-500">{combo.games}판</div>
      </div>
    </div>
  );
}

function ComboList({ combos, empty }: { combos: Composition[]; empty: string }) {
  if (combos.length === 0) {
    return <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-gray-500">{empty}</div>;
  }
  return (
    <div className="space-y-2">
      {combos.map((c, i) => (
        <ComboCard key={c.ids.join("-")} combo={c} rank={i + 1} />
      ))}
    </div>
  );
}

export default function CompositionSection({ data }: { data: CompositionsResult }) {
  const [basis, setBasis] = useState<Basis>("freq");
  const size = data.teamSize;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-bold text-gray-100">{size}인 조합 추천</h2>
          <span className="text-xs text-gray-500">
            상위 랭커 매치의 팀 조합 집계 · 팀 {data.totalTeams.toLocaleString()}개 · 조합 {data.distinctCombos.toLocaleString()}종
          </span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
          <span className="px-1.5 text-xs font-medium text-gray-500">기준</span>
          {BASIS_TABS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setBasis(b.key)}
              className={`segtab text-xs ${b.key === basis ? "segtab-active" : ""}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {basis === "both" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-300">가장 많이 나온 조합</h3>
            <ComboList combos={data.byFrequency} empty="아직 반복 등장한 조합이 없습니다." />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-300">
              승률 높은 조합 <span className="font-normal text-gray-500">({data.minGames}판 이상)</span>
            </h3>
            <ComboList combos={data.byWinRate} empty={`${data.minGames}판 이상 반복된 조합이 아직 없습니다.`} />
          </div>
        </div>
      ) : basis === "freq" ? (
        <ComboList combos={data.byFrequency} empty="아직 반복 등장한 조합이 없습니다." />
      ) : (
        <ComboList combos={data.byWinRate} empty={`${data.minGames}판 이상 반복된 조합이 아직 없습니다.`} />
      )}

      <p className="mt-2 text-[11px] text-gray-500">
        * 팀은 같은 매치에서 승패가 같은 {size}인으로 구성됩니다. 정확히 같은 {size}인이 반복되는 경우는 표본상 적을 수 있어, 판수가 낮으면 참고용입니다.
      </p>
    </section>
  );
}
