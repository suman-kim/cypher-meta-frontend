import Link from "next/link";
import type { CommunityPost } from "@/lib/community";

export default function TrendingCards({
  board,
  posts,
}: {
  board: string;
  posts: CommunityPost[];
}) {
  if (posts.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {posts.map((p) => (
        <Link
          key={p.id}
          href={`/community/${board}/${p.id}`}
          className="card p-4 transition-colors hover:bg-surface-2"
        >
          <div className="flex items-center gap-1 text-xs font-bold text-primary">
            <span aria-hidden>📈</span> TRENDING
          </div>
          <p className="mt-2 line-clamp-1 font-bold text-gray-100">{p.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{p.content}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span className="truncate">작성자: {p.authorName ?? "익명"}</span>
            <span className="shrink-0 font-semibold text-gray-400">👍 {p.likes}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
