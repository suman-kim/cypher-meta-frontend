import Link from "next/link";
import { getRatingRanking, NeopleApiError } from "@/lib/neople";
import { enrichPlayer, mapLimit, type PlayerMeta } from "@/lib/ranking-enrich";
import { PLAYSTYLE_SAMPLE } from "@/lib/badges";
import RankingTabs from "@/components/RankingTabs";
import Pagination from "@/components/Pagination";
import { EmptyState, ErrorState } from "@/components/ui";
import PodiumCard from "@/components/ranking/PodiumCard";
import RankAvatar from "@/components/ranking/RankAvatar";
import TagChips from "@/components/ranking/TagChips";
import PickList from "@/components/ranking/PickList";
import RankChange from "@/components/ranking/RankChange";
import type { RatingRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "전체 랭킹" };

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
    <Link
      href={`/players/${row.player.playerId}`}
      className="card flex flex-col gap-3 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-float sm:flex-row sm:items-center"
    >
      <div className="flex items-center gap-3 sm:w-52 sm:shrink-0">
        <div className="flex w-7 shrink-0 flex-col items-center gap-0.5">
          <span className="text-lg font-black text-gray-400">{rank}</span>
          <RankChange rank={rank} beforeRank={row.beforeRank} />
        </div>
        <RankAvatar
          characterId={meta?.topChar?.characterId}
          characterName={meta?.topChar?.characterName}
          nickname={row.player.nickname}
          size={44}
          zoom={2}
        />
        <div className="min-w-0">
          <div className="truncate font-bold text-gray-100">{row.player.nickname}</div>
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
    </Link>
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

  // 상위 100위까지만 최근 공식전 기록으로 승률·픽·성향 태그 계산 (10위 이내는 표본 넉넉히)
  // enrich 실패는 페이지 렌더를 막지 않는다(랭킹 자체는 항상 표시).
  let metaMap = new Map<string, PlayerMeta>();
  try {
    const enrichTargets = rows
      .map((r, i) => ({ r, rank: offset + i + 1 }))
      .filter((x) => x.rank <= 100);
    const metas = await mapLimit(enrichTargets, 8, (x) =>
      enrichPlayer(x.r.player.playerId, PLAYSTYLE_SAMPLE),
    );
    metaMap = new Map<string, PlayerMeta>(metas.map((m) => [m.playerId, m]));
  } catch {
    metaMap = new Map<string, PlayerMeta>();
  }

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
        <div className="card divide-y divide-line overflow-hidden">
          {tableRows.map((row) => {
            const meta = metaMap.get(row.player.playerId);
            const wr = meta?.winRate ?? 0;
            const hasRecord = (meta?.total ?? 0) > 0;
            return (
              <Link
                key={row.player.playerId}
                href={`/players/${row.player.playerId}`}
                className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-surface-2 sm:px-4"
              >
                {/* 순위 + 변동 */}
                <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 pt-0.5">
                  <span
                    className={`text-sm font-black ${row.ranking <= 3 ? "text-primary" : "text-gray-400"}`}
                  >
                    {row.ranking}
                  </span>
                  <RankChange rank={row.ranking} beforeRank={row.beforeRank} />
                </div>

                {/* 아바타 */}
                <RankAvatar
                  characterId={meta?.topChar?.characterId}
                  characterName={meta?.topChar?.characterName}
                  nickname={row.player.nickname}
                  size={40}
                  zoom={2}
                />

                {/* 이름/클랜 + 성향 태그 + 픽 TOP3 (모든 화면에서 노출) */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div>
                    <div className="truncate font-bold leading-tight text-gray-100">
                      {row.player.nickname}
                    </div>
                    {row.player.clanName && (
                      <div className="truncate text-xs text-gray-500">{row.player.clanName}</div>
                    )}
                  </div>
                  {meta && meta.picks.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-[10px] font-semibold text-gray-500">픽</span>
                      <PickList picks={meta.picks} compact />
                    </div>
                  )}
                </div>

                {/* RP + 승률/승패 — 우측 한 칼럼으로 세로 정렬(모바일 폭 확보). 101위+ 는 RP만 */}
                <div className="flex w-[4.5rem] shrink-0 flex-col items-end gap-0.5 pt-0.5 sm:w-24">
                  <div className="whitespace-nowrap font-bold text-primary">
                    <span className="text-sm">{(row.ratingPoint ?? 0).toLocaleString()}</span>
                    <span className="ml-0.5 text-[10px] font-semibold text-gray-400">RP</span>
                  </div>
                  {hasRecord && (
                    <>
                      <div className="mt-1 h-1.5 w-12 overflow-hidden rounded-full bg-surface-3 sm:w-20">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${wr}%` }} />
                      </div>
                      <div className="text-xs font-bold text-gray-100">{wr}%</div>
                      <div className="whitespace-nowrap text-[11px] text-gray-500">
                        {meta?.wins ?? 0}승 {(meta?.total ?? 0) - (meta?.wins ?? 0)}패
                      </div>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      <Pagination offset={offset} limit={LIMIT} count={rows.length} makeHref={(o) => `/ranking?offset=${o}`} />
    </div>
  );
}
