"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ITEM_RARITIES } from "@/lib/constants";
import type { CharacterRow } from "@/lib/types";

export default function ItemSearchControls({
  characters,
  itemName,
  rarityCode,
  characterId,
}: {
  characters: CharacterRow[];
  itemName: string;
  rarityCode: string;
  characterId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(itemName);
  const [rarity, setRarity] = useState(rarityCode);
  const [character, setCharacter] = useState(characterId);

  function submit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (name.trim()) params.set("itemName", name.trim());
    if (rarity) params.set("rarityCode", rarity);
    if (character) params.set("characterId", character);
    router.push(`/items?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-bg-border bg-bg-soft px-3 py-2 focus-within:border-brand">
        <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="아이템 이름 검색"
          className="w-full bg-transparent text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
        />
      </div>

      <select
        value={rarity}
        onChange={(e) => setRarity(e.target.value)}
        className="rounded-md border border-bg-border bg-bg-soft px-3 py-2 text-sm text-gray-100 focus:border-brand focus:outline-none"
      >
        <option value="">전체 등급</option>
        {ITEM_RARITIES.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>

      <select
        value={character}
        onChange={(e) => setCharacter(e.target.value)}
        className="max-w-[160px] rounded-md border border-bg-border bg-bg-soft px-3 py-2 text-sm text-gray-100 focus:border-brand focus:outline-none"
      >
        <option value="">전체 캐릭터</option>
        {characters.map((c) => (
          <option key={c.characterId} value={c.characterId}>
            {c.characterName}
          </option>
        ))}
      </select>

      <button type="submit" className="btn-primary">
        검색
      </button>
    </form>
  );
}
