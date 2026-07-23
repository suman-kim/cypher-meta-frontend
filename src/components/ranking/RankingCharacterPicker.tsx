"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/CharacterAvatar";
import type { CharacterRow } from "@/lib/types";

/** 캐릭터 랭킹용 캐릭터 선택 그리드 (셀렉트박스 대체) */
export default function RankingCharacterPicker({
  characters,
  rankingType,
  selectedId,
}: {
  characters: CharacterRow[];
  rankingType: string;
  selectedId?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const filtered = q
    ? characters.filter((c) => c.characterName.toLowerCase().includes(q.toLowerCase()))
    : characters;

  function pick(id: string) {
    router.push(`/ranking/characters?characterId=${id}&rankingType=${rankingType}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
        <svg
          className="h-4 w-4 text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
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
          {filtered.map((c) => {
            const active = c.characterId === selectedId;
            return (
              <button
                key={c.characterId}
                type="button"
                onClick={() => pick(c.characterId)}
                className={`group flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-line bg-surface hover:border-primary/60 hover:bg-surface-2"
                }`}
              >
                <Avatar characterId={c.characterId} characterName={c.characterName} size={56} zoom={2} />
                <span
                  className={`w-full truncate text-center text-xs font-medium ${
                    active ? "text-primary" : "text-gray-300 group-hover:text-gray-100"
                  }`}
                >
                  {c.characterName}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
