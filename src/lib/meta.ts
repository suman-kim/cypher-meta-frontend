/** 백엔드 메타 통계 API 클라이언트 (서버 컴포넌트 전용) */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export interface CharacterMeta {
  characterId: string;
  characterName: string | null;
  picks: number;
  wins: number;
  pickRate: number;
  winRate: number;
  kda: number;
  avgKill: number;
  avgDeath: number;
  avgAssist: number;
}

export interface MetaSummary {
  matches: number;
  playerRecords: number;
  characters: number;
  lastCollect: { lastRun?: string; collected?: number; scanned?: number } | null;
}

export async function getCharacterMeta(gameTypeId?: string): Promise<CharacterMeta[]> {
  const url = `${API}/meta/characters${gameTypeId ? `?gameTypeId=${encodeURIComponent(gameTypeId)}` : ""}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`meta characters ${res.status}`);
  return res.json();
}

export async function getMetaSummary(): Promise<MetaSummary> {
  const res = await fetch(`${API}/meta/summary`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`meta summary ${res.status}`);
  return res.json();
}
