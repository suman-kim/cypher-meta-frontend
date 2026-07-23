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
  const rc = rarity?.color ?? "#9aa7b4";
  const rarityLabel = item.rarityName ?? rarity?.name;
  const hasEffect = Boolean(item.explain || item.explainDetail);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* 히어로 (등급 색 테마) */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: rc }} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(120deg, ${rc}14, transparent 60%)` }}
        />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: `${rc}22` }} />
        <div className="relative flex items-center gap-5 p-6 sm:p-7">
          <div className="relative shrink-0">
            <div className="absolute -inset-1.5 rounded-2xl blur-lg" style={{ backgroundColor: `${rc}33` }} />
            <div className="relative">
              <ItemIcon
                itemId={item.itemId}
                itemName={item.itemName}
                rarityCode={item.rarityCode}
                size={88}
                linkable={false}
              />
            </div>
          </div>
          <div className="min-w-0">
            {item.slotName && (
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                {item.slotName}
              </div>
            )}
            <h1 className="mt-0.5 text-2xl font-black leading-tight text-gray-50 sm:text-[1.7rem]">
              {item.itemName}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {rarityLabel && (
                <span className="chip font-bold" style={{ color: rc, backgroundColor: `${rc}22` }}>
                  {rarityLabel}
                </span>
              )}
              {item.slotName && <span className="chip bg-surface-2 text-gray-400">{item.slotName}</span>}
              {item.seasonName && <span className="chip bg-surface-2 text-gray-500">{item.seasonName}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 아이템 효과 */}
      <section className="card p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">✦</span>
          <h2 className="text-base font-bold text-gray-100">아이템 효과</h2>
        </div>
        {item.explain && (
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-200">{item.explain}</p>
        )}
        {item.explainDetail && item.explainDetail !== item.explain && (
          <div className="mt-3 whitespace-pre-line rounded-xl border border-line bg-surface-2 p-4 text-sm leading-relaxed text-gray-400">
            {item.explainDetail}
          </div>
        )}
        {!hasEffect && <p className="text-sm text-gray-500">등록된 효과 설명이 없습니다.</p>}

        {item.obtainInfo && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-gray-500">
            <span className="shrink-0">📦</span>
            <span>획득 · {item.obtainInfo}</span>
          </div>
        )}
      </section>

      {/* 튜닝 */}
      {item.tuning && (item.tuning.explain || item.tuning.explain2) && (
        <section className="card p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">⚙</span>
            <h2 className="text-base font-bold text-gray-100">튜닝</h2>
          </div>
          {item.tuning.explain && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">{item.tuning.explain}</p>
          )}
          {item.tuning.explain2 && (
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-gray-400">
              {item.tuning.explain2}
            </p>
          )}
        </section>
      )}

      {/* 전용 캐릭터 */}
      {item.characterId && item.characterName && (
        <section className="card p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">🦸</span>
            <h2 className="text-base font-bold text-gray-100">전용 캐릭터</h2>
          </div>
          <Link
            href={`/characters/${item.characterId}`}
            className="inline-flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 transition-colors hover:border-primary/40 hover:bg-surface-3"
          >
            <Avatar characterId={item.characterId} characterName={item.characterName} size={44} zoom={1} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-100">{item.characterName}</div>
              <div className="text-xs text-gray-500">캐릭터 상세 보기 ›</div>
            </div>
          </Link>
        </section>
      )}

      <div className="pt-1 text-center">
        <Link href="/items" className="text-sm text-gray-500 transition-colors hover:text-gray-300">
          ← 아이템 빌드로
        </Link>
      </div>
    </div>
  );
}
