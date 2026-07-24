"use client";

import Link from "next/link";
import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";
import RankAvatar from "./RankAvatar";
import PickList from "./PickList";
import type { PickInfo } from "@/lib/ranking-enrich";

const RANK_COLORS = ["#e3b23c", "#9aa7b4", "#b06b3f"]; // 금·은·동

export interface RankerCardData {
  ranking: number;
  playerId: string;
  nickname: string;
  ratingPoint: number;
  tierName?: string | null;
  win: number;
  total: number;
  winRate: number;
  charId?: string | null;
  charName?: string | null;
  picks: PickInfo[];
}

/**
 * 상위 랭커 TOP10 가로 슬라이더 (1~10위 한 줄).
 * 1~3위는 금·은·동 강조, 4~10위는 기본 카드. 같은 라인에서 좌우로 슬라이딩.
 * 포인터 드래그(터치·마우스 공통) + 데스크톱 화살표. touch-action:pan-y 로 세로 스크롤은 그대로.
 */
export default function RankerSlider({ items }: { items: RankerCardData[] }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
    // setPointerCapture 미사용: click 이 트랙으로 넘어가 카드 링크 이동이 막히는 문제 방지
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 8) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const onUp = () => {
    drag.current.active = false;
  };
  // 드래그 후 실수로 카드 링크가 눌리지 않게 클릭 차단
  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  if (!items.length) return null;

  return (
    <div className="relative mt-4">
      <div
        ref={track}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
        style={{ touchAction: "pan-y" }}
        className="flex cursor-grab select-none gap-1 overflow-x-auto overscroll-x-contain pb-2 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_img]:pointer-events-none"
      >
        {items.map((it) => {
          const top3 = it.ranking <= 3;
          const rc = RANK_COLORS[it.ranking - 1] ?? "#9aa7b4";
          const medal = it.ranking === 1 ? "👑" : it.ranking === 2 ? "🥈" : it.ranking === 3 ? "🥉" : null;
          const loses = Math.max(0, it.total - it.win);
          const hasRec = it.total > 0;
          return (
            <Link
              key={it.playerId}
              href={`/players/${it.playerId}`}
              draggable={false}
              className="relative w-[210px] shrink-0 overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-float lg:w-[280px] lg:p-5"
              style={top3 ? { boxShadow: `0 10px 30px -14px ${rc}70` } : undefined}
            >
              {top3 && (
                <>
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${rc}, transparent)` }} />
                  <span className="pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-[2rem]" style={{ background: `linear-gradient(135deg, ${rc}2b, transparent 70%)` }} />
                </>
              )}
              <span className="pointer-events-none absolute -right-1 -top-4 select-none text-6xl font-black text-gray-200/40">
                {it.ranking}
              </span>

              <div className="relative flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${top3 ? "" : "bg-surface-3 text-gray-400"}`}
                  style={top3 ? { background: `${rc}22`, color: rc } : undefined}
                >
                  {medal && <span aria-hidden>{medal}</span>} {it.ranking}위
                </span>
                {it.tierName && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{it.tierName}</span>
                )}
              </div>

              <div className="relative mt-2.5 flex items-center gap-2.5">
                <RankAvatar
                  characterId={it.charId ?? undefined}
                  characterName={it.charName ?? undefined}
                  nickname={it.nickname}
                  size={44}
                  zoom={2}
                  ringStyle={{ boxShadow: top3 ? `0 0 0 3px ${rc}` : "0 0 0 2px rgb(var(--border))" }}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-gray-100">{it.nickname}</div>
                  <div className="text-[11px] text-gray-500">{it.ratingPoint.toLocaleString()} RP</div>
                </div>
              </div>

              {hasRec ? (
                <div className="relative mt-2.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-primary">{it.winRate}%</span>
                    <span className="text-gray-500">{it.win}승 {loses}패</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, it.winRate))}%` }} />
                  </div>
                </div>
              ) : (
                <div className="relative mt-2.5 text-[11px] text-gray-500">최근 기록 없음</div>
              )}

              <div className="relative mt-2.5 flex items-center gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold text-gray-500">픽</span>
                <PickList picks={it.picks} compact />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
