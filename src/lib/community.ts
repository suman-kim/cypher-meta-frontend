/**
 * 커뮤니티(게시판) API 클라이언트 + 게시판/분류 메타데이터.
 * 읽기(fetch) 함수는 서버 컴포넌트 전용이며 백엔드(NestJS)를 직접 호출합니다.
 * 쓰기(작성/추천/삭제/댓글)는 app/api/community/* 프록시 라우트를 통해 처리합니다.
 */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/* ------------------------------------------------------------------ */
/* 게시판 / 분류 메타                                                   */
/* ------------------------------------------------------------------ */

/**
 * 운영 중인 게시판(백엔드 community/dto.ts 의 BOARD_TYPES 와 일치).
 * free 는 예전 '자유게시판' 키를 그대로 이어받은 일반전 게시판 — 기존 글·링크(/community/free/…)가 그대로 유지된다.
 */
export const BOARDS = [
  { key: "rating", label: "공식전 게시판", icon: "🏆" },
  { key: "free", label: "일반전 게시판", icon: "💬" },
] as const;

/**
 * 운영을 멈춘 옛 게시판 — 글은 DB 에 남아 있지만 사용자 화면에는 나오지 않는다.
 * 관리자 화면에서 글의 원래 게시판 이름을 보여 주는 용도로만 쓴다.
 */
const RETIRED_BOARDS = [
  { key: "guide", label: "공략게시판(숨김)" },
  { key: "humor", label: "유머게시판(숨김)" },
  { key: "video", label: "영상게시판(숨김)" },
] as const;

export type BoardKey = (typeof BOARDS)[number]["key"];

/**
 * 운영 중인 게시판 키인지 검사한다(숨김 게시판은 false).
 * @param key — 게시판 키
 * @returns 운영 게시판이면 true
 */
export function isBoard(key: string): key is BoardKey {
  return BOARDS.some((b) => b.key === key);
}

/**
 * 게시판 표시 이름(숨김 게시판은 "(숨김)" 표기).
 * @param key — 게시판 키
 * @returns 표시 이름(모르는 키는 "게시판")
 */
export function boardLabel(key: string): string {
  return [...BOARDS, ...RETIRED_BOARDS].find((b) => b.key === key)?.label ?? "게시판";
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
  parentId: string | null;
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

async function api<T>(path: string, revalidate?: number): Promise<T> {
  const res = await fetch(`${API}${path}`, revalidate ? { next: { revalidate } } : { cache: "no-store" });
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

export function getNotices(limit = 5, revalidate?: number): Promise<CommunityPost[]> {
  return api<CommunityPost[]>(`/community/notices?limit=${limit}`, revalidate);
}

export function getRecentPosts(limit = 5, revalidate?: number): Promise<CommunityPost[]> {
  return api<CommunityPost[]>(`/community/recent?limit=${limit}`, revalidate);
}
