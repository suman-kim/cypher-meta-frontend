import Link from "next/link";
import { getPlayer, getPlayerMatches, getRatingRanking, NeopleApiError } from "@/lib/neople";
import { Avatar } from "@/components/CharacterAvatar";
import MatchRow from "@/components/MatchRow";
import SafeImage from "@/components/SafeImage";
import { EmptyState, ErrorState, LinkTabs, Stat, TierBadge } from "@/components/ui";
import { readRecord, winRate, calcKDA } from "@/lib/format";
import { positionAttributeImage } from "@/lib/images";
import { gameTypeLabel } from "@/lib/constants";
import type { MatchRow as MatchRowType, PlayerDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: { playerId: string };
  searchParams: { gameTypeId?: string };
}

export async function generateMetadata({ params }: Props) {
  try {
    const player = await getPlayer(params.playerId);
    return { title: `${player.nickname} 전적` };
  } catch {
    return { title: "플레이어" };
  }
}

/** 매치 + 해당 게임타입을 함께 담는 항목 (전체 탭에서 타입 혼합 표시용) */
interface TaggedMatch {
  match: MatchRowType;
  gameTypeId: string;
}

async function loadMatches(playerId: string, gameTypeId?: string): Promise<TaggedMatch[]> {
  // 전체(미지정)면 공식전+일반전을 각각 불러와 합침
  const types = gameTypeId ? [gameTypeId] : ["rating", "normal"];
  const results = await Promise.all(
    types.map(async (gt) => {
      try {
        const res = await getPlayerMatches(playerId, { gameTypeId: gt, limit: 20 });
        return (res.matches?.rows ?? []).map((m) => ({ match: m, gameTypeId: gt }));
      } catch {
        return [] as TaggedMatch[];
      }
    }),
  );
  return results.flat();
}

export default async function PlayerPage({ params, searchParams }: Props) {
  const gameTypeId = searchParams.gameTypeId;

  let player: PlayerDetail | undefined;
  let matches: TaggedMatch[] = [];
  let error: NeopleApiError | null = null;

  try {
    // 기본 정보 + 평점 랭킹 행(티어/RP/공식전 전적) + 매치 목록 병렬 조회
    const [p, ratingRes, m] = await Promise.all([
      getPlayer(params.playerId),
      getRatingRanking({ playerId: params.playerId, limit: 5 }).catch(() => null),
      loadMatches(params.playerId, gameTypeId),
    ]);
    player = p;
    matches = m;

    // 평점 랭킹에서 이 플레이어의 행을 찾아 티어/RP/전적 보강
    const row = ratingRes?.rows.find((r) => r.player.playerId === params.playerId);
    if (row) {
      player = {
        ...player,
        tierName: player.tierName ?? row.tierName,
        ratingPoint: player.ratingPoint ?? row.ratingPoint,
        records:
          player.records && player.records.length > 0
            ? player.records
            : [{ gameTypeId: "rating", win: row.win ?? 0, lose: row.lose ?? 0, stop: row.stop ?? 0 }],
      };
    }
  } catch (e) {
    error = e as NeopleApiError;
  }

  if (error || !player) {
    return (
      <ErrorState
        message={error?.message ?? "플레이어 정보를 불러오지 못했습니다."}
        hint={error?.code === "NO_API_KEY" ? ".env.local 의 NEOPLE_API_KEY 를 확인하세요." : undefined}
      />
    );
  }

  // 공식전 통산 전적 (records 의 rating 항목)
  const ratingRecord = (player.records ?? []).find((r) => r.gameTypeId === "rating");
  const rt = readRecord(ratingRecord);
  const overallWinRate = winRate(rt.win, rt.lose);

  // 현재 탭의 최근 전적 (불러온 매치 기준)
  const recent = matches.slice(0, 40);
  const recentWins = recent.filter((m) => m.match.playInfo.result === "win").length;
  const avgKDA =
    recent.length > 0
      ? recent.reduce(
          (s, m) =>
            s + calcKDA(m.match.playInfo.killCount, m.match.playInfo.deathCount, m.match.playInfo.assistCount),
          0,
        ) / recent.length
      : 0;
  const recentLabel = gameTypeId ? `최근 ${gameTypeLabel(gameTypeId)}` : "최근 전체";

  const tabs = [
    { href: `/players/${params.playerId}`, label: "전체", active: !gameTypeId },
    { href: `/players/${params.playerId}?gameTypeId=rating`, label: "공식전", active: gameTypeId === "rating" },
    { href: `/players/${params.playerId}?gameTypeId=normal`, label: "일반전", active: gameTypeId === "normal" },
  ];

  return (
    <div className="space-y-5">
      {/* 프로필 헤더 */}
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar
            characterId={player.represent?.characterId}
            characterName={player.represent?.characterName ?? player.nickname}
            size={72}
            zoom={2}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-gray-50">{player.nickname}</h1>
              {player.clanName && (
                <span className="chip bg-bg-hover text-gray-400">클랜 · {player.clanName}</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <TierBadge tierName={player.tierName} rp={player.ratingPoint} />
              {player.maxRatingPoint !== undefined && (
                <span className="text-gray-500">랭킹점수 {player.maxRatingPoint.toLocaleString()}</span>
              )}
            </div>
            {player.represent && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                <span>대표 캐릭터 · {player.represent.characterName}</span>
                {player.represent.position?.name && (
                  <span className="chip bg-bg-hover text-gray-400">{player.represent.position.name}</span>
                )}
                {player.represent.position?.attribute?.map((a) => (
                  <span key={a.id} title={a.name} className="inline-flex">
                    <SafeImage
                      src={positionAttributeImage(a.id)}
                      alt={a.name}
                      fallbackText={a.name.slice(0, 1)}
                      className="h-4 w-4 rounded"
                    />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 스탯 요약 */}
        <div className="grid grid-cols-2 gap-2 border-t border-bg-border p-4 sm:grid-cols-4">
          <Stat
            label="공식전 승률"
            value={rt.win + rt.lose > 0 ? `${overallWinRate}%` : "-"}
            accent={overallWinRate >= 50 ? "#4f8ff0" : "#9aa7b4"}
          />
          <Stat label="공식전 전적" value={rt.win + rt.lose > 0 ? `${rt.win}승 ${rt.lose}패` : "-"} />
          <Stat
            label={`${recentLabel} 승률`}
            value={recent.length ? `${Math.round((recentWins / recent.length) * 100)}%` : "-"}
          />
          <Stat label={`${recentLabel} 평균 평점`} value={avgKDA ? avgKDA.toFixed(2) : "-"} accent="#4fbf6b" />
        </div>
      </div>

      {/* 매치 리스트 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-100">최근 전적</h2>
          <LinkTabs tabs={tabs} />
        </div>

        {matches.length === 0 ? (
          <EmptyState
            title={`${gameTypeId ? gameTypeLabel(gameTypeId) : ""} 매치 기록이 없습니다`.trim()}
            description="최근 90일 이내 기록만 조회됩니다. 데이터는 약 1시간 주기로 갱신됩니다."
            icon="🎮"
          />
        ) : (
          <div className="space-y-2">
            {matches.map((m) => (
              <MatchRow
                key={`${m.gameTypeId}-${m.match.matchId}`}
                match={m.match}
                gameTypeId={m.gameTypeId}
                highlightPlayerId={params.playerId}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-300">
          ← 다른 플레이어 검색
        </Link>
      </div>
    </div>
  );
}
