"use client";

import { useRouter } from "next/navigation";
import { CHARACTER_RANKING_TYPES } from "@/lib/constants";
import type { CharacterRow } from "@/lib/types";

export default function CharacterRankingControls({
  characters,
  characterId,
  rankingType,
}: {
  characters: CharacterRow[];
  characterId: string;
  rankingType: string;
}) {
  const router = useRouter();

  function go(next: { characterId?: string; rankingType?: string }) {
    const cid = next.characterId ?? characterId;
    const rt = next.rankingType ?? rankingType;
    const params = new URLSearchParams();
    if (cid) params.set("characterId", cid);
    if (rt) params.set("rankingType", rt);
    router.push(`/ranking/characters?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={characterId}
        onChange={(e) => go({ characterId: e.target.value })}
        className="rounded-md border border-bg-border bg-bg-soft px-3 py-2 text-sm text-gray-100 focus:border-brand focus:outline-none"
      >
        <option value="">캐릭터 선택…</option>
        {characters.map((c) => (
          <option key={c.characterId} value={c.characterId}>
            {c.characterName}
          </option>
        ))}
      </select>

      <select
        value={rankingType}
        onChange={(e) => go({ rankingType: e.target.value })}
        className="rounded-md border border-bg-border bg-bg-soft px-3 py-2 text-sm text-gray-100 focus:border-brand focus:outline-none"
      >
        {CHARACTER_RANKING_TYPES.map((t) => (
          <option key={t.type} value={t.type}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
