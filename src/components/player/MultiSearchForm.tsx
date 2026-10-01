"use client";

/**
 * MultiSearchForm — 멀티서치 입력 폼(내 팀 / 상대 팀, 각 최대 5명).
 * 팀마다 입력창은 하나이고, 닉네임을 입력한 뒤 Enter·쉼표(모바일은 '추가' 버튼)로 배지(칩)로 쌓는다.
 * 쉼표·줄바꿈으로 여러 명을 붙여넣으면 한 번에 나뉘고, 빈 입력창에서 Backspace 는 마지막 배지를 지운다.
 * 가운데 버튼으로 두 팀을 맞바꾸고, 제출하면 /players/multi?a=…&a=…&b=… 로 이동한다.
 */
import { useRouter } from "next/navigation";
import { ClipboardEvent, FormEvent, KeyboardEvent, useState } from "react";
import { multiHref, TEAM_MAX } from "@/lib/multi";

/** 한 번에 여러 닉네임을 나누는 구분자(쉼표·줄바꿈·탭) */
const SEPARATORS = /[,\n\t]+/;

/**
 * @param defaultA — 내 팀 닉네임(초기값)
 * @param defaultB — 상대 팀 닉네임(초기값)
 */
export default function MultiSearchForm({ defaultA = [], defaultB = [] }: { defaultA?: string[]; defaultB?: string[] }) {
  const router = useRouter();
  const [a, setA] = useState<string[]>(defaultA.slice(0, TEAM_MAX));
  const [b, setB] = useState<string[]>(defaultB.slice(0, TEAM_MAX));
  // 아직 배지로 넣지 않은 입력 중인 글자 — 제출할 때 함께 포함한다
  const [draftA, setDraftA] = useState("");
  const [draftB, setDraftB] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** 입력 검증 후 멀티서치 페이지로 이동(입력 중인 글자도 포함) */
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const na = mergeNames(a, draftA);
    const nb = mergeNames(b, draftB);
    if (na.length + nb.length === 0) return setError("닉네임을 한 명 이상 입력해 주세요.");
    const all = [...na, ...nb];
    if (new Set(all).size !== all.length) return setError("같은 닉네임이 두 팀에 함께 들어 있어요.");
    setError(null);
    router.push(multiHref(na, nb));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="relative grid gap-3 lg:grid-cols-2 lg:gap-6">
        <TeamTagInput tone="a" values={a} onChange={setA} draft={draftA} onDraft={setDraftA} other={b} />
        {/* 두 팀 맞바꾸기 — 모바일은 두 패널 사이에, lg 이상은 가운데에 겹쳐 놓는다 */}
        <button
          type="button"
          onClick={() => {
            setA(b);
            setB(a);
            setDraftA(draftB);
            setDraftB(draftA);
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
        <TeamTagInput tone="b" values={b} onChange={setB} draft={draftB} onDraft={setDraftB} other={a} />
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
 * 배지 목록 + 입력 중 글자 → 제출할 닉네임 목록(중복 제거, 최대 TEAM_MAX).
 * @param values — 배지로 넣은 닉네임
 * @param draft — 입력 중인 글자(쉼표 등으로 여러 명일 수 있음)
 * @returns 닉네임 목록
 */
function mergeNames(values: string[], draft: string): string[] {
  const extra = draft.split(SEPARATORS).map((v) => v.trim()).filter(Boolean);
  return [...new Set([...values, ...extra])].slice(0, TEAM_MAX);
}

/**
 * 팀 입력 패널 — 입력창 하나에 닉네임 배지를 쌓는다(태그 입력).
 * @param tone — "a"(내 팀, 파랑) | "b"(상대 팀, 빨강)
 * @param values — 배지로 넣은 닉네임
 * @param onChange — 배지 목록 변경
 * @param draft — 입력 중인 글자
 * @param onDraft — 입력 중 글자 변경
 * @param other — 다른 팀 닉네임(양 팀 중복 안내용)
 */
function TeamTagInput({
  tone,
  values,
  onChange,
  draft,
  onDraft,
  other,
}: {
  tone: "a" | "b";
  values: string[];
  onChange: (v: string[]) => void;
  draft: string;
  onDraft: (v: string) => void;
  other: string[];
}) {
  const isA = tone === "a";
  const full = values.length >= TEAM_MAX;
  const [notice, setNotice] = useState<string | null>(null);

  /** 닉네임(여러 명 가능)을 배지로 추가 — 빈 값·중복·정원 초과는 건너뛰고 이유를 짧게 알린다 */
  function commit(text: string) {
    const names = text.split(SEPARATORS).map((v) => v.trim()).filter(Boolean);
    if (names.length === 0) return;
    const next = [...values];
    let msg: string | null = null;
    for (const n of names) {
      if (next.includes(n)) msg = `"${n}"은(는) 이미 들어 있어요`;
      else if (other.includes(n)) msg = `"${n}"은(는) ${isA ? "상대 팀" : "내 팀"}에 있어요`;
      else if (next.length >= TEAM_MAX) msg = `한 팀은 최대 ${TEAM_MAX}명이에요`;
      else next.push(n);
    }
    onChange(next);
    onDraft("");
    setNotice(msg);
  }

  /** Enter·쉼표로 추가, 빈 입력에서 Backspace 는 마지막 배지 삭제(한글 조합 중 Enter 는 무시) */
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
      e.preventDefault(); // 입력 중일 땐 폼 제출 대신 배지 추가
      commit(draft);
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
      setNotice(null);
    }
  }

  /** 여러 명을 붙여넣으면 바로 나눠서 배지로 */
  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!SEPARATORS.test(text)) return;
    e.preventDefault();
    commit(`${draft}${text}`);
  }

  return (
    <div className={`rounded-2xl border bg-surface/80 p-3 backdrop-blur sm:p-4 ${isA ? "border-primary/25" : "border-lose/25"}`}>
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
          {values.length}/{TEAM_MAX}
        </span>
      </div>

      {/* 배지 + 입력창 — 상자 아무 곳이나 누르면 입력창에 포커스 */}
      <label
        className={`flex min-h-[3.5rem] cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-2 p-2 transition-all focus-within:ring-4 ${
          isA ? "focus-within:border-primary focus-within:ring-primary/15" : "focus-within:border-lose focus-within:ring-lose/15"
        }`}
      >
        {values.map((v, i) => (
          <span
            key={v}
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-1 pr-1.5 text-sm font-bold ${
              isA ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-lose/10 text-lose ring-1 ring-lose/25"
            }`}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-black text-white ${
                isA ? "bg-primary" : "bg-lose"
              }`}
            >
              {i + 1}
            </span>
            <span className="truncate text-gray-50">{v}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(values.filter((x) => x !== v));
                setNotice(null);
              }}
              aria-label={`${v} 빼기`}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-current opacity-60 transition-opacity hover:opacity-100"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        ))}
        {!full && (
          <span className="flex min-w-[8rem] flex-1 items-center gap-1">
            <input
              value={draft}
              onChange={(e) => {
                onDraft(e.target.value);
                setNotice(null);
              }}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              enterKeyHint="enter"
              placeholder={isA ? "내 팀 닉네임 추가" : "상대 팀 닉네임 추가"}
              aria-label={`${isA ? "내 팀" : "상대 팀"} 닉네임 입력`}
              maxLength={30}
              className="h-9 min-w-0 flex-1 bg-transparent px-1.5 text-base font-bold text-gray-50 placeholder:font-medium placeholder:text-gray-500 focus:outline-none"
            />
            {/* 모바일 키보드에서 Enter 가 애매할 때를 위한 추가 버튼 */}
            {draft.trim() && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  commit(draft);
                }}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white ${isA ? "bg-primary" : "bg-lose"}`}
              >
                추가
              </button>
            )}
          </span>
        )}
      </label>
      <p className={`mt-2 px-1 text-[11px] ${notice ? "font-semibold text-lose" : "text-gray-500"}`}>
        {notice ?? (full ? `${TEAM_MAX}명을 모두 채웠어요` : "Enter·쉼표로 추가 · 여러 명을 쉼표로 붙여넣어도 돼요")}
      </p>
    </div>
  );
}
