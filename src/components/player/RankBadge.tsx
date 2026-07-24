import React from "react";

/**
 * 플레이어 전체 순위 뱃지 — 순위 구간별로 차등 UI.
 *  - 1~3위   : 금·은·동 메달 알약 + 반짝임(모션)
 *  - 4~10위  : 엘리트(보라 그라데이션 + TOP 10)
 *  - 11~50위 : 상위 50(브랜드 블루 + 상승 화살표)
 *  - 51~100위: 상위 100(청록 + 점)
 *  - 101위~  : 평문(회색 텍스트)
 * rank 가 없거나(미랭크) 유효하지 않으면 아무것도 렌더하지 않는다.
 */
export function RankBadge({ rank }: { rank?: number | null }) {
  if (rank == null || !Number.isFinite(rank) || rank < 1) return null;
  const label = `전체 ${rank.toLocaleString()}위`;

  // 1~3위: 금·은·동 메달 알약 + 반짝임
  if (rank <= 3) {
    const m =
      rank === 1
        ? { grad: "linear-gradient(120deg,#fff3c4,#f6d365 55%,#e6b422)", ink: "#4a3510", ico: "👑" }
        : rank === 2
          ? { grad: "linear-gradient(120deg,#ffffff,#dbe0e5 50%,#aab2ba)", ink: "#3a3f45", ico: "🥈" }
          : { grad: "linear-gradient(120deg,#f2c69d,#d89b6a 50%,#b06a34)", ink: "#4a2c12", ico: "🥉" };
    return (
      <span
        className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-2.5 py-1 text-xs font-extrabold shadow-sm"
        style={{ background: m.grad, color: m.ink }}
        title={`${label} · 최상위`}
      >
        <span aria-hidden>{m.ico}</span>
        <span>{label}</span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full"
          style={{
            background:
              "linear-gradient(120deg,transparent 30%,rgba(255,255,255,.7) 48%,transparent 66%)",
            animation: "rankShine 3.2s ease-in-out infinite",
          }}
        />
      </span>
    );
  }

  // 4~10위: 엘리트(보라 그라데이션 + TOP 10 태그)
  if (rank <= 10) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold text-white shadow-sm"
        style={{ background: "linear-gradient(135deg,#8b6dff,#6a4ce0)" }}
        title={`${label} · 상위 10`}
      >
        <span className="rounded bg-white/25 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
          TOP 10
        </span>
        {label}
      </span>
    );
  }

  // 11~50위: 상위 50(브랜드 블루 + 상승 화살표)
  if (rank <= 50) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
        title={`${label} · 상위 50`}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        {label}
      </span>
    );
  }

  // 51~100위: 상위 100(청록 + 점)
  if (rank <= 100) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-600 dark:text-teal-300"
        title={`${label} · 상위 100`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden />
        {label}
      </span>
    );
  }

  // 101위 ~ : 평문
  return <span className="text-xs font-bold text-gray-400">{label}</span>;
}

export default RankBadge;
