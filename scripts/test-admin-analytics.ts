/**
 * 관리자 통계·로그 화면 순수 로직 단위 테스트 (브라우저·API 불필요).
 * 실행: node --experimental-strip-types scripts/test-admin-analytics.ts
 *
 * 검증 대상 — src/lib/admin-analytics-core.ts
 *  - eventLabel / eventTone : 기록된 이벤트 이름 → 우리말·분류
 *  - kstToday / addDays / weekdayOf / isWeekend / formatKst : 한국 시간 표시
 *  - changeRate / heatAlpha / shortId / referrerHost / deviceLabel : 숫자·문자 표시
 */
import {
  addDays,
  changeRate,
  deviceLabel,
  eventLabel,
  eventTone,
  formatKst,
  heatAlpha,
  isWeekend,
  kstToday,
  referrerHost,
  shortId,
  weekdayOf,
} from "../src/lib/admin-analytics-core.ts";

/** 통과 수 */
let passed = 0;
/** 실패 수 */
let failed = 0;

/**
 * 검사 1건을 기록한다.
 * @param name 검사 이름
 * @param cond 통과 조건
 * @param detail 실패 시 보일 값
 */
function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`, detail === undefined ? "" : JSON.stringify(detail));
  }
}

console.log("\n[이벤트 이름]");
check("pageview → 화면 조회", eventLabel("pageview") === "화면 조회");
check("search → 전적 검색", eventLabel("search") === "전적 검색");
check("모집 페이지 단계", eventLabel("beta_page_optin") === "테스터 모집 페이지 · 테스터 등록 누름", eventLabel("beta_page_optin"));
check("안내 팝업 단계", eventLabel("beta_notice_store") === "테스터 안내 팝업 · Play 스토어 누름");
check("안내 팝업 닫기", eventLabel("beta_notice_hide") === "테스터 안내 팝업 · 다시 보지 않기");
check("공지 노출(32자로 잘린 이름)", eventLabel("notice_show_android-beta-2026-11") === "공지 팝업 보임 (android-beta-2026-11)");
check("모르는 이름은 그대로", eventLabel("custom_event") === "custom_event");
check("분류: 조회/검색/동작", eventTone("pageview") === "view" && eventTone("search") === "search" && eventTone("beta_page_group") === "action" && eventTone("x") === "action");

console.log("\n[한국 시간]");
check("KST 오늘(UTC 15시 = 다음날)", kstToday(new Date("2026-11-06T15:00:00Z")) === "2026-11-07");
check("KST 오늘(UTC 14:59 = 같은 날)", kstToday(new Date("2026-11-06T14:59:00Z")) === "2026-11-06");
check("addDays 연도 넘김", addDays("2026-12-31", 1) === "2027-01-01");
check("요일: 2026-11-07 = 토", weekdayOf("2026-11-07") === "토");
check("주말 판정", isWeekend("2026-11-08") && !isWeekend("2026-11-09"));
check("formatKst", formatKst("2026-11-06T16:12:10.016Z") === "11/07 01:12:10", formatKst("2026-11-06T16:12:10.016Z"));
check("formatKst 연도 포함", formatKst("2026-11-06T16:12:10.016Z", true) === "2026/11/07 01:12:10");
check("formatKst 잘못된 값은 그대로", formatKst("abc") === "abc");

console.log("\n[숫자·문자 표시]");
check("증감률 +50%", changeRate(15, 10) === 50);
check("증감률 -100%", changeRate(0, 10) === -100);
check("전날 0 → 비교 불가", changeRate(5, 0) === null && changeRate(5, null) === null);
check("히트맵 0 → 투명", heatAlpha(0, 10) === 0);
check("히트맵 최대 → 0.8", heatAlpha(10, 10) === 0.8);
check("히트맵 작은 값도 보임", heatAlpha(1, 1000) >= 0.12);
check("shortId", shortId("189e0d24-b207-4136") === "189e0d24" && shortId("unknown") === "unknown");
check("유입 호스트(www 제거)", referrerHost("https://www.google.com/search?q=x") === "google.com");
check("유입 주소 아님 → 그대로", referrerHost("not a url") === "not a url");
check("기기 이름", deviceLabel("desktop") === "PC" && deviceLabel("bot") === "검색 로봇" && deviceLabel(null) === "-");

console.log(`\n결과: ${passed} 통과 / ${failed} 실패`);
if (failed > 0) process.exit(1);
