import { getCharacters, NeopleApiError } from "@/lib/neople";
import { getRoster, type RosterEntry } from "@/lib/votes";
import CharacterRoster from "@/components/characters/CharacterRoster";
import { ErrorState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "캐릭터" };

export default async function CharactersPage() {
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
