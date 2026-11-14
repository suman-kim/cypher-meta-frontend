/**
 * android-lock.ts — 안드로이드 웹 방문자를 테스터 모집 페이지로만 보내는 규칙. (Edge 미들웨어·테스트 공용, 순수 함수)
 *
 * Play 정식 출시 조건(테스터 12명·14일)을 채우려고, 안드로이드 기기의 웹 브라우저로 들어오면
 * 모집 공고(/android-beta)와 꼭 필요한 화면(약관 등)만 열고 나머지 주소는 모집 공고로 돌려보낸다.
 *
 * 돌려보내지 않는 경우
 *  - 앱(WebView): 테스터가 앱을 써야 하므로 앱 표시 쿠키나 앱 식별 문자열이 있으면 막지 않는다.
 *  - 검색·광고 로봇: 구글 모바일 로봇도 UA 에 Android 가 들어 있다. 막으면 검색 색인·애드센스 판단이 모집 공고만 보게 된다.
 *  - 정적 파일·API·Next 내부 경로: 모집 공고 화면을 그리고 방문 기록을 남기는 데 필요하다.
 *  - 관리자 화면(/admin): 운영자가 안드로이드 휴대폰으로도 관리할 수 있어야 한다.
 *
 * 끄려면 ANDROID_LOCK.enabled 를 false 로 바꾼다(모집 안내 ANDROID_BETA.enabled 가 꺼져도 미들웨어가 함께 끈다).
 * 이 파일은 다른 모듈을 가져오지 않는다 — Edge 미들웨어와 node 단위 테스트(scripts/test-android-lock.ts)가 그대로 읽는다.
 */

/** 안드로이드 잠금 설정 */
export const ANDROID_LOCK = {
  /** 잠금을 켤지 — 모집 안내(ANDROID_BETA.enabled)가 켜져 있을 때만 동작한다 */
  enabled: true,
  /** 돌려보낼 모집 공고 경로 — android-beta.ts 의 ANDROID_BETA.pagePath 와 같은 값 */
  targetPath: "/android-beta",
  /** 돌려보낸 요청임을 모집 공고에 알리는 쿼리 이름(안내 문구를 띄운다) */
  lockedQuery: "locked",
} as const;

/** 안드로이드 브라우저에서도 열어 두는 경로(앞부분 일치) */
const ALLOWED_PREFIXES = [
  ANDROID_LOCK.targetPath, // 모집 공고
  "/privacy", // 개인정보처리방침(모집 공고에서 링크)
  "/terms", // 이용약관
  "/business-info", // 사업자 정보
  "/admin", // 관리자 화면(운영자가 휴대폰으로도 봐야 함, 접근은 관리자 토큰으로 막힘)
  "/api", // 방문 기록·클릭 기록 등 라우트 핸들러
  "/_next", // Next 정적 파일·이미지
];

/** 확장자가 있는 정적 파일(robots.txt, sitemap.xml, ads.txt, 이미지 등)은 그대로 둔다 */
const STATIC_FILE = /\.[a-z0-9]+$/i;

/** 검색엔진·광고·미리보기 로봇 UA 표식 */
const BOT_UA =
  /bot|crawler|spider|crawling|Googlebot|Mediapartners-Google|AdsBot|Google-InspectionTool|Google-Read-Aloud|Lighthouse|Yeti|Daum|facebookexternalhit|kakaotalk-scrap|Slurp/i;

/** 잠금 판단에 쓰는 요청 정보 */
export interface LockRequest {
  /** 요청 경로(쿼리 제외) */
  pathname: string;
  /** User-Agent 헤더 값(없으면 빈 문자열) */
  userAgent: string;
  /** 앱 표시 쿠키(cm_native_app=1)가 있는지 */
  hasAppCookie: boolean;
  /** 앱 식별 문자열(CyphersMetaApp) — app-mode.ts 의 APP_UA_MARK 와 같은 값 */
  appUaMark: string;
  /** 모집 안내가 켜져 있는지(ANDROID_BETA.enabled) — 꺼져 있으면 모집 공고가 404 라 잠그지 않는다 */
  betaEnabled: boolean;
}

/**
 * 안드로이드 웹 방문자를 모집 공고로 돌려보내야 하는지 판단한다.
 * @param req 경로·UA·앱 쿠키 정보
 * @returns 돌려보내야 하면 true
 */
export function shouldLockToBeta(req: LockRequest): boolean {
  if (!ANDROID_LOCK.enabled || !req.betaEnabled) return false;

  const ua = req.userAgent;
  if (!/Android/i.test(ua)) return false; // 안드로이드 기기만
  if (req.hasAppCookie || ua.includes(req.appUaMark)) return false; // 앱 WebView 는 그대로
  if (BOT_UA.test(ua)) return false; // 검색·광고 로봇은 그대로

  const path = req.pathname;
  if (STATIC_FILE.test(path)) return false;
  return !ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
