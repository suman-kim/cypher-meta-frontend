/**
 * Capacitor 최초 진입 표시를 HttpOnly 쿠키로 저장한다.
 * 루트 레이아웃은 이 쿠키를 SSR에서 읽어 앱 WebView에 광고 스크립트를 내보내지 않는다.
 */
import { NextRequest, NextResponse } from "next/server";

/** Capacitor 앱이 초기 URL에 붙이는 서버 식별 쿼리 이름. */
const NATIVE_APP_QUERY = "cm_native_app";
/** SSR에서 앱 WebView를 구분하는 HttpOnly 쿠키 이름. */
const NATIVE_APP_COOKIE = "cm_native_app";

/**
 * 앱 진입 쿼리를 제거하고 앱 식별 쿠키를 발급한다.
 * @param request 들어온 Next.js 요청
 * @returns 쿼리가 정리된 리다이렉트 또는 다음 미들웨어 응답
 */
export function middleware(request: NextRequest): NextResponse {
  if (request.nextUrl.searchParams.get(NATIVE_APP_QUERY) !== "1") {
    return NextResponse.next();
  }

  const cleanUrl = request.nextUrl.clone();
  cleanUrl.searchParams.delete(NATIVE_APP_QUERY);

  const response = NextResponse.redirect(cleanUrl);
  response.cookies.set(NATIVE_APP_COOKIE, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

/** 앱 셸이 시작 URL에 붙인 표시가 있는 루트 요청만 가로챈다. */
export const config = {
  matcher: ["/"],
};
