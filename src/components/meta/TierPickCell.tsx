"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "../CharacterAvatar";
import { calcKDA, kdaColor } from "@/lib/format";
import { getCharacterPicks, type CharacterPicksResult } from "@/lib/meta";

function pickDateParts(iso: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const g = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return { date: `${g("month")}.${g("day")}`, time: `${g("dayPeriod")} ${g("hour")}:${g("minute")}` };
}

/**
 * 티어 그리드 셀.
 * - 캐릭터 이미지 클릭 → 캐릭터 상세 페이지(유지)
 * - 캐릭터 이름 클릭 → 픽 기록 모달
 */
export function TierPickCell({
  characterId,
  characterName,
  pickRate,
  winRate,
  gameTypeId,
}: {
  characterId: string;
  characterName: string | null;
  pickRate: number;
  winRate: number;
  gameTypeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CharacterPicksResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const name = characterName ?? characterId;

  useEffect(() => {
    // open 될 때만 1회 로드. loading/data 를 deps 에 넣으면 setLoading(true) 가
    // 이 effect 를 재실행 → cleanup(alive=false) 이 진행 중인 요청을 무효화해서
    // 영영 "불러오는 중…" 에 멈춘다. 그래서 open/characterId/gameTypeId 에만 의존한다.
    if (!open) return;
    if (data) return; // 이미 로드됨 (닫았다 다시 열 때 재요청 방지)
    let alive = true;
    setLoading(true);
    setError(false);
    getCharacterPicks(characterId, gameTypeId)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, characterId, gameTypeId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex w-[84px] flex-col items-center gap-1 rounded-md p-1 transition-colors hover:bg-surface-2">
      <Link
        href={`/characters/${characterId}`}
        title={`${name} 상세 · 픽률 ${pickRate}% · 승률 ${winRate}%`}
        className="rounded-md ring-primary/50 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2"
      >
        <Avatar characterId={characterId} characterName={characterName ?? undefined} size={44} />
      </Link>
      <Link
        href={`/characters/${characterId}`}
        title={`${name} 상세`}
        className="w-full truncate text-center text-[11px] font-medium text-gray-300 transition-colors hover:text-primary"
      >
        {name}
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${name} 경기 기록 보기`}
        className="group flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-full border border-line bg-surface-2/70 px-1.5 py-[3px] text-[10px] font-semibold text-gray-400 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary active:scale-95"
      >
        <svg
          className="h-2.5 w-2.5 shrink-0 text-gray-500 transition-colors group-hover:text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 20V13M12 20V5M18 20v-4" />
        </svg>
        경기 기록
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center gap-3 border-b border-line/70 p-4">
              <Avatar characterId={characterId} characterName={characterName ?? undefined} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/characters/${characterId}`}
                    className="truncate text-sm font-bold text-gray-100 hover:text-primary"
                  >
                    {name}
                  </Link>
                  <span className="text-[11px] text-gray-500">경기 기록</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                  <span className="text-gray-500">
                    픽률 <span className="font-semibold text-primary">{pickRate}%</span>
                  </span>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-500">
                    승률{" "}
                    <span
                      className="font-semibold"
                      style={{ color: winRate >= 50 ? "rgb(var(--win))" : "rgb(var(--lose))" }}
                    >
                      {winRate}%
                    </span>
                  </span>
                  {data && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-500">
                        총 <span className="font-semibold text-gray-300">{data.total.toLocaleString()}</span>건
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-surface-2 hover:text-gray-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {loading && <div className="py-10 text-center text-xs text-gray-500">불러오는 중…</div>}
              {error && (
                <div className="py-10 text-center text-xs text-gray-500">경기 정보를 불러오지 못했습니다.</div>
              )}
              {data && data.picks.length === 0 && (
                <div className="py-10 text-center text-xs text-gray-500">픽한 경기 기록이 없습니다.</div>
              )}
              {data && data.picks.length > 0 && (
                <>
                  <div className="mb-2 px-1 text-[11px] text-gray-500">
                    최근 {data.picks.length}경기 · 이 캐릭터를 누가·어떤 경기에서 픽했는지
                  </div>
                  <ul className="space-y-1.5">
                    {data.picks.map((p, idx) => {
                      const kda = calcKDA(p.killCount, p.deathCount, p.assistCount);
                      const win = p.result === "win";
                      const col = win ? "rgb(var(--win))" : "rgb(var(--lose))";
                      const kc = kdaColor(kda);
                      const dt = pickDateParts(p.playedAt);
                      return (
                        <li
                          key={`${p.matchId}-${p.playerId}-${idx}`}
                          className="group flex items-center gap-2.5 overflow-hidden rounded-lg border border-line/60 border-l-[3px] bg-surface-2/50 px-2.5 py-1.5 text-xs transition-colors hover:bg-surface-2"
                          style={{ borderLeftColor: col }}
                        >
                          <span className="w-4 shrink-0 text-center text-[11px] font-black" style={{ color: col }}>
                            {win ? "승" : "패"}
                          </span>
                          <Link
                            href={`/players/${p.playerId}`}
                            className="min-w-0 flex-1 truncate font-semibold text-gray-100 hover:text-primary"
                            title={p.nickname ?? ""}
                          >
                            {p.nickname ?? "-"}
                          </Link>
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-gray-500">
                            {p.killCount}
                            <span className="text-gray-600">/</span>
                            <span className="text-red-400/90">{p.deathCount}</span>
                            <span className="text-gray-600">/</span>
                            {p.assistCount}
                          </span>
                          <span
                            className="w-9 shrink-0 rounded-md py-0.5 text-center text-[11px] font-bold tabular-nums"
                            style={{ color: kc, backgroundColor: `${kc}1f` }}
                          >
                            {kda.toFixed(1)}
                          </span>
                          {dt && (
                            <span className="hidden w-14 shrink-0 text-right text-[10px] leading-tight text-gray-500 sm:block">
                              <span className="block whitespace-nowrap">{dt.date}</span>
                              <span className="block whitespace-nowrap">{dt.time}</span>
                            </span>
                          )}
                          <Link
                            href={`/matches/${p.matchId}`}
                            className="flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[10px] font-medium text-gray-400 transition-colors hover:border-primary/50 hover:text-primary"
                          >
                            경기 보기
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M7 17 17 7M9 7h8v8" />
                            </svg>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
