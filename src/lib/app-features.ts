/**
 * app-features.ts — 앱(WebView) 화면에서 켜고 끄는 기능 목록.
 *
 * 웹은 그대로 두고 앱에서만 잠시 감추거나 늦게 여는 기능을 한곳에서 관리한다.
 * 화면 코드는 이 값만 보고 분기하므로, 다시 켤 때는 여기 값만 바꾸면 된다.
 */

/** 앱에서 켜고 끄는 기능 묶음 */
export interface AppFeatures {
  /**
   * 커뮤니티·댓글 등 사용자가 쓴 글(UGC) 화면.
   * Google Play 사용자 제작 콘텐츠 정책은 앱 안에 글·사용자 신고, 사용자 차단, 글쓰기 전 약관 동의를 요구한다.
   * 세 기능을 갖추기 전까지 앱에서는 감춘다(웹은 그대로).
   */
  community: boolean;
}

/** 현재 앱 기능 설정 */
export const APP_FEATURES: AppFeatures = {
  community: false,
};
