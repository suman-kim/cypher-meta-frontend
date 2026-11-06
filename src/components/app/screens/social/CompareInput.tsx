"use client";

/**
 * 앱 플레이어 비교의 입력 조각들 (클라이언트).
 *
 * - CompareInput: 두 닉네임 입력 화면 — A·B 칸, 가운데 맞바꾸기, 빠르게 채우기(내 계정·즐겨찾기·최근 검색), [비교하기].
 *   플레이어 화면에서 ?a=닉네임 으로 들어오면 A 가 채워진 채로 시작한다. 웹 CompareForm 과 같은 주소로 이동한다.
 * - CompareSwitch: 결과 화면에서 상대(B)를 즐겨찾기·최근 검색 칩으로 바로 바꾼다.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, type RefObject } from "react";
import { useFavs, useHydrated, useMe, useRecent } from "@/lib/app-storage";
import { Icon } from "../../icons";
import { CharImg, ChipRow } from "../../ui";
import { compareHref } from "./social-ui";

/**
 * 기기에 저장된 닉네임 후보(내 계정 · 즐겨찾기 · 최근 검색)와 대표 캐릭터.
 * @param exclude 빼고 보여 줄 닉네임
 * @returns 후보 목록(최대 12)과 닉네임 → 캐릭터 ID
 */
function useCandidates(exclude: string[]): { list: string[]; avatarOf: Map<string, string | undefined> } {
  const hydrated = useHydrated();
  const me = useMe();
  const favs = useFavs();
  const recent = useRecent();
  const avatarOf = new Map<string, string | undefined>();
  const list: string[] = [];
  if (!hydrated) return { list, avatarOf };
  for (const f of favs) avatarOf.set(f.nickname, f.characterId);
  if (me) avatarOf.set(me.nickname, me.characterId);
  for (const n of [me?.nickname, ...favs.map((f) => f.nickname), ...recent]) {
    if (n && !exclude.includes(n) && !list.includes(n)) list.push(n);
  }
  return { list: list.slice(0, 12), avatarOf };
}

/**
 * 두 닉네임 입력 화면.
 * @param defaultA 플레이어 A 닉네임 (주소 a=)
 * @param defaultB 플레이어 B 닉네임 (주소 b=)
 * @param gameType 지금 비교 기준 (이동 뒤에도 유지)
 */
export function CompareInput({ defaultA, defaultB, gameType }: { defaultA: string; defaultB: string; gameType: string }) {
  const router = useRouter();
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  const [focus, setFocus] = useState<"a" | "b">(defaultA && !defaultB ? "b" : "a");
  const [error, setError] = useState<string | null>(null);
  const refA = useRef<HTMLInputElement>(null);
  const refB = useRef<HTMLInputElement>(null);
  const { list, avatarOf } = useCandidates([a.trim(), b.trim()]);

  /** 검증 후 비교 주소로 이동 */
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const na = a.trim();
    const nb = b.trim();
    if (!na || !nb) {
      setError("두 플레이어의 닉네임을 모두 넣어 주세요.");
      (na ? refB : refA).current?.focus();
      return;
    }
    if (na === nb) {
      setError("서로 다른 두 플레이어를 넣어 주세요.");
      return;
    }
    setError(null);
    router.push(compareHref(na, nb, gameType));
  }

  /**
   * 빠르게 채우기 — 지금 고른 칸에 닉네임을 넣는다.
   * @param n 닉네임
   */
  function fill(n: string) {
    if (focus === "a") setA(n);
    else setB(n);
    setError(null);
    // 다른 칸이 비어 있으면 다음 칩은 그 칸에 들어가게 한다
    const otherEmpty = focus === "a" ? !b.trim() : !a.trim();
    if (otherEmpty) setFocus(focus === "a" ? "b" : "a");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <div className="relative grid gap-2">
        <Slot tag="a" value={a} onChange={setA} onFocus={() => setFocus("a")} inputRef={refA} active={focus === "a"} />
        <button
          type="button"
          onClick={() => {
            setA(b);
            setB(a);
          }}
          aria-label="두 플레이어 맞바꾸기"
          className="a-press absolute left-1/2 top-1/2 z-10 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-bg bg-surface text-gray-200 shadow-[var(--a-shadow)]"
        >
          <Icon name="swap" size={16} />
        </button>
        <Slot tag="b" value={b} onChange={setB} onFocus={() => setFocus("b")} inputRef={refB} active={focus === "b"} />
      </div>

      {list.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs font-semibold text-gray-300">빠르게 채우기 · 내 계정 · 즐겨찾기 · 최근 검색</p>
          <ChipRow>
            {list.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => fill(n)}
                className="a-press flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface pl-1 pr-3 text-[13px] font-semibold text-gray-200"
              >
                <CharImg id={avatarOf.get(n)} name={n} size={26} radius={13} />
                <span className="max-w-[7rem] truncate">{n}</span>
              </button>
            ))}
          </ChipRow>
        </div>
      )}

      <button type="submit" className="a-grad a-glow a-press mt-1 flex h-14 items-center justify-center gap-2 rounded-[18px] text-base font-bold">
        <Icon name="users" size={19} />
        비교하기
      </button>
      {error && (
        <p className="text-center text-xs font-semibold text-app-loss-tx" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

/**
 * 닉네임 입력 칸 하나 — A(파랑) / B(빨강) 표시 + 입력.
 * @param tag a | b
 * @param value 입력값
 * @param onChange 입력 바뀜
 * @param onFocus 칸을 골랐을 때
 * @param inputRef 입력칸 ref
 * @param active 지금 고른 칸인지 (테두리 강조)
 */
function Slot({
  tag,
  value,
  onChange,
  onFocus,
  inputRef,
  active,
}: {
  tag: "a" | "b";
  value: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  inputRef: RefObject<HTMLInputElement>;
  active: boolean;
}) {
  const isA = tag === "a";
  return (
    <label
      className={`a-card flex h-[68px] cursor-text items-center gap-3 border-[1.5px] px-4 transition-colors ${
        active ? (isA ? "!border-primary" : "!border-app-loss-tx") : ""
      }`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${isA ? "a-grad" : "bg-app-live text-white"}`}
      >
        {isA ? "A" : "B"}
      </span>
      <span className="grid min-w-0 flex-1">
        <span className={`text-[11px] font-bold ${isA ? "text-primary" : "text-app-loss-tx"}`}>플레이어 {isA ? "A" : "B"}</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder="닉네임 입력"
          aria-label={`플레이어 ${isA ? "A" : "B"} 닉네임`}
          maxLength={30}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={isA ? "next" : "go"}
          className="w-full bg-transparent text-base font-bold text-gray-50 outline-none"
        />
      </span>
      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="지우기"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-500 active:bg-surface-2"
        >
          <Icon name="close" size={15} />
        </button>
      )}
    </label>
  );
}

/**
 * 결과 화면의 상대 바꾸기 칩 — 누르면 B 를 그 닉네임으로 바꿔 다시 비교한다.
 * @param a 플레이어 A 닉네임 (그대로 둔다)
 * @param b 지금 플레이어 B 닉네임 (강조)
 * @param gameType 지금 비교 기준
 */
export function CompareSwitch({ a, b, gameType }: { a: string; b: string; gameType: string }) {
  const { list, avatarOf } = useCandidates([a]);
  if (list.length === 0) return null;
  // 지금 B 를 맨 앞에 둔다
  const ordered = list.includes(b) ? [b, ...list.filter((n) => n !== b)] : list;
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold text-gray-300">상대 바꾸기 · 내 계정 · 즐겨찾기 · 최근 검색</p>
      <ChipRow>
        {ordered.map((n) => {
          const on = n === b;
          return (
            <Link
              key={n}
              href={compareHref(a, n, gameType)}
              replace
              aria-current={on ? "true" : undefined}
              className={`a-press flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-1 pr-3 text-[13px] font-semibold ${
                on ? "bg-app-ac-soft text-app-ac-tx" : "border border-line bg-surface text-gray-200"
              }`}
            >
              <CharImg id={avatarOf.get(n)} name={n} size={26} radius={13} />
              <span className="max-w-[7rem] truncate">{n}</span>
            </Link>
          );
        })}
      </ChipRow>
    </div>
  );
}
