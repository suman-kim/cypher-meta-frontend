"use client";

/**
 * UltimatePicker — 역할군 풀에서 "캐릭터(1차/2차)" 1개를 고르는 아바타 그리드(단일 선택).
 * 공식 역할군 투표(티어·조합)에서 쓴다. 선택값은 unitKey("캐릭터ID:궁극기") 문자열이다.
 * (legacy 투표는 캐릭터 단위 CharacterPicker 를 그대로 쓴다)
 */
import { Avatar } from "@/components/CharacterAvatar";
import { UltimateBadge } from "@/components/characters/UltimateBadge";
import { unitKey, type CharacterUltimate } from "@/lib/official";

/**
 * @param options — 고를 수 있는 궁극기 정의 목록(해당 역할군)
 * @param dual — 2차 궁극기 보유 캐릭터 ID 집합(1차/2차 배지 표시용)
 * @param value — 현재 선택된 unitKey
 * @param onSelect — 선택 시 unitKey 전달(같은 값을 다시 누르면 부모가 해제 처리)
 * @param disabledCharacterIds — 다른 칸에서 이미 고른 캐릭터(1차/2차 무관 중복 금지)
 */
export function UltimatePicker({
  options,
  dual,
  value,
  onSelect,
  disabledCharacterIds,
}: {
  options: CharacterUltimate[];
  dual: Set<string>;
  value?: string;
  onSelect: (unit: string) => void;
  disabledCharacterIds?: Set<string>;
}) {
  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-gray-500">
        해당 역할군 캐릭터가 없습니다.
      </div>
    );
  }
  return (
    <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line bg-surface-2 p-2">
      {options.map((o) => {
        const key = unitKey(o.characterId, o.ultimateType);
        const sel = key === value;
        const dis = !sel && !!disabledCharacterIds?.has(o.characterId);
        return (
          <button
            key={key}
            type="button"
            disabled={dis}
            onClick={() => onSelect(key)}
            title={`${o.characterName} · ${o.skillName}`}
            className={`relative flex w-[52px] flex-col items-center gap-0.5 rounded-md p-1 transition ${
              sel ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-surface-3"
            } ${dis ? "cursor-not-allowed opacity-30" : ""}`}
          >
            <Avatar characterId={o.characterId} characterName={o.characterName} size={36} zoom={1} />
            {dual.has(o.characterId) && (
              <UltimateBadge ultimateType={o.ultimateType} className="absolute right-0 top-0" />
            )}
            <span className="w-full truncate text-center text-[9px] text-gray-400">{o.characterName}</span>
          </button>
        );
      })}
    </div>
  );
}
