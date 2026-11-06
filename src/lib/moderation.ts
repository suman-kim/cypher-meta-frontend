"use client";

/**
 * moderation.ts — 신고 보내기, 작성자 차단 목록, 운영 정책 동의(브라우저 전용).
 *
 *  - 차단은 서버에 보내지 않고 이 기기(localStorage)에만 둔다. 여러 화면이 같은 값을 보도록
 *    모듈 단위 저장소 + useSyncExternalStore 로 구독하고, 다른 탭의 변경(storage 이벤트)도 따라간다.
 *  - 신고자 구분값은 이 기기에서 처음 신고할 때 만든 임의 ID 다(서버는 해시만 저장).
 *  - 운영 정책 동의는 한 번 체크하면 이 기기에 기억한다(정책 문서가 바뀌면 TERMS_VERSION 을 올린다).
 * 순수 로직은 moderation-core.ts 에 있다. 이 파일은 "use client" 라 서버 컴포넌트는 순수 함수를
 * 반드시 "@/lib/moderation-core" 에서 가져와야 한다(여기서 가져오면 함수 대신 클라이언트 참조가 온다).
 */
import { useSyncExternalStore } from "react";
import { postJSON } from "./api-client";
import {
  addBlocked,
  isBlockedIn,
  parseBlocked,
  removeBlocked,
  type BlockedAuthor,
  type ReportReasonKey,
  type ReportTargetType,
} from "./moderation-core";

export * from "./moderation-core";

/** 차단 목록 저장 키 */
const BLOCKED_KEY = "cm_blocked_authors";
/** 신고자 임의 ID 저장 키 */
const REPORTER_KEY = "cm_reporter_id";
/** 운영 정책 동의 저장 키 접두사(뒤에 정책 버전) */
const TERMS_KEY_PREFIX = "cm_ugc_terms:";
/** 운영 정책 버전 — 정책 내용을 크게 바꾸면 올려서 다시 동의받는다 */
export const TERMS_VERSION = "2026-11-07";

/** 서버 렌더·첫 화면용 빈 목록(같은 참조를 돌려줘야 useSyncExternalStore 가 반복 렌더하지 않는다) */
const EMPTY: BlockedAuthor[] = [];
/** 지금 차단 목록(처음 읽을 때 채운다) */
let blockedCache: BlockedAuthor[] | null = null;
/** 차단 목록 구독자 */
const blockedListeners = new Set<() => void>();
/** 운영 정책 동의 구독자 */
const termsListeners = new Set<() => void>();
/** 저장이 막힌 환경에서 이번 화면 동안만 기억하는 동의 여부 */
let termsAgreedMemory = false;

/**
 * localStorage 를 안전하게 읽는다(사생활 모드 등에서 막혀 있으면 null).
 * @param key — 저장 키
 * @returns 값 또는 null
 */
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * localStorage 에 안전하게 쓴다(막혀 있으면 이번 화면에서만 기억).
 * @param key — 저장 키
 * @param value — 값
 */
function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 저장이 막힌 환경 — 메모리 값만 쓴다 */
  }
}

/** 다른 탭에서 바뀐 값을 따라간다(한 번만 등록) */
let storageHooked = false;
/** storage 이벤트 연결 */
function hookStorage(): void {
  if (storageHooked || typeof window === "undefined") return;
  storageHooked = true;
  window.addEventListener("storage", (e) => {
    if (e.key === BLOCKED_KEY) {
      blockedCache = parseBlocked(e.newValue);
      blockedListeners.forEach((l) => l());
    } else if (e.key?.startsWith(TERMS_KEY_PREFIX)) {
      termsListeners.forEach((l) => l());
    }
  });
}

/**
 * 지금 차단 목록.
 * @returns 차단 목록(최근 차단 먼저)
 */
export function getBlocked(): BlockedAuthor[] {
  if (typeof window === "undefined") return EMPTY;
  if (blockedCache === null) blockedCache = parseBlocked(readStorage(BLOCKED_KEY));
  return blockedCache;
}

/**
 * 차단 목록을 바꾸고 구독자에게 알린다.
 * @param next — 새 목록
 */
function setBlocked(next: BlockedAuthor[]): void {
  blockedCache = next;
  writeStorage(BLOCKED_KEY, JSON.stringify(next));
  blockedListeners.forEach((l) => l());
}

/**
 * 작성자를 차단한다(이 기기에서만 글·댓글을 숨김).
 * @param name — 닉네임
 */
export function blockAuthor(name: string): void {
  setBlocked(addBlocked(getBlocked(), name, new Date().toISOString()));
}

/**
 * 작성자 차단을 푼다.
 * @param name — 닉네임
 */
export function unblockAuthor(name: string): void {
  setBlocked(removeBlocked(getBlocked(), name));
}

/**
 * 차단 목록 변경 구독.
 * @param listener — 바뀔 때 부를 함수
 * @returns 구독 해제 함수
 */
function subscribeBlocked(listener: () => void): () => void {
  hookStorage();
  blockedListeners.add(listener);
  return () => blockedListeners.delete(listener);
}

/**
 * 차단 목록을 구독한다. 서버 렌더와 첫 화면에서는 빈 목록이다(하이드레이션 뒤에 숨김이 적용된다).
 * @returns 차단 목록
 */
export function useBlockedAuthors(): BlockedAuthor[] {
  return useSyncExternalStore(subscribeBlocked, getBlocked, () => EMPTY);
}

/**
 * 작성자가 차단됐는지 구독한다.
 * @param name — 닉네임
 * @returns 차단했으면 true
 */
export function useIsBlocked(name: string | null | undefined): boolean {
  return isBlockedIn(useBlockedAuthors(), name);
}

/**
 * 이 기기의 신고자 임의 ID(없으면 만든다).
 * @returns 임의 ID
 */
function reporterKey(): string {
  const saved = readStorage(REPORTER_KEY);
  if (saved && saved.length >= 8) return saved;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  writeStorage(REPORTER_KEY, id);
  return id;
}

/** 신고 보내기 입력 */
export interface ReportInput {
  /** 신고 대상 종류 */
  targetType: ReportTargetType;
  /** 신고 대상 ID */
  targetId: string;
  /** 신고 사유 */
  reason: ReportReasonKey;
  /** 상세 설명(선택) */
  detail?: string;
}

/**
 * 신고를 보낸다.
 * @param input — 대상·사유·상세
 * @returns duplicate=true 면 이미 신고한 대상
 * @throws ApiError — 대상이 없음(404)·하루 한도 초과(429) 등, message 는 한국어
 */
export function submitReport(input: ReportInput): Promise<{ ok: true; duplicate: boolean }> {
  const detail = input.detail?.trim();
  return postJSON("/api/moderation/reports", {
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    ...(detail ? { detail } : {}),
    reporterKey: reporterKey(),
  });
}

/**
 * 운영 정책에 동의했는지(이 기기 기준).
 * @returns 동의했으면 true
 */
function getTermsAgreed(): boolean {
  if (typeof window === "undefined") return false;
  return termsAgreedMemory || readStorage(TERMS_KEY_PREFIX + TERMS_VERSION) !== null;
}

/**
 * 운영 정책 동의 변경 구독.
 * @param listener — 바뀔 때 부를 함수
 * @returns 구독 해제 함수
 */
function subscribeTerms(listener: () => void): () => void {
  hookStorage();
  termsListeners.add(listener);
  return () => termsListeners.delete(listener);
}

/**
 * 운영 정책 동의를 기록한다.
 */
export function agreeTerms(): void {
  termsAgreedMemory = true;
  writeStorage(TERMS_KEY_PREFIX + TERMS_VERSION, new Date().toISOString());
  termsListeners.forEach((l) => l());
}

/**
 * 운영 정책 동의 여부를 구독한다(서버 렌더에서는 false).
 * @returns 동의했으면 true
 */
export function useTermsAgreed(): boolean {
  return useSyncExternalStore(subscribeTerms, getTermsAgreed, () => false);
}
