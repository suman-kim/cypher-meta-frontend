"use client";

import { Fragment, FormEvent, useCallback, useEffect, useState } from "react";
import { boardLabel } from "@/lib/community";

interface AdminPost {
  id: string;
  seq: number;
  boardType: string;
  category: string;
  isNotice: boolean;
  title: string;
  authorName: string | null;
  views: number;
  likes: number;
  commentCount: number;
  createdAt: string;
}
interface AdminComment {
  id: string;
  authorName: string | null;
  content: string;
  createdAt: string;
}
interface ListResp {
  items: AdminPost[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 게시판 관리 — 전체 글 표(검색·페이지네이션), 공지 지정/해제, 삭제, 댓글 보기/삭제 */
export default function BoardManager({ token }: { token: string }) {
  const [items, setItems] = useState<AdminPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const load = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
        if (q) params.set("q", q);
        const r = await fetch(`/api/admin/community/posts?${params.toString()}`, {
          headers: { "x-admin-token": token },
        });
        if (!r.ok) throw new Error(`목록 조회 실패 (${r.status})`);
        const data = (await r.json()) as ListResp;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch (e) {
        setError((e as Error).message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load(page, query);
  }, [load, page, query]);

  function search(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(term.trim());
  }

  async function act(url: string, body?: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "x-admin-token": token, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) {
      const t = await r.json().catch(() => ({}));
      throw new Error((t as { message?: string })?.message ?? `요청 실패 (${r.status})`);
    }
  }

  async function toggleNotice(p: AdminPost) {
    setBusy(p.id);
    try {
      await act(`/api/admin/community/posts/${p.id}/notice`, { isNotice: !p.isNotice });
      await load(page, query);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function del(p: AdminPost) {
    if (!window.confirm(`"${p.title}" 글을 삭제할까요? 댓글도 함께 삭제됩니다.`)) return;
    setBusy(p.id);
    try {
      await act(`/api/admin/community/posts/${p.id}/delete`);
      if (openId === p.id) setOpenId(null);
      await load(page, query);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function openComments(p: AdminPost) {
    if (openId === p.id) {
      setOpenId(null);
      return;
    }
    setOpenId(p.id);
    setCommentsLoading(true);
    setComments([]);
    try {
      const r = await fetch(`/api/admin/community/posts/${p.id}/comments`, {
        headers: { "x-admin-token": token },
      });
      setComments(r.ok ? ((await r.json()) as AdminComment[]) : []);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function delComment(c: AdminComment) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    try {
      await act(`/api/admin/community/comments/${c.id}/delete`);
      setComments((prev) => prev.filter((x) => x.id !== c.id));
      await load(page, query);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-400">
          전체 <b className="text-gray-200">{total.toLocaleString("ko-KR")}</b>개 글
        </div>
        <form onSubmit={search} className="flex items-center gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="제목·내용 검색"
            className="input h-9 w-44"
          />
          <button type="submit" className="btn-ghost h-9">
            검색
          </button>
        </form>
      </div>

      {error && <p className="rounded-md bg-lose/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
              <th className="w-14 px-3 py-2.5 text-left">번호</th>
              <th className="w-24 px-3 py-2.5 text-left">게시판</th>
              <th className="px-3 py-2.5 text-left">제목</th>
              <th className="w-24 px-3 py-2.5 text-left">작성자</th>
              <th className="w-28 px-3 py-2.5 text-center">조회/추천/댓글</th>
              <th className="w-24 px-3 py-2.5 text-left">작성일</th>
              <th className="w-44 px-3 py-2.5 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                  글이 없습니다.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((p) => (
                <Fragment key={p.id}>
                  <tr className="border-b border-line last:border-0 hover:bg-surface-2/40">
                    <td className="px-3 py-2 text-gray-500">{p.seq}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-400">
                      {boardLabel(p.boardType)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {p.isNotice && (
                          <span className="chip shrink-0 bg-primary/15 px-1.5 py-0 text-[10px] font-bold text-primary">
                            공지
                          </span>
                        )}
                        <span className="truncate text-gray-100" title={p.title}>
                          {p.title}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-400">{p.authorName ?? "-"}</td>
                    <td className="px-3 py-2 text-center text-xs tabular-nums text-gray-500">
                      {p.views}/{p.likes}/{p.commentCount}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                      {fmtDate(p.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleNotice(p)}
                          disabled={busy === p.id}
                          className={`h-7 rounded-md px-2 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                            p.isNotice
                              ? "bg-primary/15 text-primary hover:bg-primary/25"
                              : "border border-line text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {p.isNotice ? "공지 해제" : "공지 지정"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openComments(p)}
                          className={`h-7 rounded-md border px-2 text-[11px] transition-colors ${
                            openId === p.id
                              ? "border-primary/50 text-primary"
                              : "border-line text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          댓글 {p.commentCount}
                        </button>
                        <button
                          type="button"
                          onClick={() => del(p)}
                          disabled={busy === p.id}
                          className="h-7 rounded-md border border-lose/40 px-2 text-[11px] font-semibold text-red-300 transition-colors hover:bg-lose/10 disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                  {openId === p.id && (
                    <tr className="border-b border-line bg-surface-2/30">
                      <td colSpan={7} className="px-4 py-3">
                        {commentsLoading ? (
                          <div className="text-center text-xs text-gray-500">댓글 불러오는 중…</div>
                        ) : comments.length === 0 ? (
                          <div className="text-center text-xs text-gray-500">댓글이 없습니다.</div>
                        ) : (
                          <ul className="space-y-1.5">
                            {comments.map((c) => (
                              <li key={c.id} className="flex items-start gap-2 text-xs">
                                <span className="shrink-0 font-semibold text-gray-400">
                                  {c.authorName ?? "-"}
                                </span>
                                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-gray-300">
                                  {c.content}
                                </span>
                                <span className="shrink-0 text-gray-600">{fmtDate(c.createdAt)}</span>
                                <button
                                  type="button"
                                  onClick={() => delComment(c)}
                                  className="shrink-0 font-semibold text-red-300 hover:underline"
                                >
                                  삭제
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-ghost h-8 px-3 disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-sm text-gray-400">
            {page} / {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="btn-ghost h-8 px-3 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
