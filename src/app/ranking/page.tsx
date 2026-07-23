import Link from "next/link";
import { getRatingRanking, NeopleApiError } from "@/lib/neople";
import { enrichPlayer, mapLimit, type PlayerMeta } from "@/lib/ranking-enrich";
import RankingTabs from "@/components/RankingTabs";
import Pagination from "@/components/Pagination";
import { EmptyState, ErrorState } from "@/components/ui";
import PodiumCard from "@/components/ranking/PodiumCard";
import RankAvatar from "@/components/ranking/RankAvatar";
import TagChips from "@/components/ranking/TagChips";
import PickList from "@/components/ranking/PickList";
import type { RatingRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "평점 랭킹" };

const LIMIT = 50;

interface Props {
  searchParams: { offset?: string };
}

function ratingSubtitle(row: RatingRankingRow): string {
  const grade = row.player.grade ? `등급 ${row.player.grade} · ` : "";
  return `${grade}${(row.ratingPoint ?? 0).toLocaleString()} RP`;
}

/** 4위~10위 하이라이트 행 */
function HighlightRow({
  row,
  rank,
  meta,
}: {
  row: RatingRankingRow;
  rank: number;
  meta?: PlayerMeta;
}) {
  const wr = meta?.winRate ?? 0;
  const hasRecord = (meta?.total ?? 0) > 0;
  const loses = (meta?.total ?? 0) - (meta?.wins ?? 0);
  return (
    <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 sm:w-52 sm:shrink-0">
        <span className="w-6 shrink-0 text-center text-lg font-black text-gray-400">{rank}</span>
        <RankAvatar
          characterId={meta?.topChar?.characterId}
          characterName={meta?.topChar?.characterName}
          nickname={row.player.nickname}
          size={44}
          zoom={2}
        />
        <div className="min-w-0">
          <Link
            href={`/players/${row.player.playerId}`}
            className="block truncate font-bold text-gray-100 hover:text-primary"
          >
            {row.player.nickname}
          </Link>
          {row.player.clanName && (
            <span className="block truncate text-xs text-gray-500">{row.player.clanName}</span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <TagChips tags={meta?.tags ?? []} />
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-semibold text-gray-500">픽 TOP3</span>
          <PickList picks={meta?.picks ?? []} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line pt-2 sm:w-36 sm:shrink-0 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <div className="text-right">
          <div className="text-sm font-semibold text-primary">
            {hasRecord ? `승률 ${wr}%` : "승률 -"}
          </div>
          {hasRecord && (
            <div className="text-xs text-gray-500">
              {meta?.wins ?? 0}승 {loses}패
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-primary">{(row.ratingPoint ?? 0).toLocaleString()}</div>
          <div className="text-[11px] text-gray-500">RP</div>
        </div>
      </div>
    </div>
  );
}

export default async function RatingRankingPage({ searchParams }: Props) {
  const offset = Math.max(0, parseInt(searchParams.offset ?? "0", 10) || 0);

  let rows: RatingRankingRow[] = [];
  let error: NeopleApiError | null = null;
  try {
    rows = (await getRatingRanking({ offset, limit: LIMIT })).rows ?? [];
  } catch (e) {
    error = e as NeopleApiError;
  }

  if (error) {
    return (
      <div className="space-y-5">
        <RankingTabs active="rating" />
        <ErrorState message={error.message} hint={`code: ${error.code}`} />
      </div>
    );
  }

  // 각 랭커의 최근 공식전 기록으로 승률·픽·태그 계산 (상위 10위는 표본 넉넉히)
  const metas = await mapLimit(rows, 8, (r, i) => {
    const rank = offset + i + 1;
    return enrichPlayer(r.player.playerId, rank <= 10 ? 30 : 12);
  });
  const metaMap = new Map<string, PlayerMeta>(metas.map((m) => [m.playerId, m]));

  const showTop = offset === 0 && rows.length >= 3;
  const podium = showTop ? rows.slice(0, 3) : [];
  const highlights = showTop ? rows.slice(3, 10) : [];
  const tableRows = showTop ? rows.slice(10) : rows;

  const podiumProps = (row: RatingRankingRow, place: 1 | 2 | 3) => {
    const m = metaMap.get(row.player.playerId);
    const hasRecord = (m?.total ?? 0) > 0;
    return {
      place,
      href: `/players/${row.player.playerId}`,
      nickname: row.player.nickname,
      characterId: m?.topChar?.characterId,
      characterName: m?.topChar?.characterName,
      subtitle: ratingSubtitle(row),
      winRate: hasRecord ? m!.winRate : undefined,
      record: hasRecord ? { wins: m!.wins, loses: m!.total - m!.wins } : null,
      tags: m?.tags,
      picks: m?.picks,
    };
  };

  return (
    <div className="space-y-5">
      <RankingTabs active="rating" />
      <h1 className="text-2xl font-black text-gray-50">전체 랭킹</h1>

      {showTop && (
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

      {highlights.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold text-gray-100">🏅 4위 ~ 10위</h2>
            <span className="text-xs text-gray-500">최근 공식전 기준 픽·승률·플레이 성향</span>
          </div>
          <div className="space-y-2">
            {highlights.map((row, i) => (
              <HighlightRow
                key={row.player.playerId}
                row={row}
                rank={i + 4}
                meta={metaMap.get(row.player.playerId)}
              />
            ))}
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <EmptyState title="랭킹 데이터가 없습니다" icon="🏆" />
      ) : tableRows.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
                <th className="w-16 px-4 py-3 text-left">순위</th>
                <th className="px-4 py-3 text-left">플레이어</th>
                <th className="px-4 py-3 text-center">승률</th>
                <th className="px-4 py-3 text-right">RP 점수</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const meta = metaMap.get(row.player.playerId);
                const wr = meta?.winRate ?? 0;
                const hasRecord = (meta?.total ?? 0) > 0;
                return (
                  <tr
                    key={row.player.playerId}
                    className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <span className={`font-bold ${row.ranking <= 3 ? "text-primary" : "text-gray-400"}`}>
                        {row.ranking}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/players/${row.player.playerId}`}
                        className="inline-flex items-center gap-2.5 font-semibold text-gray-100 hover:text-primary"
                      >
                        <RankAvatar
                          characterId={meta?.topChar?.characterId}
                          characterName={meta?.topChar?.characterName}
                          nickname={row.player.nickname}
                          size={32}
                          zoom={2}
                        />
                        {row.player.nickname}
                        {row.player.clanName && (
                          <span className="text-xs font-normal text-gray-500">{row.player.clanName}</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="mx-auto max-w-[180px]">
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${wr}%` }} />
                        </div>
                        <div className="mt-1 text-center text-xs font-medium text-gray-500">
                          {hasRecord ? `${wr}%` : "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {(row.ratingPoint ?? 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <Pagination offset={offset} limit={LIMIT} count={rows.length} makeHref={(o) => `/ranking?offset=${o}`} />
    </div>
  );
}
