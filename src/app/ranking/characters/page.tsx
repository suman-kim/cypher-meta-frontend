import Link from "next/link";
import { getCharacters, getCharacterRanking, NeopleApiError } from "@/lib/neople";
import RankingTabs from "@/components/RankingTabs";
import CharacterRankingControls from "@/components/CharacterRankingControls";
import Pagination from "@/components/Pagination";
import { Avatar } from "@/components/CharacterAvatar";
import { EmptyState, ErrorState } from "@/components/ui";
import { characterRankingLabel } from "@/lib/constants";
import { winRate } from "@/lib/format";
import type { CharacterRow, CharacterRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "캐릭터 랭킹" };

const LIMIT = 50;

interface Props {
  searchParams: { characterId?: string; rankingType?: string; offset?: string };
}

export default async function CharacterRankingPage({ searchParams }: Props) {
  const characterId = searchParams.characterId ?? "";
  const rankingType = searchParams.rankingType ?? "winCount";
  const offset = Math.max(0, parseInt(searchParams.offset ?? "0", 10) || 0);

  let characters: CharacterRow[] = [];
  let charError: NeopleApiError | null = null;
  try {
    const res = await getCharacters();
    characters = (res.rows ?? []).sort((a, b) => a.characterName.localeCompare(b.characterName, "ko"));
  } catch (e) {
    charError = e as NeopleApiError;
  }

  return (
    <div className="space-y-4">
      <RankingTabs active="characters" />
      <h1 className="text-xl font-black text-gray-50">캐릭터 랭킹</h1>

      {charError ? (
        <ErrorState message={charError.message} hint={`code: ${charError.code}`} />
      ) : (
        <>
          <CharacterRankingControls
            characters={characters}
            characterId={characterId}
            rankingType={rankingType}
          />

          {!characterId ? (
            <EmptyState
              title="캐릭터를 선택하세요"
              description="선택한 캐릭터의 지표별 상위 랭킹을 보여줍니다."
              icon="🧩"
            />
          ) : (
            <CharacterRankingTable
              characterId={characterId}
              rankingType={rankingType}
              offset={offset}
            />
          )}
        </>
      )}
    </div>
  );
}

async function CharacterRankingTable({
  characterId,
  rankingType,
  offset,
}: {
  characterId: string;
  rankingType: string;
  offset: number;
}) {
  let rows: CharacterRankingRow[] = [];
  try {
    const res = await getCharacterRanking(characterId, rankingType, { offset, limit: LIMIT });
    rows = res.rows ?? [];
  } catch (e) {
    const err = e as NeopleApiError;
    return <ErrorState message={err.message} hint={`code: ${err.code}`} />;
  }

  if (rows.length === 0) {
    return <EmptyState title="랭킹 데이터가 없습니다" icon="🏆" />;
  }

  const metricLabel = characterRankingLabel(rankingType);

  return (
    <>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border text-xs text-gray-500">
              <th className="w-16 px-4 py-2.5 text-left font-medium">순위</th>
              <th className="px-4 py-2.5 text-left font-medium">플레이어</th>
              <th className="px-4 py-2.5 text-right font-medium">{metricLabel}</th>
              <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">승/패</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const value =
                rankingType === "winRate" && row.winRate !== undefined
                  ? `${row.winRate}%`
                  : (row.value ?? row.winCount ?? "-");
              const wr =
                row.winCount !== undefined && row.loseCount !== undefined
                  ? winRate(row.winCount, row.loseCount)
                  : undefined;
              return (
                <tr
                  key={row.player.playerId}
                  className="border-b border-bg-border/60 transition-colors last:border-0 hover:bg-bg-hover"
                >
                  <td className="px-4 py-2.5">
                    <span
                      className={`font-bold ${row.ranking <= 3 ? "text-brand-glow" : "text-gray-400"}`}
                    >
                      {row.ranking}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/players/${row.player.playerId}`}
                      className="inline-flex items-center gap-2 font-semibold text-gray-100 hover:text-brand-glow"
                    >
                      <Avatar characterId={characterId} size={26} />
                      {row.player.nickname}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-100">{value}</td>
                  <td className="hidden px-4 py-2.5 text-right text-gray-400 sm:table-cell">
                    {row.winCount !== undefined
                      ? `${row.winCount}승 ${row.loseCount ?? 0}패${wr !== undefined ? ` (${wr}%)` : ""}`
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        offset={offset}
        limit={LIMIT}
        count={rows.length}
        makeHref={(o) =>
          `/ranking/characters?characterId=${characterId}&rankingType=${rankingType}&offset=${o}`
        }
      />
    </>
  );
}
