import { getCharacters, NeopleApiError } from "@/lib/neople";
import CharacterGrid from "@/components/CharacterGrid";
import { ErrorState } from "@/components/ui";
import type { CharacterRow } from "@/lib/types";

// 요청 시 렌더링하되, 캐릭터 목록 fetch 자체는 24시간 캐시(neople.ts 의 TTL.characters)
export const dynamic = "force-dynamic";

export const metadata = { title: "캐릭터" };

export default async function CharactersPage() {
  let characters: CharacterRow[] = [];
  let error: NeopleApiError | null = null;
  try {
    const res = await getCharacters();
    characters = (res.rows ?? []).sort((a, b) => a.characterName.localeCompare(b.characterName, "ko"));
  } catch (e) {
    error = e as NeopleApiError;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black text-gray-50">캐릭터</h1>
      {error ? (
        <ErrorState
          message={error.message}
          hint={error.code === "NO_API_KEY" ? ".env.local 의 NEOPLE_API_KEY 를 확인하세요." : `code: ${error.code}`}
        />
      ) : (
        <CharacterGrid characters={characters} />
      )}
    </div>
  );
}
