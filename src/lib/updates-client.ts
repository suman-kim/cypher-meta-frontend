/**
 * updates-client.ts — 업데이트 노트 클라이언트 유틸.
 * "본 버전(seen)"을 localStorage 로 기억하고, 최신 발행분과 비교해
 * 헤더 NEW 뱃지 / 첫 방문 팝업을 제어한다. seen 변경은 커스텀 이벤트로 브로드캐스트.
 */
import { useEffect, useState } from "react";
import type { UpdateNote } from "@/lib/updates";

const SEEN_KEY = "cy_updates_seen";
const SNOOZE_KEY = "cy_updates_snooze";
const EVT = "cy-updates-seen";
/** '나중에' 클릭 시 팝업을 다시 띄우기까지의 스누즈 시간(시간 단위). */
const SNOOZE_HOURS = 24;

/** 사용자가 마지막으로 확인한 업데이트 노트 ID (없으면 null) */
export function getSeenUpdateId(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

/**
 * '나중에' — 해당 업데이트 팝업을 SNOOZE_HOURS 동안만 숨긴다(확인 처리 아님).
 * 헤더 NEW 뱃지는 유지되고, 스누즈가 끝나면 팝업이 다시 뜬다.
 */
export function snoozeUpdate(id: string): void {
  try {
    window.localStorage.setItem(
      SNOOZE_KEY,
      JSON.stringify({ id, until: Date.now() + SNOOZE_HOURS * 3600000 }),
    );
  } catch {
    /* localStorage 불가 — 무시 */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
  } catch {
    /* noop */
  }
}

/** 해당 업데이트가 스누즈 중인지(기간 내 + 같은 id). */
export function isUpdateSnoozed(id: string): boolean {
  try {
    const raw = window.localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw) as { id?: string; until?: number };
    return s?.id === id && typeof s.until === "number" && Date.now() < s.until;
  } catch {
    return false;
  }
}

/** 최신 업데이트를 "확인함"으로 표시하고 리스너(뱃지/팝업)에 알린다 */
export function markUpdatesSeen(id: string): void {
  try {
    window.localStorage.setItem(SEEN_KEY, id);
  } catch {
    /* localStorage 불가(프라이빗 모드 등) — 무시 */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
  } catch {
    /* noop */
  }
}

// 최신 발행분 fetch 를 모듈 레벨에서 1회로 공유(헤더 뱃지 + 팝업이 중복 호출하지 않도록)
let latestPromise: Promise<UpdateNote | null> | null = null;

/** 최신 발행 업데이트 1건(공유 캐시). 실패 시 null */
export function fetchLatestUpdate(): Promise<UpdateNote | null> {
  if (!latestPromise) {
    latestPromise = fetch("/api/updates/latest", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { latest?: UpdateNote | null } | null) => d?.latest ?? null)
      .catch(() => null);
  }
  return latestPromise;
}

/**
 * 아직 확인하지 않은 최신 업데이트를 반환하는 훅.
 * 최신 발행분이 seen 과 다르면 그 노트를, 같거나 없으면 null 을 준다.
 * seen/스누즈 이벤트가 발생하면 즉시 재계산한다.
 *
 * @param opts.respectSnooze — true 면 스누즈 중인 업데이트도 null 로 취급(팝업용).
 *   기본 false — 헤더 NEW 뱃지는 스누즈와 무관하게 "아직 안 봄"을 계속 표시한다.
 */
export function useUnseenUpdate(opts?: { respectSnooze?: boolean }): UpdateNote | null {
  const respectSnooze = !!opts?.respectSnooze;
  const [unseen, setUnseen] = useState<UpdateNote | null>(null);

  useEffect(() => {
    let alive = true;
    const compute = (): void => {
      fetchLatestUpdate().then((latest) => {
        if (!alive) return;
        const visible =
          latest &&
          latest.id !== getSeenUpdateId() &&
          (!respectSnooze || !isUpdateSnoozed(latest.id));
        setUnseen(visible ? latest : null);
      });
    };
    compute();
    window.addEventListener(EVT, compute);
    return () => {
      alive = false;
      window.removeEventListener(EVT, compute);
    };
  }, [respectSnooze]);

  return unseen;
}
