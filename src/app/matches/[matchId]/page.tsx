import Link from "next/link";
import { getMatch, NeopleApiError } from "@/lib/neople";
import { Avatar } from "@/components/CharacterAvatar";
import ItemHoverCard from "@/components/ItemHoverCard";
import MatchTabs from "@/components/match/MatchTabs";
import MatchAnalysis from "@/components/match/MatchAnalysis";
import MatchAiSummary from "@/components/match/MatchAiSummary";
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

  const mk = p.multiKillCount ?? {};
  const multiKills = MULTI_KILLS.map((m) => ({ ...m, n: (mk as Record<string, number>)[m.key] ?? 0 })).filter(
    (m) => m.n > 0,
  );

  // 구매 순서 아이콘의 이름/희귀도/부위 조회용 (최종 장착 아이템에서)
  const itemMeta = new Map<string, MatchDetailItem>();
  for (const it of player.items ?? []) if (it.itemId) itemMeta.set(it.itemId, it);

  // 장착 아이템: 부위 순서(equipSlotCode)로 정렬
  const equipped = (player.items ?? [])
    .filter((it) => it.itemId)
    .slice()
    .sort((a, b) => (a.equipSlotCode ?? "").localeCompare(b.equipSlotCode ?? ""));

  const hasCoin = p.getCoin !== undefined || p.spendCoin !== undefined;

  return (
    <div
      className={`relative h-full rounded-lg border bg-surface ${
        highlight ? "border-primary ring-2 ring-primary" : "border-line"
      }`}
    >
      {/* 캐릭터 배경 (rounded 클립은 이 레이어에만 두어 툴팁이 잘리지 않게) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-40">
          <SafeImage
            src={characterImage(p.characterId, 3)}
            alt=""
            fallbackText=""
            className="h-full w-full object-cover object-top"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to left, rgb(var(--surface) / 0.45), rgb(var(--surface)) 55%)",
          }}
        />
      </div>

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
            <div className="text-[9px] font-medium tracking-wide text-gray-500">K / D / A</div>
            <div className="text-sm font-bold text-gray-100">
              {p.killCount ?? 0}/{p.deathCount ?? 0}/{p.assistCount ?? 0}
            </div>
            <div className="text-xs font-semibold" style={{ color: kdaColor(kda) }}>
              {formatKDA(p.killCount, p.deathCount, p.assistCount)}
            </div>
          </div>
        </div>

        {/* 멀티킬 — 배지 유무와 무관하게 행 높이 항상 확보 → 카드 높이 일정 */}
        <div className="mt-2 flex min-h-[24px] flex-wrap items-center gap-1">
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

        {/* 최종 장착 아이템 (부위 라벨 + 호버 상세 요약) */}
        {equipped.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-medium text-gray-400">장착 아이템</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {equipped.map((it, i) => (
                <ItemHoverCard
                  key={`${it.itemId}-${i}`}
                  itemId={it.itemId ?? ""}
                  itemName={it.itemName ?? undefined}
                  rarityCode={it.rarityCode}
                  slotName={it.slotName}
                  size={36}
                  showSlot
                />
              ))}
            </div>
          </div>
        )}

        {/* 구매 순서 — 가로 스크롤 한 줄(박스 높이 균일) + 부위 라벨 + 호버 상세 요약 */}
        {player.itemPurchase && player.itemPurchase.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-medium text-gray-400">
              구매 순서 <span className="text-gray-500">({player.itemPurchase.length})</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {player.itemPurchase.map((id, i) => {
                const meta = itemMeta.get(id);
                return (
                  <ItemHoverCard
                    key={`${id}-${i}`}
                    itemId={id}
                    itemName={meta?.itemName ?? undefined}
                    rarityCode={meta?.rarityCode}
                    slotName={meta?.slotName}
                    size={26}
                    showSlot
                    className="shrink-0"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 주요 포인트 */}
        <div className="mt-3 grid grid-cols-3 gap-1 text-[11px] text-gray-500">
          {(["attackPoint", "damagePoint", "battlePoint"] as const).map((k) =>
            p[k] !== undefined ? (
              <div key={k} className="rounded bg-surface-2 px-1.5 py-1 text-center">
                <div className="font-semibold text-gray-300">{formatNumber(p[k])}</div>
                <div>{STAT_LABELS[k]}</div>
              </div>
            ) : null,
          )}
        </div>

        {/* 코인 */}
        {hasCoin && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
            <span>
              코인 획득 <span className="font-semibold text-amber-300">{formatNumber(p.getCoin)}</span>
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
  const known = team.result === "win" || team.result === "lose";
  return (
    <div className="card">
      <div
        className={`flex items-center justify-between rounded-t-lg px-4 py-2.5 ${
          known ? (win ? "bg-win/20" : "bg-lose/20") : "bg-surface-2"
        }`}
      >
        <span className={`font-bold ${known ? (win ? "text-blue-300" : "text-red-300") : "text-gray-300"}`}>
          {known ? (win ? "승리" : "패배") : `팀 ${index + 1}`} · {index + 1}팀
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

function TeamHeaderBar({ team, index }: { team: MatchDetailTeam; index: number }) {
  const win = team.result === "win";
  const known = team.result === "win" || team.result === "lose";
  return (
    <div
      className={`card flex items-center justify-between px-4 py-2.5 ${
        known ? (win ? "bg-win/20" : "bg-lose/20") : "bg-surface-2"
      }`}
    >
      <span className={`font-bold ${known ? (win ? "text-blue-300" : "text-red-300") : "text-gray-300"}`}>
        {known ? (win ? "승리" : "패배") : `팀 ${index + 1}`} · {index + 1}팀
      </span>
      <span className="text-xs text-gray-400">{team.players.length}명</span>
    </div>
  );
}

function MetaRow({
  label,
  value,
  valueClass = "text-gray-100",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-12 shrink-0 rounded bg-surface-2 px-2 py-1 text-center text-[11px] font-semibold text-gray-500">
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
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
  const teamA = teams[0];
  const teamB = teams[1];
  const rowCount = Math.max(teamA?.players.length ?? 0, teamB?.players.length ?? 0);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="space-y-3">
          <h1 className="text-lg font-bold text-gray-100">매치 상세</h1>
          <div className="space-y-1.5">
            <MetaRow label="모드" value={gameTypeLabel(match.gameTypeId)} valueClass="text-primary" />
            {match.map?.name ? <MetaRow label="맵" value={match.map.name} /> : null}
            {duration ? <MetaRow label="시간" value={formatPlayTime(duration)} /> : null}
            <MetaRow label="일시" value={formatDate(match.date)} />
          </div>
        </div>
        <span className="chip bg-bg-hover font-mono text-[11px] text-gray-500">
          {match.matchId.slice(0, 12)}…
        </span>
      </div>

      <MatchAiSummary match={match} highlightPlayerId={searchParams.highlight} />

      <MatchTabs
        tabs={[
          {
            key: "overview",
            label: "종합",
            content: (
              <div className="space-y-3">
                {/* 모바일: 팀별로 스택 */}
                <div className="space-y-4 lg:hidden">
                  {teams.map((team, i) => (
                    <TeamPanel
                      key={team.teamId ?? i}
                      team={team}
                      index={i}
                      highlight={searchParams.highlight}
                    />
                  ))}
                </div>

                {/* 데스크탑: 1팀·2팀을 행 단위로 같은 높이로 정렬 */}
                <div className="hidden space-y-3 lg:block">
                  <div className="grid grid-cols-2 gap-4">
                    {teamA ? <TeamHeaderBar team={teamA} index={0} /> : <div />}
                    {teamB ? <TeamHeaderBar team={teamB} index={1} /> : <div />}
                  </div>
                  {Array.from({ length: rowCount }).map((_, i) => {
                    const a = teamA?.players[i];
                    const b = teamB?.players[i];
                    return (
                      <div key={i} className="grid grid-cols-2 items-stretch gap-4">
                        {a ? (
                          <PlayerCard player={a} highlight={searchParams.highlight === a.playerId} />
                        ) : (
                          <div />
                        )}
                        {b ? (
                          <PlayerCard player={b} highlight={searchParams.highlight === b.playerId} />
                        ) : (
                          <div />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          },
          {
            key: "analysis",
            label: "분석",
            content: <MatchAnalysis teams={teams} highlightPlayerId={searchParams.highlight} />,
          },
        ]}
      />
    </div>
  );
}
