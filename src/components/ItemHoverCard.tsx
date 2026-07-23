"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ItemIcon from "@/components/ItemIcon";
import type { ItemDetail } from "@/lib/types";

/* 같은 아이템을 다시 호버해도 재요청하지 않도록 모듈 레벨에서 캐시 */
const cache = new Map<string, ItemDetail | null>();
const inflight = new Map<string, Promise<ItemDetail | null>>();

function loadItem(itemId: string): Promise<ItemDetail | null> {
  if (cache.has(itemId)) return Promise.resolve(cache.get(itemId) ?? null);
  const existing = inflight.get(itemId);
  if (existing) return existing;
  const p = fetch(`/api/items/${encodeURIComponent(itemId)}`)
    .then((r) => (r.ok ? (r.json() as Promise<ItemDetail>) : null))
    .catch(() => null)
    .then((d) => {
      cache.set(itemId, d);
      inflight.delete(itemId);
      return d;
    });
  inflight.set(itemId, p);
  return p;
}

/** slotName("손(공격)"·"회복킷"·"장신구1") → 짧은 부위 라벨("손"·"회복"·"장신구1") */
function shortSlot(s?: string | null): string {
  if (!s) return "";
  return s.replace(/\(.*?\)/g, "").replace(/킷$/, "").trim();
}

interface Props {
  itemId?: string;
  itemName?: string;
  rarityCode?: string;
  slotName?: string | null;
  size?: number;
  /** 아이콘 아래에 부위 라벨 표시 */
  showSlot?: boolean;
  className?: string;
}

/**
 * 아이템 아이콘 + (선택) 부위 라벨 + 호버 시 상세 요약 툴팁.
 * 툴팁은 포털로 body 에 그려 가로 스크롤(overflow) 영역에 잘리지 않게 하고,
 * 상세 효과(공격력·방어력·설명)는 호버 시점에 /api/items/:id 로 지연 로딩한다.
 */
export default function ItemHoverCard({
  itemId,
  itemName,
  rarityCode,
  slotName,
  size = 36,
  showSlot = false,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);

  useEffect(() => setMounted(true), []);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = rect.top < 240; // 위 공간이 부족하면 아래로 펼침
    const half = 116; // 툴팁(w-56=224px)의 절반
    const left = Math.min(Math.max(rect.left + rect.width / 2, half), window.innerWidth - half);
    setPos({ left, top: below ? rect.bottom + 8 : rect.top - 8, below });
    setOpen(true);

    if (!itemId) return;
    if (cache.has(itemId)) {
      setDetail(cache.get(itemId) ?? null);
      return;
    }
    setLoading(true);
    setDetail(null);
    loadItem(itemId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [itemId]);

  const hide = useCallback(() => setOpen(false), []);

  const name = detail?.itemName ?? itemName ?? undefined;
  const slot = detail?.slotName ?? slotName ?? undefined;
  const rarity = detail?.rarityName ?? undefined;

  const tooltip =
    open && pos ? (
      <div
        className="pointer-events-none fixed z-[100] w-56 rounded-md border border-line bg-surface p-2.5 text-left shadow-float"
        style={{
          left: pos.left,
          top: pos.top,
          transform: pos.below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
        }}
      >
        {name && <div className="text-xs font-semibold text-gray-100">{name}</div>}
        {(slot || rarity) && (
          <div className="mt-0.5 text-[11px] text-gray-500">{[slot, rarity].filter(Boolean).join(" · ")}</div>
        )}
        {loading && <div className="mt-1.5 text-[11px] text-gray-500">불러오는 중…</div>}
        {detail?.explain && (
          <div className="mt-1.5 whitespace-pre-line text-[11px] leading-relaxed text-gray-300">
            {detail.explain}
          </div>
        )}
        {detail?.explainDetail && detail.explainDetail !== detail.explain && (
          <div className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-gray-400">
            {detail.explainDetail}
          </div>
        )}
        {!loading && itemId && !detail && (
          <div className="mt-1.5 text-[11px] text-gray-500">상세 정보를 불러오지 못했습니다.</div>
        )}
      </div>
    ) : null;

  return (
    <span
      ref={ref}
      className={`relative inline-flex flex-col items-center gap-0.5 ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <ItemIcon itemId={itemId ?? ""} itemName={itemName} rarityCode={rarityCode} size={size} />
      {showSlot && (
        <span
          className="truncate text-center text-[9px] leading-tight text-gray-500"
          style={{ maxWidth: size + 8 }}
        >
          {shortSlot(slotName) || " "}
        </span>
      )}
      {mounted && open ? createPortal(tooltip, document.body) : null}
    </span>
  );
}
