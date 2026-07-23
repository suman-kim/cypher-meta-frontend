"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/meta", label: "캐릭터 티어" },
  { href: "/meta/comp", label: "조합 티어" },
];

export default function MetaSubTabs() {
  const pathname = usePathname();
  return (
    <div className="inline-flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
      {TABS.map((t) => {
        const active = t.href === "/meta" ? pathname === "/meta" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`segtab ${active ? "segtab-active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
