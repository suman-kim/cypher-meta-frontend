import Link from "next/link";
import { getRatingRanking, NeopleApiError } from "@/lib/neople";
import RankingTabs from "@/components/RankingTabs";
import Pagination from "@/components/Pagination";
import { EmptyState, ErrorState } from "@/components/ui";
import { winRate } from "@/lib/format";
import type { RatingRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "평점 랭킹" };

const LIMIT = 50;

interface Props {
  searchParams: { offset?: string };
}

function initials(name?: string) {
  return (name?.trim()?.slice(0, 2) || "?").toUpperCase();
}

function PodiumCard({ row, place }: { row: RatingRankingRow; place: 1 | 2 | 3 }) {
  const wr = winRate(row.win, row.lose);
  const first = place === 1;
  const ring = place === 1 ? "#1d57ba" : place === 2 ? "#8b95a5" : "#c07b3f";
  const badge =
    place === 1
      ? "bg-primary text-white"
      : place === 2
        ? "bg-surface-3 text-gray-200"
        : "bg-[#c07b3f] text-white";
  const size = first ? 96 : 76;
  return (
    <Link
      href={`/players/${row.player.playerId}`}
      className={`card relative flex flex-col items-center px-6 pb-5 pt-8 transition-colors hover:bg-surface-2 ${
        first ? "ring-2 ring-primary" : ""
      }`}
    >
      <span className={`chip absolute left-4 top-4 ${badge}`}>{place}위</span>
      <span
        className="grid shrink-0 place-items-center rounded-full font-black text-white ring-4 ring-white/50"
        style={{ width: size, height: size, backgroundColor: ring }}
      >
        <span className={first ? "text-2xl" : "text-xl"}>{initials(row.player.nickname)}</span>
      </span>
      <div className={`mt-3 truncate font-bold ${first ? "text-xl text-primary" : "text-gray-100"}`}>
        {row.player.nickname}
      </div>
      <div className="text-sm text-gray-500">
        {row.player.grade ? `등급 ${row.player.grade} · ` : ""}
        {(row.ratingPoint ?? 0).toLocaleString()} RP
      </div>
      <div className="mt-3 w-full">
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-primary" style={{ width: `${wr}%` }} />
        </div>
        <div className="mt-1.5 text-center text-sm font-semibold text-primary">
          승률 {wr}%{first ? ` (${row.win ?? 0}승 ${row.lose ?? 0}패)` : ""}
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

  const showPodium = offset === 0 && rows.length >= 3;
  const podium = showPodium ? rows.slice(0, 3) : [];
  const tableRows = showPodium ? rows.slice(3) : rows;

  return (
    <div className="space-y-5">
      <RankingTabs active="rating" />
      <h1 className="text-2xl font-black text-gray-50">전체 랭킹</h1>

      {showPodium && (
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
          <div className="sm:order-2">
            <PodiumCard row={podium[0]} place={1} />
          </div>
          <div className="sm:order-1">
            <PodiumCard row={podium[1]} place={2} />
          </div>
          <div className="sm:order-3">
            <PodiumCard row={podium[2]} place={3} />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="랭킹 데이터가 없습니다" icon="🏆" />
      ) : (
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
                const wr = winRate(row.win, row.lose);
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
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-bold text-gray-400">
                          {initials(row.player.nickname)}
                        </span>
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
                        <div className="mt-1 text-center text-xs font-medium text-gray-500">{wr}%</div>
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
      )}

      <Pagination offset={offset} limit={LIMIT} count={rows.length} makeHref={(o) => `/ranking?offset=${o}`} />
    </div>
  );
}
