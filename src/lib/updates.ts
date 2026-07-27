/**
 * 업데이트 노트(패치노트) API 클라이언트 + 타입.
 * 읽기(fetch)는 서버 컴포넌트 전용으로 백엔드(NestJS)를 직접 호출한다.
 * 작성/수정/삭제(관리자)는 app/api/admin/updates/* 프록시 라우트를 통해 처리한다.
 */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/** 업데이트 노트 1건 */
export interface UpdateNote {
  id: string;
  version: string | null;
  title: string;
  content: string;
  published: boolean;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 업데이트 노트 댓글 1건(비회원) */
export interface UpdateComment {
  id: string;
  updateId: string;
  parentId: string | null;
  authorName: string | null;
  content: string;
  createdAt: string;
}

/** 공개 목록 조회 결과 */
export interface UpdateListResult {
  items: UpdateNote[];
  total: number;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`updates ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * 발행된 업데이트 노트 목록(최신순).
 * @param limit — 가져올 개수(기본 20)
 * @param offset — 건너뛸 개수(기본 0)
 */
export function getUpdates(limit = 20, offset = 0): Promise<UpdateListResult> {
  const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return api<UpdateListResult>(`/updates?${p.toString()}`);
}

/**
 * 최신 발행 업데이트 1건(메인 카드용). 실패 시 null.
 */
export async function getLatestUpdate(): Promise<UpdateNote | null> {
  try {
    const r = await api<{ latest: UpdateNote | null }>(`/updates/latest`);
    return r.latest ?? null;
  } catch {
    return null;
  }
}

/**
 * 발행된 업데이트 노트 단건(상세 페이지용). 없거나 실패 시 null.
 * @param id — 업데이트 노트 ID
 */
export async function getUpdate(id: string): Promise<UpdateNote | null> {
  try {
    return await api<UpdateNote>(`/updates/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

/**
 * 특정 업데이트의 댓글 목록(오름차순). 실패 시 빈 배열.
 * @param id — 업데이트 노트 ID
 */
export async function getUpdateComments(id: string): Promise<UpdateComment[]> {
  try {
    return await api<UpdateComment[]>(`/updates/${encodeURIComponent(id)}/comments`);
  } catch {
    return [];
  }
}
