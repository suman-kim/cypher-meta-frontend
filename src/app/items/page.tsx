import Link from "next/link";
import { getCharacters, searchItems, NeopleApiError } from "@/lib/neople";
import ItemSearchControls from "@/components/ItemSearchControls";
import ItemIcon from "@/components/ItemIcon";
import { EmptyState, ErrorState } from "@/components/ui";
import { rarityMeta } from "@/lib/constants";
import type { CharacterRow, ItemRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "아이템 검색" };

interface Props {
  searchParams: { itemName?: string; rarityCode?: string; characterId?: string };
}

export default async function ItemsPage({ searchParams }: Props) {
  const itemName = (searchParams.itemName ?? "").trim();
  const rarityCode = searchParams.rarityCode ?? "";
  const characterId = searchParams.characterId ?? "";

  // 캐릭터 필터용 목록
  let characters: CharacterRow[] = [];
  try {
    const res = await getCharacters();
    characters = (res.rows ?? []).sort((a, b) => a.characterName.localeCompare(b.characterName, "ko"));
  } catch {
    characters = [];
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black text-gray-50">아이템 검색</h1>

      <ItemSearchControls
        characters={characters}
        itemName={itemName}
        rarityCode={rarityCode}
        characterId={characterId}
      />

      {!itemName ? (
        <EmptyState
          title="아이템 이름을 입력하세요"
          description="배틀 아이템을 이름으로 검색하고 등급·캐릭터로 필터링할 수 있습니다."
          icon="🎒"
        />
      ) : (
        <ItemResults itemName={itemName} rarityCode={rarityCode} characterId={characterId} />
      )}
    </div>
  );
}

async function ItemResults({
  itemName,
  rarityCode,
  characterId,
}: {
  itemName: string;
  rarityCode: string;
  characterId: string;
}) {
  let rows: ItemRow[] = [];
  try {
    const res = await searchItems(itemName, {
      wordType: "match",
      rarityCode: rarityCode || undefined,
      characterId: characterId || undefined,
      limit: 40,
    });
    rows = res.rows ?? [];
  } catch (e) {
    const err = e as NeopleApiError;
    return <ErrorState message={err.message} hint={`code: ${err.code}`} />;
  }

  if (rows.length === 0) {
    return <EmptyState title="검색 결과가 없습니다" description="다른 키워드로 시도해보세요." icon="🔍" />;
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {rows.map((it) => {
        const rarity = rarityMeta(it.rarityCode);
        return (
          <li key={it.itemId}>
            <Link
              href={`/items/${it.itemId}`}
              className="card flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-bg-hover"
            >
              <ItemIcon
                itemId={it.itemId}
                itemName={it.itemName}
                rarityCode={it.rarityCode}
                size={40}
                linkable={false}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-gray-100">{it.itemName}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {rarity && <span style={{ color: rarity.color }}>{rarity.name}</span>}
                  {it.slotName && <span>· {it.slotName}</span>}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
