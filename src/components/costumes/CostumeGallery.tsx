"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { characterImage } from "@/lib/images";
import { groupByCharacter, type Costume } from "@/lib/costumes";
import CostumeFeedbackPanel from "./CostumeFeedbackPanel";

/* ------------------------------------------------------------------ */
/* 코스튬명 태그 분리 (Ex / [V]) — 등급·변형을 배지로 예쁘게 표시        */
/* ------------------------------------------------------------------ */
const TAG_RULES: { test: RegExp; label: string }[] = [
  { test: /\s*\[V\]\s*$/i, label: "V" },
  { test: /\s+Ex\s*$/i, label: "Ex" },
];
function splitName(name: string): { base: string; tags: string[] } {
  let base = name.trim();
  const tags: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of TAG_RULES) {
      if (r.test.test(base)) {
        tags.unshift(r.label);
        base = base.replace(r.test, "").trim();
        changed = true;
      }
    }
  }
  return { base, tags };
}
function tagClass(label: string): string {
  if (label === "Ex") return "bg-gradient-to-br from-amber-300 to-yellow-500 text-black";
  if (label === "V") return "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white";
  return "bg-primary text-white";
}

/* ------------------------------------------------------------------ */
/* 캐릭터 초상화 (Neople 공식 이미지, 없으면 이니셜 폴백)               */
/* ------------------------------------------------------------------ */
function Portrait({ id, name }: { id?: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!id || err) {
    return (
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 text-xl font-black text-primary ring-1 ring-line">
        {name.slice(0, 1)}
      </div>
    );
  }
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-surface-3 to-surface-2 ring-1 ring-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={characterImage(id, 2)}
        alt={name}
        className="h-full w-full object-cover object-top"
        onError={() => setErr(true)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 코스튬 카드                                                          */
/* ------------------------------------------------------------------ */
function CostumeCard({ c, onOpen }: { c: Costume; onOpen: () => void }) {
  const { base, tags } = splitName(c.costumeName);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${c.costumeName} 상세`}
      className="group relative block overflow-hidden rounded-2xl border border-line bg-surface-2 text-left shadow-sm outline-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_16px_36px_-12px_rgba(83,131,232,0.5)] focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[436/567] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-3 to-surface-2" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.imagePath}
          alt={c.costumeName}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.07]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/90 backdrop-blur-sm">
          {c.releaseYear}
        </span>
        {tags.length > 0 && (
          <div className="absolute left-2 top-2 flex gap-1">
            {tags.map((t) => (
              <span key={t} className={`rounded-md px-1.5 py-0.5 text-[10px] font-black leading-none shadow ${tagClass(t)}`}>
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="grid h-11 w-11 scale-75 place-items-center rounded-full bg-white/15 text-white opacity-0 ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <div className="truncate text-[13px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" title={c.costumeName}>
            {base}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 메인 갤러리                                                          */
/* ------------------------------------------------------------------ */
export default function CostumeGallery({
  costumes,
  nameToId = {},
}: {
  costumes: Costume[];
  nameToId?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number | "all">("all");
  const [index, setIndex] = useState<number | null>(null);

  const years = useMemo(
    () => [...new Set(costumes.map((c) => c.releaseYear))].sort((a, b) => b - a),
    [costumes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return costumes.filter((c) => {
      if (year !== "all" && c.releaseYear !== year) return false;
      if (!q) return true;
      return (
        c.characterName.toLowerCase().includes(q) ||
        c.costumeName.toLowerCase().includes(q) ||
        String(c.releaseYear).includes(q)
      );
    });
  }, [costumes, query, year]);

  const groups = useMemo(() => groupByCharacter(filtered), [filtered]);
  const flat = useMemo(() => groups.flatMap((g) => g.costumes), [groups]);
  const indexById = useMemo(() => {
    const m = new Map<number, number>();
    flat.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [flat]);

  useEffect(() => {
    setIndex(null);
  }, [query, year]);

  const close = useCallback(() => setIndex(null), []);
  const move = useCallback(
    (dir: number) => {
      setIndex((i) => {
        if (i === null || flat.length === 0) return i;
        return (i + dir + flat.length) % flat.length;
      });
    },
    [flat.length],
  );

  // 키보드 내비 + 배경 스크롤 잠금 (폼 입력 중엔 화살표 무시)
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (typing) return;
      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, move]);

  const current = index !== null ? flat[index] : null;
  const head = current ? splitName(current.costumeName) : null;

  return (
    <div className="space-y-6">
      {/* 스티키 필터 바 (글래스) */}
      <div className="sticky top-16 z-20 rounded-2xl border border-line bg-surface/80 px-3 py-2.5 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-full border border-line bg-bg-soft px-3.5 py-2 sm:w-72">
            <svg className="h-4 w-4 shrink-0 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="코스튬·캐릭터 검색"
              className="w-full bg-transparent text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기" className="shrink-0 text-gray-500 hover:text-gray-300">
                ✕
              </button>
            )}
          </div>

          {years.length > 1 && (
            <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-bg-soft p-1">
              <YearPill active={year === "all"} onClick={() => setYear("all")}>
                전체
              </YearPill>
              {years.map((y) => (
                <YearPill key={y} active={year === y} onClick={() => setYear(y)}>
                  {y}
                </YearPill>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 요약 */}
      <div className="flex items-center gap-2 px-1 text-xs text-gray-500">
        <span>
          캐릭터 <b className="text-gray-300">{groups.length}</b>
        </span>
        <span className="h-1 w-1 rounded-full bg-gray-600" />
        <span>
          코스튬 <b className="text-gray-300">{filtered.length}</b>종
        </span>
      </div>

      {/* 캐릭터별 그룹 */}
      {groups.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">검색 결과가 없습니다.</p>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.characterName}>
              <div className="mb-4 flex items-center gap-3">
                <Portrait id={nameToId[g.characterName]} name={g.characterName} />
                <div className="min-w-0">
                  <h2 className="text-xl font-black tracking-tight text-gray-50">{g.characterName}</h2>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-bold text-primary">{g.costumes.length}종</span>
                    <span className="h-1 w-1 rounded-full bg-gray-600" />
                    <span>{g.years.join(" · ")}</span>
                  </div>
                </div>
                <div className="ml-auto hidden h-px flex-1 bg-gradient-to-r from-line to-transparent sm:block" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {g.costumes.map((c) => (
                  <CostumeCard key={c.id} c={c} onOpen={() => setIndex(indexById.get(c.id) ?? null)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 상세 모달 (이미지 + 시세/수정요청 패널) */}
      {current && head && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/85 backdrop-blur-sm md:flex md:items-center md:justify-center md:overflow-hidden md:p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`${current.costumeName} 상세`}
        >
          <div
            className="mx-auto flex min-h-full w-full flex-col bg-bg md:h-[88vh] md:min-h-0 md:max-w-6xl md:flex-row md:overflow-hidden md:rounded-2xl md:border md:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 이미지 페인 */}
            <div className="relative flex w-full shrink-0 items-center justify-center bg-black p-3 md:h-auto md:min-h-0 md:flex-1 md:p-6">
              <span className="absolute left-3 top-3 z-10 rounded-full bg-black/40 px-2.5 py-1 text-xs tabular-nums text-white/70 backdrop-blur-sm md:left-4 md:top-4">
                {(index ?? 0) + 1} / {flat.length}
              </span>

              {flat.length > 1 && (
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="이전"
                  className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-3"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}

              <div className="relative flex max-h-full items-center justify-center">
                <div className="pointer-events-none absolute inset-0 -z-10 bg-primary/20 blur-3xl" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={current.id}
                  src={current.imagePath}
                  alt={current.costumeName}
                  className="max-h-[46vh] w-auto max-w-full rounded-xl object-contain shadow-2xl ring-1 ring-white/10 md:max-h-full"
                />
              </div>

              {flat.length > 1 && (
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="다음"
                  className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-3"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>

            {/* 패널 페인 */}
            <div className="flex w-full flex-col border-t border-line bg-surface md:h-full md:w-[400px] md:flex-none md:border-l md:border-t-0">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-surface p-4 md:static">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-lg font-black text-gray-50">{head.base}</h3>
                    {head.tags.map((t) => (
                      <span key={t} className={`rounded-md px-1.5 py-0.5 text-[10px] font-black leading-none ${tagClass(t)}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-0.5 text-sm text-gray-500">
                    {current.characterName} · {current.releaseYear}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="닫기"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-gray-300 transition-colors hover:bg-surface-3"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className="p-4 md:min-h-0 md:flex-1 md:overflow-y-auto">
                <CostumeFeedbackPanel costume={current} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function YearPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
        active ? "bg-surface text-primary shadow-sm ring-1 ring-line" : "text-gray-500 hover:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}
