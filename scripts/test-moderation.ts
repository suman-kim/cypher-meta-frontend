/**
 * 신고·차단 순수 로직 단위 테스트 (브라우저·API 불필요).
 * 실행: node --experimental-strip-types scripts/test-moderation.ts
 *
 * 검증 대상 — src/lib/moderation-core.ts
 *  - authorKey / parseBlocked / addBlocked / removeBlocked / isBlockedIn : 기기 차단 목록
 *  - canModerate : 신고·차단 메뉴 노출 조건
 *  - REPORT_REASONS : 백엔드 사유 키와 같은지
 */
import {
  addBlocked,
  authorKey,
  canModerate,
  COMMUNITY_RULES,
  isBlockedIn,
  MAX_BLOCKED,
  parseBlocked,
  removeBlocked,
  REPORT_REASONS,
} from "../src/lib/moderation-core.ts";
import type { BlockedAuthor } from "../src/lib/moderation-core.ts";

/** 통과 수 */
let passed = 0;
/** 실패 수 */
let failed = 0;

/**
 * 검사 1건을 기록한다.
 * @param name 검사 이름
 * @param cond 통과 조건
 */
function assert(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

const T = "2026-11-07T00:00:00.000Z";

console.log("\n[authorKey]");
assert("앞뒤 공백 제거", authorKey("  사이퍼  ") === "사이퍼");
assert("영문 소문자", authorKey("Cypher") === "cypher");
assert("null → 빈 문자열", authorKey(null) === "");

console.log("\n[parseBlocked]");
assert("없으면 빈 목록", parseBlocked(null).length === 0);
assert("깨진 JSON → 빈 목록", parseBlocked("{oops").length === 0);
assert("배열이 아니면 빈 목록", parseBlocked('{"name":"a"}').length === 0);
const parsed = parseBlocked(JSON.stringify([{ name: "가", at: T }, { name: " 가 " }, { name: "" }, { foo: 1 }, { name: "Nick", at: T }]));
assert("빈·잘못된 항목과 중복 제거", parsed.length === 2 && parsed[0].name === "가" && parsed[1].name === "Nick");
assert("시각 없으면 기본값", typeof parseBlocked(JSON.stringify([{ name: "x" }]))[0].at === "string");
assert(
  `최대 ${MAX_BLOCKED}명`,
  parseBlocked(JSON.stringify(Array.from({ length: MAX_BLOCKED + 10 }, (_, i) => ({ name: `n${i}`, at: T })))).length === MAX_BLOCKED,
);

console.log("\n[addBlocked / removeBlocked / isBlockedIn]");
let list: BlockedAuthor[] = [];
list = addBlocked(list, "도배러", T);
list = addBlocked(list, "Spam", T);
assert("추가하면 맨 앞", list[0].name === "Spam" && list.length === 2);
const again = addBlocked(list, "도배러", "2026-11-08T00:00:00.000Z");
assert("다시 차단하면 맨 앞으로, 중복 없음", again.length === 2 && again[0].name === "도배러");
assert("원래 배열은 그대로", list[0].name === "Spam");
assert("빈 닉네임은 추가하지 않음", addBlocked(list, "  ", T) === list);
assert("차단 여부(대소문자·공백 무시)", isBlockedIn(list, " spam ") && isBlockedIn(list, "도배러"));
assert("차단 안 한 닉네임", !isBlockedIn(list, "사이퍼"));
assert("닉네임 없으면 false", !isBlockedIn(list, null));
const removed = removeBlocked(list, "SPAM");
assert("차단 풀기(대소문자 무시)", removed.length === 1 && !isBlockedIn(removed, "Spam"));

console.log("\n[canModerate]");
assert("일반 글 작성자", canModerate("사이퍼"));
assert("공지는 제외", !canModerate("운영진", true));
assert("닉네임 없으면 제외", !canModerate(null) && !canModerate("  "));

console.log("\n[REPORT_REASONS · 정책]");
assert(
  "백엔드 사유 키와 같음",
  JSON.stringify(REPORT_REASONS.map((r) => r.key).sort()) === JSON.stringify(["abuse", "illegal", "other", "privacy", "sexual", "spam"]),
);
assert("금지 내용 5가지", COMMUNITY_RULES.length === 5);

console.log(`\n결과: ${passed} 통과 / ${failed} 실패`);
if (failed > 0) process.exit(1);
