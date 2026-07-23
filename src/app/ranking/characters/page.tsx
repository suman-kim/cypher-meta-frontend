import Link from "next/link";
import { getCharacters, getCharacterRanking, NeopleApiError } from "@/lib/neople";
import RankingTabs from "@/components/RankingTabs";
import Pagination from "@/components/Pagination";
import { EmptyState, ErrorState, LinkTabs } from "@/components/ui";
import PodiumCard from "@/components/ranking/PodiumCard";
import RankAvatar from "@/components/ranking/RankAvatar";
import { Avatar } from "@/components/CharacterAvatar";
import RankingCharacterPicker from "@/components/ranking/RankingCharacterPicker";
import { CHARACTER_RANKING_TYPES, characterRankingLabel } from "@/lib/constants";
import { formatNumber, winRate } from "@/lib/format";
import type { CharacterRow, CharacterRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "캐릭터 랭킹" };

const LIMIT = 50;

interface Props {
  searchParams: { characterId?: string; rankingType?: string; offset?: string };
}

function metricValue(row: CharacterRankingRow, rankingType: string): string {
  if (rankingType === "winRate" && row.winRate !== undefined) return `${row.winRate}%`;
  return formatNumber(row.value ?? row.winCount);
}

function rowWinRate(row: CharacterRankingRow): number | undefined {
  if (row.winCount !== undefined && row.loseCount !== undefined) {
    return winRate(row.winCount, row.loseCount);
  }
  return undefined;
}

export default async function CharacterRankingPage({ searchParams }: Props) {
  const characterId = searchParams.characterId ?? "";
  const rankingType = CHARACTER_RANKING_TYPES.some((t) => t.type === searchParams.rankingType)
    ? (searchParams.rankingType as string)
    : "winCount";
  const offset = Math.max(0, parseInt(searchParams.offset ?? "0", 10) || 0);

  let characters: CharacterRow[] = [];
  let charError: NeopleApiError | null = null;
  try {
    const res = await getCharacters();
    characters = (res.rows ?? []).sort((a, b) =>
      a.characterName.localeCompare(b.characterName, "ko"),
    );
  } catch (e) {
    charError = e as NeopleApiError;
  }

  const charName = characters.find((c) => c.characterId === characterId)?.characterName;

  if (charError) {
    return (
      <div className="space-y-4">
        <RankingTabs active="characters" />
        <ErrorState message={charError.message} hint={`code: ${charError.code}`} />
      </div>
    );
  }

  // 캐릭터 미선택 → 이미지 그리드 선택 화면
  if (!characterId) {
    return (
      <div className="space-y-4">
        <RankingTabs active="characters" />
        <div>
          <h1 className="text-2xl font-black text-gray-50">캐릭터 랭킹</h1>
          <p className="mt-1 text-sm text-gray-500">
            캐릭터를 선택하면 해당 캐릭터의 지표별 상위 랭커를 보여줍니다.
          </p>
        </div>
        <RankingCharacterPicker characters={characters} rankingType={rankingType} />
      </div>
    );
  }

  // 선택됨 → 랭킹 조회
  let rows: CharacterRankingRow[] = [];
  let rankError: NeopleApiError | null = null;
  try {
    const res = await getCharacterRanking(characterId, rankingType, { offset, limit: LIMIT });
    rows = res.rows ?? [];
  } catch (e) {
    rankError = e as NeopleApiError;
  }

  const rankTabs = CHARACTER_RANKING_TYPES.map((t) => ({
    href: `/ranking/characters?characterId=${characterId}&rankingType=${t.type}`,
    label: t.label,
    active: t.type === rankingType,
  }));

  const showPodium = offset === 0 && rows.length >= 3;
  const podium = showPodium ? rows.slice(0, 3) : [];
  const tableRows = showPodium ? rows.slice(3) : rows;
  const metricLabel = characterRankingLabel(rankingType);

  const podiumProps = (row: CharacterRankingRow, place: 1 | 2 | 3) => {
    const wr = rowWinRate(row);
    return {
      place,
      href: `/players/${row.player.playerId}`,
      nickname: row.player.nickname,
      characterId,
      characterName: charName,
      subtitle: `${metricLabel} ${metricValue(row, rankingType)}`,
      winRate: wr,
      record:
        row.winCount !== undefined && row.loseCount !== undefined
          ? { wins: row.winCount, loses: row.loseCount }
          : null,
    };
  };

  return (
    <div className="space-y-4">
      <RankingTabs active="characters" />

      {/* 선택된 캐릭터 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar characterId={characterId} characterName={charName} size={48} zoom={2} />
          <div>
            <h1 className="text-xl font-black text-gray-50">{charName ?? "캐릭터"} 랭킹</h1>
            <p className="text-xs text-gray-500">{metricLabel} 상위 랭커</p>
          </div>
        </div>
        <Link
          href={`/ranking/characters?rankingType=${rankingType}`}
          className="btn-ghost"
        >
          ← 다른 캐릭터 선택
        </Link>
      </div>

      <LinkTabs tabs={rankTabs} />

      {rankError ? (
        <ErrorState message={rankError.message} hint={`code: ${rankError.code}`} />
      ) : rows.length === 0 ? (
        <EmptyState title="랭킹 데이터가 없습니다" icon="🏆" />
      ) : (
        <>
          {showPodium && (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
              <div className="sm:order-2">
                <PodiumCard {...podiumProps(podium[0], 1)} />
              </div>
              <div className="sm:order-1">
                <PodiumCard {...podiumProps(podium[1], 2)} />
              </div>
              <div className="sm:order-3">
                <PodiumCard {...podiumProps(podium[2], 3)} />
              </div>
            </div>
          )}

          {tableRows.length > 0 && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
                    <th className="w-16 px-4 py-3 text-left">순위</th>
                    <th className="px-4 py-3 text-left">플레이어</th>
                    <th className="px-4 py-3 text-right">{metricLabel}</th>
                    <th className="hidden px-4 py-3 text-center sm:table-cell">승률</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    const wr = rowWinRate(row);
                    return (
                      <tr
                        key={row.player.playerId}
                        className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`font-bold ${row.ranking <= 3 ? "text-primary" : "text-gray-400"}`}
                          >
                            {row.ranking}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/players/${row.player.playerId}`}
                            className="inline-flex items-center gap-2.5 font-semibold text-gray-100 hover:text-primary"
                          >
                            <RankAvatar
                              characterId={characterId}
                              characterName={charName}
                              nickname={row.player.nickname}
                              size={32}
                              zoom={2}
                            />
                            {row.player.nickname}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-100">
                          {metricValue(row, rankingType)}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {wr !== undefined ? (
                            <div className="mx-auto max-w-[160px]">
                              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${wr}%` }} />
                              </div>
                              <div className="mt-1 text-center text-xs font-medium text-gray-500">
                                {wr}% ({row.winCount ?? 0}승 {row.loseCount ?? 0}패)
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-gray-500">-</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            offset={offset}
            limit={LIMIT}
            count={rows.length}
            makeHref={(o) =>
              `/ranking/characters?characterId=${characterId}&rankingType=${rankingType}&offset=${o}`
            }
          />
        </>
      )}
    </div>
  );
}
