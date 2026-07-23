import type { CSSProperties } from "react";
import SafeImage from "@/components/SafeImage";
import { characterImage } from "@/lib/images";

export function initials(name?: string) {
  return (name?.trim()?.slice(0, 2) || "?").toUpperCase();
}

/** 랭킹용 원형 캐릭터 아바타 (없거나 로드 실패 시 닉네임 이니셜) */
export default function RankAvatar({
  characterId,
  characterName,
  nickname,
  size,
  zoom = 2,
  ringStyle,
}: {
  characterId?: string;
  characterName?: string;
  nickname: string;
  size: number;
  zoom?: 1 | 2 | 3;
  ringStyle?: CSSProperties;
}) {
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full bg-surface-3"
      style={{ width: size, height: size, ...ringStyle }}
    >
      <SafeImage
        src={characterImage(characterId, zoom)}
        alt={characterName ?? nickname}
        fallbackText={initials(nickname)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
