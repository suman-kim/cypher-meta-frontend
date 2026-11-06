"use client";

/**
 * 아이템 요약 시트 — 아이템 그림을 누르면 화면 아래에서 올라오는 시트로 이름·부위·희귀도·효과를 보여 준다.
 *
 * - 효과 설명은 누른 순간 /api/items/:id 로 받아 온다(웹 ItemHoverCard 와 같은 경로, 모듈 캐시로 다시 부르지 않음).
 * - 웹은 마우스 호버 툴팁이지만 앱은 손가락으로 누르므로 시트로 바꿨다.
 * - BottomSheet 는 다른 화면에서도 쓸 수 있는 모양이라 공용으로 올릴 후보다.
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ItemDetail } from "@/lib/types";
import { Icon } from "../../icons";
import { Skel } from "../../ui";
import { AppItemIcon, shortSlot } from "./parts";

/* ── 바텀 시트 ─────────────────────────────────── */

/**
 * 화면 아래에서 올라오는 시트. 바깥(어두운 부분)을 누르거나 Esc 를 누르면 닫힌다.
 * @param open 열림 여부
 * @param onClose 닫을 때 부르는 함수
 * @param title 시트 제목 (화면 읽기 프로그램용 이름 겸 머리글)
 * @param children 시트 내용
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 열려 있는 동안 뒤 화면 스크롤을 막고, Esc 로 닫는다
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        style={{ animation: "cmFade .2s ease" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-[24px] border-t border-app-hair bg-surface px-4 pt-2.5 shadow-[var(--a-shadow)]"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))", animation: "cmUp .26s cubic-bezier(.2,.8,.2,1)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-500/40" aria-hidden />
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ── 아이템 상세 불러오기 (모듈 캐시) ─────────────── */

const cache = new Map<string, ItemDetail | null>();
const inflight = new Map<string, Promise<ItemDetail | null>>();

/**
 * 아이템 상세를 받아 온다. 같은 아이템은 한 번만 부른다.
 * @param itemId 아이템 ID
 * @returns 상세 (실패하면 null)
 */
function loadItem(itemId: string): Promise<ItemDetail | null> {
  if (cache.has(itemId)) return Promise.resolve(cache.get(itemId) ?? null);
  const existing = inflight.get(itemId);
  if (existing) return existing;
  const p = fetch(`/api/items/${encodeURIComponent(itemId)}`)
    .then((r) => (r.ok ? (r.json() as Promise<ItemDetail>) : null))
    .catch(() => null)
    .then((d) => {
      // 실패는 캐시에 남기지 않아 다시 누르면 다시 시도한다
      if (d) cache.set(itemId, d);
      inflight.delete(itemId);
      return d;
    });
  inflight.set(itemId, p);
  return p;
}

/* ── 아이템 버튼 + 시트 ──────────────────────── */

/**
 * 누르면 아이템 요약 시트가 열리는 아이템 그림.
 * @param itemId 아이템 ID
 * @param itemName 아이템 이름 (매치 응답에 있는 값)
 * @param rarityCode 희귀도 코드
 * @param slotName 부위 이름
 * @param size 그림 크기(px)
 * @param label 그림 옆·아래에 붙일 요소 (부위 라벨 등, 선택)
 * @param className 버튼 추가 클래스
 */
export function ItemButton({
  itemId,
  itemName,
  rarityCode,
  slotName,
  size = 28,
  label,
  className = "",
}: {
  itemId?: string | null;
  itemName?: string | null;
  rarityCode?: string | null;
  slotName?: string | null;
  size?: number;
  label?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  /** 상세를 불러온다 (처음 열 때·다시 시도할 때) */
  const fetchDetail = () => {
    if (!itemId) return;
    setStatus("loading");
    loadItem(itemId).then((d) => {
      setDetail(d);
      setStatus(d ? "ready" : "error");
    });
  };

  /** 시트를 연다 — 아직 못 불러왔으면 불러온다 */
  const show = () => {
    setOpen(true);
    if (status === "idle" || status === "error") fetchDetail();
  };

  const name = detail?.itemName ?? itemName ?? "아이템";
  const meta = [
    detail?.slotName ?? slotName,
    detail?.rarityName,
    detail?.characterName ? `${detail.characterName} 전용` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const explain = detail?.explain?.trim() ?? "";
  const explainDetail = detail?.explainDetail?.trim() ?? "";

  return (
    <>
      <button
        type="button"
        onClick={show}
        className={`a-press inline-flex items-center text-left ${className}`}
        aria-label={`${name} 정보 보기`}
      >
        <AppItemIcon itemId={itemId} itemName={itemName} rarityCode={rarityCode} size={size} />
        {label}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={`${name} 정보`}>
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <AppItemIcon itemId={itemId} itemName={itemName} rarityCode={rarityCode} size={52} />
            <div className="grid min-w-0 gap-0.5">
              <span className="truncate text-[17px] font-extrabold text-gray-100">{name}</span>
              <span className="truncate text-xs text-gray-500">{meta || shortSlot(slotName) || "아이템"}</span>
            </div>
          </div>
          <div className="max-h-[42vh] overflow-y-auto rounded-2xl bg-bg p-3.5">
            {status === "loading" && (
              <div className="grid gap-2">
                <Skel className="h-3.5 w-4/5 rounded-md" />
                <Skel className="h-3.5 w-3/5 rounded-md" />
                <Skel className="h-3.5 w-2/3 rounded-md" />
              </div>
            )}
            {status === "error" && (
              <div className="grid justify-items-center gap-2 py-2 text-center">
                <p className="text-[13px] text-gray-300">아이템 효과를 불러오지 못했어요</p>
                <button
                  type="button"
                  onClick={fetchDetail}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
                >
                  <Icon name="refresh" size={15} />
                  다시 시도
                </button>
              </div>
            )}
            {status === "ready" && detail && (
              <div className="grid gap-2 text-[13px] leading-relaxed">
                {explain || explainDetail ? (
                  <>
                    {explain && <p className="whitespace-pre-line text-gray-200">{explain}</p>}
                    {explainDetail && explainDetail !== explain && (
                      <p className="whitespace-pre-line text-gray-400">{explainDetail}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">효과 설명이 없는 아이템이에요.</p>
                )}
              </div>
            )}
            {status === "idle" && !itemId && <p className="text-[13px] text-gray-500">아이템 정보가 없어요.</p>}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="a-press h-11 rounded-full bg-surface-2 text-sm font-bold text-gray-200"
          >
            닫기
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
