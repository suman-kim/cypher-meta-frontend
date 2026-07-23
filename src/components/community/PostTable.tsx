import Link from "next/link";
import { categoryLabel, type CommunityPost } from "@/lib/community";

function formatViews(n: number): string {
  return n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString();
}

function TitleCell({ board, post }: { board: string; post: CommunityPost }) {
  return (
    <Link href={`/community/${board}/${post.id}`} className="hover:text-primary">
      {post.title}
      {post.commentCount > 0 && (
        <span className="ml-1 text-xs font-bold text-primary">[{post.commentCount}]</span>
      )}
    </Link>
  );
}

export default function PostTable({
  board,
  notices,
  posts,
}: {
  board: string;
  notices: CommunityPost[];
  posts: CommunityPost[];
}) {
  const empty = notices.length === 0 && posts.length === 0;

  return (
    <div className="card overflow-hidden">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
            <th className="w-14 px-3 py-3 text-center">번호</th>
            <th className="w-14 px-1 py-3 text-center">분류</th>
            <th className="px-3 py-3 text-left">제목</th>
            <th className="w-28 px-3 py-3 text-left">작성자</th>
            <th className="w-14 px-2 py-3 text-center">조회</th>
            <th className="w-14 px-2 py-3 text-center">추천</th>
          </tr>
        </thead>
        <tbody>
          {notices.map((n) => (
            <tr key={n.id} className="border-b border-line bg-primary/5">
              <td className="px-3 py-3 text-center text-xs font-bold text-primary">공지</td>
              <td className="px-1 py-3 text-center">
                <span className="chip bg-surface-3 text-gray-500">필독</span>
              </td>
              <td className="truncate px-3 py-3 font-semibold text-gray-100">
                <TitleCell board={board} post={n} />
              </td>
              <td className="truncate px-3 py-3 text-gray-400">{n.authorName ?? "운영진"}</td>
              <td className="px-2 py-3 text-center text-gray-500">{formatViews(n.views)}</td>
              <td className="px-2 py-3 text-center text-gray-500">{n.likes}</td>
            </tr>
          ))}

          {empty && (
            <tr>
              <td colSpan={6} className="px-3 py-16 text-center text-sm text-gray-500">
                게시글이 없습니다. 첫 글을 작성해보세요!
              </td>
            </tr>
          )}

          {posts.map((p) => (
            <tr
              key={p.id}
              className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
            >
              <td className="px-3 py-3 text-center text-gray-400">{p.seq}</td>
              <td className="px-1 py-3 text-center">
                <span className="chip bg-surface-3 text-gray-500">{categoryLabel(p.category)}</span>
              </td>
              <td className="truncate px-3 py-3 text-gray-200">
                <TitleCell board={board} post={p} />
              </td>
              <td className="truncate px-3 py-3 text-gray-400">{p.authorName ?? "익명"}</td>
              <td className="px-2 py-3 text-center text-gray-500">{formatViews(p.views)}</td>
              <td
                className={`px-2 py-3 text-center font-semibold ${
                  p.likes > 0 ? "text-primary" : "text-gray-500"
                }`}
              >
                {p.likes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
