import Link from "next/link";
import { ReactNode } from "react";
import { tierColor } from "@/lib/constants";

/** 티어 뱃지 */
export function TierBadge({ tierName, rp }: { tierName?: string; rp?: number }) {
  if (!tierName && rp === undefined) return <span className="text-gray-500">-</span>;
  const color = tierColor(tierName);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="font-bold" style={{ color }}>
        {tierName ?? "Unranked"}
      </span>
      {rp !== undefined && <span className="text-gray-400">{rp.toLocaleString()} RP</span>}
    </span>
  );
}

/** 승/패 배지 */
export function ResultBadge({ result }: { result?: string }) {
  const win = result === "win";
  return (
    <span
      className={`chip ${win ? "bg-win/15 text-blue-300" : "bg-lose/15 text-red-300"}`}
    >
      {win ? "승리" : "패배"}
    </span>
  );
}

/** 빈 상태 */
export function EmptyState({
  title,
  description,
  icon = "🔍",
}: {
  title: string;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-bg-border bg-bg-soft/40 px-6 py-16 text-center">
      <div className="mb-3 text-4xl opacity-60">{icon}</div>
      <p className="text-base font-semibold text-gray-200">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
  );
}

/** 에러 상태 */
export function ErrorState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-lose/30 bg-lose/10 px-6 py-10 text-center">
      <div className="mb-2 text-3xl">⚠️</div>
      <p className="text-base font-semibold text-red-200">{message}</p>
      {hint && <p className="mt-2 text-sm text-red-300/70">{hint}</p>}
    </div>
  );
}

/** 섹션 제목 */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold text-gray-100">{children}</h2>
      {right}
    </div>
  );
}

/** 링크 탭 그룹 (URL 기반) */
export function LinkTabs({
  tabs,
}: {
  tabs: { href: string; label: string; active: boolean }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-bg-border bg-bg-soft p-1">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={`tab ${t.active ? "tab-active" : ""}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/** 통계 스탯 박스 */
export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="rounded-md bg-bg-soft px-3 py-2 text-center">
      <div className="text-lg font-bold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}
