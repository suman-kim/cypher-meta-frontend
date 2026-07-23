import Link from "next/link";
import type { CSSProperties } from "react";
import RankAvatar from "./RankAvatar";
import TagChips from "./TagChips";
import PickList from "./PickList";
import type { PickInfo } from "@/lib/ranking-enrich";

/** 공용 포디움 카드 (전체·캐릭터·결투장 랭킹 공용) */
export default function PodiumCard({
  place,
  href,
  nickname,
  characterId,
  characterName,
  subtitle,
  winRate,
  record,
  tags,
  picks,
}: {
  place: 1 | 2 | 3;
  href: string;
  nickname: string;
  characterId?: string;
  characterName?: string;
  subtitle?: string;
  winRate?: number;
  record?: { wins: number; loses: number } | null;
  tags?: string[];
  picks?: PickInfo[];
}) {
  const first = place === 1;
  const ring = place === 1 ? "#1d57ba" : place === 2 ? "#8b95a5" : "#c07b3f";
  const badge =
    place === 1
      ? "bg-primary text-white"
      : place === 2
        ? "bg-surface-3 text-gray-200"
        : "bg-[#c07b3f] text-white";
  const size = first ? 96 : 76;
  const ringStyle: CSSProperties = {
    boxShadow: `0 0 0 4px ${ring}, 0 0 0 8px rgba(255,255,255,0.35)`,
  };

  return (
    <Link
      href={href}
      className={`card relative flex flex-col items-center px-6 pb-5 pt-8 transition-colors hover:bg-surface-2 ${
        first ? "ring-2 ring-primary" : ""
      }`}
    >
      <span className={`chip absolute left-4 top-4 ${badge}`}>{place}위</span>

      <RankAvatar
        characterId={characterId}
        characterName={characterName}
        nickname={nickname}
        size={size}
        zoom={3}
        ringStyle={ringStyle}
      />

      <div
        className={`mt-4 max-w-full truncate font-bold ${first ? "text-xl text-primary" : "text-gray-100"}`}
      >
        {nickname}
      </div>
      {subtitle && <div className="mt-0.5 text-sm text-gray-500">{subtitle}</div>}

      {winRate !== undefined && (
        <div className="mt-3 w-full">
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-primary" style={{ width: `${winRate}%` }} />
          </div>
          <div className="mt-1.5 text-center text-sm font-semibold text-primary">
            승률 {winRate}%{record ? ` (${record.wins}승 ${record.loses}패)` : ""}
          </div>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-3">
          <TagChips tags={tags} className="flex flex-wrap justify-center gap-1" />
        </div>
      )}

      {picks && picks.length > 0 && (
        <div className="mt-3 flex flex-col items-center gap-1">
          <span className="text-[11px] font-semibold text-gray-500">픽 TOP3</span>
          <PickList picks={picks} />
        </div>
      )}
    </Link>
  );
}
