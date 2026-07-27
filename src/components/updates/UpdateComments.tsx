"use client";

import { FormEvent, useState } from "react";
import { postJSON } from "@/lib/api-client";
import { relativeTime } from "@/lib/format";
import type { UpdateComment } from "@/lib/updates";

/** 업데이트 상세의 비회원 댓글 섹션 — 목록(대댓글) + 작성/답글 + 비번 삭제 */
export default function UpdateComments({
  updateId,
  initialComments,
}: {
  updateId: string;
  initialComments: UpdateComment[];
}) {
  const [comments, setComments] = useState<UpdateComment[]>(initialComments);

  // 최상위 작성 폼
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 답글 폼(한 번에 하나만 열림)
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [rName, setRName] = useState("");
  const [rPassword, setRPassword] = useState("");
  const [rContent, setRContent] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const [rError, setRError] = useState<string | null>(null);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletePw, setDeletePw] = useState("");
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !password.trim() || !content.trim()) {
      setError("닉네임, 비밀번호, 내용을 모두 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const created = await postJSON<UpdateComment>(`/api/updates/${updateId}/comments`, {
        guestName: name,
        password,
        content,
      });
      setComments((prev) => [...prev, created]);
      setContent("");
      setPassword("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openReply(c: UpdateComment) {
    setReplyOpenId(replyOpenId === c.id ? null : c.id);
    setRName("");
    setRPassword("");
    setRContent("");
    setRError(null);
    setDeleteTarget(null);
  }

  async function onReply(e: FormEvent, target: UpdateComment) {
    e.preventDefault();
    setRError(null);
    if (!rName.trim() || !rPassword.trim() || !rContent.trim()) {
      setRError("닉네임, 비밀번호, 내용을 모두 입력해주세요.");
      return;
    }
    setRBusy(true);
    try {
      const created = await postJSON<UpdateComment>(`/api/updates/${updateId}/comments`, {
        guestName: rName,
        password: rPassword,
        content: rContent,
        parentId: target.parentId ?? target.id,
      });
      setComments((prev) => [...prev, created]);
      setReplyOpenId(null);
      setRContent("");
      setRPassword("");
      setRName("");
    } catch (err) {
      setRError((err as Error).message);
    } finally {
      setRBusy(false);
    }
  }

  function openDelete(c: UpdateComment) {
    setDeleteTarget(deleteTarget === c.id ? null : c.id);
    setDeletePw("");
    setDeleteErr(null);
    setReplyOpenId(null);
  }

  async function onDelete(e: FormEvent, commentId: string) {
    e.preventDefault();
    setDeleteErr(null);
    if (!deletePw.trim()) return;
    try {
      await postJSON(`/api/updates/comments/${commentId}/delete`, { password: deletePw });
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
      setDeleteTarget(null);
      setDeletePw("");
    } catch (err) {
      setDeleteErr((err as Error).message);
    }
  }

  /** 댓글 1개(아바타 + 본문 + 액션 + 열림 폼) */
  function renderComment(c: UpdateComment) {
    const initial = c.authorName?.trim()?.[0] ?? "익";
    return (
      <div className="rounded-xl border border-line bg-surface/60 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {initial}
            </span>
            <span className="text-sm font-semibold text-gray-200">{c.authorName ?? "익명"}</span>
            <span className="text-xs text-gray-500">{relativeTime(c.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openReply(c)} className="text-xs text-gray-500 transition-colors hover:text-primary">
              답글
            </button>
            <button type="button" onClick={() => openDelete(c)} className="text-xs text-gray-500 transition-colors hover:text-red-400">
              삭제
            </button>
          </div>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words pl-9 text-sm leading-relaxed text-gray-200">
          {c.content}
        </p>

        {deleteTarget === c.id && (
          <form onSubmit={(e) => onDelete(e, c.id)} className="mt-2.5 flex flex-wrap items-center gap-2 pl-9">
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
            {deleteErr && <span className="w-full text-xs text-red-400">{deleteErr}</span>}
          </form>
        )}

        {replyOpenId === c.id && (
          <form onSubmit={(e) => onReply(e, c)} className="mt-2.5 space-y-2 rounded-lg border border-line bg-surface-2/60 p-3">
            <div className="grid grid-cols-2 gap-2 sm:max-w-md">
              <input value={rName} onChange={(e) => setRName(e.target.value)} maxLength={20} placeholder="닉네임" className="input h-9 text-sm" />
              <input type="password" value={rPassword} onChange={(e) => setRPassword(e.target.value)} maxLength={30} placeholder="비밀번호" className="input h-9 text-sm" />
            </div>
            <textarea
              value={rContent}
              onChange={(e) => setRContent(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="답글을 입력하세요 (비회원)"
              className="input resize-y text-sm"
            />
            {rError && <p className="text-xs text-red-400">{rError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReplyOpenId(null)} className="btn-ghost px-3 py-1.5 text-xs">
                취소
              </button>
              <button type="submit" disabled={rBusy} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
                {rBusy ? "등록 중…" : "답글 등록"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface/70 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.035] sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-100">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        댓글 <span className="text-primary">{comments.length}</span>
      </h2>

      <ul className="mt-4 space-y-2.5">
        {topLevel.length === 0 && (
          <li className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-gray-500">
            첫 댓글을 남겨보세요.
          </li>
        )}
        {topLevel.map((c) => {
          const replies = repliesOf(c.id);
          return (
            <li key={c.id}>
              {renderComment(c)}
              {replies.length > 0 && (
                <ul className="mt-2.5 space-y-2.5 border-l-2 border-primary/20 pl-3.5">
                  {replies.map((r) => (
                    <li key={r.id}>{renderComment(r)}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* 최상위 댓글 작성 */}
      <form onSubmit={onSubmit} className="mt-5 rounded-xl border border-line bg-surface-2/40 p-4 dark:border-white/10">
        <p className="mb-2.5 text-xs font-semibold text-gray-400">
          의견 남기기 <span className="font-normal text-gray-500">· 비회원(닉네임 + 비밀번호)</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="닉네임" className="input" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={30} placeholder="비밀번호" className="input" />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="이 업데이트에 대한 의견을 남겨주세요."
          className="input mt-2 resize-y"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-2 flex justify-end">
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? "등록 중…" : "댓글 등록"}
          </button>
        </div>
      </form>
    </section>
  );
}
