/**
 * moderation-core.ts — 신고·차단·운영 정책 동의의 순수 로직(브라우저·React 의존 없음).
 * scripts/test-moderation.ts 가 이 파일을 직접 검증한다(다른 로컬 모듈을 import 하지 않는다 — node strip-types 실행용).
 *
 *  - 신고 사유 목록(백엔드 REPORT_REASONS 와 같은 키)
 *  - 차단 목록: 닉네임 정규화, 저장값 해석, 추가·삭제, 차단 여부
 */

/** 운영 정책을 보여 줄 주소(이용약관의 커뮤니티 운영 정책 절) */
export const COMMUNITY_POLICY_HREF = "/terms#community-policy";
/** 차단한 작성자 관리 화면 주소 */
export const BLOCKED_PAGE_HREF = "/community/blocked";

/** 신고 대상 종류 — 백엔드 moderation/report-logic.ts 의 REPORT_TARGET_TYPES 와 같다 */
export type ReportTargetType = "post" | "comment" | "update_comment";

/** 신고 사유 키 — 백엔드 REPORT_REASONS 와 같다 */
export type ReportReasonKey = "spam" | "abuse" | "sexual" | "illegal" | "privacy" | "other";

/** 신고 사유 하나(화면 표시용) */
export interface ReportReason {
  /** 서버로 보내는 키 */
  key: ReportReasonKey;
  /** 버튼 이름 */
  label: string;
  /** 짧은 설명 */
  desc: string;
}

/** 신고 사유 목록(화면 순서) */
export const REPORT_REASONS: ReportReason[] = [
  { key: "abuse", label: "욕설·비방", desc: "욕설, 인신공격, 혐오 표현" },
  { key: "spam", label: "스팸·광고", desc: "도배, 홍보, 사기성 링크" },
  { key: "sexual", label: "음란물", desc: "선정적이거나 성적인 내용" },
  { key: "illegal", label: "불법 정보", desc: "불법 거래, 계정 거래, 핵·매크로" },
  { key: "privacy", label: "개인정보 노출", desc: "다른 사람의 연락처·실명·사진 등" },
  { key: "other", label: "기타", desc: "위에 없는 문제 — 아래에 내용을 적어 주세요" },
];

/** 상세 설명 최대 글자 수(백엔드 DTO 와 같다) */
export const REPORT_DETAIL_MAX = 500;

/** 차단한 작성자 1명 */
export interface BlockedAuthor {
  /** 화면에 보일 닉네임(차단할 때 그대로) */
  name: string;
  /** 차단한 시각(ISO) */
  at: string;
}

/** 차단 목록 최대 인원 — 저장 공간을 넘기지 않게(넘으면 오래된 것부터 뺀다) */
export const MAX_BLOCKED = 200;

/**
 * 비교용 닉네임 — 앞뒤 공백을 지우고 영문은 소문자로.
 * @param name — 닉네임(없으면 빈 문자열)
 * @returns 비교 키(빈 문자열이면 차단 대상 아님)
 */
export function authorKey(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

/**
 * 저장된 문자열을 차단 목록으로 바꾼다. 깨진 값·잘못된 항목은 버린다.
 * @param raw — localStorage 에 저장된 JSON(없으면 null)
 * @returns 차단 목록(최근 차단 먼저)
 */
export function parseBlocked(raw: string | null): BlockedAuthor[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    const out: BlockedAuthor[] = [];
    for (const item of data) {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const key = authorKey(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ name, at: typeof item?.at === "string" ? item.at : new Date(0).toISOString() });
    }
    return out.slice(0, MAX_BLOCKED);
  } catch {
    return [];
  }
}

/**
 * 차단 목록에 작성자를 넣는다(이미 있으면 맨 앞으로 옮긴다).
 * @param list — 지금 목록
 * @param name — 차단할 닉네임
 * @param now — 차단 시각(ISO)
 * @returns 새 목록(원래 배열은 그대로)
 */
export function addBlocked(list: BlockedAuthor[], name: string, now: string): BlockedAuthor[] {
  const key = authorKey(name);
  if (!key) return list;
  const rest = list.filter((b) => authorKey(b.name) !== key);
  return [{ name: name.trim(), at: now }, ...rest].slice(0, MAX_BLOCKED);
}

/**
 * 차단 목록에서 작성자를 뺀다.
 * @param list — 지금 목록
 * @param name — 차단을 풀 닉네임
 * @returns 새 목록
 */
export function removeBlocked(list: BlockedAuthor[], name: string): BlockedAuthor[] {
  const key = authorKey(name);
  return list.filter((b) => authorKey(b.name) !== key);
}

/**
 * 작성자가 차단 목록에 있는지.
 * @param list — 차단 목록
 * @param name — 확인할 닉네임(없으면 false)
 * @returns 차단했으면 true
 */
export function isBlockedIn(list: BlockedAuthor[], name: string | null | undefined): boolean {
  const key = authorKey(name);
  if (!key) return false;
  return list.some((b) => authorKey(b.name) === key);
}

/**
 * 신고·차단 메뉴를 보여 줄 수 있는 작성자인지 — 닉네임이 없거나 운영진(공지) 글이면 보이지 않는다.
 * @param name — 작성자 닉네임
 * @param isNotice — 공지 글이면 true
 * @returns 보여 줄 수 있으면 true
 */
export function canModerate(name: string | null | undefined, isNotice = false): boolean {
  return !isNotice && authorKey(name) !== "";
}

/** 커뮤니티에 올리면 안 되는 글(운영 정책 요약 — 글쓰기 동의 칸과 이용약관이 함께 쓴다) */
export const COMMUNITY_RULES: string[] = [
  "욕설·비방·혐오 표현, 다른 이용자를 괴롭히는 글",
  "음란하거나 선정적인 내용",
  "광고·홍보·도배, 사기성 링크",
  "불법 정보(계정·아이템 현금 거래, 핵·매크로 등)",
  "다른 사람의 개인정보(실명·연락처·사진 등)를 올리는 글",
];

/** 신고된 글을 어떻게 처리하는지(운영 정책 요약) */
export const COMMUNITY_ENFORCEMENT =
  "신고된 글은 운영진이 24시간 안에 확인하고, 정책에 어긋나면 따로 알리지 않고 지워요. 같은 일이 반복되면 그 닉네임으로 글을 쓸 수 없게 돼요.";
