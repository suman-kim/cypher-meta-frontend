"use client";

/**
 * 금칙어 거부 안내 — 어느 입력(제목/내용/닉네임)의 어느 부분이 걸렸는지 원문을 강조해 보여 준다.
 * 긴 본문은 걸린 부분 앞뒤 일부만 잘라 보여 주고(…), 짧은 입력은 통째로 보여 준다.
 */
import { BANNED_FIELD_LABELS, type BannedState } from "@/lib/banned-words";

/** 걸린 부분 앞뒤로 보여 줄 글자 수 */
const CONTEXT = 14;
/** 이 길이 이하의 원문은 자르지 않고 통째로 보여 준다 */
const FULL_LIMIT = 80;

type Segment = { kind: "text" | "mark"; text: string } | { kind: "gap" };

/**
 * 원문을 강조 구간 기준으로 잘라 표시 조각을 만든다.
 * @param value — 제출 당시 원문
 * @param ranges — 강조할 [start, end) 구간들(겹쳐도 됨)
 * @returns 일반/강조/생략(…) 조각 배열
 */
function toSegments(value: string, ranges: [number, number][]): Segment[] {
  // 겹치거나 맞닿은 강조 구간 합치기
  const marks: [number, number][] = [];
  for (const [s, e] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const start = Math.max(0, Math.min(s, value.length));
    const end = Math.max(start, Math.min(e, value.length));
    const last = marks[marks.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else marks.push([start, end]);
  }

  // 보여 줄 창(강조 구간 ± CONTEXT) — 겹치면 합친다
  const whole = value.length <= FULL_LIMIT;
  const windows: [number, number][] = [];
  for (const [s, e] of marks) {
    const ws = whole ? 0 : Math.max(0, s - CONTEXT);
    const we = whole ? value.length : Math.min(value.length, e + CONTEXT);
    const last = windows[windows.length - 1];
    if (last && ws <= last[1]) last[1] = Math.max(last[1], we);
    else windows.push([ws, we]);
  }

  const out: Segment[] = [];
  for (const [ws, we] of windows) {
    if (ws > 0) out.push({ kind: "gap" });
    let pos = ws;
    for (const [s, e] of marks) {
      if (e <= ws || s >= we) continue;
      if (s > pos) out.push({ kind: "text", text: value.slice(pos, s) });
      out.push({ kind: "mark", text: value.slice(s, e) });
      pos = e;
    }
    if (pos < we) out.push({ kind: "text", text: value.slice(pos, we) });
  }
  const lastWindow = windows[windows.length - 1];
  if (lastWindow && lastWindow[1] < value.length) out.push({ kind: "gap" });
  return out;
}

/**
 * 금칙어 거부 안내 박스.
 * @param state — 검출 목록 + 제출 당시 필드 값
 */
export default function BannedWordAlert({ state }: { state: BannedState }) {
  const fields = [...new Set(state.matches.map((m) => m.field))];
  const words = [...new Set(state.matches.map((m) => m.word))];

  return (
    <div role="alert" className="rounded-md border border-lose/40 bg-lose/10 px-3 py-2.5">
      <p className="text-sm font-semibold text-lose">사용할 수 없는 표현이 있어 등록되지 않았습니다.</p>
      <p className="mt-0.5 text-xs text-gray-500">강조된 부분을 고친 뒤 다시 등록해주세요.</p>

      <ul className="mt-2 space-y-1.5">
        {fields.map((field) => {
          const value = state.values[field] ?? "";
          const ranges = state.matches
            .filter((m) => m.field === field)
            .map((m): [number, number] => [m.start, m.end]);
          return (
            <li key={field} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0 rounded bg-lose/15 px-1.5 py-0.5 text-[11px] font-bold text-lose">
                {BANNED_FIELD_LABELS[field] ?? field}
              </span>
              <span className="min-w-0 break-words leading-relaxed text-gray-300">
                {toSegments(value, ranges).map((seg, i) =>
                  seg.kind === "gap" ? (
                    <span key={i} className="mx-1 text-gray-500">
                      …
                    </span>
                  ) : seg.kind === "mark" ? (
                    <mark
                      key={i}
                      className="rounded-sm bg-lose/20 px-0.5 font-bold text-lose underline decoration-lose/70 decoration-wavy underline-offset-4"
                    >
                      {seg.text.replace(/\s+/g, " ")}
                    </mark>
                  ) : (
                    <span key={i}>{seg.text.replace(/\s+/g, " ")}</span>
                  ),
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-xs text-gray-500">
        검출된 금칙어: <span className="font-semibold text-gray-400">{words.join(", ")}</span>
      </p>
    </div>
  );
}
