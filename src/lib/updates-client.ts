/**
 * updates-client.ts — 업데이트 노트 클라이언트 유틸.
 * "본 버전(seen)"을 localStorage 로 기억하고, 최신 발행분과 비교해
 * 헤더 NEW 뱃지 / 첫 방문 팝업을 제어한다. seen 변경은 커스텀 이벤트로 브로드캐스트.
 */
import { useEffect, useState } from "react";
import type { UpdateNote } from "@/lib/updates";

const SEEN_KEY = "cy_updates_seen";
const EVT = "cy-updates-seen";

/** 사용자가 마지막으로 확인한 업데이트 노트 ID (없으면 null) */
export function getSeenUpdateId(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
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
 * markUpdatesSeen 이벤트가 발생하면 즉시 null 로 갱신된다.
 */
export function useUnseenUpdate(): UpdateNote | null {
  const [unseen, setUnseen] = useState<UpdateNote | null>(null);

  useEffect(() => {
    let alive = true;
    fetchLatestUpdate().then((latest) => {
      if (!alive) return;
      setUnseen(latest && latest.id !== getSeenUpdateId() ? latest : null);
    });
    const onSeen = () => {
      if (alive) setUnseen(null);
    };
    window.addEventListener(EVT, onSeen);
    return () => {
      alive = false;
      window.removeEventListener(EVT, onSeen);
    };
  }, []);

  return unseen;
}
