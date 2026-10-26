"use client";

import { FormEvent, useState } from "react";
import { postJSON } from "@/lib/api-client";
import { useBannedWords } from "@/lib/banned-words";
import BannedWordAlert from "@/components/community/BannedWordAlert";
import { relativeTime } from "@/lib/format";
import type { CommunityComment } from "@/lib/community";

/** 금칙어가 걸린 입력칸 테두리 강조 */
const BANNED_INPUT = "border-lose/70 focus:border-lose";

export default function CommentSection({
  postId,
  initialComments,
}: {
  postId: string;
  initialComments: CommunityComment[];
}) {
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);

  // 최상위 작성 폼
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const banned = useBannedWords();

  // 답글 폼(한 번에 하나만 열림)
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [rName, setRName] = useState("");
  const [rPassword, setRPassword] = useState("");
  const [rContent, setRContent] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const [rError, setRError] = useState<string | null>(null);
  const rBanned = useBannedWords();

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletePw, setDeletePw] = useState("");
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    banned.reset();
    if (!name.trim() || !password.trim() || !content.trim()) {
      setError("닉네임, 비밀번호, 내용을 모두 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const created = await postJSON<CommunityComment>(`/api/community/posts/${postId}/comments`, {
        guestName: name,
        password,
        content,
      });
      setComments((prev) => [...prev, created]);
      setContent("");
      setPassword("");
    } catch (err) {
      if (!banned.capture(err, { content, guestName: name })) setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openReply(c: CommunityComment) {
    setReplyOpenId(replyOpenId === c.id ? null : c.id);
    setRName("");
    setRPassword("");
    setRContent("");
    setRError(null);
    rBanned.reset();
    setDeleteTarget(null);
  }

  async function onReply(e: FormEvent, target: CommunityComment) {
    e.preventDefault();
    setRError(null);
    rBanned.reset();
    if (!rName.trim() || !rPassword.trim() || !rContent.trim()) {
      setRError("닉네임, 비밀번호, 내용을 모두 입력해주세요.");
      return;
    }
    setRBusy(true);
    try {
      const created = await postJSON<CommunityComment>(`/api/community/posts/${postId}/comments`, {
        guestName: rName,
        password: rPassword,
        content: rContent,
        parentId: target.parentId ?? target.id, // 대댓글은 스레드 최상위에 귀속
      });
      setComments((prev) => [...prev, created]);
      setReplyOpenId(null);
      setRContent("");
      setRPassword("");
      setRName("");
    } catch (err) {
      if (!rBanned.capture(err, { content: rContent, guestName: rName })) setRError((err as Error).message);
    } finally {
      setRBusy(false);
    }
  }

  function openDelete(c: CommunityComment) {
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
      await postJSON(`/api/community/comments/${commentId}/delete`, { password: deletePw });
      // 원댓글 삭제 시 대댓글도 함께 사라짐
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
      setDeleteTarget(null);
      setDeletePw("");
    } catch (err) {
      setDeleteErr((err as Error).message);
    }
  }

  /** 댓글 1개(본문 + 액션 + 열림 상태의 폼들) */
  function renderComment(c: CommunityComment, isReply: boolean) {
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            {isReply && <span className="text-gray-500">↳</span>}
            <span className="font-semibold text-gray-200">{c.authorName ?? "익명"}</span>
            <span className="text-gray-500">{relativeTime(c.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openReply(c)}
              className="text-xs text-gray-500 hover:text-primary"
            >
              답글
            </button>
            <button
              type="button"
              onClick={() => openDelete(c)}
              className="text-xs text-gray-500 hover:text-lose"
            >
              삭제
            </button>
          </div>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-gray-200">{c.content}</p>

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

        {replyOpenId === c.id && (
          <form onSubmit={(e) => onReply(e, c)} className="mt-2.5 space-y-2 rounded-lg border border-line bg-surface-2 p-3">
            <div className="grid grid-cols-2 gap-2 sm:max-w-md">
              <input
                value={rName}
                onChange={(e) => {
                  setRName(e.target.value);
                  rBanned.clearField("guestName");
                }}
                maxLength={20}
                placeholder="닉네임"
                className={`input h-9 text-sm ${rBanned.has("guestName") ? BANNED_INPUT : ""}`}
              />
              <input type="password" value={rPassword} onChange={(e) => setRPassword(e.target.value)} maxLength={30} placeholder="비밀번호" className="input h-9 text-sm" />
            </div>
            <textarea
              value={rContent}
              onChange={(e) => {
                setRContent(e.target.value);
                rBanned.clearField("content");
              }}
              rows={2}
              maxLength={2000}
              placeholder="답글을 입력하세요 (비회원)"
              className={`input resize-y text-sm ${rBanned.has("content") ? BANNED_INPUT : ""}`}
            />
            {rBanned.state && <BannedWordAlert state={rBanned.state} />}
            {rError && <p className="text-xs text-red-300">{rError}</p>}
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
      </>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-gray-100">
        댓글 <span className="text-primary">{comments.length}</span>
      </h2>

      <ul className="mt-4 divide-y divide-line">
        {topLevel.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-500">첫 댓글을 남겨보세요.</li>
        )}
        {topLevel.map((c) => {
          const replies = repliesOf(c.id);
          return (
            <li key={c.id} className="py-3">
              {renderComment(c, false)}
              {replies.length > 0 && (
                <ul className="mt-3 space-y-3 border-l-2 border-line pl-3.5">
                  {replies.map((r) => (
                    <li key={r.id}>{renderComment(r, true)}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* 최상위 댓글 작성 */}
      <form onSubmit={onSubmit} className="mt-4 space-y-2 border-t border-line pt-4">
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              banned.clearField("guestName");
            }}
            maxLength={20}
            placeholder="닉네임"
            className={`input ${banned.has("guestName") ? BANNED_INPUT : ""}`}
          />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={30} placeholder="비밀번호" className="input" />
        </div>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            banned.clearField("content");
          }}
          rows={3}
          maxLength={2000}
          placeholder="댓글을 입력하세요 (비회원)"
          className={`input resize-y ${banned.has("content") ? BANNED_INPUT : ""}`}
        />
        {banned.state && <BannedWordAlert state={banned.state} />}
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
