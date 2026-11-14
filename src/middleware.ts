/**
 * 요청 앞단 처리 두 가지.
 *
 * 1) 앱 표시 쿠키 — Capacitor 최초 진입 표시를 HttpOnly 쿠키로 저장한다.
 *    루트 레이아웃과 각 페이지는 이 쿠키를 SSR에서 읽어(lib/app-mode.ts) 앱 WebView에는 앱 화면을 그리고
 *    광고 스크립트를 내보내지 않는다.
 *    - `/?cm_native_app=1` : 앱 표시 쿠키 발급 (앱 셸 시작 주소)
 *    - `/?cm_native_app=0` : 앱 표시 쿠키 삭제 (브라우저로 앱 화면을 미리 본 뒤 웹 화면으로 돌아갈 때)
 *
 * 2) 안드로이드 잠금 — 안드로이드 기기의 웹 브라우저는 테스터 모집 공고(/android-beta)만 열어 둔다.
 *    다른 주소로 들어오면 모집 공고로 돌려보낸다. 앱·로봇·약관·정적 파일 예외는 lib/android-lock.ts 참고.
 */
import { NextRequest, NextResponse } from "next/server";
import { ANDROID_BETA } from "@/lib/android-beta";
import { ANDROID_LOCK, shouldLockToBeta } from "@/lib/android-lock";

/** Capacitor 앱이 초기 URL에 붙이는 서버 식별 쿼리 이름. */
const NATIVE_APP_QUERY = "cm_native_app";
/** SSR에서 앱 WebView를 구분하는 HttpOnly 쿠키 이름 (lib/app-mode.ts 의 APP_COOKIE 와 같은 값). */
const NATIVE_APP_COOKIE = "cm_native_app";
/** 앱 셸이 User-Agent 끝에 붙이는 식별 문자열 (lib/app-mode.ts 의 APP_UA_MARK 와 같은 값). */
const APP_UA_MARK = "CyphersMetaApp";

/**
 * 앱 진입 쿼리를 쿠키로 바꾸고, 안드로이드 웹 방문자는 모집 공고로 돌려보낸다.
 * @param request 들어온 Next.js 요청
 * @returns 리다이렉트 또는 다음 처리로 넘기는 응답
 */
export function middleware(request: NextRequest): NextResponse {
  const flag = request.nextUrl.searchParams.get(NATIVE_APP_QUERY);
  if (request.nextUrl.pathname === "/" && (flag === "1" || flag === "0")) {
    return handleNativeAppFlag(request, flag);
  }

  const locked = shouldLockToBeta({
    pathname: request.nextUrl.pathname,
    userAgent: request.headers.get("user-agent") ?? "",
    hasAppCookie: request.cookies.get(NATIVE_APP_COOKIE)?.value === "1",
    appUaMark: APP_UA_MARK,
    betaEnabled: ANDROID_BETA.enabled,
  });
  if (locked) {
    const target = request.nextUrl.clone();
    target.pathname = ANDROID_LOCK.targetPath;
    target.search = "";
    target.hash = "";
    target.searchParams.set(ANDROID_LOCK.lockedQuery, "1");
    // 307: 임시 이동 — 브라우저·중간 캐시가 이 이동을 기억하지 않게 한다(잠금을 풀면 바로 원래대로).
    const response = NextResponse.redirect(target, 307);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  return NextResponse.next();
}

/**
 * 앱 진입 쿼리를 제거하고 앱 식별 쿠키를 발급하거나 지운다.
 * @param request 들어온 Next.js 요청
 * @param flag "1"이면 쿠키 발급, "0"이면 쿠키 삭제
 * @returns 쿼리가 정리된 주소로 보내는 리다이렉트
 */
function handleNativeAppFlag(request: NextRequest, flag: "1" | "0"): NextResponse {
  const cleanUrl = request.nextUrl.clone();
  cleanUrl.searchParams.delete(NATIVE_APP_QUERY);
  const response = NextResponse.redirect(cleanUrl);

  if (flag === "0") {
    response.cookies.delete(NATIVE_APP_COOKIE);
    return response;
  }

  response.cookies.set(NATIVE_APP_COOKIE, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

/**
 * 페이지 요청 전체를 가로챈다. Next 정적 파일·이미지 최적화·파비콘은 미들웨어를 거치지 않게 뺀다.
 * (그 밖의 정적 파일·API 예외는 shouldLockToBeta 안에서 거른다)
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
