import Link from "next/link";
import { getTsjRanking, NeopleApiError } from "@/lib/neople";
import { loadRepChars, type RepChar } from "@/lib/ranking-enrich";
import RankingTabs from "@/components/RankingTabs";
import Pagination from "@/components/Pagination";
import { EmptyState, ErrorState, LinkTabs } from "@/components/ui";
import PodiumCard from "@/components/ranking/PodiumCard";
import RankAvatar from "@/components/ranking/RankAvatar";
import { TSJ_TYPES, tsjLabel } from "@/lib/constants";
import { formatNumber, winRate } from "@/lib/format";
import type { TsjRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "결투장 랭킹" };

const LIMIT = 50;

interface Props {
  searchParams: { tsjType?: string; offset?: string };
}

function rowWinRate(row: TsjRankingRow): number | undefined {
  if (row.winCount !== undefined && row.loseCount !== undefined) {
    return winRate(row.winCount, row.loseCount);
  }
  return undefined;
}

export default async function TsjRankingPage({ searchParams }: Props) {
  const tsjType = TSJ_TYPES.some((t) => t.type === searchParams.tsjType)
    ? (searchParams.tsjType as string)
    : "melee";
  const offset = Math.max(0, parseInt(searchParams.offset ?? "0", 10) || 0);

  let rows: TsjRankingRow[] = [];
  let error: NeopleApiError | null = null;
  try {
    const res = await getTsjRanking(tsjType, { offset, limit: LIMIT });
    rows = res.rows ?? [];
  } catch (e) {
    error = e as NeopleApiError;
    rows = [];
  }

  // 아바타용 대표 캐릭터 조회 (결투장 응답엔 캐릭터가 없음)
  const repMap =
    rows.length > 0
      ? await loadRepChars(rows.map((r) => r.player.playerId))
      : new Map<string, RepChar | undefined>();

  const tsjTabs = TSJ_TYPES.map((t) => ({
    href: `/ranking/tsj?tsjType=${t.type}`,
    label: t.label,
    active: t.type === tsjType,
  }));

  const showPodium = offset === 0 && rows.length >= 3;
  const podium = showPodium ? rows.slice(0, 3) : [];
  const tableRows = showPodium ? rows.slice(3) : rows;

  const podiumProps = (row: TsjRankingRow, place: 1 | 2 | 3) => {
    const rep = repMap.get(row.player.playerId);
    const wr = rowWinRate(row);
    return {
      place,
      href: `/players/${row.player.playerId}`,
      nickname: row.player.nickname,
      characterId: rep?.characterId,
      characterName: rep?.characterName,
      subtitle: `점수 ${formatNumber(row.score)}`,
      winRate: wr,
      record:
        row.winCount !== undefined && row.loseCount !== undefined
          ? { wins: row.winCount, loses: row.loseCount }
          : null,
    };
  };

  return (
    <div className="space-y-4">
      <RankingTabs active="tsj" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-gray-50">결투장 랭킹</h1>
        <LinkTabs tabs={tsjTabs} />
      </div>

      {error ? (
        <ErrorState message={error.message} hint={`code: ${error.code}`} />
      ) : rows.length === 0 ? (
        <EmptyState title={`${tsjLabel(tsjType)} 랭킹 데이터가 없습니다`} icon="⚔️" />
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
                    <th className="px-4 py-3 text-center">승률</th>
                    <th className="px-4 py-3 text-right">점수</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    const rep = repMap.get(row.player.playerId);
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
                              characterId={rep?.characterId}
                              characterName={rep?.characterName}
                              nickname={row.player.nickname}
                              size={32}
                              zoom={2}
                            />
                            {row.player.nickname}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {wr !== undefined ? (
                            <div className="mx-auto max-w-[180px]">
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
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {formatNumber(row.score)}
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
            makeHref={(o) => `/ranking/tsj?tsjType=${tsjType}&offset=${o}`}
          />
        </>
      )}
    </div>
  );
}
