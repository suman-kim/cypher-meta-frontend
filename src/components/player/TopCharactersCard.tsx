import { Avatar } from "@/components/CharacterAvatar";
import type { TopCharacter } from "@/lib/profile";

export default function TopCharactersCard({ characters }: { characters: TopCharacter[] }) {
  if (characters.length === 0) return null;
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-100">자주 플레이한 캐릭터</h3>
      <ul className="space-y-2.5">
        {characters.map((c, i) => (
          <li key={c.characterName} className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center text-xs font-bold text-gray-500">{i + 1}</span>
            <Avatar characterId={c.characterId} characterName={c.characterName} size={32} zoom={1} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-gray-200">{c.characterName}</div>
              <div className="text-xs text-gray-500">
                {c.pct}% <span className="text-gray-600">({c.count}판)</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
