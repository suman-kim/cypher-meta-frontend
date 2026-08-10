import {
  getCharacterMeta,
  getCharacterItemMeta,
  type CharacterItemMeta,
} from "@/lib/meta";
import ItemExplorer, { type CharItem } from "@/components/items/ItemExplorer";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic"; // Railway 내부망은 런타임 전용 — 빌드 프리렌더 대신 요청 시점 렌더
export const metadata = {
  title: "사이퍼즈 아이템 (빌드·채택률)",
  description:
    "사이퍼즈 아이템 빌드 — 캐릭터별 부위별 채택 아이템과 채택률을 상위 랭커 매치 기준으로 확인하세요.",
  alternates: { canonical: "/items" },
};

export default async function ItemsPage() {
  let chars: CharItem[] = [];
  try {
    const meta = await getCharacterMeta("rating");
    chars = meta
      .map((c) => ({
        characterId: c.characterId,
        characterName: c.characterName,
        role: c.role,
        pickRate: c.pickRate,
        winRate: c.winRate,
        matchCount: c.matchCount,
      }))
      .sort((a, b) => b.pickRate - a.pickRate);
  } catch {}

  let initial: { characterId: string; data: CharacterItemMeta } | null = null;
  if (chars[0]) {
    try {
      initial = { characterId: chars[0].characterId, data: await getCharacterItemMeta(chars[0].characterId) };
    } catch {}
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-50">아이템 빌드</h1>
        <p className="mt-1 text-sm text-gray-500">
          캐릭터를 선택하면 부위별로 자주 채택되는 아이템과 채택률을 보여줍니다.
        </p>
      </div>
      {chars.length === 0 ? (
        <EmptyState
          title="수집된 데이터가 아직 없습니다"
          description="상위 랭커 매치 수집 후 캐릭터별 아이템 통계가 표시됩니다."
          icon="🎒"
        />
      ) : (
        <ItemExplorer characters={chars} initial={initial} />
      )}
    </div>
  );
}
