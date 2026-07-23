import Link from "next/link";
import { getTsjRanking, NeopleApiError } from "@/lib/neople";
import RankingTabs from "@/components/RankingTabs";
import Pagination from "@/components/Pagination";
import { EmptyState, ErrorState, LinkTabs } from "@/components/ui";
import { TSJ_TYPES, tsjLabel } from "@/lib/constants";
import { winRate } from "@/lib/format";
import type { TsjRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "결투장 랭킹" };

const LIMIT = 50;

interface Props {
  searchParams: { tsjType?: string; offset?: string };
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

  return (
    <div className="space-y-4">
      <RankingTabs active="tsj" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-50">결투장 랭킹</h1>
        <LinkTabs
          tabs={TSJ_TYPES.map((t) => ({
            href: `/ranking/tsj?tsjType=${t.type}`,
            label: t.label,
            active: t.type === tsjType,
          }))}
        />
      </div>

      {error ? (
        <ErrorState message={error.message} hint={`code: ${error.code}`} />
      ) : rows.length === 0 ? (
        <EmptyState title={`${tsjLabel(tsjType)} 랭킹 데이터가 없습니다`} icon="⚔️" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border text-xs text-gray-500">
                  <th className="w-16 px-4 py-2.5 text-left font-medium">순위</th>
                  <th className="px-4 py-2.5 text-left font-medium">플레이어</th>
                  <th className="px-4 py-2.5 text-right font-medium">점수</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">승/패</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
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
                      <td className="px-4 py-2.5 text-right font-bold text-gray-100">
                        {row.score ?? "-"}
                      </td>
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
