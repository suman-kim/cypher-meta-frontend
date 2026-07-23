"use client";

import { Avatar } from "@/components/CharacterAvatar";
import type { RosterEntry } from "@/lib/votes";

/** 역할 풀에서 캐릭터 1명을 고르는 아바타 그리드(단일 선택). */
export function CharacterPicker({
  options,
  value,
  onSelect,
  disabledIds,
}: {
  options: RosterEntry[];
  value?: string;
  onSelect: (id: string) => void;
  disabledIds?: Set<string>;
}) {
  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-gray-500">
        해당 역할 캐릭터가 없습니다.
      </div>
    );
  }
  return (
    <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line bg-surface-2 p-2">
      {options.map((o) => {
        const sel = o.characterId === value;
        const dis = !sel && !!disabledIds?.has(o.characterId);
        return (
          <button
            key={o.characterId}
            type="button"
            disabled={dis}
            onClick={() => onSelect(o.characterId)}
            title={o.characterName ?? undefined}
            className={`flex w-[52px] flex-col items-center gap-0.5 rounded-md p-1 transition ${
              sel ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-surface-3"
            } ${dis ? "cursor-not-allowed opacity-30" : ""}`}
          >
            <Avatar characterId={o.characterId} characterName={o.characterName ?? undefined} size={36} zoom={1} />
            <span className="w-full truncate text-center text-[9px] text-gray-400">{o.characterName}</span>
          </button>
        );
      })}
    </div>
  );
}
