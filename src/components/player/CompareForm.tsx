"use client";

/**
 * CompareForm — 플레이어 2명 비교 입력 폼(닉네임 A·B).
 * A(파랑)·B(빨강) 슬롯 사이에 겹쳐 놓인 원형 버튼으로 둘을 맞바꾸고,
 * 제출하면 /players/compare?a=…&b=… 로 이동한다(현재 비교 기준 gt 유지).
 */
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

/**
 * @param defaultA — 플레이어 A 닉네임(초기값)
 * @param defaultB — 플레이어 B 닉네임(초기값)
 * @param gameType — 현재 비교 기준(이동 후에도 유지)
 */
export default function CompareForm({
  defaultA = "",
  defaultB = "",
  gameType,
}: {
  defaultA?: string;
  defaultB?: string;
  gameType?: string;
}) {
  const router = useRouter();
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  const [error, setError] = useState<string | null>(null);

  /** 입력 검증 후 비교 페이지로 이동 */
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const na = a.trim();
    const nb = b.trim();
    if (!na || !nb) return setError("두 플레이어의 닉네임을 모두 입력해 주세요.");
    if (na === nb) return setError("서로 다른 두 플레이어를 입력해 주세요.");
    setError(null);
    const q = new URLSearchParams({ a: na, b: nb });
    if (gameType && gameType !== "all") q.set("gt", gameType);
    router.push(`/players/compare?${q.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="relative flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Slot tone="a" value={a} onChange={setA} />
        {/* 맞바꾸기 — 두 슬롯 사이(가운데)에 겹쳐 놓는다 */}
        <button
          type="button"
          onClick={() => {
            setA(b);
            setB(a);
          }}
          aria-label="두 플레이어 맞바꾸기"
          title="맞바꾸기"
          className="absolute left-1/2 top-1/2 z-10 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-surface bg-gradient-to-br from-primary to-lose text-white shadow-lg shadow-primary/25 transition-transform duration-300 hover:rotate-180 active:scale-90"
        >
          {/* 모바일(세로 배치): 위아래 화살표 / sm 이상(가로 배치): 좌우 화살표 */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden" aria-hidden>
            <path d="m3 16 4 4 4-4" />
            <path d="M7 20V4" />
            <path d="m21 8-4-4-4 4" />
            <path d="M17 4v16" />
          </svg>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block" aria-hidden>
            <path d="M8 3 4 7l4 4" />
            <path d="M4 7h16" />
            <path d="m16 21 4-4-4-4" />
            <path d="M20 17H4" />
          </svg>
        </button>
        <Slot tone="b" value={b} onChange={setB} />
      </div>

      <button
        type="submit"
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/40 active:scale-[0.99]"
      >
        비교하기
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5" aria-hidden>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </button>
      {error && <p className="text-center text-xs font-semibold text-lose">{error}</p>}
    </form>
  );
}

/**
 * 플레이어 입력 슬롯 — 색 라벨(A 파랑 / B 빨강) + 닉네임 입력.
 * @param tone — "a" | "b"
 * @param value — 입력값
 * @param onChange — 입력 변경
 */
function Slot({ tone, value, onChange }: { tone: "a" | "b"; value: string; onChange: (v: string) => void }) {
  const isA = tone === "a";
  return (
    <label
      // 모바일(세로 배치)에서 flex-1 이 높이(h-16)를 0 기준으로 덮어써 줄어들지 않게, 가로 배치(sm)에서만 늘린다
      className={`flex h-16 shrink-0 items-center gap-3 rounded-2xl border bg-surface/80 px-4 backdrop-blur transition-all focus-within:ring-4 sm:flex-1 ${
        isA
          ? "border-primary/25 focus-within:border-primary focus-within:ring-primary/15"
          : "border-lose/25 focus-within:border-lose focus-within:ring-lose/15"
      }`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black text-white shadow-md ${
          isA ? "bg-primary shadow-primary/30" : "bg-lose shadow-lose/30"
        }`}
      >
        {isA ? "A" : "B"}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[10px] font-bold tracking-widest ${isA ? "text-primary" : "text-lose"}`}>
          PLAYER {isA ? "A" : "B"}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="닉네임 입력"
          aria-label={`플레이어 ${isA ? "A" : "B"} 닉네임`}
          maxLength={30}
          className="w-full bg-transparent text-base font-bold text-gray-50 placeholder:font-medium placeholder:text-gray-500 focus:outline-none"
        />
      </span>
    </label>
  );
}
