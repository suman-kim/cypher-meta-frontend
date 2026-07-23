"use client";

import { FormEvent, useState } from "react";
import { postJSON } from "@/lib/api-client";
import { relativeTime } from "@/lib/format";
import type { CommunityComment } from "@/lib/community";

export default function CommentSection({
  postId,
  initialComments,
}: {
  postId: string;
  initialComments: CommunityComment[];
}) {
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletePw, setDeletePw] = useState("");
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !password.trim() || !content.trim()) {
      setError("닉네임, 비밀번호, 내용을 모두 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const created = await postJSON<CommunityComment>(
        `/api/community/posts/${postId}/comments`,
        { guestName: name, password, content },
      );
      setComments((prev) => [...prev, created]);
      setContent("");
      setPassword("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(e: FormEvent, commentId: string) {
    e.preventDefault();
    setDeleteErr(null);
    if (!deletePw.trim()) return;
    try {
      await postJSON(`/api/community/comments/${commentId}/delete`, { password: deletePw });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setDeleteTarget(null);
      setDeletePw("");
    } catch (err) {
      setDeleteErr((err as Error).message);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-gray-100">
        댓글 <span className="text-primary">{comments.length}</span>
      </h2>

      <ul className="mt-4 divide-y divide-line">
        {comments.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-500">
            첫 댓글을 남겨보세요.
          </li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-gray-200">{c.authorName ?? "익명"}</span>
                <span className="text-gray-500">{relativeTime(c.createdAt)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(deleteTarget === c.id ? null : c.id);
                  setDeletePw("");
                  setDeleteErr(null);
                }}
                className="text-xs text-gray-500 hover:text-lose"
              >
                삭제
              </button>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-gray-200">
              {c.content}
            </p>
            {deleteTarget === c.id && (
              <form onSubmit={(e) => onDelete(e, c.id)} className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  value={deletePw}
                  onChange={(e) => setDeletePw(e.target.value)}
                  placeholder="비밀번호"
                  className="input h-8 w-32 py-1 text-xs"
                  autoFocus
                />
                <button type="submit" className="btn-primary px-2.5 py-1 text-xs">
                  삭제 확인
                </button>
                {deleteErr && <span className="w-full text-xs text-red-300">{deleteErr}</span>}
              </form>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="mt-4 space-y-2 border-t border-line pt-4">
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="닉네임"
            className="input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={30}
            placeholder="비밀번호"
            className="input"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="댓글을 입력하세요 (비회원)"
          className="input resize-y"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? "등록 중…" : "댓글 등록"}
          </button>
        </div>
      </form>
    </section>
  );
}
