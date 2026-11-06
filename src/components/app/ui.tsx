/**
 * 앱 화면 공용 UI 부품 — 카드·섹션 제목·칩·세그먼트·아바타·승패 띠·상태(빈/오류/불러오는 중) 등.
 *
 * 훅을 쓰지 않는 순수 표시 부품이라 서버·클라이언트 컴포넌트 어디서나 쓸 수 있다.
 * (onClick 같은 함수 속성은 클라이언트 컴포넌트에서만 넘긴다)
 * 색은 html[data-app] 토큰(globals.css)을 따른다. 시안: design/app/CyphersMetaApp.dc.html
 */
import Link from "next/link";
import type { ReactNode } from "react";
import SafeImage from "@/components/SafeImage";
import { characterImage } from "@/lib/images";
import { Icon, type IconName } from "./icons";

/* ── 레이아웃 ─────────────────────────────────── */

/**
 * 화면 본문 기본 틀 — 좌우 16px, 섹션 사이 20px.
 * @param children 섹션들
 * @param className 추가 클래스
 */
export function AppPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-5 px-4 pb-8 pt-1 ${className}`}>{children}</div>;
}

/**
 * 섹션 제목 줄 — 왼쪽 제목, 오른쪽 "전체 ›" 같은 이동 링크.
 * @param title 섹션 제목
 * @param href 오른쪽 링크 주소 (없으면 링크 없음)
 * @param cta 오른쪽 링크 글자 (기본 "전체")
 * @param right 링크 대신 오른쪽에 둘 요소
 * @param sub 제목 옆 회색 보조 글자(개수 등)
 * @param lead 제목 앞 작은 요소(라이브 점 등)
 */
export function SectionHead({
  title,
  href,
  cta = "전체",
  right,
  sub,
  lead,
}: {
  title: ReactNode;
  href?: string;
  cta?: string;
  right?: ReactNode;
  sub?: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-1.5 text-[17px] font-extrabold tracking-[-0.02em] text-gray-100">
        {lead}
        <span className="truncate">{title}</span>
        {sub !== undefined && <span className="font-semibold text-gray-500">{sub}</span>}
      </h2>
      {right ??
        (href && (
          <Link href={href} className="flex shrink-0 items-center gap-px text-xs text-gray-500">
            {cta}
            <Icon name="chevronRight" size={13} />
          </Link>
        ))}
    </div>
  );
}

/**
 * 카드 — 링크면 Link 로, 아니면 div 로 그린다.
 * @param href 누르면 갈 주소 (선택)
 * @param className 추가 클래스 (안쪽 여백 등)
 * @param tile true 면 작은 카드(모서리 14px, 그림자 없음)
 * @param children 카드 내용
 */
export function Card({
  href,
  className = "",
  tile = false,
  children,
}: {
  href?: string;
  className?: string;
  tile?: boolean;
  children: ReactNode;
}) {
  const cls = `${tile ? "a-tile" : "a-card"} ${href ? "a-press block" : ""} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return <div className={cls}>{children}</div>;
}

/* ── 칩·세그먼트 ─────────────────────────────── */

/**
 * 알약 모양 칩 — 선택되면 그라데이션, 아니면 테두리만.
 * @param active 선택 여부
 * @param href 링크 주소 (서버 컴포넌트에서 필터 전환용)
 * @param onClick 누름 처리 (클라이언트 컴포넌트에서만)
 * @param soft true 면 선택 상태를 연한 강조색으로(보조 칩)
 * @param children 글자
 */
export function Chip({
  active = false,
  href,
  onClick,
  soft = false,
  children,
}: {
  active?: boolean;
  href?: string;
  onClick?: () => void;
  soft?: boolean;
  children: ReactNode;
}) {
  const cls = `flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
    active
      ? soft
        ? "bg-app-ac-soft text-app-ac-tx"
        : "a-grad a-glow"
      : "border border-line text-gray-300"
  }`;
  if (href) {
    return (
      <Link href={href} scroll={false} className={cls} aria-current={active ? "true" : undefined}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {children}
    </button>
  );
}

/** 칩을 가로 스크롤 한 줄로 늘어놓는다(좌우 화면 끝까지). */
export function ChipRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`a-hscroll a-bleed gap-1.5 ${className}`}>{children}</div>;
}

/** 세그먼트 한 칸 정의 */
export interface SegItem {
  /** 구분 값 */
  key: string;
  /** 표시 글자 */
  label: ReactNode;
  /** 링크 방식일 때 주소 */
  href?: string;
}

/**
 * 세그먼트(2~3칸 전환) — 선택 칸은 그라데이션.
 * href 가 있으면 링크로, 없으면 onChange 를 부른다.
 * @param items 칸 목록
 * @param value 선택된 칸의 key
 * @param onChange 칸을 눌렀을 때 (클라이언트에서만)
 * @param size md(높이 40) | sm(높이 34)
 */
export function Segmented({
  items,
  value,
  onChange,
  size = "md",
}: {
  items: SegItem[];
  value: string;
  onChange?: (key: string) => void;
  size?: "md" | "sm";
}) {
  const h = size === "md" ? "h-10 text-sm" : "h-[34px] text-[13px]";
  return (
    <div className="flex gap-1 rounded-[22px] bg-surface-2 p-1" role="tablist">
      {items.map((it) => {
        const on = it.key === value;
        const cls = `flex flex-1 items-center justify-center rounded-[18px] font-bold transition-colors ${h} ${
          on ? "a-grad shadow-[0_6px_16px_-6px_rgba(60,110,255,.6)]" : "text-gray-300"
        }`;
        return it.href ? (
          <Link key={it.key} href={it.href} scroll={false} replace className={cls} role="tab" aria-selected={on}>
            {it.label}
          </Link>
        ) : (
          <button key={it.key} type="button" onClick={() => onChange?.(it.key)} className={cls} role="tab" aria-selected={on}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── 캐릭터 이미지 ───────────────────────────── */

/**
 * 캐릭터 얼굴 이미지 (정사각, 둥근 모서리).
 * @param id 캐릭터 ID (없으면 이름 첫 글자로 대체)
 * @param name 캐릭터 이름 (대체 글자·alt)
 * @param size 한 변 크기(px)
 * @param radius 모서리 반경(px) — 원형이면 size/2
 * @param zoom Neople 이미지 확대 단계 (큰 그림은 2)
 * @param className 추가 클래스 (테두리 등)
 */
export function CharImg({
  id,
  name,
  size = 40,
  radius = 10,
  zoom = 1,
  className = "",
}: {
  id?: string | null;
  name?: string | null;
  size?: number;
  radius?: number;
  zoom?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden bg-app-ph ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <SafeImage
        src={characterImage(id ?? undefined, zoom)}
        alt={name ?? "캐릭터"}
        fallbackText={name?.slice(0, 1)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

/* ── 작은 배지 ───────────────────────────────── */

/**
 * 궁극기 배지 (1차/2차).
 * @param label "1차" | "2차" 같은 표시 글자
 */
export function UltBadge({ label }: { label: string }) {
  const second = label.startsWith("2");
  return (
    <span
      className={`inline-flex h-[18px] shrink-0 items-center rounded-md px-1.5 text-[10px] font-extrabold ${
        second ? "a-grad" : "bg-app-ac-soft text-app-ac-tx"
      }`}
    >
      {label}
    </span>
  );
}

/**
 * 작은 사각 배지 (티어·분류·버전 등).
 * @param tone grad(강조) | soft(연한 강조) | win | loss | mute(회색)
 * @param children 글자
 */
export function Badge({
  tone = "soft",
  children,
  className = "",
}: {
  tone?: "grad" | "soft" | "win" | "loss" | "mute" | "live";
  children: ReactNode;
  className?: string;
}) {
  const t = {
    grad: "a-grad",
    soft: "bg-app-ac-soft text-app-ac-tx",
    win: "bg-app-win-bg text-app-win-tx",
    loss: "bg-app-loss-bg text-app-loss-tx",
    mute: "bg-surface-2 text-gray-300",
    live: "bg-app-live text-white",
  }[tone];
  return (
    <span
      className={`inline-flex h-[18px] shrink-0 items-center whitespace-nowrap rounded-md px-1.5 text-[10px] font-extrabold ${t} ${className}`}
    >
      {children}
    </span>
  );
}

/* ── 승패 ─────────────────────────────────────── */

/** 승패 한 칸 값 */
export type WL = "win" | "lose" | null | undefined;

/**
 * 최근 경기 승패 띠 — 칸마다 "승"/"패" (승패를 모르면 "-").
 * @param results 최신순 결과 목록
 * @param max 최대 칸 수 (기본 10)
 */
export function WinLossStrip({ results, max = 10 }: { results: WL[]; max?: number }) {
  const list = results.slice(0, max);
  if (list.length === 0) return null;
  return (
    <div className="flex gap-1">
      {list.map((r, i) => (
        <span
          key={i}
          className={`grid h-[22px] min-w-0 flex-1 place-items-center rounded-md text-[10px] font-bold ${
            r === "win"
              ? "bg-app-win-bg text-app-win-tx"
              : r === "lose"
                ? "bg-app-loss-bg text-app-loss-tx"
                : "bg-surface-2 text-gray-500"
          }`}
        >
          {r === "win" ? "승" : r === "lose" ? "패" : "-"}
        </span>
      ))}
    </div>
  );
}

/**
 * 승률 글자 색 — 50% 이상이면 승색, 아니면 패색.
 * @param wr 승률(%) — null 이면 회색
 */
export function wrClass(wr: number | null | undefined): string {
  if (wr === null || wr === undefined || Number.isNaN(wr)) return "text-gray-500";
  return wr >= 50 ? "text-app-win-tx" : "text-app-loss-tx";
}

/* ── 상태 표시 ───────────────────────────────── */

/**
 * 불러오는 중 자리 표시 블록.
 * @param className 크기·모양 클래스 (예: "h-40 rounded-[20px]")
 */
export function Skel({ className = "" }: { className?: string }) {
  return <div className={`a-skel ${className}`} aria-hidden="true" />;
}

/**
 * 빈 상태·오류 상태 상자 — 아이콘, 안내 글, 다음에 할 일(버튼/링크).
 * @param kind empty(빈 상태) | error(오류)
 * @param title 큰 안내 글
 * @param desc 작은 설명 (선택)
 * @param action 버튼·링크 요소 (선택)
 * @param icon 아이콘 이름 (기본: empty=search, error=alert)
 */
export function StateBox({
  kind = "empty",
  title,
  desc,
  action,
  icon,
}: {
  kind?: "empty" | "error";
  title: ReactNode;
  desc?: ReactNode;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="a-card grid justify-items-center gap-2.5 px-4 py-6 text-center">
      <span className={kind === "error" ? "text-app-loss-tx" : "text-gray-500"}>
        <Icon name={icon ?? (kind === "error" ? "alert" : "search")} size={24} />
      </span>
      <p className="text-sm font-semibold text-gray-200">{title}</p>
      {desc && <p className="text-xs leading-relaxed text-gray-500">{desc}</p>}
      {action}
    </div>
  );
}

/**
 * 테두리 버튼 모양 링크 (빈·오류 상태의 다음 동작 등).
 * @param href 이동 주소
 * @param icon 앞 아이콘 (선택)
 * @param children 글자
 */
export function GhostLink({ href, icon, children }: { href: string; icon?: IconName; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
    </Link>
  );
}

/**
 * 숫자 지표 한 칸 (라벨 위, 큰 값 아래).
 * @param label 지표 이름
 * @param value 값 (모르면 "-")
 * @param tone 값 색 — win/loss/ac/default
 */
export function StatCell({
  label,
  value,
  tone = "default",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "win" | "loss" | "ac";
}) {
  const c = { default: "text-gray-100", win: "text-app-win-tx", loss: "text-app-loss-tx", ac: "text-primary" }[tone];
  return (
    <div className="grid min-w-0 justify-items-center gap-0.5 text-center">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-lg font-extrabold tabular-nums ${c}`}>{value}</span>
    </div>
  );
}

/* ── 성향 태그 ───────────────────────────────── */

/** 성향 태그 라벨 → [색 톤, 아이콘] (이모지 대신 SVG) */
const TAG_LOOK: Record<string, ["up" | "ac" | "loss" | "mute", IconName]> = {
  압도적: ["up", "crown"],
  상승세: ["up", "trendUp"],
  안정적: ["mute", "filter"],
  준수: ["mute", "check"],
  "기복 있음": ["loss", "wave"],
  "반등 필요": ["loss", "trendUp"],
  "원챔 장인": ["ac", "target"],
  "주력픽 확고": ["ac", "target"],
  "주력픽 뚜렷": ["ac", "target"],
  "만능 픽": ["ac", "grid"],
  "멀티 픽": ["ac", "grid"],
  학살자: ["loss", "sword"],
  공격적: ["loss", "sword"],
  서포터형: ["ac", "heart"],
  조력자: ["ac", "users"],
  고KDA: ["up", "bars"],
  불사신: ["up", "shield"],
  생존형: ["ac", "heart"],
  밸런스형: ["mute", "filter"],
  화력형: ["loss", "flame"],
  "골드 파밍": ["ac", "coin"],
  "콤보 장인": ["ac", "sparkle"],
  백어택러: ["loss", "sword"],
  속전속결: ["loss", "clock"],
  힐러: ["up", "heart"],
  철벽: ["up", "shield"],
  "시야 장인": ["ac", "eye"],
  "가디언 헌터": ["ac", "target"],
  "공성 특화": ["ac", "map"],
  장기전형: ["mute", "clock"],
  딜러: ["ac", "target"],
};

/**
 * 태그 문자열에서 앞의 이모지를 떼어 낸 라벨을 돌려준다. ("👁️ 시야 장인" → "시야 장인")
 * @param tag 원본 태그
 */
export function tagLabel(tag: string): string {
  const sp = tag.indexOf(" ");
  if (sp > 0 && /[^\p{L}\p{N}]/u.test(tag.slice(0, sp))) return tag.slice(sp + 1);
  return tag;
}

/**
 * 플레이 성향 태그 칩 (SVG 아이콘 + 라벨).
 * @param tag 태그 문자열 (이모지가 붙어 있어도 된다)
 */
export function PlayTag({ tag }: { tag: string }) {
  const label = tagLabel(tag);
  const [tone, icon] = TAG_LOOK[label] ?? ["mute", "check"];
  const cls = {
    up: "bg-app-win-bg text-app-win-tx",
    ac: "bg-app-ac-soft text-app-ac-tx",
    loss: "bg-app-loss-bg text-app-loss-tx",
    mute: "bg-surface-2 text-gray-300",
  }[tone];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ${cls}`}>
      <Icon name={icon} size={12} />
      {label}
    </span>
  );
}

/**
 * 성향 태그 여러 개.
 * @param tags 태그 목록
 * @param max 최대 개수 (기본 4)
 */
export function PlayTags({ tags, max = 4 }: { tags: string[]; max?: number }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.slice(0, max).map((t) => (
        <PlayTag key={t} tag={t} />
      ))}
    </div>
  );
}

/* ── 목록 행 ─────────────────────────────────── */

/**
 * 메뉴 목록 한 줄 (제목·설명·오른쪽 화살표).
 * @param href 이동 주소
 * @param title 제목
 * @param desc 설명 (선택)
 * @param lead 왼쪽 요소 (아이콘 등, 선택)
 * @param right 오른쪽 요소 (기본 화살표)
 */
export function ListRow({
  href,
  title,
  desc,
  lead,
  right,
}: {
  href: string;
  title: ReactNode;
  desc?: ReactNode;
  lead?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-surface-2">
      {lead}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-sm font-bold text-gray-100">{title}</span>
        {desc && <span className="truncate text-[11px] text-gray-500">{desc}</span>}
      </span>
      {right ?? (
        <span className="text-gray-500">
          <Icon name="chevronRight" size={16} />
        </span>
      )}
    </Link>
  );
}

/* ── 티어 이름 ───────────────────────────────── */

/** API 영문 티어 키워드 → 한글 */
const TIER_KO: [RegExp, string][] = [
  [/\bACE\b/i, "에이스"],
  [/\bJOKER\b/i, "조커"],
  [/\bDIAMOND\b/i, "다이아몬드"],
  [/\bGOLD\b/i, "골드"],
  [/\bSILVER\b/i, "실버"],
  [/\bBRONZE\b/i, "브론즈"],
];

/**
 * 티어 이름을 한글로 바꾼다. ("ACE" → "에이스", "GOLD 2" → "골드 2", 이미 한글이면 그대로)
 * @param tierName API 티어 이름
 * @returns 한글 티어 이름 (없으면 null)
 */
export function tierKo(tierName: string | null | undefined): string | null {
  if (!tierName) return null;
  let out = tierName;
  for (const [re, ko] of TIER_KO) out = out.replace(re, ko);
  return out;
}
