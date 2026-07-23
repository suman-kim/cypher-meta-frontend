/**
 * 커뮤니티 투표(캐릭터 티어 / 조합 티어) 클라이언트.
 * 읽기(집계·로스터)는 서버 컴포넌트에서 백엔드를 직접 호출하고,
 * 쓰기/내 투표 조회는 app/api/votes/* 프록시(방문자 쿠키 부여)를 통합니다.
 */
import { ROLE_LABELS } from "./meta";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export type RoleCode = "tank" | "melee" | "ranged" | "support";
export const VOTE_ROLES: RoleCode[] = ["tank", "melee", "ranged", "support"];
export { ROLE_LABELS };

export interface RosterEntry {
  characterId: string;
  characterName: string | null;
  role: RoleCode | "etc";
}

/* ── 편성 프리셋 (백엔드 meta/formations.ts 와 key 일치) ── */
export interface Formation {
  key: string;
  label: string;
  counts: Record<RoleCode, number>;
  roles: RoleCode[];
}
const ROLE_ORDER: RoleCode[] = ["tank", "melee", "ranged", "support"];
function expand(counts: Record<RoleCode, number>): RoleCode[] {
  const out: RoleCode[] = [];
  for (const r of ROLE_ORDER) for (let i = 0; i < (counts[r] ?? 0); i++) out.push(r);
  return out;
}
function make(key: string, label: string, counts: Record<RoleCode, number>): Formation {
  return { key, label, counts, roles: expand(counts) };
}
export const FORMATIONS: Formation[] = [
  make("std", "탱2·근1·원1·서1", { tank: 2, melee: 1, ranged: 1, support: 1 }),
  make("poke", "탱2·원2·서1", { tank: 2, melee: 0, ranged: 2, support: 1 }),
  make("bruiser", "탱2·근2·서1", { tank: 2, melee: 2, ranged: 0, support: 1 }),
  make("dive", "탱1·근1·원2·서1", { tank: 1, melee: 1, ranged: 2, support: 1 }),
  make("heavytank", "탱3·근1·원1", { tank: 3, melee: 1, ranged: 1, support: 0 }),
  make("doublepoke", "탱2·근1·원2", { tank: 2, melee: 1, ranged: 2, support: 0 }),
];
export const FORMATION_MAP: Record<string, Formation> = Object.fromEntries(
  FORMATIONS.map((f) => [f.key, f]),
);

/* ── 집계 결과 타입 ── */
export interface TierVotesResult {
  totalBallots: number;
  roles: Record<RoleCode, { characterId: string; votes: number }[]>;
}
export interface CompVotesResult {
  totalBallots: number;
  distinctCombos: number;
  top: { ids: string[]; votes: number; formationKey: string }[];
}

/* ── 서버 전용 fetch ── */
export async function getRoster(): Promise<RosterEntry[]> {
  const res = await fetch(`${API}/meta/roster`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`roster ${res.status}`);
  return res.json();
}
export async function getTierVotes(): Promise<TierVotesResult> {
  const res = await fetch(`${API}/votes/tier`, { cache: "no-store" });
  if (!res.ok) throw new Error(`tier votes ${res.status}`);
  return res.json();
}
export async function getCompVotes(): Promise<CompVotesResult> {
  const res = await fetch(`${API}/votes/comp`, { cache: "no-store" });
  if (!res.ok) throw new Error(`comp votes ${res.status}`);
  return res.json();
}

export function rosterMapOf(roster: RosterEntry[]): Map<string, RosterEntry> {
  return new Map(roster.map((r) => [r.characterId, r]));
}
