/**
 * site-notices.ts — 웹 접속 시 띄우는 안내 모달(사이트 안내)의 공통 규칙과 표시 기록.
 *
 * 안내마다 SiteNotice 하나를 정의하고(노출 기간·대상·다시 보이는 간격), 화면은 components/notices/ 에 둔다.
 * 여러 안내가 동시에 해당되면 목록 앞쪽 하나만 띄운다(한 번에 모달 하나).
 * 방문자가 닫은 기록은 기기 localStorage 에만 남는다(서버로 보내지 않음).
 *
 * 이 파일은 순수 함수와 저장소 접근만 두고 다른 모듈을 불러오지 않는다
 * (scripts/test-notices.ts 가 node 로 바로 불러와 검증한다).
 */

/** 안내를 띄울지 판단할 때 쓰는 방문 정보 */
export interface SiteNoticeContext {
  /** 현재 경로(예: "/players/abc") */
  pathname: string;
  /** 브라우저 User-Agent */
  userAgent: string;
  /** 터치 지점 수(navigator.maxTouchPoints) — iPadOS 데스크톱 UA 구분용 */
  touchPoints: number;
  /** 현재 시각(ms) */
  now: number;
}

/** 안내 한 건의 정의 */
export interface SiteNotice {
  /** 고유 ID. 내용이 크게 바뀌어 다시 보여 줘야 하면 ID 를 바꾼다 */
  id: string;
  /** 노출 시작 시각(ISO). 없으면 바로 */
  startsAt?: string;
  /** 노출 종료 시각(ISO). 없으면 계속 */
  endsAt?: string;
  /** '닫기' 뒤 다시 보이기까지 시간(시간 단위) */
  snoozeHours: number;
  /**
   * 이 방문에서 보여 줄 대상인지(경로·기기 등).
   * @param ctx 방문 정보
   * @returns 대상이면 true
   */
  isEligible: (ctx: SiteNoticeContext) => boolean;
}

/** 방문자가 안내를 닫은 기록 */
export interface NoticeRecord {
  /** '다시 보지 않기'를 눌렀으면 true */
  hidden?: boolean;
  /** '닫기'를 누른 경우 다시 보이기 시작할 시각(ms) */
  until?: number;
}

// ------------------------------------------------------------------ 접속 팝업 순서

/**
 * 접속 안내의 차례가 끝났는지. 접속 시 뜨는 팝업은 '접속 안내 → 새 업데이트' 순서로 하나씩 띄운다.
 * SiteNoticeHost 가 띄울 안내가 없거나 안내를 닫으면 끝내고, WhatsNewPopup 은 끝난 뒤에만 뜬다.
 */
let noticeTurnDone = false;
/** 차례가 끝나기를 기다리는 리스너 */
const noticeTurnListeners = new Set<() => void>();

/** 접속 안내 차례를 끝낸다(이미 끝났으면 아무 일도 안 한다). */
export function finishNoticeTurn(): void {
  if (noticeTurnDone) return;
  noticeTurnDone = true;
  noticeTurnListeners.forEach((l) => l());
}

/**
 * 접속 안내 차례가 끝났는지.
 * @returns 끝났으면 true
 */
export function isNoticeTurnDone(): boolean {
  return noticeTurnDone;
}

/**
 * 차례가 끝나면 알림을 받는다(useSyncExternalStore 구독 함수 모양).
 * @param listener 끝났을 때 부를 함수
 * @returns 구독 해제 함수
 */
export function subscribeNoticeTurn(listener: () => void): () => void {
  noticeTurnListeners.add(listener);
  return () => {
    noticeTurnListeners.delete(listener);
  };
}

/** 다른 화면에서 안내를 직접 열 때 보내는 이벤트 이름(detail = 안내 ID) */
export const OPEN_NOTICE_EVENT = "cm:open-notice";

/** localStorage 키 앞부분 */
const STORE_PREFIX = "cm_notice:";

/**
 * 노출 기간 안인지 확인한다.
 * @param notice 안내 정의
 * @param now 현재 시각(ms)
 * @returns 기간 안이면 true (날짜가 잘못돼 있으면 그 조건은 없는 것으로 본다)
 */
export function isWithinPeriod(notice: SiteNotice, now: number): boolean {
  const start = notice.startsAt ? Date.parse(notice.startsAt) : NaN;
  const end = notice.endsAt ? Date.parse(notice.endsAt) : NaN;
  if (Number.isFinite(start) && now < start) return false;
  if (Number.isFinite(end) && now >= end) return false;
  return true;
}

/**
 * 방문자가 닫아서 지금은 숨겨야 하는지 확인한다.
 * @param record 닫은 기록(없으면 null)
 * @param now 현재 시각(ms)
 * @returns 숨겨야 하면 true
 */
export function isSuppressed(record: NoticeRecord | null, now: number): boolean {
  if (!record) return false;
  if (record.hidden) return true;
  return typeof record.until === "number" && now < record.until;
}

/**
 * 지금 자동으로 띄울 안내 하나를 고른다(목록 앞쪽 우선).
 * @param notices 안내 목록
 * @param ctx 방문 정보
 * @param getRecord 안내 ID → 닫은 기록
 * @returns 띄울 안내, 없으면 null
 */
export function pickNotice(
  notices: readonly SiteNotice[],
  ctx: SiteNoticeContext,
  getRecord: (id: string) => NoticeRecord | null,
): SiteNotice | null {
  for (const n of notices) {
    if (!isWithinPeriod(n, ctx.now)) continue;
    if (!n.isEligible(ctx)) continue;
    if (isSuppressed(getRecord(n.id), ctx.now)) continue;
    return n;
  }
  return null;
}

/**
 * 기기에 저장된 닫은 기록을 읽는다.
 * @param id 안내 ID
 * @returns 기록, 없거나 읽을 수 없으면 null
 */
export function readNoticeRecord(id: string): NoticeRecord | null {
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + id);
    if (!raw) return null;
    const v = JSON.parse(raw) as NoticeRecord;
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

/**
 * 기록을 저장한다(localStorage 를 쓸 수 없으면 조용히 넘어간다).
 * @param id 안내 ID
 * @param record 저장할 기록
 */
function writeNoticeRecord(id: string, record: NoticeRecord): void {
  try {
    window.localStorage.setItem(STORE_PREFIX + id, JSON.stringify(record));
  } catch {
    /* 프라이빗 모드 등 — 이번 방문만 닫힌다 */
  }
}

/**
 * '닫기' — 일정 시간 뒤 다시 보이게 한다. 이미 '다시 보지 않기'를 눌렀으면 그대로 둔다.
 * @param id 안내 ID
 * @param hours 다시 보이기까지 시간(시간 단위)
 */
export function snoozeNotice(id: string, hours: number): void {
  if (readNoticeRecord(id)?.hidden) return;
  writeNoticeRecord(id, { until: Date.now() + hours * 3600_000 });
}

/**
 * '다시 보지 않기' — 이 기기에서는 자동으로 띄우지 않는다(푸터 링크로는 다시 열 수 있다).
 * @param id 안내 ID
 */
export function hideNotice(id: string): void {
  writeNoticeRecord(id, { hidden: true });
}

/**
 * 다른 화면(푸터 등)에서 안내를 직접 연다.
 * @param id 안내 ID
 */
export function openNotice(id: string): void {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_NOTICE_EVENT, { detail: id }));
  } catch {
    /* noop */
  }
}
