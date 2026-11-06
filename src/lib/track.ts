/**
 * track.ts — 화면 동작(버튼 클릭 등)을 방문 기록에 이벤트로 남기는 도우미(클라이언트 전용).
 * AnalyticsTracker 와 같은 /api/track 로 보내며, 관리자 대시보드의 '이벤트별' 집계에 나타난다.
 * 실패해도 화면 동작에는 영향을 주지 않는다.
 */

/**
 * 이벤트 하나를 기록한다.
 * @param event 이벤트 이름(최대 32자, 예: "beta_notice_show")
 * @param path 발생 경로(없으면 현재 주소의 경로)
 */
export function trackEvent(event: string, path?: string): void {
  try {
    const body = JSON.stringify({ path: path ?? window.location.pathname, event: event.slice(0, 32) });
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
