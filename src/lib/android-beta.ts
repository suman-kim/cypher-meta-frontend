/**
 * android-beta.ts — 안드로이드 앱 비공개 테스트(테스터 모집) 안내의 링크와 노출 규칙.
 *
 * 참여 순서: ① Google 그룹 가입 → ② 테스터 등록(Play 테스트 참여 페이지) → ③ Play 스토어에서 설치.
 * Play 비공개 테스트는 그룹에 속한 계정만 참여할 수 있어서, 그룹은 '웹상의 모든 사용자가 가입 가능'이어야 한다.
 * 정식 출시 뒤에는 enabled 를 false 로 바꾸거나 새 안내로 교체한다.
 */
import type { SiteNotice, SiteNoticeContext } from "./site-notices";

/** 안드로이드 비공개 테스트 정보 */
export const ANDROID_BETA = {
  /** 안내를 켤지 */
  enabled: true,
  /** 앱 패키지 이름 */
  packageName: "pixel.cyphersmeta.app",
  /** ① 테스터 Google 그룹(가입 페이지) */
  groupUrl: "https://groups.google.com/g/pixelstudio-tester",
  /** ② 테스터 등록(테스트 참여) 페이지 */
  optInUrl: "https://play.google.com/apps/testing/pixel.cyphersmeta.app",
  /** ③ Play 스토어 앱 페이지(테스터 등록 뒤 열림) */
  storeUrl: "https://play.google.com/store/apps/details?id=pixel.cyphersmeta.app",
  /** 테스트 앱을 지우지 않고 유지해 달라고 부탁하는 기간(일) — Play 정식 출시 조건 */
  keepDays: 14,
  /** 테스트 의견을 받을 이메일 */
  feedbackEmail: "zzsdsdsd@gmail.com",
  /** 모집 공고 페이지 경로 */
  pagePath: "/android-beta",
} as const;

/** 참여 단계 키(클릭 이벤트 이름에도 쓴다) */
export type BetaStepKey = "group" | "optin" | "store";

/** 참여 단계 하나 */
export interface BetaStep {
  /** 단계 키 */
  key: BetaStepKey;
  /** 단계 제목 */
  title: string;
  /** 무엇을 누르면 되는지 */
  desc: string;
  /** 버튼 글자 */
  cta: string;
  /** 여는 주소(새 탭) */
  href: string;
}

/** 참여 순서 — 안내 모달과 모집 공고 페이지가 함께 쓴다 */
export const ANDROID_BETA_STEPS: BetaStep[] = [
  {
    key: "group",
    title: "테스터 그룹 가입",
    desc: "Google 그룹 페이지에서 '그룹 가입'을 눌러 주세요.",
    cta: "그룹 가입하기",
    href: ANDROID_BETA.groupUrl,
  },
  {
    key: "optin",
    title: "테스터 등록",
    desc: "'테스터 되기'를 눌러 주세요. 그룹 가입이 반영되기까지 몇 분 걸릴 수 있어요.",
    cta: "테스터 등록하기",
    href: ANDROID_BETA.optInUrl,
  },
  {
    key: "store",
    title: "앱 설치",
    desc: "Play 스토어에서 '설치'를 눌러 주세요.",
    cta: "Play 스토어에서 받기",
    href: ANDROID_BETA.storeUrl,
  },
];

/** 앱에서 먼저 써 볼 수 있는 기능(짧은 표시용) */
export const ANDROID_BETA_PERKS = ["전적 갱신 알림", "방송 시작 알림", "앱 전용 화면"];

/** 안내를 띄우지 않는 경로(모집 공고 자체·관리·업데이트 노트·약관 화면) */
const HIDDEN_PREFIXES = ["/android-beta", "/admin", "/updates", "/privacy", "/terms", "/business-info"];

/**
 * iPhone·iPad 인지(안드로이드 앱을 설치할 수 없는 기기).
 * @param userAgent 브라우저 User-Agent
 * @param touchPoints 터치 지점 수 — iPadOS 는 데스크톱(Macintosh) UA 를 쓰므로 함께 본다
 * @returns iOS 기기면 true
 */
export function isAppleMobile(userAgent: string, touchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && touchPoints > 1;
}

/** 테스터 모집 안내 — 웹 방문자 대상(앱 화면은 레이아웃에서 이미 제외), iPhone·iPad 제외 */
export const ANDROID_BETA_NOTICE: SiteNotice = {
  id: "android-beta-2026-11",
  snoozeHours: 72,
  isEligible: (ctx: SiteNoticeContext) =>
    ANDROID_BETA.enabled &&
    !HIDDEN_PREFIXES.some((p) => ctx.pathname.startsWith(p)) &&
    !isAppleMobile(ctx.userAgent, ctx.touchPoints),
};
