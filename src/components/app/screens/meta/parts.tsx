/**
 * 메타·캐릭터·랭킹 묶음 화면이 함께 쓰는 작은 부품.
 *
 * - 메타/랭킹 탭 첫 화면의 큰 제목 상단바(세그먼트 포함)
 * - 데이터 티어 배지(S~D), 순위 변동 표시, 작은 성향 태그, 가는 막대, 이전/다음 쪽 링크
 * - 스킬 조작 키 이름(LMB → 좌클릭 …), 몇 분 전 표기
 * 훅이 없는 순수 표시 부품이라 서버·클라이언트 컴포넌트 어디서나 쓸 수 있다.
 * (공용 ui.tsx 에 없는 것만 둔다 — 공용으로 올릴 후보: TierBadge, RankDelta, MiniTag, Bar)
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { Tier } from "@/lib/meta";
import { AppTopBar } from "../../AppChrome";
import { Icon } from "../../icons";
import { Segmented, tagLabel } from "../../ui";

/* ── 상단바 ─────────────────────────────────── */

/**
 * 메타 탭 상단바 — 큰 제목 "메타", 오른쪽 "캐릭터 목록 ›", 아래 캐릭터 티어/조합 티어 세그먼트.
 * @param active 지금 보는 세그먼트 (tier=캐릭터 티어, comp=조합 티어)
 */
export function MetaTopBar({ active }: { active: "tier" | "comp" }) {
  return (
    <AppTopBar
      variant="large"
      title="메타"
      right={
        <Link href="/characters" className="flex items-center gap-px text-xs font-semibold text-gray-300">
          캐릭터 목록
          <Icon name="chevronRight" size={13} />
        </Link>
      }
    >
      <Segmented
        size="sm"
        value={active}
        items={[
          { key: "tier", label: "캐릭터 티어", href: "/meta" },
          { key: "comp", label: "조합 티어", href: "/meta/comp" },
        ]}
      />
    </AppTopBar>
  );
}

/**
 * 랭킹 탭 상단바 — 큰 제목 "랭킹", 오른쪽 기준 안내, 아래 전체/캐릭터별/결투장 세그먼트.
 * @param active 지금 보는 세그먼트 (all=전체, char=캐릭터별, tsj=결투장)
 * @param basis 오른쪽에 회색으로 보여 줄 기준 글자 (예: "공식전 RP")
 */
export function RankTopBar({ active, basis }: { active: "all" | "char" | "tsj"; basis: string }) {
  return (
    <AppTopBar variant="large" title="랭킹" right={<span className="text-xs text-gray-500">{basis}</span>}>
      <Segmented
        size="sm"
        value={active}
        items={[
          { key: "all", label: "전체", href: "/ranking" },
          { key: "char", label: "캐릭터별", href: "/ranking/characters" },
          { key: "tsj", label: "결투장", href: "/ranking/tsj" },
        ]}
      />
    </AppTopBar>
  );
}

/* ── 배지·표시 ───────────────────────────────── */

/**
 * 데이터 티어(S~D) 배지 — S 는 그라데이션, A 는 연한 강조, B·C·D 는 회색.
 * @param tier 티어 글자
 * @param size sm(표 안, 22px) | lg(상세 머리, 높이 24 + "티어" 글자)
 */
export function TierBadge({ tier, size = "sm" }: { tier: Tier; size?: "sm" | "lg" }) {
  const tone = tier === "S" ? "a-grad" : tier === "A" ? "bg-app-ac-soft text-app-ac-tx" : "bg-surface-2 text-gray-300";
  if (size === "lg") {
    return (
      <span className={`inline-flex h-6 shrink-0 items-center rounded-lg px-2 text-xs font-extrabold ${tone}`}>
        {tier} 티어
      </span>
    );
  }
  return (
    <span className={`inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md text-xs font-extrabold ${tone}`}>
      {tier}
    </span>
  );
}

/**
 * 순위 변동 — 신규 진입 NEW, 변동 없음 –, 상승(빨강 위 삼각형)·하락(파랑 아래 삼각형) + 계단 수.
 * (한국식 표기: 오르면 빨강, 내리면 파랑 — 웹 RankChange 와 같은 규칙)
 * @param rank 지금 순위
 * @param beforeRank 이전 순위 (0·없음이면 신규 진입)
 */
export function RankDelta({ rank, beforeRank }: { rank: number; beforeRank?: number | null }) {
  if (!beforeRank || beforeRank <= 0) {
    return <span className="text-[9px] font-extrabold tracking-wide text-primary">NEW</span>;
  }
  const delta = beforeRank - rank;
  if (delta === 0) return <span className="text-[10px] font-bold text-gray-500">-</span>;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-px text-[10px] font-bold tabular-nums ${up ? "text-app-loss-tx" : "text-app-win-tx"}`}
      aria-label={up ? `${delta}계단 상승` : `${-delta}계단 하락`}
    >
      <svg width="7" height="7" viewBox="0 0 10 10" aria-hidden="true">
        <path d={up ? "M5 1l4 7H1z" : "M5 9L1 2h8z"} fill="currentColor" />
      </svg>
      {Math.abs(delta)}
    </span>
  );
}

/**
 * 촘촘한 목록용 작은 성향 태그(글자만, 높이 18px). 앞의 이모지는 떼어 낸다.
 * @param tag 성향 태그 원문
 * @param className 추가 클래스 (좁은 화면에서 숨기기 등)
 */
export function MiniTag({ tag, className = "" }: { tag: string; className?: string }) {
  return (
    <span
      className={`inline-flex h-[18px] shrink-0 items-center whitespace-nowrap rounded-md bg-surface-2 px-1.5 text-[10px] font-semibold text-gray-300 ${className}`}
    >
      {tagLabel(tag)}
    </span>
  );
}

/**
 * 가는 가로 막대(비율 표시).
 * @param pct 채울 비율(0~100)
 * @param className 바깥 막대 클래스 (높이·폭)
 * @param tone grad(강조 그라데이션) | mute(회색)
 */
export function Bar({ pct, className = "h-1.5", tone = "grad" }: { pct: number; className?: string; tone?: "grad" | "mute" }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <span className={`block overflow-hidden rounded-full bg-surface-2 ${className}`}>
      <span className={`block h-full rounded-full ${tone === "grad" ? "a-grad" : "bg-gray-500"}`} style={{ width: `${w}%` }} />
    </span>
  );
}

/**
 * 이전/다음 쪽 링크 줄 (쪽 단위로 넘기는 목록의 맨 아래).
 * @param prevHref 이전 쪽 주소 (없으면 숨김)
 * @param nextHref 다음 쪽 주소 (없으면 숨김)
 * @param label 가운데 안내 글 (예: "51~100위")
 */
export function PageLinks({ prevHref, nextHref, label }: { prevHref?: string | null; nextHref?: string | null; label?: ReactNode }) {
  if (!prevHref && !nextHref) return null;
  const cls = "a-press inline-flex h-9 items-center gap-1 rounded-full border border-line px-3.5 text-[13px] font-semibold text-gray-200";
  return (
    <div className="flex items-center justify-between gap-2">
      {prevHref ? (
        <Link href={prevHref} className={cls}>
          <Icon name="back" size={14} />
          이전
        </Link>
      ) : (
        <span />
      )}
      {label && <span className="text-xs text-gray-500">{label}</span>}
      {nextHref ? (
        <Link href={nextHref} className={cls}>
          다음
          <Icon name="chevronRight" size={14} />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

/* ── 글자 도우미 ─────────────────────────────── */

/** 스킬 슬롯 코드 → 앱 표시 이름 */
const SKILL_KEY: Record<string, string> = {
  LMB: "좌클릭",
  RMB: "우클릭",
  "LMB+RMB": "양클릭",
  "Shift+LMB": "Shift+좌클릭",
  "Shift+RMB": "Shift+우클릭",
  "Wheel Up": "휠 위",
  "Wheel Down": "휠 아래",
  Passive: "패시브",
};

/**
 * 스킬 조작 키 이름을 쉬운 말로 바꾼다. ("Shift+LMB" → "Shift+좌클릭")
 * @param slot 스킬 슬롯 코드
 */
export function skillKeyLabel(slot: string): string {
  return SKILL_KEY[slot] ?? slot;
}

/**
 * 몇 분/시간/일 전인지 짧게 적는다.
 * @param iso 기준 시각(ISO 문자열)
 * @param now 지금 시각(ms) — 서버 렌더 시각
 * @returns "방금 전" | "n분 전" | "n시간 전" | "n일 전" (시각이 이상하면 null)
 */
export function agoText(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}
