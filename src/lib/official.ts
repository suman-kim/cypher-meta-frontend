/**
 * official.ts — 공식 역할군·1차/2차 궁극기 공용 타입과 상수 (서버/클라이언트 공용, fetch 없음).
 *
 * 포지션 체계는 두 가지다.
 *  - official : 사이퍼즈 공식 역할군 7종(궁극기별) — 기본
 *  - legacy   : 기존 자체 포지션 4종(탱커/근접딜러/원거리딜러/서포터)
 * 백엔드 GET /meta/position-system 이 현재 체계를 알려 주며, 페이지는 그 값으로 화면을 고른다.
 * 서버 전용 fetch 는 lib/official-api.ts 에 있다.
 */

/** 포지션 체계 */
export type PositionSystem = "official" | "legacy";

/** 궁극기 구분 ("1st"=1차, "2nd"=2차) */
export type UltimateType = "1st" | "2nd";

/** 공식 역할군 영문 키 (URL·투표 payload 용) */
export type OfficialRoleKey =
  | "vanguard"
  | "striker"
  | "skirmisher"
  | "reaper"
  | "ranger"
  | "artillery"
  | "controller";

/** 공식 역할군 정의 1개 */
export interface OfficialRoleDef {
  /** 영문 키 */
  key: OfficialRoleKey;
  /** 한글명 (백엔드 officialRole 값과 동일) */
  name: string;
  /** 표시 색(칩·도넛·막대 등 UI 강조색) */
  color: string;
  /** 공식 아이콘의 시그니처 색 — 아이콘 이미지(public/icons/roles)의 대표 색에서 추출 */
  iconColor: string;
  /** 공식 설명(요약) — 툴팁용 */
  desc: string;
  /** 역할군 고정 버프(공식 "역할군 시스템 안내"의 역할 고정 버프 표) */
  buffs: string[];
}

/**
 * 공식 역할군 7종 — 표시 순서(전방 → 후방 → 지원). 백엔드 position-system.ts 의 OFFICIAL_ROLES 와 key·name 일치.
 * 설명·고정 버프 출처: 사이퍼즈 공식 "역할군 시스템 안내"(2026-09-30 확인).
 */
export const OFFICIAL_ROLES: OfficialRoleDef[] = [
  {
    key: "vanguard", name: "뱅가드", color: "#5b8def", iconColor: "#bdb9b3",
    desc: "최전방에서 전투를 이끌며 높은 전투 유지력을 보이는 캐릭터",
    buffs: ["체력이 60% 이하일 때 이동 속도 +50", "비전투 중 초당 체력 회복 +1.1% +7", "최대 체력 +5%, 방어력 +4%, 상태 이상 지속시간 -15%, 궁극기 대미지 +16%"],
  },
  {
    key: "striker", name: "스트라이커", color: "#e3913c", iconColor: "#cd6f14",
    desc: "전방에서 공격과 방어를 유연하게 전환하는 밸런스형 캐릭터",
    buffs: ["전투 지속 시 4초마다 공격 속도 +2%, 인간 추가 공격력 +2.5%, 방어력 +1.5% (최대 3회)", "플레이어 타격 시 흡혈률 +20%, 소모킷 구매 코인 -20%", "최대 체력을 초과하는 흡혈량을 보호막으로 전환 (최대 10%)"],
  },
  {
    key: "skirmisher", name: "스커미셔", color: "#c65bd6", iconColor: "#ccab3d",
    desc: "높은 기동성으로 적의 허점을 찌르는 기습 공격 특화 캐릭터",
    buffs: ["적 플레이어를 300 거리 이내에서 타격 시 추가 피해 (L스킬 제외, 쿨타임 60초)", "비전투 중 이동 속도 +30, 공격력 +30", "전투 시작 시 10초간 이동 속도 +15, 치명타 +15%"],
  },
  {
    key: "reaper", name: "리퍼", color: "#e2506a", iconColor: "#cb3734",
    desc: "순간적인 강력한 대미지로 근접한 적을 제압하는 캐릭터",
    buffs: ["플레이어 킬 시 10초간 쿨타임 가속 +10% (중첩 불가)", "현재 체력이 50%를 초과하는 적 플레이어 공격 시 방어 관통 +10%", "치명타 피해량 +10%"],
  },
  {
    key: "ranger", name: "레인저", color: "#4fbf6b", iconColor: "#875bc7",
    desc: "원거리에서 지속적으로 치명적인 피해를 누적시키는 캐릭터",
    buffs: ["적 플레이어를 600 거리 밖에서 타격 시 방어 관통 +5%의 추가 피해 (L스킬 제외, 쿨타임 15초)", "이동 속도 +15, 방어력 +3%, 공격력 +10 (피격 시 20초간 효과 제거)", "인간 추가 공격력 +5%"],
  },
  {
    key: "artillery", name: "아틸러리", color: "#2fb5b0", iconColor: "#2787b3",
    desc: "긴 사거리로 적군을 견제하고 공성을 주도하는 캐릭터",
    buffs: ["적 플레이어를 600 거리 밖에서 타격 시 10초간 쿨타임 가속 +10% (L스킬 제외, 쿨타임 20초)", "적 플레이어 타격 시 체력 회복량 -20% 디버프 6초간 부여 (중첩 불가)", "수호자·몬스터 추가 공격력 +17%"],
  },
  {
    key: "controller", name: "컨트롤러", color: "#a15bf0", iconColor: "#3fdd40",
    desc: "아군 지원 및 적군의 행동을 제어·약화시키는 캐릭터",
    buffs: ["전투 지속 시 5초마다 600 범위 내 아군 보호막 +70 (최대 5회, 다른 컨트롤러에게는 미적용)", "적 플레이어를 SL 스킬로 타격 시 쿨타임 가속 -10% 디버프 8초간 부여 (중첩 불가)", "궁극기(E) 쿨타임 -10%, SL 스킬 쿨타임 -5%"],
  },
];

/** 역할군을 모를 때(개인 분석의 미확정) 표시 색 */
export const UNKNOWN_ROLE_COLOR = "#9aa7b4";

/**
 * 한글 역할군명으로 정의를 찾는다.
 * @param name — 공식 역할군 한글명(예: "리퍼")
 * @returns 정의(없으면 undefined)
 */
export function roleByName(name: string | null | undefined): OfficialRoleDef | undefined {
  return OFFICIAL_ROLES.find((r) => r.name === name);
}

/**
 * 영문 키로 정의를 찾는다.
 * @param key — 공식 역할군 영문 키(예: "reaper")
 * @returns 정의(없으면 undefined)
 */
export function roleByKey(key: string | null | undefined): OfficialRoleDef | undefined {
  return OFFICIAL_ROLES.find((r) => r.key === key);
}

/**
 * URL 쿼리 값이 공식 역할군 키인지 검사한다.
 * @param v — 쿼리 값
 * @returns 공식 역할군 키면 true
 */
export function isOfficialRoleKey(v: string | undefined): v is OfficialRoleKey {
  return !!v && OFFICIAL_ROLES.some((r) => r.key === v);
}

/**
 * 궁극기 구분 표시 라벨.
 * @param t — "1st" | "2nd"
 * @returns "1차" | "2차"
 */
export function ultimateLabel(t: string | null | undefined): string {
  return t === "2nd" ? "2차" : "1차";
}

/**
 * (캐릭터, 궁극기) 선택 단위 문자열 — 공식 투표 payload·React key 로 쓴다.
 * @param characterId — 캐릭터 ID
 * @param ultimateType — "1st" | "2nd"
 * @returns "characterId:ultimateType"
 */
export function unitKey(characterId: string, ultimateType: string): string {
  return `${characterId}:${ultimateType}`;
}

/**
 * 캐릭터 상세 경로 — 2차 궁극기 칸이면 2차 페이지(?ult=2nd)로, 그 외는 기본(1차) 페이지로.
 * @param characterId — 캐릭터 ID
 * @param ultimateType — 궁극기 구분(없으면 기본 페이지)
 * @returns 상세 페이지 경로
 */
export function characterHref(characterId: string, ultimateType?: string | null): string {
  return ultimateType === "2nd" ? `/characters/${characterId}?ult=2nd` : `/characters/${characterId}`;
}

/** 캐릭터별 궁극기 정의 1행 (GET /meta/ultimates) */
export interface CharacterUltimate {
  characterId: string;
  characterName: string;
  ultimateType: UltimateType;
  /** 궁극기 스킬명 (예: 드라그노프) */
  skillName: string;
  /** 이 궁극기 선택 시 공식 역할군 한글명 */
  officialRole: string;
  /** 1차/2차 구분 외부 검수 여부 */
  verified: boolean;
}

/** (캐릭터, 1차/2차) 단위 메타 통계 1행 (GET /meta/characters/ultimates) */
export interface UltimateStatRow {
  characterId: string;
  characterName: string | null;
  ultimateType: UltimateType;
  skillName: string;
  officialRole: string;
  /** 2차 궁극기 보유 캐릭터인지 (1차/2차 배지 표시 여부) */
  dual: boolean;
  picks: number;
  matchCount: number;
  wins: number;
  pickRate: number;
  winRate: number;
  kda: number;
  avgKill: number;
  avgDeath: number;
  avgAssist: number;
}

/** 궁극기 단위 조합의 멤버 1명 */
export interface UltimateCompMember {
  characterId: string;
  characterName: string;
  ultimateType: UltimateType;
  skillName: string;
  officialRole: string;
  dual: boolean;
}

/** 궁극기 단위 조합 1건 */
export interface UltimateComposition {
  members: UltimateCompMember[];
  /** 공식 역할군 구성(표시 순서로 정렬) */
  roles: string[];
  games: number;
  wins: number;
  winRate: number;
}

/** 궁극기 단위 조합 집계 결과 (GET /meta/compositions/ultimates) */
export interface UltimateCompositionsResult {
  gameTypeId: string;
  size: 2 | 3;
  minGames: number;
  /** 적용된 역할군 구성 필터(한글명) */
  filterRoles: string[];
  totalCombos: number;
  sampledMatches: number;
  distinctCombos: number;
  /** 필터 UI 용 — 역할군 구성별 표본 수(많은 순) */
  roleMixes: { roles: string[]; games: number }[];
  byFrequency: UltimateComposition[];
  byWinRate: UltimateComposition[];
}

/** 공식 편성 프리셋 (GET /votes/official/formations) */
export interface OfficialFormation {
  key: string;
  label: string;
  /** 슬롯별 공식 역할군 한글명 */
  roles: string[];
}

/** 공식 티어 투표 집계 (GET /votes/official/tier) */
export interface OfficialTierVotesResult {
  totalBallots: number;
  roles: Record<string, { unit: string; characterId: string; ultimateType: UltimateType; votes: number }[]>;
}

/** 공식 조합 투표 집계 (GET /votes/official/comp) */
export interface OfficialCompVotesResult {
  totalBallots: number;
  distinctCombos: number;
  top: { units: string[]; votes: number; formationKey: string }[];
}

/**
 * 궁극기 정의를 공식 역할군별로 묶는다(2차 보유 캐릭터는 1차·2차 역할군에 각각 들어간다).
 * @param ults — 캐릭터별 궁극기 정의 목록
 * @returns 역할군 키 → 해당 역할군 궁극기 정의 목록(캐릭터명 가나다순)
 */
export function groupUltimatesByRole(ults: CharacterUltimate[]): Record<OfficialRoleKey, CharacterUltimate[]> {
  const out = Object.fromEntries(OFFICIAL_ROLES.map((r) => [r.key, [] as CharacterUltimate[]])) as Record<
    OfficialRoleKey,
    CharacterUltimate[]
  >;
  for (const u of ults) {
    const def = roleByName(u.officialRole);
    if (def) out[def.key].push(u);
  }
  for (const k of Object.keys(out) as OfficialRoleKey[])
    out[k].sort(
      (a, b) => a.characterName.localeCompare(b.characterName, "ko") || a.ultimateType.localeCompare(b.ultimateType),
    );
  return out;
}

/**
 * 2차 궁극기를 가진 캐릭터 ID 집합.
 * @param ults — 캐릭터별 궁극기 정의 목록
 * @returns characterId 집합
 */
export function dualCharacterIds(ults: CharacterUltimate[]): Set<string> {
  return new Set(ults.filter((u) => u.ultimateType === "2nd").map((u) => u.characterId));
}
