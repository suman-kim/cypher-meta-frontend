"use client";

/**
 * app-storage.ts — 앱 기기 저장소(localStorage) 읽기·쓰기와 React 훅.
 *
 * 로그인 없이 쓰는 앱이라 "내 닉네임 연동", "즐겨찾기", "최근 검색", "테마", "알림 설정"을
 * 이 기기에만 저장한다. 앱을 지우거나 기기를 바꾸면 사라진다(더보기·내 계정 화면에서 안내).
 *
 * - 같은 탭 안의 다른 컴포넌트도 바로 바뀌도록 저장할 때 사용자 정의 이벤트를 쏜다.
 * - useSyncExternalStore 로 구독하며, 서버 렌더에서는 기본값을 돌려준다.
 *   기본값은 모듈 상수로 두어 참조가 매번 같도록 한다(React 경고 방지).
 * - 최근 검색은 웹 검색창(components/SearchBar.tsx)과 같은 키·형식(string[])을 써서 서로 공유한다.
 */
import { useSyncExternalStore } from "react";

/** 저장해 두는 플레이어 요약(즐겨찾기·내 계정) */
export interface SavedPlayer {
  /** Neople 플레이어 ID — 플레이어 화면 주소에 쓴다 */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 대표 캐릭터 ID (아바타 이미지) */
  characterId?: string;
  /** 마지막으로 본 공식전 RP */
  rp?: number;
  /** 마지막으로 본 공식전 전체 순위 (없으면 null) */
  rank?: number | null;
  /** 마지막으로 본 티어 이름 */
  tierName?: string;
  /** 이 요약을 저장·갱신한 시각(ms) */
  savedAt?: number;
}

/** 앱 테마 선택값 — system 이면 기기 설정을 따른다 */
export type AppTheme = "system" | "light" | "dark";

/** 알림 설정 — 푸시 구독 대상을 정할 때 쓴다(src/components/app/AppPushSync.tsx) */
export interface AlertPrefs {
  /** 내 계정·즐겨찾기 플레이어의 새 매치 알림 */
  match: boolean;
  /** 알림을 켠 스트리머의 방송 시작 알림 */
  live: boolean;
}

/** 저장소 키 모음 */
export const STORE_KEYS = {
  /** 내 닉네임 연동 */
  me: "cm_app_me",
  /** 즐겨찾기 플레이어 목록 */
  favs: "cm_app_favs",
  /** 최근 검색어 (웹과 공유) */
  recent: "cy_recent_searches",
  /** 앱 테마 */
  theme: "cm_app_theme",
  /** 알림 설정 */
  alerts: "cm_app_alerts",
  /** 방송 시작 알림을 켠 채널 { [채널키 플랫폼:채널ID]: 채널 이름 (예전 값은 true) } */
  liveAlerts: "cm_app_live_alerts",
  /** 이 설치본의 고유 ID — 푸시 구독을 서버에서 구분하는 값(로그인 없음) */
  installId: "cm_app_install_id",
} as const;

/** 즐겨찾기 최대 개수 */
export const FAV_MAX = 30;
/** 최근 검색 최대 개수 (웹 SearchBar 와 같음) */
export const RECENT_MAX = 8;

const EVT = "cm-app-storage";

const EMPTY_FAVS: SavedPlayer[] = [];
const EMPTY_RECENT: string[] = [];
const DEFAULT_ALERTS: AlertPrefs = { match: true, live: true };
const EMPTY_LIVE_ALERTS: Record<string, string | boolean> = {};

/** 키별로 마지막 원문·해석값을 기억해, 값이 같으면 같은 참조를 돌려준다. */
const cache = new Map<string, { raw: string | null; val: unknown }>();

/**
 * 저장값을 읽는다(파싱 실패·서버 환경이면 기본값).
 * @param key 저장소 키
 * @param fallback 값이 없을 때 돌려줄 기본값
 */
function readKey<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.val as T;
  let val: T = fallback;
  if (raw !== null) {
    try {
      val = JSON.parse(raw) as T;
    } catch {
      val = fallback;
    }
  }
  cache.set(key, { raw, val });
  return val;
}

/**
 * 값을 저장하고 같은 탭의 구독자에게 알린다.
 * @param key 저장소 키
 * @param value 저장할 값 (null 이면 지운다)
 */
function writeKey(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 공간 부족·사생활 모드 — 조용히 무시 */
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: key }));
}

/** 저장소 변경 구독 (같은 탭 이벤트 + 다른 탭 storage 이벤트) */
function subscribe(cb: () => void): () => void {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * 저장값 하나를 구독하는 훅.
 * @param key 저장소 키
 * @param fallback 기본값 — 반드시 모듈 상수처럼 참조가 고정된 값을 넘긴다
 */
function useKey<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => readKey(key, fallback),
    () => fallback,
  );
}

const noopSubscribe = () => () => {};

/**
 * 클라이언트에서 하이드레이션이 끝났는지 알려준다.
 * 기기 저장값은 서버에서 알 수 없으므로, 끝나기 전에는 빈 상태 대신 자리 표시를 보여 줄 때 쓴다.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* ── 내 닉네임 연동 ───────────────────────────── */

/** 연동한 내 플레이어 (없으면 null) */
export function useMe(): SavedPlayer | null {
  return useKey<SavedPlayer | null>(STORE_KEYS.me, null);
}

/**
 * 내 닉네임을 연동하거나 해제한다.
 * @param p 연동할 플레이어 (null 이면 해제)
 */
export function setMe(p: SavedPlayer | null): void {
  writeKey(STORE_KEYS.me, p ? { ...p, savedAt: Date.now() } : null);
}

/* ── 즐겨찾기 ─────────────────────────────────── */

/** 즐겨찾기 목록 (추가한 순서) */
export function useFavs(): SavedPlayer[] {
  return useKey<SavedPlayer[]>(STORE_KEYS.favs, EMPTY_FAVS);
}

/** 이 플레이어가 즐겨찾기에 있는지 */
export function useIsFav(playerId: string): boolean {
  const favs = useFavs();
  return favs.some((f) => f.playerId === playerId);
}

/**
 * 즐겨찾기에 넣거나 뺀다.
 * @param p 대상 플레이어
 * @returns 처리 뒤 즐겨찾기 상태 (true = 들어 있음)
 */
export function toggleFav(p: SavedPlayer): boolean {
  const cur = readKey<SavedPlayer[]>(STORE_KEYS.favs, EMPTY_FAVS);
  if (cur.some((f) => f.playerId === p.playerId)) {
    writeKey(
      STORE_KEYS.favs,
      cur.filter((f) => f.playerId !== p.playerId),
    );
    return false;
  }
  writeKey(STORE_KEYS.favs, [...cur, { ...p, savedAt: Date.now() }].slice(-FAV_MAX));
  return true;
}

/**
 * 즐겨찾기에서 뺀다.
 * @param playerId 뺄 플레이어 ID
 */
export function removeFav(playerId: string): void {
  const cur = readKey<SavedPlayer[]>(STORE_KEYS.favs, EMPTY_FAVS);
  writeKey(
    STORE_KEYS.favs,
    cur.filter((f) => f.playerId !== playerId),
  );
}

/**
 * 플레이어 화면을 열 때 최신 RP·순위·대표 캐릭터로 저장된 요약(내 계정·즐겨찾기)을 고친다.
 * 저장돼 있지 않은 플레이어면 아무것도 하지 않는다.
 * @param p 화면에서 읽은 최신 요약
 */
export function refreshSaved(p: SavedPlayer): void {
  const me = readKey<SavedPlayer | null>(STORE_KEYS.me, null);
  if (me && me.playerId === p.playerId) {
    writeKey(STORE_KEYS.me, { ...me, ...p, savedAt: Date.now() });
  }
  const favs = readKey<SavedPlayer[]>(STORE_KEYS.favs, EMPTY_FAVS);
  if (favs.some((f) => f.playerId === p.playerId)) {
    writeKey(
      STORE_KEYS.favs,
      favs.map((f) => (f.playerId === p.playerId ? { ...f, ...p, savedAt: Date.now() } : f)),
    );
  }
}

/* ── 최근 검색 (웹 SearchBar 와 공유) ─────────── */

/** 최근 검색어 목록 (최신순) */
export function useRecent(): string[] {
  return useKey<string[]>(STORE_KEYS.recent, EMPTY_RECENT);
}

/**
 * 최근 검색어 맨 앞에 넣는다(중복 제거, 최대 RECENT_MAX).
 * @param q 검색어
 */
export function addRecent(q: string): void {
  const t = q.trim();
  if (!t) return;
  const cur = readKey<string[]>(STORE_KEYS.recent, EMPTY_RECENT);
  writeKey(STORE_KEYS.recent, [t, ...cur.filter((r) => r !== t)].slice(0, RECENT_MAX));
}

/**
 * 최근 검색어 하나를 지운다.
 * @param q 지울 검색어
 */
export function removeRecent(q: string): void {
  const cur = readKey<string[]>(STORE_KEYS.recent, EMPTY_RECENT);
  writeKey(
    STORE_KEYS.recent,
    cur.filter((r) => r !== q),
  );
}

/** 최근 검색어를 모두 지운다. */
export function clearRecent(): void {
  writeKey(STORE_KEYS.recent, []);
}

/* ── 테마 ─────────────────────────────────────── */

/** 앱 테마 선택값 (기본: 기기 설정 따름) */
export function useAppTheme(): AppTheme {
  return useKey<AppTheme>(STORE_KEYS.theme, "system");
}

/**
 * 앱 테마를 바꾼다. 실제 html.dark 반영은 AppThemeSync 가 맡는다.
 * @param t 새 테마
 */
export function setAppTheme(t: AppTheme): void {
  writeKey(STORE_KEYS.theme, t);
}

/* ── 알림 설정 ────────────────────────────────── */

/** 알림 설정 */
export function useAlertPrefs(): AlertPrefs {
  return useKey<AlertPrefs>(STORE_KEYS.alerts, DEFAULT_ALERTS);
}

/**
 * 알림 설정 하나를 바꾼다.
 * @param key 바꿀 항목
 * @param on 켜기 여부
 */
export function setAlertPref(key: keyof AlertPrefs, on: boolean): void {
  const cur = readKey<AlertPrefs>(STORE_KEYS.alerts, DEFAULT_ALERTS);
  writeKey(STORE_KEYS.alerts, { ...cur, [key]: on });
}

/** 방송 시작 알림을 켠 채널 목록 { [플랫폼:채널ID]: 채널 이름 | true } — 값이 참이면 켜짐 */
export function useLiveAlerts(): Record<string, string | boolean> {
  return useKey<Record<string, string | boolean>>(STORE_KEYS.liveAlerts, EMPTY_LIVE_ALERTS);
}

/**
 * 채널 하나의 방송 시작 알림을 켜거나 끈다.
 * @param channel 채널 키 (플랫폼:채널ID)
 * @param name 채널 이름 — 푸시 구독에 표시명으로 함께 보낸다
 * @returns 처리 뒤 켜짐 여부
 */
export function toggleLiveAlert(channel: string, name?: string): boolean {
  const cur = readKey<Record<string, string | boolean>>(STORE_KEYS.liveAlerts, EMPTY_LIVE_ALERTS);
  const next = { ...cur };
  if (next[channel]) delete next[channel];
  else next[channel] = name?.trim() || true;
  writeKey(STORE_KEYS.liveAlerts, next);
  return !!next[channel];
}

/**
 * 이 설치본의 고유 ID 를 돌려준다(없으면 만들어 저장). 서버 환경에서는 빈 문자열.
 * @returns UUID v4 문자열
 */
export function getInstallId(): string {
  if (typeof window === "undefined") return "";
  const saved = readKey<string | null>(STORE_KEYS.installId, null);
  if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return saved;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
          (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
        );
  writeKey(STORE_KEYS.installId, id);
  return id;
}
