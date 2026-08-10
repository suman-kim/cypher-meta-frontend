import { notFound } from "next/navigation";
import { boardLabel, getNotices, getPosts, getTrending, isBoard } from "@/lib/community";
import { getRatingRanking } from "@/lib/neople";
import { ErrorState } from "@/components/ui";
import BoardSearch from "@/components/community/BoardSearch";
import TrendingCards from "@/components/community/TrendingCards";
import PostTable from "@/components/community/PostTable";
import NumberedPagination from "@/components/community/NumberedPagination";
import WeeklyRankingCard, { type RankRow } from "@/components/community/WeeklyRankingCard";
import NoticeCard from "@/components/community/NoticeCard";

export const runtime = "edge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

interface Props {
  params: { board: string };
  searchParams: { page?: string; q?: string };
}

export function generateMetadata({ params }: Props) {
  const label = isBoard(params.board) ? boardLabel(params.board) : "커뮤니티";
  return {
    title: `사이퍼즈 커뮤니티 · ${label}`,
    description:
      "사이퍼즈 커뮤니티 — 자유게시판·공략·팁을 나누고 인기 글과 주간 랭킹을 확인하세요.",
    alternates: { canonical: `/community/${params.board}` },
  };
}

export default async function BoardPage({ params, searchParams }: Props) {
  const board = params.board;
  if (!isBoard(board)) notFound();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const q = searchParams.q?.trim() || undefined;

  const [list, trending, notices, ranking] = await Promise.all([
    getPosts(board, { page, pageSize: PAGE_SIZE, q }).catch(() => null),
    getTrending(board, 3).catch(() => []),
    getNotices(5).catch(() => []),
    getRatingRanking({ limit: 5 })
      .then((r) => r.rows ?? [])
      .catch(() => []),
  ]);

  if (!list) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-black text-gray-50">{boardLabel(board)}</h1>
        <ErrorState
          message="커뮤니티 데이터를 불러오지 못했습니다."
          hint="백엔드 서버(:4000)와 DB가 실행 중인지 확인하세요."
        />
      </div>
    );
  }

  const rankRows: RankRow[] = ranking.map((r) => ({
    rank: r.ranking,
    nickname: r.player.nickname,
    rp: r.ratingPoint ?? 0,
    playerId: r.player.playerId,
  }));

  const makeHref = (p: number) =>
    `/community/${board}?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-50">{boardLabel(board)}</h1>
        <div className="w-full sm:w-80">
          <BoardSearch board={board} defaultValue={q ?? ""} />
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-6">
        <div className="space-y-4">
          {q ? (
            <p className="text-sm text-gray-500">
              &lsquo;{q}&rsquo; 검색 결과 {list.total.toLocaleString()}건
            </p>
          ) : (
            <TrendingCards board={board} posts={trending} />
          )}

          <PostTable board={board} notices={q ? [] : list.notices} posts={list.items} />

          <NumberedPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={list.total}
            makeHref={makeHref}
          />
        </div>

        <div className="mt-4 space-y-4 xl:mt-0">
          <WeeklyRankingCard rows={rankRows} />
          <NoticeCard notices={notices} />
        </div>
      </div>
    </div>
  );
}
