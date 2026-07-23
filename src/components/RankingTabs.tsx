import Link from "next/link";

export default function RankingTabs({ active }: { active: "rating" | "characters" | "tsj" }) {
  const tabs = [
    { href: "/ranking", label: "평점 랭킹", key: "rating" },
    { href: "/ranking/characters", label: "캐릭터 랭킹", key: "characters" },
    { href: "/ranking/tsj", label: "결투장 랭킹", key: "tsj" },
  ] as const;
  return (
    <div className="flex items-center gap-5 border-b border-line">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={`tab ${active === t.key ? "tab-active" : ""}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
