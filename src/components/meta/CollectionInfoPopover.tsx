"use client";

/**
 * CollectionInfoPopover — 집계 정보 한 줄(디자인 1b)의 ⓘ 버튼과 설명 팝오버.
 * 항목마다 있던 ⓘ 를 하나로 합쳐, 누르면 항목별 설명을 한 번에 보여 준다.
 * 바깥을 누르거나 Esc 를 누르면 닫힌다.
 */
import { useEffect, useRef, useState } from "react";

/** 팝오버에 보일 설명 1줄 */
export interface InfoItem {
  /** 항목 이름(예: "표본 매치") */
  label: string;
  /** 설명 */
  text: string;
}

/**
 * @param items — 항목별 설명
 * @param note — 맨 아래 덧붙일 안내(선택)
 */
export default function CollectionInfoPopover({ items, note }: { items: InfoItem[]; note?: string }) {
  const [open, setOpen] = useState(false);
  // 팝오버 세로 위치(버튼 바로 아래, 화면 기준) — 가로는 화면 좌우 16px 여백 안에 고정해 잘리지 않게 한다
  const [top, setTop] = useState(0);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  /** 열기/닫기 — 열 때 버튼 위치로 팝오버 높이를 맞춘다 */
  const toggle = () => {
    if (!open && btnRef.current) setTop(btnRef.current.getBoundingClientRect().bottom + 8);
    setOpen((v) => !v);
  };

  // 스크롤하면 위치가 어긋나므로 닫는다
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  // 바깥 클릭·Esc 로 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="집계 기준 안내"
        className="grid h-4 w-4 place-items-center rounded-full border border-line text-[10px] leading-none text-gray-500 transition-colors hover:border-primary hover:text-primary"
      >
        i
      </button>
      {open && (
        <span
          role="dialog"
          className="fixed inset-x-4 z-30 mx-auto block max-w-md rounded-xl border border-line bg-surface p-3 text-left shadow-float"
          style={{ top }}
        >
          <span className="mb-2 block text-xs font-bold text-gray-100">집계 기준</span>
          <span className="block space-y-2">
            {items.map((it) => (
              <span key={it.label} className="block text-[11px] leading-relaxed text-gray-400">
                <b className="mr-1 font-semibold text-gray-200">{it.label}</b>
                {it.text}
              </span>
            ))}
          </span>
          {note && (
            <span className="mt-2 block border-t border-line/60 pt-2 text-[11px] leading-relaxed text-gray-500">{note}</span>
          )}
        </span>
      )}
    </span>
  );
}
