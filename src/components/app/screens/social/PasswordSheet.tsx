"use client";

/**
 * 비밀번호 확인 시트 — 화면 아래에서 올라오는 작은 창.
 * 비회원 글·댓글을 지울 때 작성할 때 넣은 비밀번호를 받는다. 입력값은 이 창 안에서만 들고 있고 저장하지 않는다.
 * (공용 ui 로 올릴 만한 후보: 아래에서 올라오는 시트)
 */
import { FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "../../icons";
import { inputCls, Spinner } from "./social-ui";

/**
 * @param open 열림 여부
 * @param title 시트 제목 (예: "글 삭제")
 * @param desc 제목 아래 설명
 * @param confirmLabel 확인 버튼 글자 (기본 "삭제")
 * @param busy 처리 중이면 true (버튼 잠금 + 스피너)
 * @param error 실패 안내 글 (서버 메시지)
 * @param onClose 닫기 (취소·바깥 누름·Esc)
 * @param onConfirm 확인 — 입력한 비밀번호를 넘긴다
 */
export function PasswordSheet({
  open,
  title,
  desc,
  confirmLabel = "삭제",
  busy = false,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  desc?: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (password: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [empty, setEmpty] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // 부모가 매번 새 함수를 넘겨도 아래 효과가 다시 돌지 않도록 최신 닫기 함수를 ref 로 들고 있는다
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 열릴 때마다 입력을 비우고 입력칸에 커서를 둔다
  useEffect(() => {
    if (!open) return;
    setPw("");
    setEmpty(false);
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  /** 비어 있으면 안내만, 아니면 확인 콜백 */
  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!pw.trim()) {
      setEmpty(true);
      return;
    }
    onConfirm(pw);
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        style={{ animation: "cmFade .2s ease" }}
      />
      <form
        onSubmit={submit}
        className="absolute inset-x-0 bottom-0 mx-auto grid max-w-xl gap-3.5 rounded-t-[24px] border-t border-app-hair bg-surface px-5 pt-3"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))", animation: "cmUp .24s cubic-bezier(.2,.8,.2,1)" }}
      >
        <span className="mx-auto h-1 w-10 rounded-full bg-surface-3" aria-hidden="true" />
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-app-loss-bg text-app-loss-tx">
            <Icon name="lock" size={19} />
          </span>
          <div className="grid min-w-0 gap-0.5">
            <p className="text-[17px] font-extrabold text-gray-50">{title}</p>
            {desc && <p className="text-[13px] leading-relaxed text-gray-500">{desc}</p>}
          </div>
        </div>
        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setEmpty(false);
          }}
          maxLength={30}
          autoComplete="off"
          placeholder="작성할 때 넣은 비밀번호"
          aria-label="비밀번호"
          className={`${inputCls(empty || !!error)} h-12`}
        />
        {(empty || error) && (
          <p className="-mt-1.5 text-xs font-semibold text-app-loss-tx" role="alert">
            {empty ? "비밀번호를 입력해 주세요." : error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="a-press h-12 rounded-[14px] border border-line text-[15px] font-bold text-gray-200"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy}
            className="a-press flex h-12 items-center justify-center gap-2 rounded-[14px] bg-app-live text-[15px] font-bold text-white disabled:opacity-60"
          >
            {busy && <Spinner size={16} />}
            {busy ? "확인 중…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
