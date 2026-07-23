import Link from "next/link";

export interface RankRow {
  rank: number;
  nickname: string;
  rp: number;
  playerId?: string;
}

export default function WeeklyRankingCard({ rows }: { rows: RankRow[] }) {
  return (
    <div className="card p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-100">
        🏆 주간 랭킹 TOP 5
      </h3>
      <ol className="mt-3 space-y-2.5">
        {rows.length === 0 && (
          <li className="text-xs text-gray-500">랭킹 데이터를 불러올 수 없습니다.</li>
        )}
        {rows.map((r) => (
          <li key={r.rank} className="flex items-center gap-2 text-sm">
            <span
              className={`w-4 shrink-0 text-center font-bold ${
                r.rank <= 3 ? "text-primary" : "text-gray-500"
              }`}
            >
              {r.rank}
            </span>
            {r.playerId ? (
              <Link
                href={`/players/${r.playerId}`}
                className="min-w-0 flex-1 truncate font-medium text-gray-200 hover:text-primary"
              >
                {r.nickname}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 truncate font-medium text-gray-200">
                {r.nickname}
              </span>
            )}
            <span className="shrink-0 text-xs font-semibold text-gray-500">
              {r.rp.toLocaleString()} RP
            </span>
          </li>
        ))}
      </ol>
      <Link href="/ranking" className="btn-ghost mt-3 w-full">
        더보기
      </Link>
    </div>
  );
}
