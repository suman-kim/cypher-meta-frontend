/**
 * 접속 안내 모달 규칙 단위 테스트 (브라우저·API 불필요).
 * 실행: node --experimental-strip-types scripts/test-notices.ts
 *
 * 검증 대상
 *  - site-notices.ts : 노출 기간, 닫은 기록(닫기·다시 보지 않기), 안내 고르기(앞쪽 우선), 접속 팝업 차례
 *  - android-beta.ts : 테스터 모집 안내 대상(경로·iPhone/iPad 제외)
 */
import {
  finishNoticeTurn,
  isNoticeTurnDone,
  isSuppressed,
  isWithinPeriod,
  pickNotice,
  subscribeNoticeTurn,
} from "../src/lib/site-notices.ts";
import type { NoticeRecord, SiteNotice, SiteNoticeContext } from "../src/lib/site-notices.ts";
import { ANDROID_BETA_NOTICE, isAppleMobile } from "../src/lib/android-beta.ts";

let passed = 0;
let failed = 0;

/**
 * 검사 1건을 기록한다.
 * @param name 검사 이름
 * @param cond 통과 조건
 */
function assert(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

const NOW = Date.parse("2026-11-07T12:00:00+09:00");
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36";
const WINDOWS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36";
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1";
const MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/19.0 Safari/605.1.15";

/**
 * 방문 정보를 만든다.
 * @param over 덮어쓸 값
 * @returns 방문 정보
 */
function ctx(over: Partial<SiteNoticeContext> = {}): SiteNoticeContext {
  return { pathname: "/", userAgent: ANDROID_UA, touchPoints: 5, now: NOW, ...over };
}

/**
 * 시험용 안내를 만든다.
 * @param id 안내 ID
 * @param over 덮어쓸 값
 * @returns 안내
 */
function notice(id: string, over: Partial<SiteNotice> = {}): SiteNotice {
  return { id, snoozeHours: 72, isEligible: () => true, ...over };
}

console.log("▶ 노출 기간");
{
  assert("기간 없음 → 노출", isWithinPeriod(notice("a"), NOW));
  assert("시작 전 → 숨김", !isWithinPeriod(notice("a", { startsAt: "2026-11-08T00:00:00+09:00" }), NOW));
  assert("종료 뒤 → 숨김", !isWithinPeriod(notice("a", { endsAt: "2026-11-01T00:00:00+09:00" }), NOW));
  assert("잘못된 날짜는 조건 없음", isWithinPeriod(notice("a", { startsAt: "언젠가" }), NOW));
}

console.log("▶ 닫은 기록");
{
  assert("기록 없음 → 보임", !isSuppressed(null, NOW));
  assert("다시 보지 않기 → 숨김", isSuppressed({ hidden: true }, NOW));
  assert("닫기 기간 안 → 숨김", isSuppressed({ until: NOW + 1000 }, NOW));
  assert("닫기 기간 지남 → 보임", !isSuppressed({ until: NOW - 1 }, NOW));
}

console.log("▶ 안내 고르기");
{
  const records: Record<string, NoticeRecord> = { b: { hidden: true } };
  const get = (id: string) => records[id] ?? null;
  const list = [notice("b"), notice("c", { isEligible: () => false }), notice("d"), notice("e")];
  assert("닫은 것·대상 아닌 것 건너뛰고 앞쪽 하나", pickNotice(list, ctx(), get)?.id === "d");
  assert("해당 없으면 null", pickNotice([notice("b")], ctx(), get) === null);
}

console.log("▶ 테스터 모집 안내 대상");
{
  const ok = (c: SiteNoticeContext) => ANDROID_BETA_NOTICE.isEligible(c);
  assert("안드로이드 홈 → 대상", ok(ctx()));
  assert("PC → 대상(웹에서 등록 후 휴대폰 설치)", ok(ctx({ userAgent: WINDOWS_UA, touchPoints: 0 })));
  assert("iPhone → 제외", !ok(ctx({ userAgent: IPHONE_UA })));
  assert("iPad(데스크톱 UA + 터치) → 제외", !ok(ctx({ userAgent: MAC_UA, touchPoints: 5 })));
  assert("Mac(터치 없음) → 대상", ok(ctx({ userAgent: MAC_UA, touchPoints: 0 })));
  assert("관리자 화면 → 제외", !ok(ctx({ pathname: "/admin/visits" })));
  assert("개인정보처리방침 → 제외", !ok(ctx({ pathname: "/privacy" })));
  assert("모집 공고 페이지 → 제외(이미 보고 있음)", !ok(ctx({ pathname: "/android-beta" })));
  assert("isAppleMobile(iPhone)", isAppleMobile(IPHONE_UA, 5));
}

console.log("▶ 접속 팝업 차례(접속 안내 → 새 업데이트)");
{
  let calls = 0;
  const off = subscribeNoticeTurn(() => calls++);
  assert("처음엔 안 끝남(업데이트 팝업 대기)", !isNoticeTurnDone());
  finishNoticeTurn();
  finishNoticeTurn();
  assert("끝내면 true", isNoticeTurnDone());
  assert("리스너는 한 번만", calls === 1);
  off();
}

console.log(`\n결과: ${passed} 통과, ${failed} 실패`);
if (failed > 0) process.exit(1);
