"use client";

/**
 * ModerationSheet — 글·댓글 신고와 작성자 차단을 한 창에서 처리하는 시트(웹·앱 공용).
 *
 * 단계: menu(신고/차단 고르기) → report(사유·상세) → reportDone(접수 안내 + 작성자 차단 제안)
 *       menu → block(차단 확인) → blockDone(차단 안내 + 관리 화면 링크)
 * 휴대폰 폭에서는 아래에서 올라오고, 넓은 화면에서는 가운데 뜬다. 카드의 transform 영향을 받지 않도록 body 에 띄운다.
 * 시트는 루트 레이아웃의 ModerationHost 하나만 그린다(openModeration 으로 연다). 버튼 쪽에 두면 차단 직후
 * 그 글·댓글이 숨겨지며 버튼과 함께 시트도 사라져 '차단했어요' 안내를 못 보기 때문이다.
 * 동작이 끝나면 항상 다음에 할 일(차단·관리 화면·닫기)을 보여 준다.
 */
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  BLOCKED_PAGE_HREF,
  blockAuthor,
  REPORT_DETAIL_MAX,
  REPORT_REASONS,
  submitReport,
  useIsBlocked,
  type ReportReasonKey,
  type ReportTargetType,
} from "@/lib/moderation";

/** 신고·차단 대상 */
export interface ModerationTarget {
  /** 대상 종류 */
  type: ReportTargetType;
  /** 대상 ID */
  id: string;
  /** 작성자 닉네임(없으면 차단 메뉴를 숨긴다) */
  authorName: string | null;
}

/** 시트 단계 */
export type ModerationStep = "menu" | "report" | "reportDone" | "block" | "blockDone";

/** 시트 속성 */
interface ModerationSheetProps {
  /** 열림 여부 */
  open: boolean;
  /** 대상 */
  target: ModerationTarget;
  /** 처음 보여 줄 단계(기본 menu) */
  initialStep?: ModerationStep;
  /** 닫을 때 */
  onClose: () => void;
}

/**
 * 대상 종류를 화면 이름으로.
 * @param type — 대상 종류
 * @returns "글" | "댓글"
 */
function noun(type: ReportTargetType): string {
  return type === "post" ? "글" : "댓글";
}

/**
 * 신고·차단 시트.
 * @param props.open 열림 여부
 * @param props.target 대상(종류·ID·작성자)
 * @param props.initialStep 처음 단계
 * @param props.onClose 닫기
 */
export default function ModerationSheet({ open, target, initialStep = "menu", onClose }: ModerationSheetProps) {
  const [step, setStep] = useState<ModerationStep>(initialStep);
  const [reason, setReason] = useState<ReportReasonKey | null>(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const blocked = useIsBlocked(target.authorName);
  const name = target.authorName?.trim() ?? "";
  const label = noun(target.type);
  // 부모가 매번 새 함수를 넘겨도 효과가 다시 돌지 않게 최신 닫기 함수를 ref 로 든다
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 열릴 때마다 처음 상태로
  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setReason(null);
    setDetail("");
    setError(null);
    setDuplicate(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, initialStep]);

  if (!open || typeof document === "undefined") return null;

  /** 신고 보내기 */
  async function onReport() {
    if (!reason || busy) return;
    if (reason === "other" && !detail.trim()) {
      setError("'기타'를 고르셨다면 어떤 문제인지 짧게 적어 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await submitReport({ targetType: target.type, targetId: target.id, reason, detail });
      setDuplicate(r.duplicate);
      setStep("reportDone");
    } catch (e) {
      setError((e as Error).message || "신고를 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  /** 차단하기 */
  function onBlock() {
    if (!name) return;
    blockAuthor(name);
    setStep("blockDone");
  }

  const sheet = (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${label} 신고·차단`}>
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/55" style={{ animation: "cmFade .2s ease" }} />
      <div
        className="relative grid max-h-[88dvh] w-full max-w-md gap-4 overflow-y-auto rounded-t-[22px] border border-line bg-surface px-5 pt-3 shadow-2xl sm:rounded-2xl sm:pt-5"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))", animation: "cmUp .24s cubic-bezier(.2,.8,.2,1)" }}
      >
        <span className="mx-auto h-1 w-10 rounded-full bg-surface-3 sm:hidden" aria-hidden="true" />

        {step === "menu" && (
          <>
            <Head icon="more" tone="mute" title={`이 ${label}에 대해`} desc={name ? `작성자: ${name}` : undefined} />
            <div className="grid gap-2">
              <MenuButton icon="flag" title={`${label} 신고하기`} desc="정책에 어긋나는 내용이면 운영진이 확인하고 지워요." onClick={() => setStep("report")} />
              {name && !blocked && (
                <MenuButton icon="block" title="이 작성자 차단하기" desc={`${name}님의 글과 댓글을 내 화면에서 숨겨요.`} onClick={() => setStep("block")} />
              )}
            </div>
            <SecondaryButton onClick={onClose}>취소</SecondaryButton>
          </>
        )}

        {step === "report" && (
          <>
            <Head icon="flag" tone="warn" title={`${label} 신고`} desc="어떤 문제인지 골라 주세요. 신고한 사람은 작성자에게 알려지지 않아요." />
            <div className="grid gap-1.5" role="radiogroup" aria-label="신고 사유">
              {REPORT_REASONS.map((r) => {
                const on = reason === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setReason(r.key);
                      setError(null);
                    }}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                      on ? "border-primary/60 bg-primary/10" : "border-line hover:bg-surface-2"
                    }`}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${on ? "border-primary" : "border-gray-500"}`} aria-hidden="true">
                      {on && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-100">{r.label}</span>
                      <span className="block text-xs text-gray-500">{r.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-gray-400">
                자세한 내용 <span className="font-normal text-gray-500">{reason === "other" ? "(필수)" : "(선택)"}</span>
              </span>
              <textarea
                value={detail}
                onChange={(e) => {
                  setDetail(e.target.value);
                  setError(null);
                }}
                rows={3}
                maxLength={REPORT_DETAIL_MAX}
                placeholder="운영진이 확인할 때 참고할 내용을 적어 주세요."
                className="input resize-none text-sm"
              />
              <span className="text-right text-[11px] text-gray-500">
                {detail.length}/{REPORT_DETAIL_MAX}
              </span>
            </label>
            {error && (
              <p className="-mt-2 text-xs font-semibold text-red-300" role="alert">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={initialStep === "report" ? onClose : () => setStep("menu")}>
                {initialStep === "report" ? "취소" : "뒤로"}
              </SecondaryButton>
              <PrimaryButton onClick={onReport} disabled={!reason || busy}>
                {busy ? "보내는 중…" : reason ? "신고하기" : "사유를 골라 주세요"}
              </PrimaryButton>
            </div>
          </>
        )}

        {step === "reportDone" && (
          <>
            <Head
              icon="check"
              tone="ok"
              title={duplicate ? `이미 신고한 ${label}이에요` : "신고가 접수됐어요"}
              desc="운영진이 24시간 안에 확인하고, 정책에 어긋나면 지워요. 알려 주셔서 고마워요."
            />
            {name && !blocked && (
              <MenuButton icon="block" title={`${name}님도 차단할까요?`} desc="차단하면 이 작성자의 글과 댓글이 내 화면에서 바로 사라져요." onClick={() => setStep("block")} />
            )}
            <SecondaryButton onClick={onClose}>닫기</SecondaryButton>
          </>
        )}

        {step === "block" && (
          <>
            <Head
              icon="block"
              tone="warn"
              title={`${name}님을 차단할까요?`}
              desc="이 기기에서 이 닉네임으로 쓴 글과 댓글이 보이지 않아요. 같은 닉네임을 쓰는 다른 사람의 글도 함께 숨겨져요."
            />
            <p className="-mt-1 rounded-xl bg-surface-2 px-3.5 py-2.5 text-xs leading-relaxed text-gray-400">
              차단은 상대에게 알려지지 않고, &lsquo;차단한 작성자&rsquo; 화면에서 언제든 풀 수 있어요.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={initialStep === "block" ? onClose : () => setStep("menu")}>
                {initialStep === "block" ? "취소" : "뒤로"}
              </SecondaryButton>
              <PrimaryButton onClick={onBlock}>차단하기</PrimaryButton>
            </div>
          </>
        )}

        {step === "blockDone" && (
          <>
            <Head icon="check" tone="ok" title={`${name}님을 차단했어요`} desc="이제 이 작성자의 글과 댓글이 내 화면에 보이지 않아요." />
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={BLOCKED_PAGE_HREF}
                onClick={onClose}
                className="flex h-11 items-center justify-center rounded-xl border border-line text-sm font-bold text-gray-200 hover:bg-surface-2"
              >
                차단 목록 보기
              </Link>
              <PrimaryButton onClick={onClose}>확인</PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
  return createPortal(sheet, document.body);
}

/** 시트 아이콘 이름 */
type SheetIcon = "more" | "flag" | "block" | "check";

/** 아이콘 SVG path */
const ICON_PATHS: Record<SheetIcon, string> = {
  more: "M5 12h.01M12 12h.01M19 12h.01",
  flag: "M5 21V4M5 4h11l-1.5 4L16 12H5",
  block: "M12 3a9 9 0 100 18 9 9 0 000-18zM5.6 5.6l12.8 12.8",
  check: "M5 12.5l4.5 4.5L19 7.5",
};

/**
 * 선 아이콘.
 * @param name 아이콘 이름
 * @param size 크기(px)
 */
function SheetIconSvg({ name, size = 18 }: { name: SheetIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/** 머리 아이콘 색 */
const TONES = {
  mute: "bg-surface-3 text-gray-300",
  warn: "bg-amber-500/15 text-amber-400",
  ok: "bg-emerald-500/15 text-emerald-400",
} as const;

/**
 * 시트 머리(아이콘 + 제목 + 설명).
 * @param icon 아이콘
 * @param tone 아이콘 색
 * @param title 제목
 * @param desc 설명
 */
function Head({ icon, tone, title, desc }: { icon: SheetIcon; tone: keyof typeof TONES; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${TONES[tone]}`}>
        <SheetIconSvg name={icon} size={19} />
      </span>
      <div className="grid min-w-0 gap-0.5">
        <p className="break-words text-[17px] font-extrabold text-gray-50">{title}</p>
        {desc && <p className="text-[13px] leading-relaxed text-gray-500">{desc}</p>}
      </div>
    </div>
  );
}

/**
 * 메뉴 항목 버튼.
 * @param icon 아이콘
 * @param title 이름
 * @param desc 설명
 * @param onClick 누를 때
 */
function MenuButton({ icon, title, desc, onClick }: { icon: SheetIcon; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left transition-colors hover:bg-surface-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-gray-300">
        <SheetIconSvg name={icon} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-gray-100">{title}</span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </span>
      <span className="text-gray-500" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

/**
 * 주 버튼.
 * @param onClick 누를 때
 * @param disabled 잠금
 * @param children 글자
 */
function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="h-11 rounded-xl bg-primary text-sm font-bold text-white transition-opacity disabled:opacity-50">
      {children}
    </button>
  );
}

/**
 * 보조 버튼.
 * @param onClick 누를 때
 * @param children 글자
 */
function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-11 rounded-xl border border-line text-sm font-bold text-gray-200 transition-colors hover:bg-surface-2">
      {children}
    </button>
  );
}

/** 열린 시트 요청(대상 + 처음 단계). 닫혀 있으면 null */
interface OpenRequest {
  /** 대상 */
  target: ModerationTarget;
  /** 처음 단계 */
  step: ModerationStep;
  /** 요청 번호 — 같은 대상을 다시 열어도 처음 상태로 돌아가게 */
  seq: number;
}

/** 지금 열린 요청 */
let current: OpenRequest | null = null;
/** 요청 번호 */
let seq = 0;
/** 구독자 */
const listeners = new Set<() => void>();

/**
 * 신고·차단 시트를 연다(ModerationHost 가 그린다).
 * @param target — 대상
 * @param step — 처음 단계(기본 menu)
 */
export function openModeration(target: ModerationTarget, step: ModerationStep = "menu"): void {
  seq += 1;
  current = { target, step, seq };
  listeners.forEach((l) => l());
}

/** 시트를 닫는다 */
function closeModeration(): void {
  current = null;
  listeners.forEach((l) => l());
}

/**
 * 열린 요청 구독.
 * @param l — 바뀔 때 부를 함수
 * @returns 구독 해제 함수
 */
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * 신고·차단 시트 자리 — 루트 레이아웃(웹·앱)에 한 번만 둔다.
 */
export function ModerationHost() {
  const req = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  if (!req) return null;
  return <ModerationSheet key={req.seq} open target={req.target} initialStep={req.step} onClose={closeModeration} />;
}
