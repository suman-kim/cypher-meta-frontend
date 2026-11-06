/**
 * 앱 플레이어 비교의 "지표 막대"용 요약 (서버 전용 — lib/neople 을 쓴다).
 *
 * 웹 비교 화면에는 없는 앱 시안(10)의 RP · 승률 · KDA · 평균 딜 비교 막대에 쓴다.
 * RP 는 플레이어 정보에서, 나머지는 최근 공식전 COMPARE_RECENT 판에서 계산한다(멀티서치 요약과 같은 계산 — lib/multi).
 * 조회에 실패하면 던지지 않고 null 값으로 채워 화면이 "-" 를 보이게 한다.
 */
import { getPlayer, getPlayerMatches } from "@/lib/neople";
import { buildMultiSummary } from "@/lib/multi";

/** 지표 계산에 쓰는 최근 공식전 수 */
export const COMPARE_RECENT = 20;

/** 플레이어 1명의 비교 지표 */
export interface CompareStats {
  /** 공식전 RP (모르면 null) */
  rp: number | null;
  /** 티어 이름 (모르면 null) */
  tierName: string | null;
  /** 계산에 쓴 최근 공식전 수 */
  games: number;
  /** 최근 공식전 승률(%) — 기록 없으면 null */
  winRate: number | null;
  /** 최근 공식전 KDA — 기록 없으면 null */
  kda: number | null;
  /** 최근 공식전 판당 평균 공격량(가한 피해) — 기록 없으면 null */
  avgDamage: number | null;
}

/** 아무것도 모를 때 값 */
const EMPTY: CompareStats = { rp: null, tierName: null, games: 0, winRate: null, kda: null, avgDamage: null };

/**
 * 플레이어 ID → 비교 지표.
 * @param playerId Neople 플레이어 ID
 * @returns 지표 (실패한 항목은 null)
 */
export async function loadCompareStats(playerId: string): Promise<CompareStats> {
  const [detail, matches] = await Promise.all([
    getPlayer(playerId).catch(() => null),
    getPlayerMatches(playerId, { gameTypeId: "rating", limit: COMPARE_RECENT }).catch(() => null),
  ]);
  if (!detail && !matches) return EMPTY;
  const rows = (matches?.matches?.rows ?? []).slice(0, COMPARE_RECENT);
  const sum = buildMultiSummary(rows);
  const dmgRows = rows.filter((r) => typeof r.playInfo?.attackPoint === "number");
  return {
    rp: detail?.ratingPoint ?? null,
    tierName: detail?.tierName ?? null,
    games: sum.games,
    winRate: sum.winRate,
    kda: sum.kda,
    avgDamage: dmgRows.length
      ? Math.round(dmgRows.reduce((n, r) => n + (r.playInfo.attackPoint ?? 0), 0) / dmgRows.length)
      : null,
  };
}
