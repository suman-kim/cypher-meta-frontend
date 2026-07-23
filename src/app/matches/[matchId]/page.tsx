import Link from "next/link";
import { getMatch, NeopleApiError } from "@/lib/neople";
import { Avatar } from "@/components/CharacterAvatar";
import ItemIcon from "@/components/ItemIcon";
import SafeImage from "@/components/SafeImage";
import { ErrorState } from "@/components/ui";
import { characterImage } from "@/lib/images";
import { formatKDA, kdaColor, calcKDA, formatDate, formatPlayTime, formatNumber } from "@/lib/format";
import { gameTypeLabel, STAT_LABELS } from "@/lib/constants";
import type { MatchDetail, MatchDetailItem, MatchDetailPlayer, MatchDetailTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: { matchId: string };
  searchParams: { highlight?: string };
}

export const metadata = { title: "매치 상세" };

const MULTI_KILLS = [
  { key: "double", label: "더블킬", color: "#4fbf6b" },
  { key: "triple", label: "트리플킬", color: "#4f8ff0" },
  { key: "quadruple", label: "쿼드러플킬", color: "#a15bf0" },
  { key: "genocide", label: "제노사이드", color: "#ff5470" },
] as const;

function PlayerCard({
  player,
  highlight,
}: {
  player: MatchDetailPlayer;
  highlight: boolean;
}) {
  const p = player.playInfo;
  const kda = calcKDA(p.killCount, p.deathCount, p.assistCount);

  // 멀티킬 배지 (0 초과인 것만)
  const mk = p.multiKillCount ?? {};
  const multiKills = MULTI_KILLS.map((m) => ({ ...m, n: (mk as Record<string, number>)[m.key] ?? 0 })).filter(
    (m) => m.n > 0,
  );

  // 구매 순서 아이콘의 이름/희귀도 조회용 (최종 장착 아이템에서)
  const itemMeta = new Map<string, MatchDetailItem>();
  for (const it of player.items ?? []) if (it.itemId) itemMeta.set(it.itemId, it);

  const hasCoin = p.getCoin !== undefined || p.spendCoin !== undefined;

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${
        highlight ? "bg-brand/15 ring-1 ring-brand/50" : "bg-bg-soft"
      }`}
    >
      {/* 캐릭터 배경 이미지 */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 opacity-[0.14]">
        <SafeImage
          src={characterImage(p.characterId, 3)}
          alt=""
          fallbackText=""
          className="h-full w-full object-cover object-top"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: highlight
            ? "linear-gradient(to left, rgba(28,38,66,0.15), rgba(28,38,66,0.85) 55%)"
            : "linear-gradient(to left, rgba(21,23,30,0.25), #15171e 55%)",
        }}
      />

      <div className="relative p-3">
        <div className="flex items-center gap-3">
          <Avatar characterId={p.characterId} characterName={p.characterName} size={40} zoom={1} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/players/${player.playerId}`}
                className="truncate text-sm font-semibold text-gray-100 hover:text-brand-glow"
              >
                {player.nickname}
              </Link>
              {p.aceInfo?.name && (
                <span
                  className="chip shrink-0 px-1.5 py-0 text-[10px] font-bold"
                  style={
                    p.aceInfo.name === "ACE"
                      ? { color: "#ff5470", backgroundColor: "#ff547020" }
                      : { color: "#a15bf0", backgroundColor: "#a15bf020" }
                  }
                >
                  {p.aceInfo.name}
                </span>
              )}
            </div>
            <div className="truncate text-xs text-gray-500">{p.characterName}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-100">
              {p.killCount ?? 0}/{p.deathCount ?? 0}/{p.assistCount ?? 0}
            </div>
            <div className="text-xs font-semibold" style={{ color: kdaColor(kda) }}>
              {formatKDA(p.killCount, p.deathCount, p.assistCount)}
            </div>
          </div>
        </div>

        {/* 멀티킬 */}
        {multiKills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {multiKills.map((m) => (
              <span
                key={m.key}
                className="chip px-1.5 py-0.5 text-[10px] font-bold"
                style={{ color: m.color, backgroundColor: `${m.color}20` }}
              >
                {m.label}
                {m.n > 1 ? ` ×${m.n}` : ""}
              </span>
            ))}
          </div>
        )}

        {/* 최종 장착 아이템 */}
        {player.items && player.items.length > 0 && (
          <div className="mt-2">
            <div className="mb-1 text-[10px] text-gray-500">장착 아이템</div>
            <div className="flex flex-wrap gap-1">
              {player.items.map((it, i) => (
                <ItemIcon
                  key={`${it.itemId}-${i}`}
                  itemId={it.itemId}
                  itemName={it.itemName}
                  rarityCode={it.rarityCode}
                  size={26}
                />
              ))}
            </div>
          </div>
        )}

        {/* 구매 순서 */}
        {player.itemPurchase && player.itemPurchase.length > 0 && (
          <div className="mt-2">
            <div className="mb-1 text-[10px] text-gray-500">
              구매 순서 <span className="text-gray-600">({player.itemPurchase.length})</span>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {player.itemPurchase.map((id, i) => {
                const meta = itemMeta.get(id);
                return (
                  <ItemIcon
                    key={`${id}-${i}`}
                    itemId={id}
                    itemName={meta?.itemName}
                    rarityCode={meta?.rarityCode}
                    size={18}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 주요 포인트 */}
        <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] text-gray-500">
          {(["attackPoint", "damagePoint", "battlePoint"] as const).map((k) =>
            p[k] !== undefined ? (
              <div key={k} className="rounded bg-bg/70 px-1.5 py-1 text-center">
                <div className="font-semibold text-gray-300">{formatNumber(p[k])}</div>
                <div>{STAT_LABELS[k]}</div>
              </div>
            ) : null,
          )}
        </div>

        {/* 코인 */}
        {hasCoin && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
            <span>
              🪙 획득 <span className="font-semibold text-amber-300">{formatNumber(p.getCoin)}</span>
            </span>
            <span>
              소비 <span className="font-semibold text-gray-300">{formatNumber(p.spendCoin)}</span>
            </span>
            {p.spendConsumablesCoin ? (
              <span className="text-gray-600">소모품 {formatNumber(p.spendConsumablesCoin)}</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamPanel({
  team,
  index,
  highlight,
}: {
  team: MatchDetailTeam;
  index: number;
  highlight?: string;
}) {
  const win = team.result === "win";
  return (
    <div className="card overflow-hidden">
      <div
        className={`flex items-center justify-between px-4 py-2.5 ${
          win ? "bg-win/20" : "bg-lose/20"
        }`}
      >
        <span className={`font-bold ${win ? "text-blue-300" : "text-red-300"}`}>
          {win ? "승리" : "패배"} · {index + 1}팀
        </span>
        <span className="text-xs text-gray-400">{team.players.length}명</span>
      </div>
      <div className="space-y-2 p-3">
        {team.players.map((pl) => (
          <PlayerCard key={pl.playerId} player={pl} highlight={highlight === pl.playerId} />
        ))}
      </div>
    </div>
  );
}

export default async function MatchPage({ params, searchParams }: Props) {
  let match: MatchDetail;
  try {
    match = await getMatch(params.matchId);
  } catch (e) {
    const err = e as NeopleApiError;
    return <ErrorState message={err.message} hint={`code: ${err.code}`} />;
  }

  const teams = match.teams ?? [];
  const duration = teams[0]?.players[0]?.playInfo?.playTime;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-2 px-5 py-3">
        <div>
          <h1 className="text-lg font-bold text-gray-100">매치 상세</h1>
          <p className="text-xs text-gray-500">
            {gameTypeLabel(match.gameTypeId)}
            {match.map?.name ? ` · ${match.map.name}` : ""}
            {duration ? ` · ${formatPlayTime(duration)}` : ""} · {formatDate(match.date)}
          </p>
        </div>
        <span className="chip bg-bg-hover font-mono text-[11px] text-gray-500">
          {match.matchId.slice(0, 12)}…
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {teams.map((team, i) => (
          <TeamPanel key={team.teamId ?? i} team={team} index={i} highlight={searchParams.highlight} />
        ))}
      </div>
    </div>
  );
}
