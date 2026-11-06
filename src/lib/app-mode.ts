/**
 * app-mode.ts — 지금 요청이 앱(Capacitor WebView)에서 왔는지 서버에서 판단한다. (서버 전용)
 *
 * 같은 주소를 웹과 앱이 함께 쓰고, 화면 모양만 이 판단으로 갈라 그린다.
 *  1) 앱 표시 쿠키: 앱 셸이 시작 주소에 `?cm_native_app=1` 을 붙이면 미들웨어가 1년짜리 HttpOnly 쿠키로 바꿔 둔다.
 *  2) 앱 식별 문자열: 앱 셸이 웹뷰 User-Agent 끝에 `CyphersMetaApp/<버전>` 을 붙인다(capacitor.config 의 appendUserAgent).
 *     쿠키가 없는 첫 요청이나 딥링크로 바로 들어온 경우에도 앱으로 알아본다.
 * 둘 중 하나만 있어도 앱으로 본다. 업데이트하지 않은 예전 설치본은 쿠키로 계속 인식된다.
 */
import { cookies, headers } from "next/headers";

/** 앱 표시 쿠키 이름 (미들웨어가 발급) */
export const APP_COOKIE = "cm_native_app";
/** 앱 셸이 User-Agent 끝에 붙이는 식별 문자열 */
export const APP_UA_MARK = "CyphersMetaApp";

/**
 * 현재 요청이 앱 화면으로 그려야 하는 요청인지 돌려준다.
 * 쿠키·헤더를 읽으므로 이 함수를 부르는 페이지는 요청 시점 렌더(동적)가 된다.
 * @returns 앱 WebView 요청이면 true
 */
export function isAppRequest(): boolean {
  if (cookies().get(APP_COOKIE)?.value === "1") return true;
  const ua = headers().get("user-agent") ?? "";
  return ua.includes(APP_UA_MARK);
}
