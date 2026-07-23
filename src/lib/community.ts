/**
 * 커뮤니티(게시판) API 클라이언트 + 게시판/분류 메타데이터.
 * 읽기(fetch) 함수는 서버 컴포넌트 전용이며 백엔드(NestJS)를 직접 호출합니다.
 * 쓰기(작성/추천/삭제/댓글)는 app/api/community/* 프록시 라우트를 통해 처리합니다.
 */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/* ------------------------------------------------------------------ */
/* 게시판 / 분류 메타                                                   */
/* ------------------------------------------------------------------ */

export const BOARDS = [
  { key: "free", label: "자유게시판", icon: "💬" },
  { key: "guide", label: "공략게시판", icon: "📖" },
  { key: "humor", label: "유머게시판", icon: "😄" },
  { key: "video", label: "영상게시판", icon: "🎬" },
] as const;

export type BoardKey = (typeof BOARDS)[number]["key"];

export function isBoard(key: string): key is BoardKey {
  return BOARDS.some((b) => b.key === key);
}

export function boardLabel(key: string): string {
  return BOARDS.find((b) => b.key === key)?.label ?? "게시판";
}

export const CATEGORIES = [
  { key: "free", label: "자유" },
  { key: "question", label: "질문" },
  { key: "info", label: "정보" },
  { key: "discussion", label: "토론" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? "자유";
}

/* ------------------------------------------------------------------ */
/* 타입                                                                */
/* ------------------------------------------------------------------ */

export interface CommunityPost {
  id: string;
  seq: number;
  boardType: string;
  category: string;
  isNotice: boolean;
  title: string;
  content: string;
  authorId: string | null;
  authorName: string | null;
  views: number;
  likes: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string | null;
  authorName: string | null;
  content: string;
  createdAt: string;
}

export interface PostListResult {
  items: CommunityPost[];
  notices: CommunityPost[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PostDetail extends CommunityPost {
  comments: CommunityComment[];
}

/* ------------------------------------------------------------------ */
/* 서버 전용 fetch                                                     */
/* ------------------------------------------------------------------ */

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`community ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export function getPosts(
  board: string,
  opts: { page?: number; pageSize?: number; q?: string } = {},
): Promise<PostListResult> {
  const p = new URLSearchParams({ board });
  if (opts.page) p.set("page", String(opts.page));
  if (opts.pageSize) p.set("pageSize", String(opts.pageSize));
  if (opts.q) p.set("q", opts.q);
  return api<PostListResult>(`/community/posts?${p.toString()}`);
}

export function getTrending(board: string, limit = 3): Promise<CommunityPost[]> {
  return api<CommunityPost[]>(`/community/posts/trending?board=${board}&limit=${limit}`);
}

export function getPost(id: string): Promise<PostDetail> {
  return api<PostDetail>(`/community/posts/${encodeURIComponent(id)}`);
}

export function getNotices(limit = 5): Promise<CommunityPost[]> {
  return api<CommunityPost[]>(`/community/notices?limit=${limit}`);
}
