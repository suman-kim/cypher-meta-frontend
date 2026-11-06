/**
 * 소셜 묶음(커뮤니티·방송·멀티서치·비교) 화면이 함께 쓰는 작은 표시 부품과 형식 함수.
 *
 * 훅이 없는 순수 부품이라 서버·클라이언트 컴포넌트 어디서나 쓸 수 있다.
 * (공용 ui.tsx 로 올릴 만한 후보: 입력칸 스타일·필드 라벨·안내 줄·스피너)
 */
import type { ReactNode } from "react";
import { Icon, type IconName } from "../../icons";

/* ── 입력칸 ───────────────────────────────────── */

/**
 * 앱 입력칸 기본 클래스. 글자 크기를 16px 로 두어 iOS 웹뷰가 입력 시 화면을 확대하지 않게 한다.
 * 오류 상태는 inputCls(true) 로 빨간 테두리를 더한다.
 * @param invalid 오류 표시 여부
 * @returns className 문자열
 */
export function inputCls(invalid = false): string {
  return `w-full rounded-[14px] border bg-surface-2 px-3.5 text-base text-gray-100 outline-none transition-colors focus:border-primary ${
    invalid ? "border-app-loss-tx" : "border-line"
  }`;
}

/**
 * 입력 필드 묶음 — 라벨 + 입력 요소 + 아래 안내/오류 글.
 * @param label 라벨 글자
 * @param htmlFor 연결할 입력 요소 id
 * @param hint 회색 도움말 (오류가 없을 때 보인다)
 * @param error 빨간 오류 글 (있으면 hint 대신 보인다)
 * @param right 라벨 줄 오른쪽 요소(글자 수 등)
 * @param children 입력 요소
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  right,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-bold text-gray-300">
          {label}
        </label>
        {right}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-semibold text-app-loss-tx" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── 안내·상태 ────────────────────────────────── */

/**
 * 회색 바탕 안내 줄 (아이콘 + 글).
 * @param icon 앞 아이콘 (기본 info)
 * @param tone mute(회색) | ac(연한 강조) | loss(경고)
 * @param children 안내 글
 */
export function Notice({
  icon = "info",
  tone = "mute",
  children,
}: {
  icon?: IconName;
  tone?: "mute" | "ac" | "loss";
  children: ReactNode;
}) {
  const cls = {
    mute: "bg-surface-2 text-gray-300",
    ac: "bg-app-ac-soft text-app-ac-tx",
    loss: "bg-app-loss-bg text-app-loss-tx",
  }[tone];
  return (
    <div className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${cls}`}>
      <span className="mt-px shrink-0 opacity-80">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * 돌아가는 원형 불러오기 표시.
 * @param size 지름(px)
 */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block shrink-0 animate-spin rounded-full border-2 border-line border-t-primary"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/* ── 형식 ────────────────────────────────────── */

/**
 * 큰 숫자를 짧게 적는다. (1,234 → "1,234", 15,002 → "1.5만", 230,000 → "23만")
 * @param n 숫자
 */
export function compactNum(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 100000) return `${Math.round(n / 10000)}만`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString("ko-KR");
}

/* ── 주소 ────────────────────────────────────── */

/**
 * 비교 주소를 만든다 (웹 CompareForm 과 같은 모양).
 * @param a 플레이어 A 닉네임
 * @param b 플레이어 B 닉네임
 * @param gt 비교 기준 (all 이면 생략)
 */
export function compareHref(a: string, b: string, gt?: string): string {
  const q = new URLSearchParams({ a, b });
  if (gt && gt !== "all") q.set("gt", gt);
  return `/players/compare?${q.toString()}`;
}
