"use client";

/**
 * 앱 멀티서치 입력 (시안 09 위쪽).
 *
 * - 내 팀 · 상대 팀 두 칸. 칸마다 최대 5명, 닉네임을 Enter·쉼표로 칩으로 쌓는다. 쉼표·줄바꿈으로 여러 명을 붙여 넣으면 한 번에 나뉜다.
 *   (안드로이드 키보드는 쉼표 keydown 이 오지 않을 때가 있어 입력값 변화에서도 쉼표를 찾는다)
 * - 칸마다 인원 진행 막대(5칸)와 [모두 지우기], 가운데 [팀 맞바꾸기].
 * - 빠르게 넣기: 내 계정·즐겨찾기·최근 검색 닉네임을 눌러 지금 고른 칸에 넣는다.
 * - [전적 한 번에 보기 · N명] → 웹과 같은 주소(multiHref: /players/multi?a=…&b=…)로 이동하고 결과 위치로 내려간다.
 */
import { useRouter } from "next/navigation";
import { KeyboardEvent, useRef, useState, type RefObject } from "react";
import { useFavs, useHydrated, useMe, useRecent } from "@/lib/app-storage";
import { multiHref, TEAM_MAX } from "@/lib/multi";
import { Icon } from "../../icons";
import { CharImg, ChipRow } from "../../ui";

/** 한 번에 여러 닉네임을 나누는 구분자(쉼표·줄바꿈·탭) */
const SEPARATORS = /[,\n\t]+/;

/** 팀 구분 */
type Team = "a" | "b";

/** 팀별 표시 이름 */
const TEAM_LABEL: Record<Team, string> = { a: "내 팀", b: "상대 팀" };

/**
 * 칩 목록 + 입력 중 글자 → 제출할 닉네임 목록(중복 제거, 최대 TEAM_MAX).
 * @param values 칩으로 넣은 닉네임
 * @param draft 입력 중인 글자
 */
function mergeNames(values: string[], draft: string): string[] {
  const extra = draft.split(SEPARATORS).map((v) => v.trim()).filter(Boolean);
  return [...new Set([...values, ...extra])].slice(0, TEAM_MAX);
}

/**
 * @param defaultA 내 팀 닉네임 (주소에서 읽은 값)
 * @param defaultB 상대 팀 닉네임 (주소에서 읽은 값)
 */
export default function MultiForm({ defaultA, defaultB }: { defaultA: string[]; defaultB: string[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const me = useMe();
  const favs = useFavs();
  const recent = useRecent();

  const [names, setNames] = useState<Record<Team, string[]>>({ a: defaultA.slice(0, TEAM_MAX), b: defaultB.slice(0, TEAM_MAX) });
  const [drafts, setDrafts] = useState<Record<Team, string>>({ a: "", b: "" });
  const [notes, setNotes] = useState<Record<Team, string | null>>({ a: null, b: null });
  const [focus, setFocus] = useState<Team>(defaultA.length >= TEAM_MAX && defaultB.length < TEAM_MAX ? "b" : "a");
  const [error, setError] = useState<string | null>(null);
  const inputs = { a: useRef<HTMLInputElement>(null), b: useRef<HTMLInputElement>(null) };

  // 닉네임 → 대표 캐릭터 (내 계정·즐겨찾기에 저장된 것만 알 수 있다)
  const avatarOf = new Map<string, string | undefined>();
  if (hydrated) {
    for (const f of favs) avatarOf.set(f.nickname, f.characterId);
    if (me) avatarOf.set(me.nickname, me.characterId);
  }

  /**
   * 닉네임(여러 명 가능)을 칩으로 넣는다 — 중복·다른 팀에 있음·정원 초과는 건너뛰고 이유를 알린다.
   * @param team 넣을 팀
   * @param text 닉네임 글 (쉼표 등으로 여러 명일 수 있음)
   */
  function commit(team: Team, text: string) {
    const list = text.split(SEPARATORS).map((v) => v.trim()).filter(Boolean);
    const other: Team = team === "a" ? "b" : "a";
    const next = [...names[team]];
    let msg: string | null = null;
    for (const n of list) {
      if (next.includes(n)) msg = `"${n}"은(는) 이미 들어 있어요`;
      else if (names[other].includes(n)) msg = `"${n}"은(는) ${TEAM_LABEL[other]}에 있어요`;
      else if (next.length >= TEAM_MAX) msg = `한 팀은 최대 ${TEAM_MAX}명이에요`;
      else next.push(n);
    }
    setNames((p) => ({ ...p, [team]: next }));
    setDrafts((p) => ({ ...p, [team]: "" }));
    setNotes((p) => ({ ...p, [team]: msg }));
    setError(null);
  }

  /**
   * 칩 하나 빼기.
   * @param team 팀
   * @param n 뺄 닉네임
   */
  function remove(team: Team, n: string) {
    setNames((p) => ({ ...p, [team]: p[team].filter((x) => x !== n) }));
    setNotes((p) => ({ ...p, [team]: null }));
  }

  /** 두 팀 맞바꾸기 (입력 중 글자도 함께) */
  function swap() {
    setNames((p) => ({ a: p.b, b: p.a }));
    setDrafts((p) => ({ a: p.b, b: p.a }));
    setNotes({ a: null, b: null });
    setFocus((f) => (f === "a" ? "b" : "a"));
  }

  const mergedA = mergeNames(names.a, drafts.a);
  const mergedB = mergeNames(names.b, drafts.b);
  const total = mergedA.length + mergedB.length;

  /** 검색 — 검증 후 웹과 같은 주소로 이동, 결과 위치로 내려간다 */
  function onSearch() {
    if (total === 0) {
      setError("닉네임을 한 명 이상 넣어 주세요.");
      return;
    }
    const all = [...mergedA, ...mergedB];
    if (new Set(all).size !== all.length) {
      setError("같은 닉네임이 두 팀에 함께 있어요.");
      return;
    }
    setError(null);
    setNames({ a: mergedA, b: mergedB });
    setDrafts({ a: "", b: "" });
    router.push(`${multiHref(mergedA, mergedB)}#multi-result`);
  }

  // 빠르게 넣기 후보 — 내 계정 · 즐겨찾기 · 최근 검색 (이미 넣은 닉네임 제외, 최대 12)
  const taken = new Set([...names.a, ...names.b]);
  const quick: string[] = [];
  if (hydrated) {
    for (const n of [me?.nickname, ...favs.map((f) => f.nickname), ...recent]) {
      if (n && !taken.has(n) && !quick.includes(n)) quick.push(n);
    }
  }
  const focusFull = names[focus].length >= TEAM_MAX;

  return (
    <div className="grid gap-3">
      <TeamPanel
        team="a"
        values={names.a}
        draft={drafts.a}
        note={notes.a}
        active={focus === "a"}
        avatarOf={avatarOf}
        inputRef={inputs.a}
        onFocus={() => setFocus("a")}
        onDraft={(v) => {
          setDrafts((p) => ({ ...p, a: v }));
          setNotes((p) => ({ ...p, a: null }));
        }}
        onCommit={(t) => commit("a", t)}
        onRemove={(n) => remove("a", n)}
        onClear={() => {
          setNames((p) => ({ ...p, a: [] }));
          setNotes((p) => ({ ...p, a: null }));
        }}
      />

      {/* 팀 맞바꾸기 */}
      <div className="relative flex items-center justify-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden="true" />
        <button
          type="button"
          onClick={swap}
          className="a-press relative flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-[13px] font-bold text-gray-200"
        >
          <Icon name="swap" size={15} />팀 맞바꾸기
        </button>
      </div>

      <TeamPanel
        team="b"
        values={names.b}
        draft={drafts.b}
        note={notes.b}
        active={focus === "b"}
        avatarOf={avatarOf}
        inputRef={inputs.b}
        onFocus={() => setFocus("b")}
        onDraft={(v) => {
          setDrafts((p) => ({ ...p, b: v }));
          setNotes((p) => ({ ...p, b: null }));
        }}
        onCommit={(t) => commit("b", t)}
        onRemove={(n) => remove("b", n)}
        onClear={() => {
          setNames((p) => ({ ...p, b: [] }));
          setNotes((p) => ({ ...p, b: null }));
        }}
      />

      {/* 빠르게 넣기 */}
      {quick.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs font-semibold text-gray-300">
            빠르게 넣기 ·{" "}
            <span className={focus === "a" ? "text-primary" : "text-app-loss-tx"}>{TEAM_LABEL[focus]}</span>
            {focusFull ? "은 5명을 모두 채웠어요" : "에 추가돼요"}
          </p>
          <ChipRow>
            {quick.map((n) => (
              <button
                key={n}
                type="button"
                disabled={focusFull}
                onClick={() => commit(focus, n)}
                className="a-press flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface pl-1 pr-3 text-[13px] font-semibold text-gray-200 disabled:opacity-50"
              >
                <CharImg id={avatarOf.get(n)} name={n} size={26} radius={13} />
                <span className="max-w-[7rem] truncate">{n}</span>
                <Icon name="plus" size={14} className="text-primary" />
              </button>
            ))}
          </ChipRow>
        </div>
      )}

      <button
        type="button"
        onClick={onSearch}
        disabled={total === 0}
        className="a-grad a-glow a-press mt-1 flex h-14 items-center justify-center gap-2 rounded-[18px] text-base font-bold disabled:opacity-50"
      >
        <Icon name="search" size={19} stroke={2.4} />
        전적 한 번에 보기{total > 0 && ` · ${total}명`}
      </button>
      {error && (
        <p className="text-center text-xs font-semibold text-app-loss-tx" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * 팀 입력 칸 — 머리(이름·인원·모두 지우기), 진행 막대, 닉네임 칩, 닉네임 추가 입력.
 * @param team 팀 (a 내 팀 / b 상대 팀)
 * @param values 넣은 닉네임
 * @param draft 입력 중 글자
 * @param note 칸 아래 안내(건너뛴 이유) — 없으면 도움말
 * @param active 지금 고른 칸인지 (빠르게 넣기 대상, 테두리 강조)
 * @param avatarOf 닉네임 → 대표 캐릭터 ID
 * @param inputRef 입력칸 ref
 * @param onFocus 칸을 눌렀을 때
 * @param onDraft 입력 중 글자 바뀜
 * @param onCommit 글을 칩으로 넣기
 * @param onRemove 칩 빼기
 * @param onClear 모두 지우기
 */
function TeamPanel({
  team,
  values,
  draft,
  note,
  active,
  avatarOf,
  inputRef,
  onFocus,
  onDraft,
  onCommit,
  onRemove,
  onClear,
}: {
  team: Team;
  values: string[];
  draft: string;
  note: string | null;
  active: boolean;
  avatarOf: Map<string, string | undefined>;
  inputRef: RefObject<HTMLInputElement>;
  onFocus: () => void;
  onDraft: (v: string) => void;
  onCommit: (text: string) => void;
  onRemove: (n: string) => void;
  onClear: () => void;
}) {
  const isA = team === "a";
  const full = values.length >= TEAM_MAX;
  const chipCls = isA ? "bg-app-ac-soft text-app-ac-tx" : "bg-app-loss-bg text-app-loss-tx";

  /** Enter 로 추가(한글 조합 중 Enter 는 무시), 빈 입력에서 Backspace 는 마지막 칩 빼기 */
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (draft.trim()) onCommit(draft);
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onRemove(values[values.length - 1]);
    }
  }

  return (
    <section
      onClick={() => {
        onFocus();
        inputRef.current?.focus();
      }}
      className={`a-card grid cursor-text gap-3 border-[1.5px] p-3.5 transition-colors ${
        active ? (isA ? "!border-primary" : "!border-app-loss-tx") : ""
      }`}
      aria-label={`${TEAM_LABEL[team]} 닉네임`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isA ? "a-grad" : "bg-app-live text-white"}`}>
          <Icon name="users" size={18} />
        </span>
        <span className="grid min-w-0 flex-1">
          <span className={`text-[15px] font-extrabold ${isA ? "text-gray-50" : "text-app-loss-tx"}`}>{TEAM_LABEL[team]}</span>
          <span className="text-[11px] text-gray-500 tabular-nums">
            {values.length} / {TEAM_MAX}명
          </span>
        </span>
        <button
          type="button"
          disabled={values.length === 0}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="h-8 shrink-0 rounded-full px-2.5 text-xs font-semibold text-gray-500 active:bg-surface-2 disabled:opacity-40"
        >
          모두 지우기
        </button>
      </div>

      {/* 인원 진행 막대 (5칸) */}
      <div className="grid grid-cols-5 gap-1" aria-hidden="true">
        {Array.from({ length: TEAM_MAX }, (_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full ${i < values.length ? (isA ? "bg-primary" : "bg-app-loss-tx") : "bg-surface-3"}`}
          />
        ))}
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className={`inline-flex h-9 max-w-full items-center gap-1.5 rounded-full pl-1 pr-1 text-[13px] font-bold ${chipCls}`}>
              <CharImg id={avatarOf.get(v)} name={v} size={28} radius={14} />
              <span className="truncate text-gray-50">{v}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(v);
                }}
                aria-label={`${v} 빼기`}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full opacity-70 active:opacity-100"
              >
                <Icon name="close" size={13} stroke={2.6} />
              </button>
            </span>
          ))}
        </div>
      )}

      {!full ? (
        <label className="flex h-11 items-center gap-2 rounded-[14px] border border-dashed border-line px-3 text-gray-500">
          <Icon name="plus" size={16} />
          <input
            ref={inputRef}
            value={draft}
            onFocus={onFocus}
            onChange={(e) => {
              const v = e.target.value;
              // 쉼표·줄바꿈이 들어오면(붙여넣기·안드로이드 키보드) 바로 나눠 칩으로
              if (SEPARATORS.test(v)) onCommit(v);
              else onDraft(v);
            }}
            onKeyDown={onKeyDown}
            enterKeyHint="enter"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={60}
            placeholder="닉네임 추가"
            aria-label={`${TEAM_LABEL[team]} 닉네임 입력`}
            className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-100 outline-none"
          />
          {draft.trim() && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCommit(draft);
              }}
              className={`h-8 shrink-0 rounded-[10px] px-3 text-xs font-bold ${isA ? "a-grad" : "bg-app-live text-white"}`}
            >
              추가
            </button>
          )}
        </label>
      ) : null}

      <p className={`-mt-1 text-[11px] ${note ? "font-semibold text-app-loss-tx" : "text-gray-500"}`}>
        {note ?? (full ? `${TEAM_MAX}명을 모두 채웠어요` : "Enter·쉼표로 추가 · 여러 명을 쉼표로 붙여 넣어도 돼요")}
      </p>
    </section>
  );
}
