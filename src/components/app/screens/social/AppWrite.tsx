"use client";

/**
 * 앱 글쓰기 화면 (시안 18).
 *
 * 구성: 비회원 안내 → 게시판 세그먼트 → 분류 칩 → 닉네임·비밀번호(4자 이상, "삭제할 때 필요해요")
 *       → 제목 → 내용(글자 수) → 금칙어 안내 → [취소] [등록].
 * - 웹 WriteForm 과 같은 API(POST /api/community/posts)를 쓴다. 등록하면 그 글로 이동한다(뒤로 가기에 폼이 남지 않게 replace).
 * - 빈 칸은 등록을 누른 뒤 칸 아래에 "필수 항목이에요"로 알려 준다.
 * - 비밀번호는 화면 입력으로만 받아 서버에 보내고, 기기에 저장하지 않는다.
 */
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { postJSON } from "@/lib/api-client";
import { useBannedWords } from "@/lib/banned-words";
import { BOARDS, CATEGORIES, type BoardKey, type CategoryKey } from "@/lib/community";
import BannedWordAlert from "@/components/community/BannedWordAlert";
import { AppTopBar, goBack, toast } from "../../AppChrome";
import { AppPage, Chip, Segmented } from "../../ui";
import { Field, inputCls, Notice, Spinner } from "./social-ui";

/** 비밀번호 최소 길이 (시안 기준 — 서버는 1자 이상이면 받지만 앱에서는 4자 이상을 권한다) */
const PW_MIN = 4;
/** 제목 최대 길이 (백엔드 CreatePostDto 와 같음) */
const TITLE_MAX = 120;
/** 내용 최대 길이 (백엔드 CreatePostDto 와 같음) */
const CONTENT_MAX = 20000;

/**
 * @param board 처음 고를 게시판 (주소의 게시판)
 */
export default function AppWrite({ board }: { board: BoardKey }) {
  const router = useRouter();
  const [boardSel, setBoardSel] = useState<BoardKey>(board);
  const [category, setCategory] = useState<CategoryKey>("free");
  const [guestName, setGuestName] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tried, setTried] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const banned = useBannedWords();

  // 등록을 한 번 누른 뒤에만 칸별 안내를 보인다
  const eName = tried && !guestName.trim() ? "필수 항목이에요" : null;
  const ePw = tried
    ? !password.trim()
      ? "필수 항목이에요"
      : password.length < PW_MIN
        ? `${PW_MIN}자 이상 입력해 주세요`
        : null
    : null;
  const eTitle = tried && !title.trim() ? "필수 항목이에요" : null;
  const eContent = tried && !content.trim() ? "필수 항목이에요" : null;

  /** 등록 — 빈 칸·짧은 비밀번호면 칸 아래 안내만 하고 멈춘다 */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    banned.reset();
    setTried(true);
    if (!guestName.trim() || password.length < PW_MIN || !title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      const res = await postJSON<{ id: string }>("/api/community/posts", {
        board: boardSel,
        category,
        title,
        content,
        guestName,
        password,
      });
      toast("글을 등록했어요");
      router.replace(`/community/${boardSel}/${res.id}`);
      router.refresh();
    } catch (err) {
      if (!banned.capture(err, { title, content, guestName })) setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppTopBar title="글쓰기" backHref={`/community/${board}`} />
      <form onSubmit={onSubmit} noValidate>
        <AppPage className="!gap-4">
          <Notice>로그인 없이 비회원으로 작성해요. 비밀번호는 글을 삭제할 때 필요해요.</Notice>

          <Field label="게시판">
            <Segmented
              items={BOARDS.map((b) => ({ key: b.key, label: b.label }))}
              value={boardSel}
              onChange={(k) => setBoardSel(k as BoardKey)}
            />
          </Field>

          <Field label="분류">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="분류">
              {CATEGORIES.map((c) => (
                <Chip key={c.key} active={category === c.key} onClick={() => setCategory(c.key)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 items-start gap-2.5">
            <Field label="닉네임" htmlFor="w-name" error={eName ?? (banned.has("guestName") ? "사용할 수 없는 표현이 있어요" : null)}>
              <input
                id="w-name"
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  banned.clearField("guestName");
                }}
                maxLength={20}
                placeholder="닉네임"
                autoComplete="nickname"
                aria-invalid={!!eName || banned.has("guestName")}
                className={`${inputCls(!!eName || banned.has("guestName"))} h-12`}
              />
            </Field>
            <Field label="비밀번호" htmlFor="w-pw" hint="삭제할 때 필요해요" error={ePw}>
              <input
                id="w-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={30}
                placeholder={`${PW_MIN}자 이상`}
                autoComplete="new-password"
                aria-invalid={!!ePw}
                className={`${inputCls(!!ePw)} h-12`}
              />
            </Field>
          </div>

          <Field label="제목" htmlFor="w-title" error={eTitle ?? (banned.has("title") ? "사용할 수 없는 표현이 있어요" : null)}>
            <input
              id="w-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                banned.clearField("title");
              }}
              maxLength={TITLE_MAX}
              placeholder="제목을 입력하세요"
              aria-invalid={!!eTitle || banned.has("title")}
              className={`${inputCls(!!eTitle || banned.has("title"))} h-12`}
            />
          </Field>

          <Field
            label="내용"
            htmlFor="w-content"
            error={eContent ?? (banned.has("content") ? "사용할 수 없는 표현이 있어요" : null)}
            right={
              <span className="text-xs tabular-nums text-gray-500">
                {content.length.toLocaleString()} / {CONTENT_MAX.toLocaleString()}자
              </span>
            }
          >
            <textarea
              id="w-content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                banned.clearField("content");
              }}
              maxLength={CONTENT_MAX}
              placeholder="내용을 입력하세요"
              aria-invalid={!!eContent || banned.has("content")}
              className={`${inputCls(!!eContent || banned.has("content"))} min-h-[220px] resize-y py-3 leading-relaxed`}
            />
          </Field>

          {banned.state && <BannedWordAlert state={banned.state} />}
          {error && (
            <Notice icon="alert" tone="loss">
              {error}
            </Notice>
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => goBack(router, `/community/${board}`)}
              className="a-press h-12 rounded-[14px] border border-line bg-surface text-[15px] font-bold text-gray-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="a-grad a-glow a-press flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-bold disabled:opacity-60"
            >
              {submitting && <Spinner size={16} />}
              {submitting ? "등록 중…" : "등록"}
            </button>
          </div>
        </AppPage>
      </form>
    </>
  );
}
