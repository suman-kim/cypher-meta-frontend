import Link from "next/link";
import { getCharacters, getCharacterRanking, NeopleApiError } from "@/lib/neople";
import { Avatar } from "@/components/CharacterAvatar";
import { EmptyState, ErrorState, LinkTabs } from "@/components/ui";
import { CHARACTER_RANKING_TYPES, characterRankingLabel } from "@/lib/constants";
import { winRate } from "@/lib/format";
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

  let rows: CharacterRankingRow[] = [];
  let error: NeopleApiError | null = null;
  try {
    const res = await getCharacterRanking(params.characterId, rankingType, { limit: 20 });
    rows = res.rows ?? [];
  } catch (e) {
    error = e as NeopleApiError;
    rows = [];
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="card flex items-center gap-4 p-5">
        <Avatar characterId={params.characterId} characterName={name} size={80} zoom={2} />
        <div>
          <h1 className="text-2xl font-black text-gray-50">{name ?? "캐릭터"}</h1>
          <p className="text-sm text-gray-500">지표별 상위 랭커를 확인하세요.</p>
          <div className="mt-2">
            <Link
              href={`/ranking/characters?characterId=${params.characterId}&rankingType=${rankingType}`}
              className="text-sm text-brand hover:text-brand-glow"
            >
              전체 랭킹 보기 →
            </Link>
          </div>
        </div>
      </div>

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
              <tr className="border-b border-bg-border text-xs text-gray-500">
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
                    className="border-b border-bg-border/60 transition-colors last:border-0 hover:bg-bg-hover"
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={`font-bold ${row.ranking <= 3 ? "text-brand-glow" : "text-gray-400"}`}
                      >
                        {row.ranking}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/players/${row.player.playerId}`}
                        className="font-semibold text-gray-100 hover:text-brand-glow"
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
