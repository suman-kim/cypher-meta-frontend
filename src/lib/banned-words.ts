"use client";

/**
 * 금칙어 검출 응답 해석 + 폼 상태 훅.
 * 백엔드가 게시글·댓글 작성을 금칙어로 거부하면 400 { code: "BANNED_WORDS", message, matches } 를 준다.
 * matches 의 start/end 는 제출한 원문 기준 위치라서, 제출 당시 값(values)과 함께 보관해 강조 표시에 쓴다.
 */
import { useCallback, useState } from "react";
import { ApiError } from "@/lib/api-client";

/** 금칙어 검출 1건(백엔드 community/banned-word.util.ts 의 BannedMatch 와 같은 모양) */
export interface BannedMatch {
  /** 입력 필드 키(title / content / guestName) */
  field: string;
  /** 걸린 금칙어 */
  word: string;
  /** 원문 시작 위치(포함) */
  start: number;
  /** 원문 끝 위치(미포함) */
  end: number;
  /** 원문에서 걸린 부분 그대로 */
  text: string;
}

/** 금칙어로 거부된 제출 — 검출 목록 + 제출 당시 필드 값 */
export interface BannedState {
  matches: BannedMatch[];
  values: Record<string, string>;
}

/** 필드 키 → 화면 표시 이름 */
export const BANNED_FIELD_LABELS: Record<string, string> = {
  title: "제목",
  content: "내용",
  guestName: "닉네임",
};

/**
 * 에러가 금칙어 거부(400 BANNED_WORDS)면 검출 목록을 꺼낸다.
 * @param err — postJSON 등이 던진 에러
 * @returns 검출 목록, 금칙어 거부가 아니면 null
 */
export function bannedMatchesOf(err: unknown): BannedMatch[] | null {
  if (!(err instanceof ApiError)) return null;
  const d = err.data as { code?: string; matches?: unknown } | null;
  if (d?.code !== "BANNED_WORDS" || !Array.isArray(d.matches)) return null;
  return d.matches as BannedMatch[];
}

/**
 * 작성 폼의 금칙어 상태 훅.
 * capture 로 거부 응답을 담고, 사용자가 필드를 고치면 clearField 로 그 필드의 (이제 낡은) 표시를 지운다.
 * @returns state(없으면 null)·capture·clearField·reset·has
 */
export function useBannedWords() {
  const [state, setState] = useState<BannedState | null>(null);

  /** 금칙어 거부면 상태에 담고 true, 다른 에러면 false */
  const capture = useCallback((err: unknown, values: Record<string, string>): boolean => {
    const matches = bannedMatchesOf(err);
    if (!matches) return false;
    setState({ matches, values });
    return true;
  }, []);

  /** 해당 필드의 검출 표시를 지운다(남은 검출이 없으면 상태 자체를 비움) */
  const clearField = useCallback((field: string) => {
    setState((s) => {
      if (!s || !s.matches.some((m) => m.field === field)) return s;
      const rest = s.matches.filter((m) => m.field !== field);
      return rest.length ? { ...s, matches: rest } : null;
    });
  }, []);

  const reset = useCallback(() => setState(null), []);

  /** 해당 필드에 검출이 있는가(입력칸 테두리 강조용) */
  const has = (field: string) => !!state?.matches.some((m) => m.field === field);

  return { state, capture, clearField, reset, has };
}
