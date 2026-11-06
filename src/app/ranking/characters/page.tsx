import Link from "next/link";
import { getCharacters, getCharacterRanking, NeopleApiError, neopleErrorView } from "@/lib/neople";
import { getRoster, type RosterEntry } from "@/lib/votes";
import RankingTabs from "@/components/RankingTabs";
import Pagination from "@/components/Pagination";
import { EmptyState, ErrorState, LinkTabs } from "@/components/ui";
import PodiumCard from "@/components/ranking/PodiumCard";
import RankAvatar from "@/components/ranking/RankAvatar";
import { Avatar } from "@/components/CharacterAvatar";
import RankingCharacterPicker from "@/components/ranking/RankingCharacterPicker";
import { getCharacterUltimates, getPositionSystem } from "@/lib/official-api";
import { OFFICIAL_ROLES, dualCharacterIds, groupUltimatesByRole, ultimateLabel, type CharacterUltimate } from "@/lib/official";
import { ROLE_LABELS, type RoleOrEtc } from "@/lib/meta";
import { isAppRequest } from "@/lib/app-mode";
import AppRankingChars from "@/components/app/screens/meta/AppRankingChars";
import type { PickerGroup } from "@/components/app/screens/meta/CharPicker";
import { CHARACTER_RANKING_TYPES, characterRankingLabel } from "@/lib/constants";
import { formatNumber, winRate } from "@/lib/format";
import type { CharacterRankingRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "사이퍼즈 캐릭터 랭킹",
  description:
    "사이퍼즈 캐릭터별 랭킹 — 승리 수·승률·킬·어시스트·경험치 지표별 상위 랭커를 확인하세요.",
  alternates: { canonical: "/ranking/characters" },
};

const LIMIT = 50;

interface Props {
  searchParams: { characterId?: string; rankingType?: string; offset?: string };
}

function metricValue(row: CharacterRankingRow, rankingType: string): string {
  if (rankingType === "winRate" && row.winRate !== undefined) return `${row.winRate}%`;
  return formatNumber(row.value ?? row.winCount);
}

function rowWinRate(row: CharacterRankingRow): number | undefined {
  if (row.winCount !== undefined && row.loseCount !== undefined) {
    return winRate(row.winCount, row.loseCount);
  }
  return undefined;
}

export default async function CharacterRankingPage({ searchParams }: Props) {
  const characterId = searchParams.characterId ?? "";
  const rankingType = CHARACTER_RANKING_TYPES.some((t) => t.type === searchParams.rankingType)
    ? (searchParams.rankingType as string)
    : "winCount";
  const offset = Math.max(0, parseInt(searchParams.offset ?? "0", 10) || 0);

  let characters: RosterEntry[] = [];
  let charError: NeopleApiError | null = null;
  try {
    characters = await getRoster();
  } catch {
    characters = [];
  }
  if (characters.length === 0) {
    try {
      const res = await getCharacters();
      characters = (res.rows ?? []).map((c) => ({
        characterId: c.characterId,
        characterName: c.characterName,
        role: "etc" as const,
      }));
    } catch (e) {
      charError = e as NeopleApiError;
    }
  }

  const charName = characters.find((c) => c.characterId === characterId)?.characterName ?? undefined;
  // 공식 역할군 체계면 캐릭터 선택기를 공식 역할군으로 묶는다(실패 시 기존 포지션 그룹)
  const officialUltimates: CharacterUltimate[] =
    (await getPositionSystem()) === "official" ? await getCharacterUltimates().catch(() => []) : [];

  // 앱 WebView: 캐릭터 고르기 화면(또는 캐릭터 목록 실패)을 앱 화면으로 그린다.
  const app = isAppRequest();
  if (app && (charError || !characterId)) {
    const ev = charError ? neopleErrorView(charError) : null;
    return (
      <AppRankingChars
        characterId={null}
        charName={null}
        rankingType={rankingType}
        metricLabel={characterRankingLabel(rankingType)}
        metricTabs={[]}
        rows={[]}
        groups={appPickerGroups(characters, officialUltimates)}
        error={ev ? { maintenance: ev.variant === "maintenance", message: ev.message } : null}
        prevHref={null}
        nextHref={null}
        rangeLabel={null}
      />
    );
  }

  if (charError) {
    return (
      <div className="space-y-4">
        <RankingTabs active="characters" />
        <ErrorState {...neopleErrorView(charError)} />
      </div>
    );
  }

  // 캐릭터 미선택 → 이미지 그리드 선택 화면
  if (!characterId) {
    return (
      <div className="space-y-4">
        <RankingTabs active="characters" />
        <div>
          <h1 className="text-2xl font-black text-gray-50">캐릭터 랭킹</h1>
          <p className="mt-1 text-sm text-gray-500">
            캐릭터를 선택하면 해당 캐릭터의 지표별 상위 랭커를 보여줍니다.
          </p>
        </div>
        <RankingCharacterPicker
          characters={characters}
          rankingType={rankingType}
          officialUltimates={officialUltimates.length ? officialUltimates : undefined}
        />
      </div>
    );
  }

  // 선택됨 → 랭킹 조회
  let rows: CharacterRankingRow[] = [];
  let rankError: NeopleApiError | null = null;
  try {
    const res = await getCharacterRanking(characterId, rankingType, { offset, limit: LIMIT });
    rows = res.rows ?? [];
  } catch (e) {
    rankError = e as NeopleApiError;
  }

  const rankTabs = CHARACTER_RANKING_TYPES.map((t) => ({
    href: `/ranking/characters?characterId=${characterId}&rankingType=${t.type}`,
    label: t.label,
    active: t.type === rankingType,
  }));

  // 앱 WebView: 고른 캐릭터의 지표별 랭킹을 앱 목록으로 그린다(쪽 단위 이전/다음).
  if (app) {
    const ev = rankError ? neopleErrorView(rankError) : null;
    const pageHref = (o: number) =>
      `/ranking/characters?characterId=${characterId}&rankingType=${rankingType}${o > 0 ? `&offset=${o}` : ""}`;
    return (
      <AppRankingChars
        characterId={characterId}
        charName={charName ?? null}
        rankingType={rankingType}
        metricLabel={characterRankingLabel(rankingType)}
        metricTabs={CHARACTER_RANKING_TYPES.map((t) => ({
          key: t.type,
          label: t.label,
          href: `/ranking/characters?characterId=${characterId}&rankingType=${t.type}`,
          active: t.type === rankingType,
        }))}
        rows={rows.map((row) => {
          const wr = rowWinRate(row);
          return {
            rank: row.ranking,
            playerId: row.player.playerId,
            nickname: row.player.nickname,
            value:
              rankingType === "winRate" && row.winRate !== undefined
                ? `${Math.round(row.winRate * 10) / 10}%`
                : formatNumber(row.value ?? row.winCount),
            // 승률 지표일 때는 값과 겹치지 않게 승패만
            record:
              row.winCount !== undefined && row.loseCount !== undefined
                ? `${formatNumber(row.winCount)}승 ${formatNumber(row.loseCount)}패${
                    wr !== undefined && rankingType !== "winRate" ? ` · 승률 ${wr}%` : ""
                  }`
                : null,
          };
        })}
        groups={[]}
        error={ev ? { maintenance: ev.variant === "maintenance", message: ev.message } : null}
        prevHref={offset > 0 ? pageHref(Math.max(0, offset - LIMIT)) : null}
        nextHref={!rankError && rows.length >= LIMIT ? pageHref(offset + LIMIT) : null}
        rangeLabel={rows.length > 0 ? `${offset + 1}~${offset + rows.length}위` : null}
      />
    );
  }

  const showPodium = offset === 0 && rows.length >= 3;
  const podium = showPodium ? rows.slice(0, 3) : [];
  const tableRows = showPodium ? rows.slice(3) : rows;
  const metricLabel = characterRankingLabel(rankingType);

  const podiumProps = (row: CharacterRankingRow, place: 1 | 2 | 3) => {
    const wr = rowWinRate(row);
    return {
      place,
      href: `/players/${row.player.playerId}`,
      nickname: row.player.nickname,
      characterId,
      characterName: charName,
      subtitle: `${metricLabel} ${metricValue(row, rankingType)}`,
      winRate: wr,
      record:
        row.winCount !== undefined && row.loseCount !== undefined
          ? { wins: row.winCount, loses: row.loseCount }
          : null,
    };
  };

  return (
    <div className="space-y-4">
      <RankingTabs active="characters" />

      {/* 선택된 캐릭터 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar characterId={characterId} characterName={charName} size={48} zoom={2} />
          <div>
            <h1 className="text-xl font-black text-gray-50">{charName ?? "캐릭터"} 랭킹</h1>
            <p className="text-xs text-gray-500">{metricLabel} 상위 랭커</p>
          </div>
        </div>
        <Link
          href={`/ranking/characters?rankingType=${rankingType}`}
          className="btn-ghost"
        >
          ← 다른 캐릭터 선택
        </Link>
      </div>

      <LinkTabs tabs={rankTabs} />

      {rankError ? (
        <ErrorState {...neopleErrorView(rankError)} />
      ) : rows.length === 0 ? (
        <EmptyState title="랭킹 데이터가 없습니다" icon="🏆" />
      ) : (
        <>
          {showPodium && (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
              <div className="sm:order-2">
                <PodiumCard {...podiumProps(podium[0], 1)} />
              </div>
              <div className="sm:order-1">
                <PodiumCard {...podiumProps(podium[1], 2)} />
              </div>
              <div className="sm:order-3">
                <PodiumCard {...podiumProps(podium[2], 3)} />
              </div>
            </div>
          )}

          {tableRows.length > 0 && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
                    <th className="w-16 px-4 py-3 text-left">순위</th>
                    <th className="px-4 py-3 text-left">플레이어</th>
                    <th className="px-4 py-3 text-right">{metricLabel}</th>
                    <th className="hidden px-4 py-3 text-center sm:table-cell">승률</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    const wr = rowWinRate(row);
                    return (
                      <tr
                        key={row.player.playerId}
                        className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`font-bold ${row.ranking <= 3 ? "text-primary" : "text-gray-400"}`}
                          >
                            {row.ranking}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/players/${row.player.playerId}`}
                            className="inline-flex items-center gap-2.5 font-semibold text-gray-100 hover:text-primary"
                          >
                            <RankAvatar
                              characterId={characterId}
                              characterName={charName}
                              nickname={row.player.nickname}
                              size={32}
                              zoom={2}
                            />
                            {row.player.nickname}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-100">
                          {metricValue(row, rankingType)}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {wr !== undefined ? (
                            <div className="mx-auto max-w-[160px]">
                              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${wr}%` }} />
                              </div>
                              <div className="mt-1 text-center text-xs font-medium text-gray-500">
                                {wr}% ({row.winCount ?? 0}승 {row.loseCount ?? 0}패)
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-gray-500">-</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            offset={offset}
            limit={LIMIT}
            count={rows.length}
            makeHref={(o) =>
              `/ranking/characters?characterId=${characterId}&rankingType=${rankingType}&offset=${o}`
            }
          />
        </>
      )}
    </div>
  );
}

/** 예전 포지션 묶음 순서 */
const LEGACY_GROUPS: RoleOrEtc[] = ["tank", "melee", "ranged", "support", "etc"];

/**
 * 앱 캐릭터 고르기 묶음 — 공식 역할군 체계면 역할군 7종(2차 보유 캐릭터는 두 곳), 아니면 예전 포지션별.
 * @param characters 기존 로스터(포지션 코드 포함)
 * @param ultimates 공식 역할군 궁극기 정의 (예전 체계·실패면 빈 배열)
 * @returns 역할군 묶음 목록
 */
function appPickerGroups(characters: RosterEntry[], ultimates: CharacterUltimate[]): PickerGroup[] {
  if (ultimates.length > 0) {
    const grouped = groupUltimatesByRole(ultimates);
    const dual = dualCharacterIds(ultimates);
    return OFFICIAL_ROLES.map((r) => ({
      key: r.key,
      label: r.name,
      roleIcon: r.key,
      items: grouped[r.key].map((u) => ({
        characterId: u.characterId,
        name: u.characterName,
        ultLabel: dual.has(u.characterId) ? ultimateLabel(u.ultimateType) : null,
      })),
    })).filter((g) => g.items.length > 0);
  }
  return LEGACY_GROUPS.map((role) => ({
    key: role,
    label: ROLE_LABELS[role],
    roleIcon: null,
    items: characters
      .filter((c) => c.role === role)
      .map((c) => ({ characterId: c.characterId, name: c.characterName ?? c.characterId, ultLabel: null }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko")),
  })).filter((g) => g.items.length > 0);
}
