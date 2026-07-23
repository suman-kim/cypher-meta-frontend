"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/CharacterAvatar";
import type { RosterEntry, RoleCode } from "@/lib/votes";

const SECTIONS: { key: RoleCode | "etc"; label: string; color: string }[] = [
  { key: "tank", label: "탱커", color: "#5b8def" },
  { key: "melee", label: "근접딜러", color: "#e2506a" },
  { key: "ranged", label: "원거리딜러", color: "#4fbf6b" },
  { key: "support", label: "서포터", color: "#a15bf0" },
  { key: "etc", label: "미분류", color: "#9aa7b4" },
];

export default function CharacterRoster({ characters }: { characters: RosterEntry[] }) {
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const m: Record<string, RosterEntry[]> = { tank: [], melee: [], ranged: [], support: [], etc: [] };
    for (const c of characters) {
      if (kw && !(c.characterName ?? "").toLowerCase().includes(kw)) continue;
      (m[c.role] ?? m.etc).push(c);
    }
    for (const k of Object.keys(m))
      m[k].sort((a, b) => (a.characterName ?? "").localeCompare(b.characterName ?? "", "ko"));
    return m;
  }, [characters, q]);

  const total = SECTIONS.reduce((n, s) => n + (grouped[s.key]?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* 검색 */}
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
        <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="캐릭터 이름 검색"
          className="w-full bg-transparent text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-gray-500">{total}종</span>
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">검색 결과가 없습니다.</p>
      ) : (
        SECTIONS.map((s) => {
          const list = grouped[s.key] ?? [];
          if (list.length === 0) return null;
          return (
            <section key={s.key}>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-4 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <h2 className="text-base font-bold text-gray-100">{s.label}</h2>
                <span className="chip bg-surface-2 text-gray-500">{list.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {list.map((c) => (
                  <Link
                    key={c.characterId}
                    href={`/characters/${c.characterId}`}
                    className="group flex flex-col items-center gap-1.5 rounded-lg border border-line bg-surface p-2 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-surface-2"
                  >
                    <Avatar
                      characterId={c.characterId}
                      characterName={c.characterName ?? undefined}
                      size={56}
                      zoom={2}
                    />
                    <span className="w-full truncate text-center text-xs font-medium text-gray-300 group-hover:text-gray-100">
                      {c.characterName ?? c.characterId}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
