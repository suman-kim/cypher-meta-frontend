"use client";

/**
 * BetaSteps — 안드로이드 앱 비공개 테스트 참여 3단계(그룹 가입 → 테스터 등록 → Play 스토어 설치).
 * 안내 모달과 모집 공고 페이지가 함께 쓴다. 링크는 새 탭으로 열고, 누른 단계는 체크로 바꿔
 * 다음 단계 버튼을 강조한다(다음 할 일이 보이게). 클릭은 `beta_<source>_<단계>` 이벤트로 기록한다.
 */
import { useEffect, useState } from "react";
import { ANDROID_BETA_STEPS, type BetaStep, type BetaStepKey } from "@/lib/android-beta";
import { trackEvent } from "@/lib/track";

/** 참여 단계 목록 속성 */
interface BetaStepsProps {
  /** 어디서 보여 주는지(클릭 이벤트 이름 구분) */
  source: "notice" | "page";
  /**
   * 세 단계를 모두 눌렀는지가 바뀔 때 부른다(모달의 '닫기'→'완료' 전환 등).
   * @param allDone 모두 눌렀으면 true
   */
  onAllDoneChange?: (allDone: boolean) => void;
  /** 페이지처럼 넓은 곳에서 조금 크게 보여 줄지 */
  large?: boolean;
}

/**
 * 참여 3단계.
 * @param props.source 보여 주는 곳(notice | page)
 * @param props.onAllDoneChange 모두 눌렀는지 바뀔 때 호출
 * @param props.large 크게 보여 줄지
 */
export default function BetaSteps({ source, onAllDoneChange, large = false }: BetaStepsProps) {
  /** 이번에 누른 단계들 */
  const [done, setDone] = useState<Set<BetaStepKey>>(new Set());

  /** 다음에 할 단계(아직 안 누른 첫 단계) */
  const nextKey = ANDROID_BETA_STEPS.find((s) => !done.has(s.key))?.key ?? null;
  const allDone = nextKey === null;

  useEffect(() => {
    onAllDoneChange?.(allDone);
  }, [allDone, onAllDoneChange]);

  /**
   * 단계 버튼을 눌렀을 때 — 기록하고 체크 표시한다(링크는 새 탭에서 열린다).
   * @param step 누른 단계
   */
  function onStep(step: BetaStep) {
    trackEvent(`beta_${source}_${step.key}`);
    setDone((prev) => new Set(prev).add(step.key));
  }

  return (
    <div>
      <p
        className={`mb-3 flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2.5 leading-relaxed text-gray-400 ${
          large ? "text-sm" : "text-xs"
        }`}
      >
        <svg
          className="mt-0.5 shrink-0 text-primary"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 7.5v.5" />
        </svg>
        <span>
          세 단계 모두 <b className="text-gray-200">휴대폰 Play 스토어에 로그인한 Google 계정</b>으로 진행해 주세요.
        </span>
      </p>

      <ol className={large ? "space-y-3" : "space-y-2.5"}>
        {ANDROID_BETA_STEPS.map((s, i) => {
          const isDone = done.has(s.key);
          const isNext = s.key === nextKey;
          return (
            <li
              key={s.key}
              className={`flex items-start gap-3 rounded-xl border transition-colors ${large ? "p-4" : "p-3"} ${
                isNext ? "border-primary/50 bg-primary/5" : "border-line bg-surface-2/40"
              }`}
            >
              <span
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  isDone ? "bg-[#34a853] text-white" : isNext ? "bg-primary text-white" : "bg-surface-3 text-gray-400"
                }`}
                aria-hidden
              >
                {isDone ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold text-gray-100 ${large ? "text-base" : "text-sm"}`}>
                  {s.title}
                  {isDone && <span className="ml-1.5 text-xs font-medium text-[#34a853]">열었어요</span>}
                </p>
                <p className={`mt-0.5 leading-relaxed text-gray-500 ${large ? "text-sm" : "text-xs"}`}>{s.desc}</p>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onStep(s)}
                  className={`mt-2 inline-flex items-center gap-1 rounded-md font-semibold transition-colors ${
                    large ? "px-3.5 py-2 text-sm" : "px-3 py-1.5 text-xs"
                  } ${
                    isNext
                      ? "bg-primary text-white hover:bg-primary-strong"
                      : "border border-line bg-surface text-gray-300 hover:bg-surface-3"
                  }`}
                >
                  {s.cta}
                  <span aria-hidden className="text-[10px] opacity-80">
                    ↗
                  </span>
                </a>
              </div>
            </li>
          );
        })}
      </ol>

      <p className={`mt-3 leading-relaxed text-gray-500 ${large ? "text-xs" : "text-[11px]"}`}>
        안드로이드 기기에서만 설치할 수 있어요. 그룹에 가입한 이메일은 운영자에게만 보여요.
      </p>
    </div>
  );
}
