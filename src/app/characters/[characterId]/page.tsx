import Link from "next/link";
import type { Metadata } from "next";
import { getCharacters, getCharacterRanking, NeopleApiError } from "@/lib/neople";
import {
  getCharacterMeta,
  getCharacterItemMeta,
  orderSlots,
  withTiers,
  ROLE_LABELS,
  type CharacterMeta,
  type CharacterItemMeta,
} from "@/lib/meta";
import { Avatar } from "@/components/CharacterAvatar";
import CypherProfileView from "@/components/characters/CypherProfile";
import { getCypherProfile, STAT_DISPLAY } from "@/lib/cypher-profiles";
import ItemIcon from "@/components/ItemIcon";
import { EmptyState, ErrorState, LinkTabs, Stat } from "@/components/ui";
import { CHARACTER_RANKING_TYPES, characterRankingLabel } from "@/lib/constants";
import { winRate, kdaColor } from "@/lib/format";
import type { CharacterRankingRow } from "@/lib/types";
import CharacterUltimates from "@/components/characters/CharacterUltimates";
import UltimateSwitch from "@/components/characters/UltimateSwitch";
import { getCharacterUltimates, getCharacterUltimateStats, getPositionSystem } from "@/lib/official-api";
import { roleByName, ultimateLabel, type CharacterUltimate, type UltimateStatRow, type UltimateType } from "@/lib/official";
import { isAppRequest } from "@/lib/app-mode";
import AppCharacter from "@/components/app/screens/meta/AppCharacter";

export const dynamic = "force-dynamic";

interface Props {
  params: { characterId: string };
  /** rankingType — 랭커 지표 / ult — 1차·2차 궁극기("1st"|"2nd", 2차 보유 캐릭터만) / tab — 앱 전용: 정보·빌드·랭커 칸 */
  searchParams: { rankingType?: string; ult?: string; tab?: string };
}

/**
 * 상세 페이지 URL — 궁극기 선택과 랭커 지표를 함께 유지한다.
 * @param characterId — 캐릭터 ID
 * @param rankingType — 랭커 지표
 * @param ult — 선택 궁극기(없으면 생략)
 * @returns 상세 페이지 경로
 */
function detailHref(characterId: string, rankingType: string, ult?: string): string {
  const p = new URLSearchParams();
  if (ult) p.set("ult", ult);
  if (rankingType !== "winCount") p.set("rankingType", rankingType);
  const q = p.toString();
  return `/characters/${characterId}${q ? `?${q}` : ""}`;
}

async function resolveName(characterId: string): Promise<string | undefined> {
  try {
    const res = await getCharacters();
    return res.rows?.find((c) => c.characterId === characterId)?.characterName;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const canonical = `/characters/${params.characterId}`;
  const name = await resolveName(params.characterId);
  const title = name ?? "캐릭터 상세";
  const description = name
    ? `사이퍼즈 ${name}의 픽률·승률·KDA, 추천 아이템 빌드, 지표별 상위 랭커를 확인하세요.`
    : "사이퍼즈 캐릭터 상세 통계와 추천 빌드.";
  return { title, description, alternates: { canonical }, openGraph: { title, description } };
}

export default async function CharacterDetailPage({ params, searchParams }: Props) {
  const rankingType = CHARACTER_RANKING_TYPES.some((t) => t.type === searchParams.rankingType)
    ? (searchParams.rankingType as string)
    : "winCount";

  const name = await resolveName(params.characterId);
  const profile = getCypherProfile(name);

  // 공식 역할군 체계면 이 캐릭터의 1차/2차 궁극기 정의·통계를 먼저 불러온다(실패 시 궁극기 분리 없이 표시)
  let ultimates: CharacterUltimate[] = [];
  let ultimateStats: UltimateStatRow[] = [];
  /** 전체 캐릭터의 궁극기 단위 통계 — 앱 화면의 티어·역할군 순위 계산용 */
  let allUltimateStats: UltimateStatRow[] = [];
  if ((await getPositionSystem()) === "official") {
    const [u, st] = await Promise.all([
      getCharacterUltimates().catch(() => [] as CharacterUltimate[]),
      getCharacterUltimateStats("rating").catch(() => [] as UltimateStatRow[]),
    ]);
    ultimates = u.filter((x) => x.characterId === params.characterId);
    ultimateStats = st.filter((x) => x.characterId === params.characterId);
    allUltimateStats = st;
  }
  // 2차 궁극기 보유 캐릭터는 1차/2차로 페이지를 나눈다(기본 1차). 1차만 있는 캐릭터는 분리 없음.
  const dual = ultimates.some((u) => u.ultimateType === "2nd");
  const selectedUlt: UltimateType | undefined = dual ? (searchParams.ult === "2nd" ? "2nd" : "1st") : undefined;
  const selectedDef = ultimates.find((u) => u.ultimateType === selectedUlt);
  const selectedStat = ultimateStats.find((s) => s.ultimateType === selectedUlt);

  // 메타 통계(자체 픽률·승률·KDA)와 아이템 채택률 — 1차/2차 분리 시 그 궁극기 판만(수집한 매칭 경기의 장착 아이템).
  // 백엔드가 없거나 데이터가 없으면 조용히 생략.
  const [metaRes, itemMeta] = await Promise.all([
    getCharacterMeta().catch(() => [] as CharacterMeta[]),
    getCharacterItemMeta(params.characterId, selectedUlt).catch(() => null as CharacterItemMeta | null),
  ]);
  /** 전체 캐릭터 메타 행 — 앱 화면의 티어·역할군 순위 계산에도 쓴다 */
  const allMeta: CharacterMeta[] = Array.isArray(metaRes) ? metaRes : [];
  const selfMeta = allMeta.find((r) => r.characterId === params.characterId) ?? null;
  // 상단 지표 — 1차/2차 분리 시 그 궁극기 통계, 아니면 캐릭터 합산
  const headStat = selectedUlt ? (selectedStat ?? null) : selfMeta;
  const ultLabel = selectedDef ? `${ultimateLabel(selectedDef.ultimateType)} 궁극기 ${selectedDef.skillName}` : null;

  let rows: CharacterRankingRow[] = [];
  let error: NeopleApiError | null = null;
  try {
    const res = await getCharacterRanking(params.characterId, rankingType, { limit: 20 });
    rows = res.rows ?? [];
  } catch (e) {
    error = e as NeopleApiError;
    rows = [];
  }

  const slots = orderSlots(itemMeta?.slots ?? []);

  // 앱 WebView: 같은 데이터로 앱 캐릭터 상세(시안 07)를 그린다.
  if (isAppRequest()) {
    // 티어·역할군 순위 — 메타 화면 기본(종합 기준)과 같은 계산. 공식 체계면 궁극기 단위 행, 아니면 캐릭터 단위 행.
    const useUlt = allUltimateStats.length > 0;
    const tieredAll = useUlt ? withTiers(allUltimateStats) : withTiers(allMeta);
    const mine = useUlt
      ? tieredAll.find(
          (r) =>
            r.characterId === params.characterId &&
            (r as UltimateStatRow).ultimateType === (selectedUlt ?? "1st"),
        )
      : tieredAll.find((r) => r.characterId === params.characterId);
    const roleOf = (r: (typeof tieredAll)[number]): string | null =>
      useUlt ? ((r as UltimateStatRow).officialRole ?? null) : ((r as CharacterMeta).role ?? null);
    const myRole = mine ? roleOf(mine) : null;
    const sameRole = myRole
      ? tieredAll.filter((r) => roleOf(r) === myRole).sort((a, b) => b.score - a.score || b.matchCount - a.matchCount)
      : [];
    const myIndex = mine ? sameRole.indexOf(mine) : -1;
    const fallbackRole = selectedDef?.officialRole ?? ultimates.find((u) => u.ultimateType === "1st")?.officialRole ?? null;
    const roleName = useUlt
      ? (myRole ?? fallbackRole)
      : myRole
        ? (ROLE_LABELS[myRole as keyof typeof ROLE_LABELS] ?? myRole)
        : fallbackRole;
    const buffRole = roleByName(selectedDef?.officialRole ?? ultimates.find((u) => u.ultimateType === "1st")?.officialRole);
    const totalUltPicks = ultimateStats.reduce((n, x) => n + x.picks, 0);
    const skills = (profile?.skills ?? []).filter((x) => !selectedUlt || !x.ult || x.ult === selectedUlt);
    const rankHref = (t: string) => {
      const p = new URLSearchParams();
      if (selectedUlt) p.set("ult", selectedUlt);
      if (t !== "winCount") p.set("rankingType", t);
      p.set("tab", "rank");
      return `/characters/${params.characterId}?${p.toString()}`;
    };

    return (
      <AppCharacter
        characterId={params.characterId}
        name={name ?? null}
        intro={profile?.roleDesc ?? null}
        tier={mine?.tier ?? null}
        roleName={roleName}
        officialRole={!!roleByName(roleName)}
        roleRank={myIndex >= 0 ? { rank: myIndex + 1, total: sameRole.length } : null}
        head={headStat ? { pickRate: headStat.pickRate, winRate: headStat.winRate, kda: headStat.kda, picks: headStat.picks } : null}
        dual={dual}
        selectedUlt={selectedUlt ?? null}
        ultimates={[...ultimates]
          .sort((a, b) => a.ultimateType.localeCompare(b.ultimateType))
          .map((u) => {
            const st = ultimateStats.find((x) => x.ultimateType === u.ultimateType);
            return {
              type: u.ultimateType,
              label: ultimateLabel(u.ultimateType),
              skillName: u.skillName,
              roleName: u.officialRole,
              roleDesc: roleByName(u.officialRole)?.desc ?? null,
              pickRate: st?.pickRate ?? null,
              winRate: st?.winRate ?? null,
              share: st && totalUltPicks ? Math.round((st.picks / totalUltPicks) * 1000) / 10 : null,
            };
          })}
        attackType={profile?.attackType ?? null}
        difficulty={profile?.difficulty ?? null}
        stats={
          profile?.stat
            ? STAT_DISPLAY.map((d) => {
                const v = profile.stat![d.key];
                return { label: d.label, value: v.toLocaleString(), pct: Math.max(4, Math.min(100, (v / d.max) * 100)) };
              })
            : []
        }
        skills={skills.map((x) => ({
          slot: x.slot,
          name: x.name,
          cooldown: x.cooldown ?? null,
          cost: x.cost ?? null,
          explain: x.explain,
          ultLabel: x.ult ? ultimateLabel(x.ult) : null,
        }))}
        buff={
          buffRole && profile?.stat
            ? {
                roleKey: buffRole.key,
                roleName: buffRole.name,
                buffs: buffRole.buffs,
                when: selectedUlt ? `${ultimateLabel(selectedUlt)} 궁극기를 고르면 적용돼요` : "기본 능력치에 더해 적용돼요",
              }
            : null
        }
        buildPicks={itemMeta?.picks ?? null}
        slots={slots.map((x) => ({
          code: x.equipSlotCode,
          label: x.label,
          items: x.items.map((it) => ({ itemId: it.itemId, name: it.itemName, rarityCode: it.rarityCode, rate: it.rate })),
        }))}
        ultTag={ultLabel}
        metricTabs={CHARACTER_RANKING_TYPES.map((t) => ({
          key: t.type,
          label: t.label,
          href: rankHref(t.type),
          active: t.type === rankingType,
        }))}
        metricLabel={characterRankingLabel(rankingType)}
        rankers={rows.map((row) => {
          const wr =
            row.winCount !== undefined && row.loseCount !== undefined ? winRate(row.winCount, row.loseCount) : undefined;
          return {
            rank: row.ranking,
            playerId: row.player.playerId,
            nickname: row.player.nickname,
            value:
              rankingType === "winRate" && row.winRate !== undefined
                ? `${Math.round(row.winRate * 10) / 10}%`
                : (row.value ?? row.winCount ?? "-").toLocaleString(),
            // 승률 지표일 때는 값과 겹치지 않게 승패만
            record:
              row.winCount !== undefined
                ? `${row.winCount.toLocaleString()}승 ${(row.loseCount ?? 0).toLocaleString()}패${
                    wr !== undefined && rankingType !== "winRate" ? ` · 승률 ${wr}%` : ""
                  }`
                : null,
          };
        })}
        rankerError={error ? error.message || "잠시 뒤 다시 열어 주세요." : null}
        allRankHref={`/ranking/characters?characterId=${params.characterId}&rankingType=${rankingType}`}
        rankRetryHref={rankHref(rankingType)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Avatar characterId={params.characterId} characterName={name} size={80} zoom={2} />
          <div>
            <h1 className="text-2xl font-black text-gray-50">{name ?? "캐릭터"}</h1>
            <p className="text-sm text-gray-500">지표별 상위 랭커와 메타 통계를 확인하세요.</p>
            <div className="mt-2">
              <Link
                href={`/ranking/characters?characterId=${params.characterId}&rankingType=${rankingType}`}
                className="text-sm text-primary hover:underline"
              >
                전체 랭킹 보기 →
              </Link>
            </div>
          </div>
        </div>

        {headStat && (
          <div className="grid grid-cols-4 gap-2 sm:ml-auto sm:w-[360px]">
            <Stat label="픽률" value={`${headStat.pickRate}%`} accent="rgb(var(--primary))" />
            <Stat
              label="승률"
              value={`${headStat.winRate}%`}
              accent={headStat.winRate >= 50 ? "rgb(var(--win))" : "rgb(var(--lose))"}
            />
            <Stat label="KDA" value={headStat.kda.toFixed(2)} accent={kdaColor(headStat.kda)} />
            <Stat label="표본" value={headStat.picks.toLocaleString()} />
          </div>
        )}
      </div>

      {/* 1차/2차 궁극기 페이지 전환 — 2차 궁극기 보유 캐릭터만. 지표·추천 빌드·채택률이 선택한 궁극기 판으로 바뀐다 */}
      {dual && selectedUlt && (
        <UltimateSwitch
          ultimates={ultimates}
          stats={ultimateStats}
          selected={selectedUlt}
          hrefFor={(u) => detailHref(params.characterId, rankingType, u)}
        />
      )}

      {/* 궁극기·공식 역할군 (official 체계, 1차만 있는 캐릭터 — 2차 보유 캐릭터는 위 전환에서 함께 보여 줌) */}
      {ultimates.length > 0 && !dual && <CharacterUltimates ultimates={ultimates} stats={ultimateStats} />}

      {/* 능력치 & 스킬 (공식 사이트 기준) */}

      {/* 능력치(공통)·역할군 고정 버프·스킬 — 2차 보유 캐릭터는 선택 궁극기 기준으로 */}
      {profile && (
        <CypherProfileView
          profile={profile}
          ultimateType={selectedUlt}
          role={roleByName(selectedDef?.officialRole ?? ultimates.find((u) => u.ultimateType === "1st")?.officialRole)}
        />
      )}

      {/* 메타 아이템 빌드 (슬롯별) */}
      {slots.length > 0 && (
        <div className="space-y-4">
          {/* 추천 빌드: 슬롯별 최다 채택 아이템 */}
          <section>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">추천 빌드</h2>
              {ultLabel && <span className="chip bg-primary/10 text-[11px] font-semibold text-primary">{ultLabel}</span>}
              <span className="text-xs text-gray-500">
                표본 {itemMeta?.picks.toLocaleString()} · 수집한 매칭 경기의 장착 아이템 · 슬롯별 최다 채택
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {slots.map((s) => {
                const top = s.items[0];
                return (
                  <div key={s.equipSlotCode} className="card flex flex-col items-center gap-1.5 p-3">
                    <span className="text-[11px] font-semibold text-gray-500">{s.label}</span>
                    <ItemIcon
                      itemId={top.itemId}
                      itemName={top.itemName ?? undefined}
                      rarityCode={top.rarityCode ?? undefined}
                      size={40}
                    />
                    <span
                      className="w-full truncate text-center text-xs font-medium text-gray-100"
                      title={top.itemName ?? undefined}
                    >
                      {top.itemName ?? top.itemId}
                    </span>
                    <span className="text-xs font-bold text-primary">{top.rate}%</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 슬롯별 채택률 상세 */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">슬롯별 채택률</h2>
              {ultLabel && <span className="chip bg-primary/10 text-[11px] font-semibold text-primary">{ultLabel}</span>}
              <span className="text-xs text-gray-500">각 슬롯 상위 채택 아이템</span>
            </div>
            <div className="card divide-y divide-line">
              {slots.map((s) => (
                <div
                  key={s.equipSlotCode}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
                >
                  <div className="w-full shrink-0 text-sm font-semibold text-gray-300 sm:w-24">
                    {s.label}
                  </div>
                  <div className="flex flex-1 flex-wrap gap-x-4 gap-y-2">
                    {s.items.slice(0, 4).map((it) => (
                      <div key={it.itemId} className="flex items-center gap-2">
                        <ItemIcon
                          itemId={it.itemId}
                          itemName={it.itemName ?? undefined}
                          rarityCode={it.rarityCode ?? undefined}
                          size={28}
                        />
                        <div className="min-w-0">
                          <div className="max-w-[140px] truncate text-xs font-medium text-gray-100">
                            {it.itemName ?? it.itemId}
                          </div>
                          <div className="text-[11px] text-gray-500">{it.rate}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 지표 탭 */}
      <LinkTabs
        keepScroll
        tabs={CHARACTER_RANKING_TYPES.map((t) => ({
          href: detailHref(params.characterId, t.type, selectedUlt),
          label: t.label,
          active: t.type === rankingType,
        }))}
      />

      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold text-gray-100">{characterRankingLabel(rankingType)} 상위 랭커</h2>
        {/* 네오플 캐릭터 랭킹은 궁극기를 구분하지 않는다 */}
        {dual && <span className="text-xs text-gray-500">네오플 공식 랭킹 기준 · 1차/2차 구분 없음</span>}
      </div>

      {error ? (
        <ErrorState message={error.message} hint={`code: ${error.code}`} />
      ) : rows.length === 0 ? (
        <EmptyState title="랭킹 데이터가 없습니다" icon="🏆" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-gray-500">
                <th className="w-16 px-4 py-2.5 text-left font-medium">순위</th>
                <th className="px-4 py-2.5 text-left font-medium">플레이어</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {characterRankingLabel(rankingType)}
                </th>
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
                    className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={`font-bold ${row.ranking <= 3 ? "text-primary" : "text-gray-400"}`}
                      >
                        {row.ranking}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/players/${row.player.playerId}`}
                        className="font-semibold text-gray-100 hover:text-primary"
                      >
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
      )}
    </div>
  );
}
