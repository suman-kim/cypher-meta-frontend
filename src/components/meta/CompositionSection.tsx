"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/CharacterAvatar";
import {
  getCompositionMatches,
  type Composition,
  type CompositionsResult,
  type CompMatch,
} from "@/lib/meta";

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

function fmtMatchDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ComboCard({
  combo,
  rank,
  gameTypeId,
}: {
  combo: Composition;
  rank: number;
  gameTypeId: string;
}) {
  const wr = combo.winRate;
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<CompMatch[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && matches === null && !loading) {
      setLoading(true);
      try {
        const r = await getCompositionMatches(combo.ids, gameTypeId);
        setMatches(r.matches);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-surface-2"
      >
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
        <span className={`shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-line/60 bg-surface-2/30 px-2.5 py-2">
          {loading ? (
            <div className="py-3 text-center text-xs text-gray-500">불러오는 중…</div>
          ) : !matches || matches.length === 0 ? (
            <div className="py-3 text-center text-xs text-gray-500">
              이 조합이 등장한 경기 기록을 찾지 못했습니다.
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="grid h-4 w-4 place-items-center rounded bg-primary/15 text-[9px] text-primary">▦</span>
                이 조합이 등장한 경기 기록 <b className="text-gray-300">{matches.length}</b>건
              </div>
              <ul className="divide-y divide-line/40">
                {matches.map((m) => {
                  const win = m.result === "win";
                  const col = win ? "rgb(var(--win))" : "rgb(var(--lose))";
                  return (
                    <li
                      key={m.matchId}
                      className="border-l-2 py-2 pl-2.5 first:pt-0.5 last:pb-0.5"
                      style={{ borderLeftColor: col }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-[11px] font-black" style={{ color: col }}>
                          {win ? "승리" : "패배"}
                        </span>
                        <span className="shrink-0 text-[11px] text-gray-500">{fmtMatchDate(m.playedAt)}</span>
                        {m.mapName && <span className="truncate text-[11px] text-gray-500">· {m.mapName}</span>}
                        <Link
                          href={`/matches/${m.matchId}`}
                          className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[10px] font-medium text-gray-400 transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          경기 보기
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17 17 7M9 7h8v8" />
                          </svg>
                        </Link>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {m.players.map((p) => (
                          <Link
                            key={p.playerId}
                            href={`/players/${p.playerId}`}
                            title={`${p.characterName ?? ""} · ${p.killCount}/${p.deathCount}/${p.assistCount}`}
                            className="flex items-center gap-1.5 rounded-full bg-surface-2 py-0.5 pl-0.5 pr-2 transition-colors hover:bg-surface-3"
                          >
                            <Avatar
                              characterId={p.characterId}
                              characterName={p.characterName ?? undefined}
                              size={18}
                              zoom={1}
                            />
                            <span className="text-[10px] font-medium text-gray-300">
                              {p.nickname ?? p.characterName ?? "-"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ComboList({
  combos,
  empty,
  gameTypeId,
}: {
  combos: Composition[];
  empty: string;
  gameTypeId: string;
}) {
  if (combos.length === 0) {
    return <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-gray-500">{empty}</div>;
  }
  return (
    <div className="space-y-2">
      {combos.map((c, i) => (
        <ComboCard key={c.ids.join("-")} combo={c} rank={i + 1} gameTypeId={gameTypeId} />
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
            <ComboList combos={data.byFrequency} empty="아직 반복 등장한 조합이 없습니다." gameTypeId={data.gameTypeId} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-300">
              승률 높은 조합 <span className="font-normal text-gray-500">({data.minGames}판 이상)</span>
            </h3>
            <ComboList combos={data.byWinRate} empty={`${data.minGames}판 이상 반복된 조합이 아직 없습니다.`} gameTypeId={data.gameTypeId} />
          </div>
        </div>
      ) : basis === "freq" ? (
        <ComboList combos={data.byFrequency} empty="아직 반복 등장한 조합이 없습니다." gameTypeId={data.gameTypeId} />
      ) : (
        <ComboList combos={data.byWinRate} empty={`${data.minGames}판 이상 반복된 조합이 아직 없습니다.`} gameTypeId={data.gameTypeId} />
      )}

      <p className="mt-2 text-[11px] text-gray-500">
        * 팀은 같은 매치에서 승패가 같은 {size}인으로 구성됩니다. 정확히 같은 {size}인이 반복되는 경우는 수집 데이터로는 적을 수 있어, 판수가 낮으면 참고용입니다.
      </p>
    </section>
  );
}
