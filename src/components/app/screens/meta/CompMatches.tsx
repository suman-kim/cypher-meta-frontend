"use client";

/**
 * 5인 조합 카드 아래 "이 조합이 나온 경기" 펼침 — 처음 펼칠 때 경기 기록을 불러온다.
 * 웹 조합 카드(CompositionSection)의 경기 기록 펼침과 같은 데이터(/api/meta/compositions/matches)를 쓴다.
 */
import Link from "next/link";
import { useState } from "react";
import { getCompositionMatches, type CompMatch } from "@/lib/meta";
import { Icon } from "../../icons";
import { Badge, CharImg, Skel } from "../../ui";

/**
 * 경기 시각을 "11.05 14:30" 처럼 짧게 적는다(한국 시간).
 * @param iso 경기 시각(ISO)
 */
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: Intl.DateTimeFormatPartTypes) => parts.find((x) => x.type === t)?.value ?? "";
  return `${g("month")}.${g("day")} ${g("hour")}:${g("minute")}`;
}

/**
 * @param ids 조합 캐릭터 ID 목록(5명)
 * @param gameTypeId 게임 타입 (예: "rating")
 */
export default function CompMatches({ ids, gameTypeId }: { ids: string[]; gameTypeId: string }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<CompMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  /** 경기 기록을 불러온다(실패하면 오류 상태). */
  async function load() {
    setLoading(true);
    setErr(false);
    try {
      const r = await getCompositionMatches(ids, gameTypeId);
      setList(r.matches);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }

  /** 펼침/접기 — 처음 펼칠 때만 불러온다. */
  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && list === null && !loading) void load();
  }

  return (
    <div className="mt-3 border-t border-app-hair pt-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-1 py-1 text-xs font-semibold text-gray-500"
      >
        {open ? "경기 기록 접기" : "이 조합이 나온 경기 보기"}
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} />
      </button>

      {open && (
        <div className="mt-2 grid gap-2">
          {loading ? (
            <>
              <Skel className="h-16 rounded-[14px]" />
              <Skel className="h-16 rounded-[14px]" />
            </>
          ) : err ? (
            <div className="grid justify-items-center gap-2 py-3 text-center">
              <p className="text-xs text-gray-500">경기 기록을 불러오지 못했어요.</p>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-xs font-semibold text-gray-200"
              >
                <Icon name="refresh" size={13} />
                다시 시도
              </button>
            </div>
          ) : !list || list.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-500">이 조합이 나온 경기 기록을 찾지 못했어요.</p>
          ) : (
            list.map((m) => {
              const win = m.result === "win";
              return (
                <div key={m.matchId} className={`rounded-[14px] px-3 py-2.5 ${win ? "bg-app-win-bg" : "bg-app-loss-bg"}`}>
                  <div className="flex items-center gap-2">
                    <Badge tone={win ? "win" : "loss"}>{win ? "승리" : "패배"}</Badge>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-gray-500">
                      {shortDate(m.playedAt)}
                      {m.mapName ? ` · ${m.mapName}` : ""}
                    </span>
                    <Link href={`/matches/${m.matchId}`} className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-primary">
                      경기 보기
                      <Icon name="chevronRight" size={12} />
                    </Link>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.players.map((p) => (
                      <Link
                        key={p.playerId}
                        href={`/players/${p.playerId}`}
                        className="flex items-center gap-1 rounded-full bg-surface py-0.5 pl-0.5 pr-2"
                      >
                        <CharImg id={p.characterId} name={p.characterName} size={18} radius={9} />
                        <span className="max-w-[88px] truncate text-[10px] font-medium text-gray-300">
                          {p.nickname ?? p.characterName ?? "-"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
