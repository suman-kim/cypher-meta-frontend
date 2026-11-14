/**
 * 안드로이드 잠금 규칙 단위 테스트 (브라우저·API 불필요).
 * 실행: node --experimental-strip-types scripts/test-android-lock.ts
 *
 * 검증 대상
 *  - android-lock.ts : 안드로이드 웹 방문자만 모집 공고로 보내고, 앱·로봇·iPhone·PC·허용 경로·정적 파일은 그대로 둔다.
 */
import { shouldLockToBeta } from "../src/lib/android-lock.ts";
import type { LockRequest } from "../src/lib/android-lock.ts";

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
  } else {
    failed++;
    console.error(`  실패: ${name}`);
  }
}

/** 안드로이드 크롬 UA */
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
/** 앱 WebView UA (끝에 앱 식별 문자열) */
const ANDROID_APP = `${ANDROID_CHROME.replace("Mobile Safari", "Mobile Safari wv")} CyphersMetaApp/1.0.0`;
/** 구글 모바일 검색 로봇 UA */
const GOOGLEBOT_MOBILE =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
/** 애드센스 로봇(모바일) UA */
const ADSENSE_MOBILE =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Mediapartners-Google";
/** 네이버 검색 로봇 UA */
const NAVER_BOT = "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (compatible; Yeti/1.1; +https://naver.me/spd)";
/** 아이폰 사파리 UA */
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
/** PC 크롬 UA */
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

/**
 * 판단 요청을 만든다(기본: 안드로이드 크롬, 쿠키 없음, 모집 안내 켜짐).
 * @param over 바꿀 값
 * @returns 판단 요청
 */
function req(over: Partial<LockRequest>): LockRequest {
  return {
    pathname: "/",
    userAgent: ANDROID_CHROME,
    hasAppCookie: false,
    appUaMark: "CyphersMetaApp",
    betaEnabled: true,
    ...over,
  };
}

console.log("안드로이드 잠금 규칙");

// 막아야 하는 경우
for (const path of ["/", "/players/abc", "/meta", "/ranking", "/search", "/android-betax", "/admin"]) {
  assert(`안드로이드 브라우저 ${path} → 잠금`, shouldLockToBeta(req({ pathname: path })));
}

// 열어 두는 경로
for (const path of ["/android-beta", "/privacy", "/terms", "/business-info", "/api/track", "/_next/data/x.json"]) {
  assert(`안드로이드 브라우저 ${path} → 통과`, !shouldLockToBeta(req({ pathname: path })));
}
for (const path of ["/robots.txt", "/sitemap.xml", "/ads.txt", "/icon.svg", "/opengraph-image.png"]) {
  assert(`정적 파일 ${path} → 통과`, !shouldLockToBeta(req({ pathname: path })));
}

// 앱은 막지 않는다
assert("앱 쿠키 → 통과", !shouldLockToBeta(req({ hasAppCookie: true })));
assert("앱 UA → 통과", !shouldLockToBeta(req({ userAgent: ANDROID_APP })));

// 로봇은 막지 않는다
assert("구글 모바일 로봇 → 통과", !shouldLockToBeta(req({ userAgent: GOOGLEBOT_MOBILE })));
assert("애드센스 로봇 → 통과", !shouldLockToBeta(req({ userAgent: ADSENSE_MOBILE })));
assert("네이버 로봇 → 통과", !shouldLockToBeta(req({ userAgent: NAVER_BOT })));

// 안드로이드가 아니면 막지 않는다
assert("아이폰 → 통과", !shouldLockToBeta(req({ userAgent: IPHONE })));
assert("PC → 통과", !shouldLockToBeta(req({ userAgent: DESKTOP })));
assert("UA 없음 → 통과", !shouldLockToBeta(req({ userAgent: "" })));

// 모집 안내가 꺼지면 잠금도 꺼진다
assert("모집 안내 꺼짐 → 통과", !shouldLockToBeta(req({ betaEnabled: false })));

console.log(`\n통과 ${passed} / 실패 ${failed}`);
if (failed > 0) process.exit(1);
