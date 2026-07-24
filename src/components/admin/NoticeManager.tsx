"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BOARDS, boardLabel } from "@/lib/community";

interface Notice {
  id: string;
  seq: number;
  boardType: string;
  title: string;
  content: string;
  authorName: string | null;
  createdAt: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 공지사항 관리 — 추가/수정/삭제 */
export default function NoticeManager({ token }: { token: string }) {
  const [list, setList] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [board, setBoard] = useState("free");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/community/posts?noticeOnly=true&pageSize=100`, {
        headers: { "x-admin-token": token },
      });
      if (!r.ok) throw new Error(`공지 조회 실패 (${r.status})`);
      const data = (await r.json()) as { items: Notice[] };
      setList(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function reset() {
    setEditingId(null);
    setBoard("free");
    setTitle("");
    setContent("");
  }

  function edit(n: Notice) {
    setEditingId(n.id);
    setBoard(n.boardType);
    setTitle(n.title);
    setContent(n.content);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const url = editingId
        ? `/api/admin/community/posts/${editingId}/update`
        : `/api/admin/community/posts`;
      const body = editingId
        ? { board, title: title.trim(), content }
        : { board, title: title.trim(), content, isNotice: true, category: "info" };
      const r = await fetch(url, {
        method: "POST",
        headers: { "x-admin-token": token, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.json().catch(() => ({}));
        throw new Error((t as { message?: string })?.message ?? `저장 실패 (${r.status})`);
      }
      reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function del(n: Notice) {
    if (!window.confirm(`공지 "${n.title}" 를 삭제할까요?`)) return;
    try {
      const r = await fetch(`/api/admin/community/posts/${n.id}/delete`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      if (!r.ok) throw new Error(`삭제 실패 (${r.status})`);
      if (editingId === n.id) reset();
      await load();
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      {/* 작성/수정 폼 */}
      <form onSubmit={submit} className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-100">
            {editingId ? "✏️ 공지 수정" : "📢 새 공지 등록"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              + 새 공지 작성
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            className="input h-10 w-40"
          >
            {BOARDS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목"
            maxLength={120}
            className="input h-10 min-w-[200px] flex-1"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="공지 내용을 입력하세요."
          rows={5}
          maxLength={20000}
          className="input resize-y"
        />
        {error && <p className="rounded-md bg-lose/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-2">
          {editingId && (
            <button type="button" onClick={reset} className="btn-ghost">
              취소
            </button>
          )}
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? "저장 중…" : editingId ? "수정 저장" : "공지 등록"}
          </button>
        </div>
      </form>

      {/* 공지 목록 */}
      <div className="space-y-2">
        <div className="text-sm text-gray-400">
          등록된 공지 <b className="text-gray-200">{list.length}</b>개
        </div>
        {loading ? (
          <div className="card p-8 text-center text-sm text-gray-500">불러오는 중…</div>
        ) : list.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500">등록된 공지가 없습니다.</div>
        ) : (
          <ul className="space-y-2">
            {list.map((n) => (
              <li key={n.id} className="card flex items-center gap-3 p-3">
                <span className="chip shrink-0 bg-primary/15 font-bold text-primary">공지</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-gray-100">{n.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                    <span>{boardLabel(n.boardType)}</span>
                    <span>·</span>
                    <span>{fmtDate(n.createdAt)}</span>
                    {n.authorName && (
                      <>
                        <span>·</span>
                        <span>{n.authorName}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => edit(n)}
                  className="btn-ghost h-8 shrink-0 px-3 text-xs"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => del(n)}
                  className="h-8 shrink-0 rounded-md border border-lose/40 px-3 text-xs font-semibold text-red-300 transition-colors hover:bg-lose/10"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
