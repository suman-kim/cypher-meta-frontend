import Link from "next/link";

/** 메타 페이지 상단: 데이터 뷰 / 커뮤니티 투표 뷰 전환 탭 */
export default function MetaViewTabs({
  base,
  active,
  dataLabel,
}: {
  base: string;
  active: "data" | "vote";
  dataLabel: string;
}) {
  const tabs = [
    { key: "data" as const, label: dataLabel, href: base },
    { key: "vote" as const, label: "🗳 커뮤니티 투표", href: `${base}?tab=vote` },
  ];
  return (
    <div className="inline-flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`segtab ${t.key === active ? "segtab-active" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
