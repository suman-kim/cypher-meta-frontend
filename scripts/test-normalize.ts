/**
 * normalize.ts 단위 테스트 (API 불필요).
 * 실행: node --experimental-strip-types scripts/test-normalize.ts
 *
 * flat / nested 두 형태의 원시 응답이 모두 동일한 뷰 모델로 정규화되는지 검증합니다.
 */
import {
  normalizeMatchDetail,
  normalizePlayerMatches,
  normalizePlayerDetail,
  normalizeRatingRanking,
  normalizeCharacterRanking,
  normalizeTsjRanking,
} from "../src/lib/normalize.ts";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

console.log("▶ 플레이어 매치 — nested ({ matches: { rows: [{ playInfo }] } })");
{
  const r = normalizePlayerMatches({
    matches: {
      gameTypeId: "rating",
      rows: [
        { matchId: "m1", date: "2026-01-01 10:00:00", playInfo: { characterId: "c1", characterName: "다오", result: "win", killCount: 5, deathCount: 2, assistCount: 3 } },
      ],
    },
  });
  assert("matchId 추출", r.matches.rows[0].matchId === "m1");
  assert("playInfo.killCount", r.matches.rows[0].playInfo.killCount === 5);
  assert("characterName", r.matches.rows[0].playInfo.characterName === "다오");
  assert("gameTypeId 보존", r.matches.gameTypeId === "rating");
}

console.log("▶ 플레이어 매치 — flat ({ matches: [{ ...stats }] })");
{
  const r = normalizePlayerMatches({
    matches: [
      { matchId: "m2", date: "2026-01-02 10:00:00", characterId: "c2", characterName: "레베카", result: "lose", killCount: 3 },
    ],
  });
  assert("matchId 추출", r.matches.rows[0].matchId === "m2");
  assert("flat → playInfo.killCount", r.matches.rows[0].playInfo.killCount === 3);
  assert("flat → characterName", r.matches.rows[0].playInfo.characterName === "레베카");
}

console.log("▶ 평점 랭킹 — nested ({ rows: [{ player }] })");
{
  const r = normalizeRatingRanking({
    rows: [{ ranking: 1, player: { playerId: "p1", nickname: "홍길동" }, ratingPoint: 3000, tierName: "ACE" }],
  });
  assert("player.nickname", r.rows[0].player.nickname === "홍길동");
  assert("ratingPoint", r.rows[0].ratingPoint === 3000);
  assert("ranking", r.rows[0].ranking === 1);
}

console.log("▶ 평점 랭킹 — flat ({ rows: [{ playerId, nickname }] })");
{
  const r = normalizeRatingRanking({
    rows: [{ playerId: "p2", nickname: "김철수", ratingPoint: 2500 }],
  });
  assert("flat → player.playerId", r.rows[0].player.playerId === "p2");
  assert("flat → player.nickname", r.rows[0].player.nickname === "김철수");
  assert("ranking 미존재 시 인덱스+1", r.rows[0].ranking === 1);
}

console.log("▶ 매치 상세 — nested playInfo & flat player 혼용");
{
  const nested = normalizeMatchDetail({
    matchId: "x1",
    gameTypeId: "rating",
    teams: [
      { result: "win", players: [{ playerId: "p", nickname: "n", playInfo: { characterId: "c", characterName: "cn", result: "win", killCount: 7 }, items: [{ itemId: "i1", itemName: "칼" }] }] },
    ],
  });
  assert("nested → playInfo.killCount", nested.teams[0].players[0].playInfo.killCount === 7);
  assert("items 개수", nested.teams[0].players[0].items?.length === 1);

  const flat = normalizeMatchDetail({
    matchId: "x2",
    teams: [
      { result: "lose", players: [{ playerId: "p", nickname: "n", characterId: "c", characterName: "cn", result: "lose", killCount: 9 }] },
    ],
  });
  assert("flat → playInfo.killCount", flat.teams[0].players[0].playInfo.killCount === 9);
  assert("팀 결과 보존", flat.teams[0].result === "lose");
}

console.log("▶ 캐릭터/결투장 랭킹 — 방어적 처리");
{
  const cr = normalizeCharacterRanking({ rows: [{ playerId: "p", nickname: "n", winCount: 10, loseCount: 2 }] });
  assert("캐릭터랭킹 flat player", cr.rows[0].player.nickname === "n" && cr.rows[0].winCount === 10);
  const tsj = normalizeTsjRanking({ rows: [{ ranking: 3, player: { playerId: "p", nickname: "n" }, score: 1500 }] });
  assert("결투장 score", tsj.rows[0].score === 1500 && tsj.rows[0].ranking === 3);
  const empty = normalizeRatingRanking(null);
  assert("null 입력 → 빈 rows", Array.isArray(empty.rows) && empty.rows.length === 0);
}

console.log("▶ 실제 스키마 — 매치 목록 (matches 가 루트 flat 배열)");
{
  const r = normalizePlayerMatches({
    date: "2026-07-23",
    gameTypeId: "normal",
    matches: [
      { matchId: "n1", playTime: 1543, result: "win", playTypeName: "일반전", characterId: "c", characterName: "듀블", killCount: 7, deathCount: 3, assistCount: 12 },
    ],
  });
  assert("루트 gameTypeId 보존(normal)", r.matches.gameTypeId === "normal");
  assert("flat matches → rows", r.matches.rows.length === 1 && r.matches.rows[0].playInfo.characterName === "듀블");
  assert("playTypeName 보존", r.matches.rows[0].playInfo.playTypeName === "일반전");
}

console.log("▶ 실제 응답 — 매치 상세 (teams.players=ID문자열 + 최상위 players[])");
{
  const r = normalizeMatchDetail({
    date: "2026-07-22 20:26",
    gameTypeId: "rating",
    map: { mapId: "102", name: "메트로폴리스" },
    teams: [
      { result: "win", players: ["A", "B"] },
      { result: "lose", players: ["C"] },
    ],
    players: [
      { playerId: "A", nickname: "윤슬", playInfo: { characterId: "c1", characterName: "트릭시", killCount: 7, deathCount: 13, assistCount: 8, aceInfo: null }, items: [{ itemId: "i1", itemName: "네이팜", rarityCode: "104" }], itemPurchase: ["i1", "i1", "i2"] },
      { playerId: "B", nickname: "시눈", playInfo: { characterId: "c2", characterName: "트리비아", killCount: 15, deathCount: 4, assistCount: 9, aceInfo: { code: 102, name: "ACE" } }, items: [] },
      { playerId: "C", nickname: "이갸릉", playInfo: { characterId: "c3", characterName: "루이스", killCount: 3, deathCount: 8, assistCount: 3 }, items: [] },
    ],
  });
  assert("팀 2개", r.teams.length === 2);
  assert("map 보존", r.map?.name === "메트로폴리스");
  assert("승리팀 2명 (ID→상세 연결)", r.teams[0].players.length === 2);
  assert("닉네임 연결", r.teams[0].players[0].nickname === "윤슬");
  assert("nested playInfo 연결", r.teams[0].players[0].playInfo.characterName === "트릭시" && r.teams[0].players[0].playInfo.killCount === 7);
  assert("아이템 연결", r.teams[0].players[0].items?.length === 1);
  assert("구매 순서 연결", r.teams[0].players[0].itemPurchase?.length === 3);
  assert("ACE 정보 보존", r.teams[0].players[1].playInfo.aceInfo?.name === "ACE");
  assert("player 승패=팀 결과 보강", r.teams[0].players[0].playInfo.result === "win");
  assert("패배팀 연결", r.teams[1].players[0].playInfo.characterName === "루이스" && r.teams[1].result === "lose");
}

console.log("▶ 실제 스키마 — 플레이어 상세 (flat win/lose → rating 전적 합성)");
{
  const r = normalizePlayerDetail({ playerId: "p", nickname: "홍길동", grade: 1, tierName: "ACE", rp: 3200, win: 120, lose: 80, stop: 3 });
  assert("tierName", r.tierName === "ACE");
  assert("ratingPoint = rp", r.ratingPoint === 3200);
  assert("records 합성(rating)", r.records?.length === 1 && r.records[0].win === 120 && r.records[0].lose === 80);
}

console.log("▶ 실제 스키마 — 평점 랭킹 (flat, win/lose 포함)");
{
  const r = normalizeRatingRanking({ rows: [{ playerId: "p", nickname: "n", grade: 1, rp: 3000, rankingPoint: 2999, tierName: "ACE", win: 50, lose: 30, stop: 1 }] });
  assert("flat player", r.rows[0].player.playerId === "p");
  assert("ratingPoint=rp, win/lose 보존", r.rows[0].ratingPoint === 3000 && r.rows[0].win === 50 && r.rows[0].lose === 30);
}

console.log(`\n결과: ${passed} 통과, ${failed} 실패`);
if (failed > 0) process.exit(1);
