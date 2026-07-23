import Link from "next/link";
import { getItem, NeopleApiError } from "@/lib/neople";
import ItemIcon from "@/components/ItemIcon";
import { Avatar } from "@/components/CharacterAvatar";
import { ErrorState } from "@/components/ui";
import { rarityMeta } from "@/lib/constants";
import type { ItemDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: { itemId: string };
}

export async function generateMetadata({ params }: Props) {
  try {
    const item = await getItem(params.itemId);
    return { title: item.itemName };
  } catch {
    return { title: "아이템 상세" };
  }
}

export default async function ItemDetailPage({ params }: Props) {
  let item: ItemDetail;
  try {
    item = await getItem(params.itemId);
  } catch (e) {
    const err = e as NeopleApiError;
    return <ErrorState message={err.message} hint={`code: ${err.code}`} />;
  }

  const rarity = rarityMeta(item.rarityCode);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <ItemIcon
            itemId={item.itemId}
            itemName={item.itemName}
            rarityCode={item.rarityCode}
            size={72}
            linkable={false}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-gray-50">{item.itemName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              {rarity && (
                <span className="chip" style={{ color: rarity.color, backgroundColor: `${rarity.color}20` }}>
                  {item.rarityName ?? rarity.name}
                </span>
              )}
              {item.slotName && <span className="chip bg-bg-hover text-gray-400">{item.slotName}</span>}
              {item.seasonName && <span className="text-xs text-gray-500">{item.seasonName}</span>}
            </div>
          </div>
        </div>

        {item.explain && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-300">
            {item.explain}
          </p>
        )}
        {item.explainDetail && item.explainDetail !== item.explain && (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-400">
            {item.explainDetail}
          </p>
        )}
        {item.obtainInfo && (
          <p className="mt-3 text-xs text-gray-500">획득: {item.obtainInfo}</p>
        )}
      </div>

      {/* 튜닝 */}
      {item.tuning && (item.tuning.explain || item.tuning.explain2) && (
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-bold text-gray-200">튜닝</h2>
          {item.tuning.explain && <p className="text-sm text-gray-300">{item.tuning.explain}</p>}
          {item.tuning.explain2 && <p className="mt-1 text-sm text-gray-400">{item.tuning.explain2}</p>}
        </div>
      )}

      {/* 전용 캐릭터 */}
      {item.characterId && item.characterName && (
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-bold text-gray-200">전용 캐릭터</h2>
          <Link
            href={`/characters/${item.characterId}`}
            className="inline-flex flex-col items-center gap-1"
          >
            <Avatar characterId={item.characterId} characterName={item.characterName} size={48} zoom={1} />
            <span className="max-w-[80px] truncate text-xs text-gray-400">{item.characterName}</span>
          </Link>
        </div>
      )}

      <div className="text-center">
        <Link href="/items" className="text-sm text-gray-500 hover:text-gray-300">
          ← 아이템 검색으로
        </Link>
      </div>
    </div>
  );
}
