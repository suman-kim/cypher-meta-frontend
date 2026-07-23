import { characterImage } from "@/lib/images";
import SafeImage from "./SafeImage";

interface Props {
  characterId?: string;
  characterName?: string;
  size?: number;
  zoom?: 1 | 2 | 3;
  className?: string;
  rounded?: boolean;
}

export default function CharacterAvatar({
  characterId,
  characterName,
  size = 44,
  zoom = 1,
  className = "",
  rounded = true,
}: Props) {
  return (
    <SafeImage
      src={characterImage(characterId, zoom)}
      alt={characterName ?? "character"}
      fallbackText={characterName?.slice(0, 1)}
      className={`shrink-0 object-cover ${rounded ? "rounded-md" : ""} ${className}`}
      fallbackClassName={rounded ? "rounded-md" : ""}
    />
  );
}

/** 인라인 스타일로 크기를 강제하기 위한 래퍼 (SafeImage 는 className 만 받음) */
export function Avatar({
  characterId,
  characterName,
  size = 44,
  zoom = 1,
  rounded = true,
}: Props) {
  return (
    <span
      className="inline-block overflow-hidden"
      style={{ width: size, height: size, borderRadius: rounded ? 8 : 0 }}
    >
      <CharacterAvatar
        characterId={characterId}
        characterName={characterName}
        zoom={zoom}
        rounded={rounded}
        className="h-full w-full"
      />
    </span>
  );
}
