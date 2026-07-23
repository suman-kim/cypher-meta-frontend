import Link from "next/link";
import { getCharacters, getCharacterRanking, NeopleApiError } from "@/lib/neople";
import {
  getCharacterMeta,
  getCharacterItemMeta,
  orderSlots,
  type CharacterMeta,
  type CharacterItemMeta,
} from "@/lib/meta";
import { Avatar } from "@/components/CharacterAvatar";
import CypherProfileView from "@/components/characters/CypherProfile";
import { getCypherProfile } from "@/lib/cypher-profiles";
import ItemIcon from "@/components/ItemIcon";
import { EmptyState, ErrorState, LinkTabs, Stat } from "@/components/ui";
import { CHARACTER_RANKING_TYPES, characterRankingLabel } from "@/lib/constants";
import { winRate, kdaColor } from "@/lib/format";
import type { CharacterRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: { characterId: string };
  searchParams: { rankingType?: string };
}

async function resolveName(characterId: string): Promise<string | undefined> {
  try {
    const res = await getCharacters();
    return res.rows?.find((c) => c.characterId === characterId)?.characterName;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props) {
  const name = await resolveName(params.characterId);
  return { title: name ?? "캐릭터 상세" };
}

export default async function CharacterDetailPage({ params, searchParams }: Props) {
  const rankingType = CHARACTER_RANKING_TYPES.some((t) => t.type === searchParams.rankingType)
    ? (searchParams.rankingType as string)
    : "winCount";

  const name = await resolveName(params.characterId);
  const profile = getCypherProfile(name);

  // 메타 통계(자체 픽률·승률·KDA)와 아이템 채택률 — 백엔드가 없거나 데이터가 없으면 조용히 생략.
  const [selfMeta, itemMeta] = await Promise.all([
    getCharacterMeta()
      .then((rows: CharacterMeta[]) => rows.find((r) => r.characterId === params.characterId) ?? null)
      .catch(() => null),
    getCharacterItemMeta(params.characterId).catch(() => null as CharacterItemMeta | null),
  ]);

  let rows: CharacterRankingRow[] = [];
  let error: NeopleApiError | null = null;
  try {
    const res = await getCharacterRanking(params.characterId, rankingType, { limit: 20 });
    rows = res.rows ?? [];
  } catch (e) {
    error = e as NeopleApiError;
    rows = [];
  }

  const slots = orderSlots(itemMeta?.slots ?? []);

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Avatar characterId={params.characterId} characterName={name} size={80} zoom={2} />
          <div>
            <h1 className="text-2xl font-black text-gray-50">{name ?? "캐릭터"}</h1>
            <p className="text-sm text-gray-500">지표별 상위 랭커와 메타 통계를 확인하세요.</p>
            <div className="mt-2">
              <Link
                href={`/ranking/characters?characterId=${params.characterId}&rankingType=${rankingType}`}
                className="text-sm text-primary hover:underline"
              >
                전체 랭킹 보기 →
              </Link>
            </div>
          </div>
        </div>

        {selfMeta && (
          <div className="grid grid-cols-4 gap-2 sm:ml-auto sm:w-[360px]">
            <Stat label="픽률" value={`${selfMeta.pickRate}%`} accent="rgb(var(--primary))" />
            <Stat
              label="승률"
              value={`${selfMeta.winRate}%`}
              accent={selfMeta.winRate >= 50 ? "rgb(var(--win))" : "rgb(var(--lose))"}
            />
            <Stat label="KDA" value={selfMeta.kda.toFixed(2)} accent={kdaColor(selfMeta.kda)} />
            <Stat label="표본" value={selfMeta.picks.toLocaleString()} />
          </div>
        )}
      </div>

      {/* 능력치 & 스킬 (공식 사이트 기준) */}
      {profile && <CypherProfileView profile={profile} />}

      {/* 메타 아이템 빌드 (슬롯별) */}
      {slots.length > 0 && (
        <div className="space-y-4">
          {/* 추천 빌드: 슬롯별 최다 채택 아이템 */}
          <section>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">추천 빌드</h2>
              <span className="text-xs text-gray-500">
                표본 {itemMeta?.picks.toLocaleString()} · 슬롯별 최다 채택
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {slots.map((s) => {
                const top = s.items[0];
                return (
                  <div key={s.equipSlotCode} className="card flex flex-col items-center gap-1.5 p-3">
                    <span className="text-[11px] font-semibold text-gray-500">{s.label}</span>
                    <ItemIcon
                      itemId={top.itemId}
                      itemName={top.itemName ?? undefined}
                      rarityCode={top.rarityCode ?? undefined}
                      size={40}
                    />
                    <span
                      className="w-full truncate text-center text-xs font-medium text-gray-100"
                      title={top.itemName ?? undefined}
                    >
                      {top.itemName ?? top.itemId}
                    </span>
                    <span className="text-xs font-bold text-primary">{top.rate}%</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 슬롯별 채택률 상세 */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">슬롯별 채택률</h2>
              <span className="text-xs text-gray-500">각 슬롯 상위 채택 아이템</span>
            </div>
            <div className="card divide-y divide-line">
              {slots.map((s) => (
                <div
                  key={s.equipSlotCode}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
                >
                  <div className="w-full shrink-0 text-sm font-semibold text-gray-300 sm:w-24">
                    {s.label}
                  </div>
                  <div className="flex flex-1 flex-wrap gap-x-4 gap-y-2">
                    {s.items.slice(0, 4).map((it) => (
                      <div key={it.itemId} className="flex items-center gap-2">
                        <ItemIcon
                          itemId={it.itemId}
                          itemName={it.itemName ?? undefined}
                          rarityCode={it.rarityCode ?? undefined}
                          size={28}
                        />
                        <div className="min-w-0">
                          <div className="max-w-[140px] truncate text-xs font-medium text-gray-100">
                            {it.itemName ?? it.itemId}
                          </div>
                          <div className="text-[11px] text-gray-500">{it.rate}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 지표 탭 */}
      <LinkTabs
        tabs={CHARACTER_RANKING_TYPES.map((t) => ({
          href: `/characters/${params.characterId}?rankingType=${t.type}`,
          label: t.label,
          active: t.type === rankingType,
        }))}
      />

      <h2 className="text-lg font-bold text-gray-100">
        {characterRankingLabel(rankingType)} 상위 랭커
      </h2>

      {error ? (
        <ErrorState message={error.message} hint={`code: ${error.code}`} />
      ) : rows.length === 0 ? (
        <EmptyState title="랭킹 데이터가 없습니다" icon="🏆" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-gray-500">
                <th className="w-16 px-4 py-2.5 text-left font-medium">순위</th>
                <th className="px-4 py-2.5 text-left font-medium">플레이어</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {characterRankingLabel(rankingType)}
                </th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">승/패</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const value =
                  rankingType === "winRate" && row.winRate !== undefined
                    ? `${row.winRate}%`
                    : (row.value ?? row.winCount ?? "-");
                const wr =
                  row.winCount !== undefined && row.loseCount !== undefined
                    ? winRate(row.winCount, row.loseCount)
                    : undefined;
                return (
                  <tr
                    key={row.player.playerId}
                    className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={`font-bold ${row.ranking <= 3 ? "text-primary" : "text-gray-400"}`}
                      >
                        {row.ranking}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/players/${row.player.playerId}`}
                        className="font-semibold text-gray-100 hover:text-primary"
                      >
                        {row.player.nickname}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-100">{value}</td>
                    <td className="hidden px-4 py-2.5 text-right text-gray-400 sm:table-cell">
                      {row.winCount !== undefined
                        ? `${row.winCount}승 ${row.loseCount ?? 0}패${wr !== undefined ? ` (${wr}%)` : ""}`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
