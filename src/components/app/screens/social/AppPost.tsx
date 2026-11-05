"use client";

/**
 * 앱 게시글 화면 (시안 13).
 *
 * 구성: 상단바(뒤로 + 게시판 이름 + 공유·삭제) → 분류 배지·제목·작성자·시간·조회수 → 본문 → 추천 버튼
 *       → 댓글·답글 목록 → 댓글 작성 폼(닉네임·비밀번호·내용, 답글이면 위에 "○○님에게 답글" 표시).
 * - 웹 RecommendButton·DeletePostButton·CommentSection 과 같은 API(app/api/community/*)를 쓴다.
 * - 글·댓글 삭제는 아래에서 올라오는 비밀번호 확인 시트로 받는다. 비밀번호는 화면 입력으로만 쓰고 저장하지 않는다.
 * - 글이 없으면 "삭제되었거나 존재하지 않는 글" 빈 상태와 목록으로 가는 버튼을 보인다.
 */
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, type RefObject } from "react";
import { postJSON } from "@/lib/api-client";
import { useBannedWords } from "@/lib/banned-words";
import { boardLabel, categoryLabel, type BoardKey, type CommunityComment, type PostDetail } from "@/lib/community";
import { formatKoreanDateTime, formatMatchListDate } from "@/lib/format";
import { nativeShare } from "@/lib/native";
import BannedWordAlert from "@/components/community/BannedWordAlert";
import { AppTopBar, toast, TopIconButton } from "../../AppChrome";
import { Icon } from "../../icons";
import { AppPage, Badge, GhostLink, StateBox } from "../../ui";
import { PasswordSheet } from "./PasswordSheet";
import { compactNum, inputCls, Spinner } from "./social-ui";

/** 앱 게시글 화면이 받는 데이터 */
export interface AppPostProps {
  /** 글 상세(댓글 포함) — 없거나 불러오지 못했으면 null */
  post: PostDetail | null;
  /** 주소의 게시판 키 (목록으로 돌아갈 곳) */
  board: BoardKey;
}

/** 삭제 확인 대상 — 글 또는 댓글 하나 */
type DeleteTarget = { kind: "post" } | { kind: "comment"; id: string } | null;

/**
 * @param props AppPostProps
 */
export default function AppPost({ post, board }: AppPostProps) {
  const listHref = `/community/${board}`;

  if (!post) {
    return (
      <>
        <AppTopBar title={boardLabel(board)} backHref={listHref} />
        <AppPage>
          <StateBox
            icon="community"
            title="삭제되었거나 존재하지 않는 글일 수 있어요"
            desc="목록에서 다른 글을 찾아보세요."
            action={
              <GhostLink href={listHref} icon="back">
                목록으로
              </GhostLink>
            }
          />
        </AppPage>
      </>
    );
  }
  return <PostBody post={post} board={board} />;
}

/**
 * 글이 있을 때의 화면 본체.
 * @param post 글 상세
 * @param board 주소의 게시판 키
 */
function PostBody({ post, board }: { post: PostDetail; board: BoardKey }) {
  const router = useRouter();
  const listHref = `/community/${board}`;
  const [comments, setComments] = useState<CommunityComment[]>(post.comments ?? []);
  const [del, setDel] = useState<DeleteTarget>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  /** 공유 — 기기 공유 시트, 안 되면 웹 공유, 그것도 안 되면 주소 복사 */
  async function onShare() {
    const url = window.location.href;
    if (await nativeShare({ title: post.title, url })) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
        return;
      }
    } catch {
      return; // 사용자가 공유를 취소함
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("글 주소를 복사했어요");
    } catch {
      toast("이 기기에서는 공유할 수 없어요");
    }
  }

  /** 삭제 시트 열기 */
  function openDelete(t: DeleteTarget) {
    setDelErr(null);
    setDel(t);
  }

  /** 삭제 시트 확인 — 글이면 목록으로, 댓글이면 목록에서 뺀다 */
  async function onConfirmDelete(password: string) {
    if (!del) return;
    setDelBusy(true);
    setDelErr(null);
    try {
      if (del.kind === "post") {
        await postJSON(`/api/community/posts/${post.id}/delete`, { password });
        toast("글을 삭제했어요");
        router.replace(listHref);
        router.refresh();
        return;
      }
      const id = del.id;
      await postJSON(`/api/community/comments/${id}/delete`, { password });
      // 원댓글을 지우면 답글도 함께 사라진다(웹과 같음)
      setComments((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
      if (replyTo && (replyTo.id === id || replyTo.parentId === id)) setReplyTo(null);
      setDel(null);
      toast("댓글을 삭제했어요");
    } catch (e) {
      setDelErr((e as Error).message || "삭제하지 못했어요. 비밀번호를 확인해 주세요.");
    } finally {
      setDelBusy(false);
    }
  }

  /** 답글 쓰기 — 아래 작성 폼으로 내려가 입력칸에 커서를 둔다 */
  function startReply(c: CommunityComment) {
    setReplyTo(c);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => textRef.current?.focus({ preventScroll: true }), 350);
  }

  return (
    <>
      <AppTopBar
        title={boardLabel(board)}
        backHref={listHref}
        right={
          <>
            <TopIconButton icon="share" label="공유" onClick={onShare} />
            {!post.isNotice && <TopIconButton icon="trash" label="글 삭제" onClick={() => openDelete({ kind: "post" })} />}
          </>
        }
      />
      <AppPage className="!gap-4">
        {/* 머리 — 분류·제목·작성 정보 */}
        <header className="grid gap-2">
          <div className="flex gap-1.5">
            {post.isNotice ? <Badge tone="grad">공지</Badge> : <Badge tone="mute">{categoryLabel(post.category)}</Badge>}
          </div>
          <h1 className="break-words text-[22px] font-extrabold leading-snug tracking-[-0.02em] text-gray-50">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
            <span className="font-semibold text-gray-300">{post.authorName ?? (post.isNotice ? "운영진" : "익명")}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.createdAt} title={formatKoreanDateTime(post.createdAt)} suppressHydrationWarning>
              {formatMatchListDate(post.createdAt)}
            </time>
            <span className="flex items-center gap-1 tabular-nums" aria-label={`조회 ${post.views}`}>
              <Icon name="eye" size={13} />
              {compactNum(post.views)}
            </span>
          </div>
        </header>

        {/* 본문 */}
        <div className="min-h-[80px] whitespace-pre-wrap break-words text-[15px] leading-[1.7] text-gray-200">{post.content}</div>

        <div className="flex justify-center py-1">
          <RecommendButton postId={post.id} initialLikes={post.likes} />
        </div>

        <hr className="border-line" />

        {/* 댓글 */}
        <section className="grid gap-2.5" aria-label="댓글">
          <h2 className="text-[15px] font-extrabold text-gray-100">
            댓글 <span className="text-primary">{comments.length}</span>
          </h2>

          {topLevel.length === 0 ? (
            <p className="a-tile px-4 py-6 text-center text-[13px] text-gray-500">첫 댓글을 남겨 보세요.</p>
          ) : (
            topLevel.map((c) => (
              <div key={c.id} className="grid gap-2">
                <CommentItem c={c} onReply={startReply} onDelete={() => openDelete({ kind: "comment", id: c.id })} />
                {repliesOf(c.id).map((r) => (
                  <div key={r.id} className="pl-6">
                    <CommentItem c={r} reply onReply={startReply} onDelete={() => openDelete({ kind: "comment", id: r.id })} />
                  </div>
                ))}
              </div>
            ))
          )}

          <CommentForm
            postId={post.id}
            formRef={formRef}
            textRef={textRef}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onCreated={(c) => {
              setComments((prev) => [...prev, c]);
              setReplyTo(null);
            }}
          />
        </section>
      </AppPage>

      <PasswordSheet
        open={del !== null}
        title={del?.kind === "post" ? "글을 삭제할까요?" : "댓글을 삭제할까요?"}
        desc={
          del?.kind === "post"
            ? "글을 쓸 때 넣은 비밀번호를 입력해 주세요. 삭제하면 되돌릴 수 없어요."
            : "댓글을 쓸 때 넣은 비밀번호를 입력해 주세요. 원댓글을 지우면 답글도 함께 지워져요."
        }
        busy={delBusy}
        error={delErr}
        onClose={() => setDel(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

/**
 * 추천 버튼 — 한 번 누르면 추천 수를 서버 값으로 바꾸고 잠근다(웹 RecommendButton 과 같은 API).
 * @param postId 글 ID
 * @param initialLikes 처음 추천 수
 */
function RecommendButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  /** 추천 요청 */
  async function onClick() {
    if (busy || done) return;
    setBusy(true);
    try {
      const res = await postJSON<{ likes: number }>(`/api/community/posts/${postId}/like`);
      setLikes(res.likes);
      setDone(true);
      toast("이 글을 추천했어요");
    } catch (e) {
      toast((e as Error).message || "추천하지 못했어요. 잠시 뒤 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || done}
      aria-pressed={done}
      className={`a-press flex h-12 min-w-[128px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold transition-colors ${
        done ? "bg-app-ac-soft text-app-ac-tx" : "border border-line bg-surface text-gray-100"
      }`}
    >
      {busy ? <Spinner size={16} /> : <Icon name="thumb" size={18} fill={done ? "currentColor" : "none"} />}
      추천 <span className="tabular-nums">{likes.toLocaleString()}</span>
    </button>
  );
}

/**
 * 댓글 하나 — 작성자·시간·[답글][삭제] / 내용.
 * @param c 댓글
 * @param reply 답글이면 true (앞에 답글 표시)
 * @param onReply 답글 버튼
 * @param onDelete 삭제 버튼
 */
function CommentItem({
  c,
  reply = false,
  onReply,
  onDelete,
}: {
  c: CommunityComment;
  reply?: boolean;
  onReply: (c: CommunityComment) => void;
  onDelete: () => void;
}) {
  return (
    <div className="a-tile grid gap-1.5 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-xs">
        {reply && (
          <span className="text-gray-500" aria-label="답글">
            <Icon name="reply" size={13} />
          </span>
        )}
        <span className="min-w-0 truncate font-bold text-gray-100">{c.authorName ?? "익명"}</span>
        <span className="shrink-0 text-gray-500" suppressHydrationWarning>
          {formatMatchListDate(c.createdAt)}
        </span>
        <span className="ml-auto flex shrink-0 items-center">
          <button type="button" onClick={() => onReply(c)} className="h-7 rounded-full px-2 font-semibold text-gray-500 active:bg-surface-2">
            답글
          </button>
          <button type="button" onClick={onDelete} className="h-7 rounded-full px-2 font-semibold text-gray-500 active:bg-surface-2">
            삭제
          </button>
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">{c.content}</p>
    </div>
  );
}

/**
 * 댓글·답글 작성 폼 (비회원: 닉네임 + 비밀번호 + 내용).
 * @param postId 글 ID
 * @param formRef 폼 요소 ref (답글을 누르면 이곳으로 스크롤)
 * @param textRef 내용 입력칸 ref (답글을 누르면 커서)
 * @param replyTo 답글 대상 댓글 (없으면 일반 댓글)
 * @param onCancelReply 답글 취소
 * @param onCreated 등록 성공 — 새 댓글을 넘긴다
 */
function CommentForm({
  postId,
  formRef,
  textRef,
  replyTo,
  onCancelReply,
  onCreated,
}: {
  postId: string;
  formRef: RefObject<HTMLFormElement>;
  textRef: RefObject<HTMLTextAreaElement>;
  replyTo: CommunityComment | null;
  onCancelReply: () => void;
  onCreated: (c: CommunityComment) => void;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const banned = useBannedWords();

  const missName = tried && !name.trim();
  const missPw = tried && !password.trim();
  const missContent = tried && !content.trim();

  /** 등록 — 빈 칸이 있으면 표시만 하고 멈춘다 */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    banned.reset();
    setTried(true);
    if (!name.trim() || !password.trim() || !content.trim()) return;
    setBusy(true);
    try {
      const created = await postJSON<CommunityComment>(`/api/community/posts/${postId}/comments`, {
        guestName: name,
        password,
        content,
        ...(replyTo ? { parentId: replyTo.parentId ?? replyTo.id } : {}), // 답글의 답글은 스레드 첫 댓글에 붙인다
      });
      onCreated(created);
      setContent("");
      setPassword("");
      setTried(false);
      toast(replyTo ? "답글을 남겼어요" : "댓글을 남겼어요");
    } catch (err) {
      if (!banned.capture(err, { content, guestName: name })) setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="a-card mt-1 grid gap-2 p-3.5" noValidate>
      {replyTo && (
        <div className="flex items-center gap-1.5 rounded-[10px] bg-app-ac-soft px-3 py-2 text-xs text-app-ac-tx">
          <Icon name="reply" size={13} />
          <span className="min-w-0 flex-1 truncate">
            <b>{replyTo.authorName ?? "익명"}</b>님에게 답글
          </span>
          <button type="button" onClick={onCancelReply} className="shrink-0 font-bold">
            취소
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            banned.clearField("guestName");
          }}
          maxLength={20}
          placeholder="닉네임"
          aria-label="닉네임"
          aria-invalid={missName || banned.has("guestName")}
          className={`${inputCls(missName || banned.has("guestName"))} h-11`}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={30}
          autoComplete="off"
          placeholder="비밀번호"
          aria-label="비밀번호 (삭제할 때 필요)"
          aria-invalid={missPw}
          className={`${inputCls(missPw)} h-11`}
        />
      </div>
      <textarea
        ref={textRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          banned.clearField("content");
        }}
        rows={3}
        maxLength={2000}
        placeholder={replyTo ? "답글을 입력하세요" : "댓글을 입력하세요"}
        aria-label="댓글 내용"
        aria-invalid={missContent || banned.has("content")}
        className={`${inputCls(missContent || banned.has("content"))} min-h-[88px] resize-none py-3 leading-relaxed`}
      />
      {(missName || missPw || missContent) && (
        <p className="text-xs font-semibold text-app-loss-tx" role="alert">
          닉네임, 비밀번호, 내용을 모두 입력해 주세요. 비밀번호는 댓글을 지울 때 필요해요.
        </p>
      )}
      {banned.state && <BannedWordAlert state={banned.state} />}
      {error && (
        <p className="text-xs font-semibold text-app-loss-tx" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="a-grad a-press flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-bold disabled:opacity-60"
      >
        {busy && <Spinner size={16} />}
        {busy ? "등록 중…" : replyTo ? "답글 등록" : "댓글 등록"}
      </button>
    </form>
  );
}
