"use client";

/**
 * MultiSearchForm — 멀티서치 입력 폼(내 팀 / 상대 팀, 각 5칸).
 * 5:5 경기라 팀마다 5칸을 기본으로 보여 주고(다 채울 필요 없음, 빈 칸은 무시), 가운데 버튼으로 두 팀을 맞바꾼다.
 * 제출하면 /players/multi?a=…&a=…&b=… 로 이동한다.
 */
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { multiHref, TEAM_MAX } from "@/lib/multi";

/**
 * @param defaultA — 내 팀 닉네임(초기값)
 * @param defaultB — 상대 팀 닉네임(초기값)
 */
export default function MultiSearchForm({ defaultA = [], defaultB = [] }: { defaultA?: string[]; defaultB?: string[] }) {
  const router = useRouter();
  // 팀마다 항상 5칸 — 입력값이 적으면 빈 칸으로 채운다
  const [a, setA] = useState<string[]>(() => pad(defaultA));
  const [b, setB] = useState<string[]>(() => pad(defaultB));
  const [error, setError] = useState<string | null>(null);

  /** 입력 검증 후 비교 페이지로 이동 */
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const na = a.map((v) => v.trim()).filter(Boolean);
    const nb = b.map((v) => v.trim()).filter(Boolean);
    if (na.length + nb.length === 0) return setError("닉네임을 한 명 이상 입력해 주세요.");
    const all = [...na, ...nb];
    if (new Set(all).size !== all.length) return setError("같은 닉네임이 두 번 들어 있어요.");
    setError(null);
    router.push(multiHref(na, nb));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="relative grid gap-3 lg:grid-cols-2 lg:gap-6">
        <TeamPanel tone="a" values={a} onChange={setA} />
        {/* 두 팀 맞바꾸기 — 모바일은 두 패널 사이에, lg 이상은 가운데에 겹쳐 놓는다 */}
        <button
          type="button"
          onClick={() => {
            setA(b);
            setB(a);
          }}
          aria-label="두 팀 맞바꾸기"
          title="팀 맞바꾸기"
          className="relative z-10 -my-6 mx-auto grid h-11 w-11 place-items-center rounded-full border-4 border-surface bg-gradient-to-br from-primary to-lose text-white shadow-lg shadow-primary/25 transition-transform duration-300 hover:rotate-180 active:scale-90 lg:absolute lg:left-1/2 lg:top-1/2 lg:my-0 lg:-translate-x-1/2 lg:-translate-y-1/2"
        >
          {/* 모바일(세로 배치): 위아래 화살표 / lg 이상(가로 배치): 좌우 화살표 */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="lg:hidden" aria-hidden>
            <path d="m3 16 4 4 4-4" />
            <path d="M7 20V4" />
            <path d="m21 8-4-4-4 4" />
            <path d="M17 4v16" />
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="hidden lg:block" aria-hidden>
            <path d="M8 3 4 7l4 4" />
            <path d="M4 7h16" />
            <path d="m16 21 4-4-4-4" />
            <path d="M20 17H4" />
          </svg>
        </button>
        <TeamPanel tone="b" values={b} onChange={setB} />
      </div>

      <button
        type="submit"
        className="group mx-auto flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/40 active:scale-[0.99] lg:max-w-sm"
      >
        검색하기
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
 * 팀 인원(TEAM_MAX) 만큼 칸을 맞춘다.
 * @param values — 입력값
 * @returns 길이 TEAM_MAX 의 목록(모자라면 빈 칸)
 */
function pad(values: string[]): string[] {
  return [...values, ...Array<string>(TEAM_MAX).fill("")].slice(0, TEAM_MAX);
}

/**
 * 팀 입력 패널 — 색 라벨(내 팀 파랑 / 상대 팀 빨강)과 닉네임 5칸. ✕ 는 그 칸을 비운다.
 * @param tone — "a"(내 팀) | "b"(상대 팀)
 * @param values — 칸별 입력값(5개)
 * @param onChange — 칸 목록 변경
 */
function TeamPanel({ tone, values, onChange }: { tone: "a" | "b"; values: string[]; onChange: (v: string[]) => void }) {
  const isA = tone === "a";
  const filled = values.filter((v) => v.trim()).length;
  const set = (i: number, v: string) => onChange(values.map((x, j) => (j === i ? v : x)));

  return (
    <div
      className={`rounded-2xl border bg-surface/80 p-3 backdrop-blur sm:p-4 ${isA ? "border-primary/25" : "border-lose/25"}`}
    >
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span
          className={`grid h-6 w-6 place-items-center rounded-lg text-[11px] font-black text-white shadow-md ${
            isA ? "bg-primary shadow-primary/30" : "bg-lose shadow-lose/30"
          }`}
        >
          {isA ? "A" : "B"}
        </span>
        <span className={`text-[11px] font-black tracking-widest ${isA ? "text-primary" : "text-lose"}`}>
          {isA ? "MY TEAM" : "ENEMY TEAM"}
        </span>
        <span className="text-xs font-bold text-gray-300">{isA ? "내 팀" : "상대 팀"}</span>
        <span className="ml-auto text-[11px] font-bold tabular-nums text-gray-500">
          {filled}/{TEAM_MAX}
        </span>
      </div>

      <div className="space-y-2">
        {values.map((v, i) => (
          <div
            key={i}
            className={`flex h-11 items-center gap-2.5 rounded-xl border border-line bg-surface-2 pl-3 pr-1.5 transition-all focus-within:ring-4 sm:h-12 ${
              isA ? "focus-within:border-primary focus-within:ring-primary/15" : "focus-within:border-lose focus-within:ring-lose/15"
            }`}
          >
            <span className={`w-4 shrink-0 text-center text-xs font-black tabular-nums ${isA ? "text-primary" : "text-lose"}`}>
              {i + 1}
            </span>
            <input
              value={v}
              onChange={(e) => set(i, e.target.value)}
              placeholder={isA ? (i === 0 ? "내 닉네임" : "팀원 닉네임") : "상대 닉네임"}
              aria-label={`${isA ? "내 팀" : "상대 팀"} ${i + 1}번 닉네임`}
              maxLength={30}
              className="min-w-0 flex-1 bg-transparent text-base font-bold text-gray-50 placeholder:font-medium placeholder:text-gray-500 focus:outline-none"
            />
            {v && (
              <button
                type="button"
                onClick={() => set(i, "")}
                aria-label={`${i + 1}번 비우기`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-surface-3 hover:text-lose"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
