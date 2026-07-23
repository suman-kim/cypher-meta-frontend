import { Avatar } from "@/components/CharacterAvatar";
import type { PickInfo } from "@/lib/ranking-enrich";

/** 픽 TOP3 (캐릭터 이미지 + 판수) */
export default function PickList({ picks, compact = false }: { picks: PickInfo[]; compact?: boolean }) {
  if (!picks || picks.length === 0)
    return <span className="text-xs text-gray-500">기록 없음</span>;
  return (
    <div className="flex items-end gap-2">
      {picks.slice(0, 3).map((p, i) => (
        <div
          key={p.characterId}
          className="flex flex-col items-center gap-0.5"
          title={p.characterName}
        >
          <Avatar
            characterId={p.characterId}
            characterName={p.characterName}
            size={i === 0 ? (compact ? 26 : 34) : compact ? 22 : 28}
            zoom={1}
          />
          <span className={`${compact ? "text-[9px]" : "text-[10px]"} leading-none text-gray-500`}>
            {p.count}판
          </span>
        </div>
      ))}
    </div>
  );
}
