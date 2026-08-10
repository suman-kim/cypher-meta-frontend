import Link from "next/link";
import { boardLabel, categoryLabel, getPost, type PostDetail } from "@/lib/community";
import { relativeTime } from "@/lib/format";
import { ErrorState } from "@/components/ui";
import CommentSection from "@/components/community/CommentSection";
import RecommendButton from "@/components/community/RecommendButton";
import DeletePostButton from "@/components/community/DeletePostButton";

export const runtime = "edge";

export const dynamic = "force-dynamic"; // 댓글 신선도 위해 동적 유지

interface Props {
  params: { board: string; postId: string };
}

export default async function PostDetailPage({ params }: Props) {
  let post: PostDetail;
  try {
    post = await getPost(params.postId);
  } catch {
    return (
      <ErrorState
        message="게시글을 불러올 수 없습니다."
        hint="삭제되었거나 존재하지 않는 글일 수 있습니다."
      />
    );
  }

  const board = params.board;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={`/community/${board}`}
        className="inline-block text-sm text-gray-400 hover:text-primary"
      >
        ← {boardLabel(post.boardType)} 목록
      </Link>

      <article className="card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-surface-3 text-gray-500">
            {post.isNotice ? "공지" : categoryLabel(post.category)}
          </span>
          <h1 className="text-lg font-bold text-gray-50">{post.title}</h1>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line pb-4 text-xs text-gray-500">
          <span className="font-medium text-gray-400">{post.authorName ?? "익명"}</span>
          <span>{relativeTime(post.createdAt)}</span>
          <span>조회 {post.views.toLocaleString()}</span>
          <span>추천 {post.likes}</span>
          <span>댓글 {post.commentCount}</span>
        </div>

        <div className="mt-5 min-h-[120px] whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">
          {post.content}
        </div>

        <div className="mt-6 flex justify-center">
          <RecommendButton postId={post.id} initialLikes={post.likes} />
        </div>

        {!post.isNotice && (
          <div className="mt-6 flex items-center justify-end border-t border-line pt-4">
            <DeletePostButton postId={post.id} board={board} />
          </div>
        )}
      </article>

      <CommentSection postId={post.id} initialComments={post.comments} />
    </div>
  );
}
