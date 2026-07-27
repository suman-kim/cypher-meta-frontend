import Link from "next/link";
import { categoryLabel, type CommunityPost } from "@/lib/community";

function formatViews(n: number): string {
  return n >= 10000 ? `${Math.round(n / 1000)}k` : n.toLocaleString("ko-KR");
}

/** 작성 시각 → 상대 시간(오래되면 MM.DD). 서버 컴포넌트에서 1회 계산 */
function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(t);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 제목 2줄 말줄임(line-clamp 플러그인 없이 인라인 스타일로) */
const clamp2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 10v11" />
      <path d="M18 21H7V10l4.2-6.6a1.9 1.9 0 0 1 3.3 1.9L13.4 9H19a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 21Z" />
    </svg>
  );
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

/** 모바일 전용 카드형 게시글 행(테이블 대체) */
function MobileRow({
  board,
  post,
  notice = false,
}: {
  board: string;
  post: CommunityPost;
  notice?: boolean;
}) {
  return (
    <li>
      <Link
        href={`/community/${board}/${post.id}`}
        className={`flex flex-col gap-1.5 px-3.5 py-3 transition-colors active:bg-surface-2 ${
          notice ? "bg-primary/5" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <span
            className={`chip mt-px shrink-0 ${
              notice ? "bg-primary/15 text-primary" : "bg-surface-3 text-gray-500"
            }`}
          >
            {notice ? "공지" : categoryLabel(post.category)}
          </span>
          <span
            className={`flex-1 text-sm leading-snug text-gray-100 ${notice ? "font-bold" : "font-medium"}`}
            style={clamp2}
          >
            {post.title}
            {post.commentCount > 0 && (
              <span className="ml-1 align-middle text-xs font-bold text-primary">[{post.commentCount}]</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="truncate font-medium text-gray-400">
            {post.authorName ?? (notice ? "운영진" : "익명")}
          </span>
          <span aria-hidden className="text-gray-300">·</span>
          <span suppressHydrationWarning>{timeAgo(post.createdAt)}</span>
          <span className="ml-auto flex shrink-0 items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <EyeIcon />
              {formatViews(post.views)}
            </span>
            <span className={`inline-flex items-center gap-1 ${post.likes > 0 ? "font-semibold text-primary" : ""}`}>
              <LikeIcon />
              {post.likes}
            </span>
          </span>
        </div>
      </Link>
    </li>
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
      {/* 데스크톱: 테이블 (md 이상) */}
      <table className="hidden w-full table-fixed text-sm md:table">
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

      {/* 모바일: 카드형 리스트 (md 미만) */}
      <ul className="divide-y divide-line md:hidden">
        {notices.map((n) => (
          <MobileRow key={n.id} board={board} post={n} notice />
        ))}

        {empty && (
          <li className="px-3.5 py-16 text-center text-sm text-gray-500">
            게시글이 없습니다. 첫 글을 작성해보세요!
          </li>
        )}

        {posts.map((p) => (
          <MobileRow key={p.id} board={board} post={p} />
        ))}
      </ul>
    </div>
  );
}
