/**
 * app-features.ts — 앱(WebView) 화면에서 켜고 끄는 기능 목록.
 *
 * 웹은 그대로 두고 앱에서만 잠시 감추거나 늦게 여는 기능을 한곳에서 관리한다.
 * 화면 코드는 이 값만 보고 분기하므로, 다시 켤 때는 여기 값만 바꾸면 된다.
 */

/** 앱에서 켜고 끄는 기능 묶음 */
export interface AppFeatures {
  /**
   * 커뮤니티 게시판·업데이트 댓글 등 사용자가 쓴 글(UGC) 화면.
   * Google Play 사용자 제작 콘텐츠 정책이 요구하는 글·사용자 신고(ModerationSheet → content_reports),
   * 사용자 차단(기기 저장), 글쓰기 전 운영 정책 동의(TermsAgree)를 갖춰 2026-11-07 에 켰다.
   */
  community: boolean;
  /**
   * 코스튬 시세·수정 제보 목록. 다른 사람에게 공개되는 사용자 글이지만 아직 신고·차단이 붙어 있지 않아
   * 앱에서는 감춘다(웹은 그대로). 붙이려면 백엔드 moderation 에 ReportTarget 을 하나 추가하고 이 값을 켠다.
   */
  costumeFeedback: boolean;
}

/** 현재 앱 기능 설정 */
export const APP_FEATURES: AppFeatures = {
  community: true,
  costumeFeedback: false,
};
