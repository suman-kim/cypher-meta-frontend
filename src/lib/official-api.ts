/**
 * official-api.ts — 공식 역할군·궁극기 관련 백엔드 조회 (서버 전용: 서버 컴포넌트/라우트 핸들러에서만 import).
 *
 * 백엔드 주소(CYPHERS_API_URL)를 쓰므로 클라이언트 컴포넌트에서 import 하지 않는다.
 * 클라이언트에서 필요한 쓰기(투표)는 app/api/votes/official/* 프록시를 거친다.
 */
import type {
  CharacterUltimate,
  OfficialCompVotesResult,
  OfficialFormation,
  OfficialTierVotesResult,
  PositionSystem,
  UltimateCompositionsResult,
  UltimateStatRow,
} from "./official";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/**
 * 현재 포지션 체계를 조회한다.
 * 백엔드가 아직 이 기능을 모르거나(구버전 배포) 호출이 실패하면 기존 화면(legacy)으로 둔다 —
 * 프론트가 먼저 배포돼도 깨지지 않게 하기 위함.
 * @returns "official" | "legacy"
 */
export async function getPositionSystem(): Promise<PositionSystem> {
  try {
    const res = await fetch(`${API}/meta/position-system`, { next: { revalidate: 60 } });
    if (!res.ok) return "legacy";
    const d = (await res.json()) as { system?: string };
    return d?.system === "official" ? "official" : "legacy";
  } catch {
    return "legacy";
  }
}

/**
 * 캐릭터별 1차/2차 궁극기 정의(스킬명·공식 역할군) 목록.
 * @returns character_ultimates 행 목록
 */
export async function getCharacterUltimates(): Promise<CharacterUltimate[]> {
  const res = await fetch(`${API}/meta/ultimates`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`ultimates ${res.status}`);
  return res.json();
}

/**
 * (캐릭터, 1차/2차) 단위 메타 통계 — 공식 역할군 캐릭터 티어 원천.
 * @param gameTypeId — 게임 타입(예: "rating")
 * @returns 궁극기 단위 행 목록
 */
export async function getCharacterUltimateStats(gameTypeId?: string): Promise<UltimateStatRow[]> {
  const q = gameTypeId ? `?gameTypeId=${encodeURIComponent(gameTypeId)}` : "";
  const res = await fetch(`${API}/meta/characters/ultimates${q}`, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`ultimate stats ${res.status}`);
  return res.json();
}

/**
 * 궁극기 단위 듀오/트리오 조합 집계.
 * @param opts.size — 조합 인원 2|3
 * @param opts.roles — 역할군 구성 필터(영문 키 배열)
 * @param opts.limit — 목록별 반환 수
 * @param opts.minGames — 승률순 최소 표본
 * @returns 조합 집계 결과
 */
export async function getUltimateCompositions(opts: {
  size?: 2 | 3;
  roles?: string[];
  limit?: number;
  minGames?: number;
  gameTypeId?: string;
}): Promise<UltimateCompositionsResult> {
  const p = new URLSearchParams();
  if (opts.size) p.set("size", String(opts.size));
  if (opts.roles?.length) p.set("roles", opts.roles.join(","));
  if (opts.limit) p.set("limit", String(opts.limit));
  if (opts.minGames) p.set("minGames", String(opts.minGames));
  if (opts.gameTypeId) p.set("gameTypeId", opts.gameTypeId);
  const res = await fetch(`${API}/meta/compositions/ultimates?${p.toString()}`, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`ultimate compositions ${res.status}`);
  return res.json();
}

/**
 * 공식 역할군 티어 투표 집계.
 * @returns 역할군별 득표 상위
 */
export async function getOfficialTierVotes(): Promise<OfficialTierVotesResult> {
  const res = await fetch(`${API}/votes/official/tier`, { cache: "no-store" });
  if (!res.ok) throw new Error(`official tier votes ${res.status}`);
  return res.json();
}

/**
 * 공식 역할군 조합 투표 집계.
 * @returns 인기 조합 상위
 */
export async function getOfficialCompVotes(): Promise<OfficialCompVotesResult> {
  const res = await fetch(`${API}/votes/official/comp`, { cache: "no-store" });
  if (!res.ok) throw new Error(`official comp votes ${res.status}`);
  return res.json();
}

/**
 * 공식 편성 프리셋 목록.
 * @returns 편성 프리셋 배열
 */
export async function getOfficialFormations(): Promise<OfficialFormation[]> {
  const res = await fetch(`${API}/votes/official/formations`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`official formations ${res.status}`);
  return res.json();
}
