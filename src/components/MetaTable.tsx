"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "./CharacterAvatar";
import { calcKDA, kdaColor } from "@/lib/format";
import {
  TIER_META,
  getCharacterPicks,
  type TieredCharacter,
  type CharacterPicksResult,
} from "@/lib/meta";

type SortKey = "score" | "pickRate" | "winRate" | "kda" | "picks";

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "score", label: "종합" },
  { key: "pickRate", label: "픽률" },
  { key: "winRate", label: "승률" },
  { key: "kda", label: "KDA" },
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
  return {
    date: `${g("month")}.${g("day")}`,
    time: `${g("dayPeriod")} ${g("hour")}:${g("minute")}`,
  };
}
/** 확장 패널 — 이 캐릭터를 누가·어떤 경기에서 픽했는지 */
function PicksPanel({
  char,
  data,
  loading,
}: {
  char: TieredCharacter;
  data?: CharacterPicksResult;
  loading: boolean;
}) {
  if (loading) return <div className="py-4 text-center text-xs text-gray-500">불러오는 중…</div>;
  if (!data) return <div className="py-4 text-center text-xs text-gray-500">경기 정보를 불러오지 못했습니다.</div>;
  if (data.picks.length === 0)
    return <div className="py-4 text-center text-xs text-gray-500">픽한 경기 기록이 없습니다.</div>;
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-gray-100">
          {char.characterName ?? char.characterId}
        </span>
        <span className="text-[11px] text-gray-500">픽한 경기 기록</span>
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-medium text-gray-400">
          총 {data.total.toLocaleString()}건 · 최근 {data.picks.length}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
        {data.picks.map((p, idx) => {
          const kda = calcKDA(p.killCount, p.deathCount, p.assistCount);
          const win = p.result === "win";
          const col = win ? "rgb(var(--win))" : "rgb(var(--lose))";
          const kc = kdaColor(kda);
          const dt = pickDateParts(p.playedAt);
          return (
            <li
              key={`${p.matchId}-${p.playerId}-${idx}`}
              className="group flex items-center gap-2.5 overflow-hidden rounded-lg border border-line/60 border-l-[3px] bg-surface px-2.5 py-1.5 text-xs transition-colors hover:bg-surface-2"
              style={{ borderLeftColor: col }}
            >
              <span className="w-4 shrink-0 text-center text-[11px] font-black" style={{ color: col }}>
                {win ? "승" : "패"}
              </span>
              <Link
                href={`/players/${p.playerId}`}
                onClick={(e) => e.stopPropagation()}
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
                <span className="hidden w-14 shrink-0 text-right text-[10px] leading-tight text-gray-500 xl:block">
                  <span className="block whitespace-nowrap">{dt.date}</span>
                  <span className="block whitespace-nowrap">{dt.time}</span>
                </span>
              )}
              <Link
                href={`/matches/${p.matchId}`}
                onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}

/** 반응형 지표 타일 — 모바일 3열 그리드 / 데스크톱 인라인 칩 */
function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-surface-2 px-2 py-1.5 text-center sm:min-w-[62px]">
      <span className="text-[10px] font-medium text-gray-500">{label}</span>
      <span className="mt-0.5 text-sm font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}

export default function MetaTable({
  rows,
  gameTypeId,
}: {
  rows: TieredCharacter[];
  gameTypeId?: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [openId, setOpenId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, CharacterPicksResult>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!picks[id]) {
      setLoadingId(id);
      try {
        const data = await getCharacterPicks(id, gameTypeId);
        setPicks((prev) => ({ ...prev, [id]: data }));
      } catch {
        /* 패널이 오류 표시 */
      } finally {
        setLoadingId((cur) => (cur === id ? null : cur));
      }
    }
  }

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const d = (b[sortKey] as number) - (a[sortKey] as number);
      return d !== 0 ? d : b.picks - a.picks;
    });
    return arr;
  }, [rows, sortKey]);

  return (
    <div className="space-y-2.5">
      {/* 정렬 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">정렬</span>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
          {SORT_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSortKey(t.key)}
              className={`segtab text-xs ${sortKey === t.key ? "segtab-active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 캐릭터 카드 목록 (반응형: 모바일 세로 / 데스크톱 가로) */}
      <ul className="space-y-2">
        {sorted.map((r, i) => {
          const open = openId === r.characterId;
          return (
            <li
              key={r.characterId}
              className={`overflow-hidden rounded-xl border bg-surface transition-colors ${
                open ? "border-primary/40" : "border-line"
              }`}
            >
              <div
                onClick={() => toggle(r.characterId)}
                className="flex cursor-pointer flex-col gap-2.5 p-3 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-400">{i + 1}</span>
                  <TierPill tier={r.tier} size="md" />
                  <Avatar characterId={r.characterId} characterName={r.characterName ?? undefined} size={36} />
                  <Link
                    href={`/characters/${r.characterId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate text-sm font-bold text-gray-100 hover:text-primary"
                  >
                    {r.characterName ?? r.characterId}
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:ml-auto sm:flex sm:gap-2">
                  <MiniStat label="픽률" value={`${r.pickRate}%`} color="rgb(var(--primary))" />
                  <MiniStat
                    label="승률"
                    value={`${r.winRate}%`}
                    color={r.winRate >= 50 ? "rgb(var(--win))" : "rgb(var(--lose))"}
                  />
                  <MiniStat label="KDA" value={r.kda.toFixed(2)} color={kdaColor(r.kda)} />
                </div>

                <span
                  className={`hidden shrink-0 text-gray-500 transition-transform sm:inline ${
                    open ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </div>

              {open && (
                <div className="border-t border-line/60 bg-surface-2/40 px-3 py-3">
                  <PicksPanel char={r} data={picks[r.characterId]} loading={loadingId === r.characterId} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
