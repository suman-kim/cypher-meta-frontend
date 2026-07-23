"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "./CharacterAvatar";
import type { CharacterRow } from "@/lib/types";

export default function CharacterGrid({ characters }: { characters: CharacterRow[] }) {
  const [q, setQ] = useState("");
  const filtered = q
    ? characters.filter((c) => c.characterName.toLowerCase().includes(q.toLowerCase()))
    : characters;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-bg-border bg-bg-soft px-3 py-2">
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
        <span className="shrink-0 text-xs text-gray-500">{filtered.length}종</span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">검색 결과가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {filtered.map((c) => (
            <Link
              key={c.characterId}
              href={`/characters/${c.characterId}`}
              className="group flex flex-col items-center gap-1.5 rounded-lg border border-bg-border bg-bg-card p-2 transition-colors hover:border-brand/60 hover:bg-bg-hover"
            >
              <Avatar characterId={c.characterId} characterName={c.characterName} size={56} zoom={2} />
              <span className="w-full truncate text-center text-xs font-medium text-gray-300 group-hover:text-gray-100">
                {c.characterName}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
