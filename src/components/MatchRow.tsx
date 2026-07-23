import Link from "next/link";
import type { MatchRow as MatchRowType } from "@/lib/types";
import { Avatar } from "./CharacterAvatar";
import { formatKDA, kdaColor, calcKDA, formatPlayTime, relativeTime } from "@/lib/format";
import { gameTypeLabel } from "@/lib/constants";

export default function MatchRow({
  match,
  gameTypeId,
  highlightPlayerId,
}: {
  match: MatchRowType;
  gameTypeId?: string;
  highlightPlayerId?: string;
}) {
  const p = match.playInfo;
  const win = p.result === "win";
  const kda = calcKDA(p.killCount, p.deathCount, p.assistCount);
  const href = highlightPlayerId
    ? `/matches/${match.matchId}?highlight=${encodeURIComponent(highlightPlayerId)}`
    : `/matches/${match.matchId}`;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 transition-colors ${
        win
          ? "border-l-win bg-win/10 hover:bg-win/15"
          : "border-l-lose bg-lose/10 hover:bg-lose/15"
      }`}
    >
      <div className="flex w-16 shrink-0 flex-col items-center">
        <span className={`text-sm font-bold ${win ? "text-blue-300" : "text-red-300"}`}>
          {win ? "승리" : "패배"}
        </span>
        <span className="text-[11px] text-gray-500">{gameTypeLabel(gameTypeId)}</span>
      </div>

      <Avatar characterId={p.characterId} characterName={p.characterName} size={44} zoom={1} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-gray-100">{p.characterName}</div>
        <div className="text-xs text-gray-500">
          {[p.playTypeName, p.playTime ? formatPlayTime(p.playTime) : "", relativeTime(match.date)]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>

      <div className="w-24 shrink-0 text-center">
        <div className="text-sm font-bold text-gray-100">
          {p.killCount ?? 0} <span className="text-gray-500">/</span>{" "}
          <span className="text-red-400">{p.deathCount ?? 0}</span>{" "}
          <span className="text-gray-500">/</span> {p.assistCount ?? 0}
        </div>
        <div className="text-xs font-semibold" style={{ color: kdaColor(kda) }}>
          {formatKDA(p.killCount, p.deathCount, p.assistCount)} 평점
        </div>
      </div>
    </Link>
  );
}
