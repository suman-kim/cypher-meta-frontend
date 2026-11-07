/**
 * admin-analytics-core.ts — 관리자 '일별·방문 로그·활동' 화면의 응답 타입과 순수 도우미(서버·클라이언트 공용, import 없음).
 *
 * - 응답 타입: 백엔드 /analytics/admin/* 응답 모양
 * - 이벤트 이름 → 우리말(규칙 목록, 새 이벤트는 EVENT_RULES 에 한 줄 더한다)
 * - 한국 시간 표시, 요일, 전날 대비, 히트맵 진하기, 기기 이름 등
 * 테스트: scripts/test-admin-analytics.ts (npm test)
 */

/* ───────────── 응답 타입 ───────────── */

/** 화면 종류 안내 */
export interface RouteGroupInfo {
  /** 종류 키 */
  key: string;
  /** 보일 이름 */
  label: string;
}

/** 일별 표 한 줄 */
export interface DailyRow {
  /** 날짜 'YYYY-MM-DD' (KST) */
  date: string;
  /** 조회수(화면을 연 횟수) */
  views: number;
  /** 방문자 수 */
  visitors: number;
  /** 새 방문자 수 */
  newVisitors: number;
  /** 전적 검색 수 */
  searches: number;
  /** 앱 조회수 */
  appViews: number;
  /** 웹 조회수 */
  webViews: number;
  /** 기타 이벤트 수 */
  otherEvents: number;
  /** 화면 종류별 조회수 */
  byGroup: Record<string, number>;
}

/** GET daily 응답 */
export interface DailyResponse {
  /** 기간 */
  range: { days: number; from: string; to: string };
  /** 화면 종류(표의 열 순서) */
  groups: RouteGroupInfo[];
  /** 날짜별 줄(오래된 순) */
  rows: DailyRow[];
}

/** GET day 응답 */
export interface DayResponse {
  /** 날짜 */
  date: string;
  /** 합계 */
  totals: { views: number; visitors: number; searches: number; appViews: number; webViews: number };
  /** 페이지별(상위 20) */
  pages: { path: string; views: number; visitors: number }[];
  /** 검색어(상위 15) */
  searches: { query: string; count: number }[];
  /** 유입 경로(상위 10) */
  referrers: { referrer: string; count: number }[];
  /** 시간대(KST, 기록 있는 시간만) */
  hours: { hour: number; views: number; visitors: number }[];
  /** 이벤트별 건수 */
  events: { event: string; count: number }[];
  /** 화면 종류별 조회수 */
  groups: (RouteGroupInfo & { views: number })[];
}

/** 방문 로그 한 줄 */
export interface VisitLog {
  /** 행 ID */
  id: string;
  /** 시각(ISO) */
  createdAt: string;
  /** 이벤트 이름 */
  event: string;
  /** 경로 */
  path: string;
  /** 검색어(검색 이벤트) */
  query: string | null;
  /** 외부 유입 주소 */
  referrer: string | null;
  /** 방문자 ID */
  visitorId: string;
  /** 앱/웹 */
  client: "app" | "web";
  /** 기기 유형 */
  device: string | null;
  /** 브라우저 */
  browser: string | null;
  /** OS */
  os: string | null;
  /** 국가 코드 */
  country: string | null;
  /** 도시 */
  city: string | null;
  /** IP */
  ip: string | null;
}

/** GET logs 응답 */
export interface LogsResponse {
  /** 실제 적용된 기간 */
  range: { from: string; to: string };
  /** 이번 페이지 */
  items: VisitLog[];
  /** 다음 페이지 커서(없으면 null) */
  nextCursor: string | null;
  /** 기간 안 이벤트 목록(첫 페이지에만) */
  events?: { event: string; count: number }[];
}

/** GET visitor 응답 */
export interface VisitorSummary {
  /** 방문자 ID */
  visitorId: string;
  /** 첫 방문(ISO) */
  firstAt: string;
  /** 마지막 방문(ISO) */
  lastAt: string;
  /** 조회수 */
  views: number;
  /** 전체 기록 수 */
  events: number;
  /** 방문한 날 수 */
  activeDays: number;
  /** 앱을 쓴 적 있음 */
  usedApp: boolean;
  /** 웹을 쓴 적 있음 */
  usedWeb: boolean;
  /** 가장 최근 기기 정보 */
  latest: { device: string | null; browser: string | null; os: string | null; country: string | null; city: string | null; ip: string | null } | null;
  /** 자주 본 화면(상위 5) */
  topPaths: { path: string; views: number }[];
}

/** 사이트 활동 한 건 */
export interface ActivityItem {
  /** 종류 키 */
  type: string;
  /** 원래 행 ID */
  id: string;
  /** 시각(ISO) */
  at: string;
  /** 정렬 키 */
  atKey: string;
  /** 제목 */
  title: string;
  /** 부가 설명 */
  detail: string | null;
  /** 한 사람(닉네임) */
  actor: string | null;
  /** 사이트 경로 */
  link: string | null;
}

/** GET activity 응답 */
export interface ActivityResponse {
  /** 이번 페이지 */
  items: ActivityItem[];
  /** 다음 페이지 기준(없으면 null) */
  nextBefore: string | null;
  /** 전체 종류 */
  types: RouteGroupInfo[];
}

/** GET activity/summary 응답 */
export interface ActivitySummaryResponse {
  /** 기간 */
  range: { days: number; from: string; to: string };
  /** 종류별 합계 */
  types: (RouteGroupInfo & { total: number })[];
  /** 날짜별(오래된 순) */
  rows: { date: string; byType: Record<string, number>; total: number }[];
}

/* ───────────── 이벤트 이름 ───────────── */

/** 이벤트 분류(칩 색) */
export type EventTone = "view" | "search" | "action";

/** 이벤트 이름 규칙 하나 */
interface EventRule {
  /** 맞는지 보는 식 */
  test: RegExp;
  /** 우리말 이름 만들기(정규식 매치 결과를 받는다) */
  label: (m: RegExpMatchArray) => string;
  /** 분류 */
  tone: EventTone;
}

/** 테스터 안내 단계 키 → 이름 */
const BETA_STEPS: Record<string, string> = { group: "그룹 가입 누름", optin: "테스터 등록 누름", store: "Play 스토어 누름" };
/** 테스터 안내 팝업 닫는 방법 → 이름 */
const BETA_CLOSE: Record<string, string> = { close: "닫음", hide: "다시 보지 않기", done: "끝까지 진행" };

/** 이벤트 이름 규칙(위에서부터 먼저 맞는 것). 새 이벤트를 기록하기 시작하면 여기에 한 줄 더한다. */
const EVENT_RULES: EventRule[] = [
  { test: /^pageview$/, label: () => "화면 조회", tone: "view" },
  { test: /^search$/, label: () => "전적 검색", tone: "search" },
  {
    test: /^beta_(notice|page)_(group|optin|store)$/,
    label: (m) => `${m[1] === "notice" ? "테스터 안내 팝업" : "테스터 모집 페이지"} · ${BETA_STEPS[m[2]]}`,
    tone: "action",
  },
  { test: /^beta_notice_(close|hide|done)$/, label: (m) => `테스터 안내 팝업 · ${BETA_CLOSE[m[1]]}`, tone: "action" },
  { test: /^notice_show_(.+)$/, label: (m) => `공지 팝업 보임 (${m[1]})`, tone: "action" },
];

/**
 * 이벤트 이름을 관리자가 읽기 쉬운 우리말로 바꾼다. 모르는 이름은 그대로 돌려준다.
 * @param event — 기록된 이벤트 이름
 * @returns 우리말 이름
 */
export function eventLabel(event: string): string {
  for (const r of EVENT_RULES) {
    const m = event.match(r.test);
    if (m) return r.label(m);
  }
  return event;
}

/**
 * 이벤트 분류(칩 색)를 돌려준다.
 * @param event — 기록된 이벤트 이름
 * @returns view | search | action
 */
export function eventTone(event: string): EventTone {
  return EVENT_RULES.find((r) => r.test.test(event))?.tone ?? "action";
}

/* ───────────── 날짜·숫자 표시 ───────────── */

/** KST 와 UTC 의 차이(밀리초) */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
/** 요일 이름(일요일부터) */
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 오늘(한국 시간) 날짜.
 * @param now — 기준 순간(테스트용)
 * @returns 'YYYY-MM-DD'
 */
export function kstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 날짜에 며칠을 더한다(빼려면 음수).
 * @param date — 'YYYY-MM-DD'
 * @param days — 일수
 * @returns 'YYYY-MM-DD'
 */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * 날짜의 요일.
 * @param date — 'YYYY-MM-DD'
 * @returns '월' 등 한 글자
 */
export function weekdayOf(date: string): string {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

/**
 * 토·일인지.
 * @param date — 'YYYY-MM-DD'
 * @returns 주말이면 true
 */
export function isWeekend(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
}

/**
 * 순간을 한국 시간 'MM/DD HH:MM:SS' 로 쓴다.
 * @param iso — ISO 시각
 * @param withYear — 앞에 연도를 붙일지
 * @returns 표시 문자열(잘못된 값이면 원래 값)
 */
export function formatKst(iso: string, withYear = false): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const s = new Date(t + KST_OFFSET_MS).toISOString(); // YYYY-MM-DDTHH:MM:SS.sssZ
  const md = `${s.slice(5, 7)}/${s.slice(8, 10)} ${s.slice(11, 19)}`;
  return withYear ? `${s.slice(0, 4)}/${md}` : md;
}

/**
 * 전날 대비 증감률(%). 전날이 0 이면 비교할 수 없어 null.
 * @param cur — 오늘 값
 * @param prev — 전날 값(없으면 null)
 * @returns 반올림한 퍼센트 또는 null
 */
export function changeRate(cur: number, prev: number | null | undefined): number | null {
  if (prev == null || prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

/**
 * 히트맵 칸 진하기(0~1). 0 이면 0, 값이 있으면 최소 0.12 부터.
 * @param value — 칸 값
 * @param max — 같은 열의 최댓값
 * @returns 불투명도
 */
export function heatAlpha(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.round((0.12 + 0.68 * (value / max)) * 100) / 100;
}

/**
 * 긴 ID 를 앞 8자로 줄인다.
 * @param id — ID
 * @returns 줄인 ID
 */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

/**
 * 유입 주소에서 사이트 이름(호스트)만 꺼낸다.
 * @param url — 유입 주소
 * @returns 호스트(주소가 아니면 원래 값)
 */
export function referrerHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 기기 유형 → 이름 */
const DEVICE_LABELS: Record<string, string> = { desktop: "PC", mobile: "모바일", tablet: "태블릿", bot: "검색 로봇" };

/**
 * 기기 유형 이름.
 * @param device — desktop/mobile/tablet/bot
 * @returns 우리말 이름(모르면 원래 값, 없으면 '-')
 */
export function deviceLabel(device: string | null | undefined): string {
  if (!device) return "-";
  return DEVICE_LABELS[device] ?? device;
}
