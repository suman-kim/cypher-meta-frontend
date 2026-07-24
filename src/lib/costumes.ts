/** 백엔드 코스튬 API 클라이언트(서버 컴포넌트 전용 fetch) + 그룹핑 헬퍼(순수 함수) */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/** 코스튬 1건 — 백엔드 costumes 테이블 행과 1:1 대응 */
export interface Costume {
  /** 고유번호 */
  id: number;
  /** 출시년도 */
  releaseYear: number;
  /** 캐릭터명(한글) */
  characterName: string;
  /** 코스튬명(한글) */
  costumeName: string;
  /** 서버 저장 이미지 웹 경로(예: /costumes/2026/luis_00.png) */
  imagePath: string;
  /** 원본 이미지 파일명 */
  imageFile: string;
  /** 세트 내 정렬 순서 */
  seq: number;
}

/** 코스튬 목록 조회(서버 전용). character/year 로 필터 가능. */
export async function getCostumes(opts?: { character?: string; year?: number }): Promise<Costume[]> {
  const p = new URLSearchParams();
  if (opts?.character) p.set("character", opts.character);
  if (opts?.year) p.set("year", String(opts.year));
  const qs = p.toString();
  const res = await fetch(`${API}/costumes${qs ? `?${qs}` : ""}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`costumes ${res.status}`);
  return res.json();
}

/** 필터 UI 용 패싯(캐릭터/연도 + 개수) */
export interface CostumeFacets {
  total: number;
  characters: { name: string; count: number }[];
  years: { year: number; count: number }[];
}

/** 필터용 패싯 조회(서버 전용). */
export async function getCostumeFacets(): Promise<CostumeFacets> {
  const res = await fetch(`${API}/costumes/facets`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`costume facets ${res.status}`);
  return res.json();
}

/** 캐릭터별 그룹 */
export interface CostumeGroup {
  characterName: string;
  /** 이 캐릭터가 가진 출시년도 목록(내림차순) */
  years: number[];
  /** 정렬된 코스튬 목록(연도 desc → seq asc) */
  costumes: Costume[];
}

/**
 * 코스튬 배열을 캐릭터별로 묶는다.
 * 각 그룹 내부는 연도 내림차순 → 세트 순서(seq) → id 로 정렬,
 * 그룹 자체는 보유 코스튬 수 많은 순 → 캐릭터명(한글) 순으로 정렬한다.
 */
export function groupByCharacter(rows: Costume[]): CostumeGroup[] {
  const map = new Map<string, Costume[]>();
  for (const r of rows) {
    const arr = map.get(r.characterName) ?? [];
    arr.push(r);
    map.set(r.characterName, arr);
  }
  const groups: CostumeGroup[] = [];
  for (const [characterName, costumes] of map.entries()) {
    costumes.sort(
      (a, b) => b.releaseYear - a.releaseYear || a.seq - b.seq || a.id - b.id,
    );
    const years = [...new Set(costumes.map((c) => c.releaseYear))].sort((a, b) => b - a);
    groups.push({ characterName, years, costumes });
  }
  groups.sort(
    (a, b) =>
      b.costumes.length - a.costumes.length ||
      a.characterName.localeCompare(b.characterName, "ko"),
  );
  return groups;
}
