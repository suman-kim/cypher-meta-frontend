import { getCharacters, NeopleApiError } from "@/lib/neople";
import { getRoster, type RosterEntry } from "@/lib/votes";
import CharacterRoster from "@/components/characters/CharacterRoster";
import { ErrorState } from "@/components/ui";
import OfficialCharacterRoster from "@/components/characters/OfficialCharacterRoster";
import { getCharacterUltimates, getPositionSystem } from "@/lib/official-api";
import type { CharacterUltimate } from "@/lib/official";

export const dynamic = "force-dynamic"; // Railway: 요청 시점 렌더(백엔드는 런타임에만 확실히 도달) — 빌드타임 프리렌더 실패 방지
export const metadata = {
  title: "사이퍼즈 캐릭터 (전체 목록)",
  description:
    "사이퍼즈 전체 캐릭터(사이퍼) 목록 — 포지션별 캐릭터와 능력치·스킬, 캐릭터 티어를 확인하세요.",
  alternates: { canonical: "/characters" },
};

/**
 * 캐릭터 목록 페이지.
 * 포지션 체계가 official 이면 공식 역할군별 목록을, 아니면(legacy·조회 실패) 기존 포지션별 목록을 보여 준다.
 */
export default async function CharactersPage() {
  // 공식 역할군 체계 — 궁극기 정의를 못 받으면 기존 화면으로 폴백
  let ultimates: CharacterUltimate[] | null = null;
  if ((await getPositionSystem()) === "official") {
    ultimates = await getCharacterUltimates().catch(() => null);
  }
  if (ultimates && ultimates.length > 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-50">캐릭터</h1>
          <p className="mt-1 text-sm text-gray-500">공식 역할군별 사이퍼를 확인하고 상세 정보로 이동하세요.</p>
        </div>
        <OfficialCharacterRoster ultimates={ultimates} />
      </div>
    );
  }

  let characters: RosterEntry[] = [];
  let error: NeopleApiError | null = null;

  // 역할 포함 로스터 우선, 실패 시 이름만이라도 표시(전부 미분류)
  try {
    characters = await getRoster();
  } catch {
    characters = [];
  }
  if (characters.length === 0) {
    try {
      const res = await getCharacters();
      characters = (res.rows ?? []).map((c) => ({
        characterId: c.characterId,
        characterName: c.characterName,
        role: "etc" as const,
      }));
    } catch (e) {
      error = e as NeopleApiError;
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-50">캐릭터</h1>
        <p className="mt-1 text-sm text-gray-500">포지션별 사이퍼를 확인하고 상세 정보로 이동하세요.</p>
      </div>
      {error ? (
        <ErrorState
          message={error.message}
          hint={error.code === "NO_API_KEY" ? ".env.local 의 NEOPLE_API_KEY 를 확인하세요." : `code: ${error.code}`}
        />
      ) : (
        <CharacterRoster characters={characters} />
      )}
    </div>
  );
}
