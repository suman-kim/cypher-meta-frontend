"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import type {
  MatchRow as MatchRowType,
  MatchDetail,
  MatchDetailTeam,
  MatchPlayInfo,
} from "@/lib/types";
import { Avatar } from "./CharacterAvatar";
import ItemIcon from "./ItemIcon";
import {
  calcKDA,
  formatKDA,
  formatMatchListDate,
  formatNumber,
  formatPlayTime,
  kdaColor,
} from "@/lib/format";
import { gameTypeLabel } from "@/lib/constants";
import { buildMatchSummary } from "@/lib/match-summary";
import MvpCriteria from "@/components/match/MvpCriteria";

function hasKdaFields(pi: {
  killCount?: number;
  deathCount?: number;
  assistCount?: number;
}): boolean {
  return pi.killCount !== undefined || pi.deathCount !== undefined || pi.assistCount !== undefined;
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-2.5 text-center">
      <div
        className="truncate text-base font-black tabular-nums text-gray-100"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-gray-500">{label}</div>
    </div>
  );
}

const nnum = (v: unknown): number => (typeof v === "number" ? v : 0);

/** 개인 특이 기록 배지 — 멀티킬 / 노데스 / 힐 등 이 경기에서 눈에 띄는 기록만 뽑는다. */
type Highlight = { text: string; kind: "epic" | "good" | "neutral" };
/** 같은 멀티킬이 2회 이상이면 " ×N" 접미사 (1회면 접미사 없음) */
const times = (nCount: number) => (nCount >= 2 ? ` ×${nCount}` : "");
function computeHighlights(pi: MatchPlayInfo): Highlight[] {
  const out: Highlight[] = [];
  const mk = pi.multiKillCount;
  const genocide = nnum(mk?.genocide);
  const quad = nnum(mk?.quadruple);
  const triple = nnum(mk?.triple);
  const dbl = nnum(mk?.double);
  if (genocide > 0) out.push({ text: `제노사이드${times(genocide)}`, kind: "epic" });
  if (quad > 0) out.push({ text: `쿼드러플킬${times(quad)}`, kind: "epic" });
  if (triple > 0) out.push({ text: `트리플킬${times(triple)}`, kind: "good" });
  if (dbl > 0 && !triple && !quad && !genocide) out.push({ text: `더블킬${times(dbl)}`, kind: "good" });
  const k = nnum(pi.killCount);
  const a = nnum(pi.assistCount);
  if (nnum(pi.deathCount) === 0 && k + a >= 5) out.push({ text: "노데스", kind: "good" });
  if (nnum(pi.healAmount) >= 10000) out.push({ text: `힐 ${formatNumber(nnum(pi.healAmount))}`, kind: "neutral" });
  return out;
}

function HighlightBadge({ text, kind }: Highlight) {
  const style =
    kind === "epic"
      ? { color: "#a15bf0", backgroundColor: "#a15bf020" }
      : kind === "good"
        ? { color: "#4fbf6b", backgroundColor: "#4fbf6b20" }
        : { color: "#9aa7b4", backgroundColor: "#9aa7b420" };
  return (
    <span className="chip px-1.5 py-0.5 text-[10px] font-semibold leading-none" style={style}>
      {text}
    </span>
  );
}

/** 접이식 전체 스탯 비교 — 지표별 랭킹 바 (기본 닫힘). 각 지표마다 전원(최대 10명)을
 *  값 큰 순 가로 막대로 정렬해 "누가 1등인지"가 한눈에 보이게 한다. 팀 색으로 구분, 내 선수 강조. */
function FullStatCompare({
  teams,
  highlightPlayerId,
}: {
  teams: MatchDetailTeam[];
  highlightPlayerId?: string;
}) {
  const BLUE = "#4f8ff0";
  const RED = "#ff5470";
  const METRICS: { key: keyof MatchPlayInfo; label: string }[] = [
    { key: "battlePoint", label: "전투 점수" },
    { key: "attackPoint", label: "가한 피해" },
    { key: "damagePoint", label: "받은 피해" },
    { key: "sightPoint", label: "시야" },
    { key: "healAmount", label: "힐량" },
    { key: "backAttackCount", label: "백어택" },
  ];

  // 내 팀 = 파랑, 상대 = 빨강 (검색 플레이어 없으면 승리팀 파랑 / 패배팀 빨강)
  const myTeamIdx =
    highlightPlayerId != null
      ? teams.findIndex((t) => t.players.some((p) => p.playerId === highlightPlayerId))
      : -1;
  const colorOf = (teamIdx: number) => {
    if (myTeamIdx >= 0) return teamIdx === myTeamIdx ? BLUE : RED;
    const t = teams[teamIdx];
    if (t?.result === "win") return BLUE;
    if (t?.result === "lose") return RED;
    return teamIdx === 0 ? BLUE : RED;
  };

  const flat = teams.flatMap((t, ti) => t.players.map((p) => ({ p, teamIdx: ti })));

  return (
    <details className="group rounded-lg border border-line bg-surface-2/40">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-gray-400 transition-colors hover:text-gray-200 [&::-webkit-details-marker]:hidden">
        <span>전체 스탯 비교 보기</span>
        <span className="ml-auto text-gray-600 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2">
        {METRICS.map((m) => {
          const rows = flat
            .map(({ p, teamIdx }) => ({
              p,
              teamIdx,
              v: nnum(p.playInfo[m.key]),
            }))
            .sort((a, b) => b.v - a.v);
          const max = Math.max(0, ...rows.map((r) => r.v));
          if (max <= 0) return null; // 전원 0인 지표는 숨김 (예: 아무도 힐 안 함)
          return (
            <div key={m.key as string}>
              <div className="mb-2 border-b border-line pb-1 text-xs font-bold text-gray-100">
                {m.label}
              </div>
              <div className="space-y-1">
                {rows.map((r, i) => {
                  const me = r.p.playerId === highlightPlayerId;
                  const w = Math.max((r.v / max) * 100, r.v > 0 ? 3 : 0);
                  return (
                    <div key={r.p.playerId} className="flex items-center gap-1.5">
                      <span className="w-4 shrink-0 text-right text-[9px] tabular-nums text-gray-600">
                        {i + 1}
                      </span>
                      <span
                        className={`w-14 shrink-0 truncate text-[10px] ${
                          me ? "font-bold text-primary" : "text-gray-300"
                        }`}
                        title={r.p.nickname || r.p.playInfo.characterName}
                      >
                        {r.p.nickname || r.p.playInfo.characterName}
                      </span>
                      <div className="relative h-3 flex-1 overflow-hidden rounded bg-surface">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${w}%`,
                            backgroundColor: colorOf(r.teamIdx),
                            opacity: i === 0 ? 1 : 0.72,
                          }}
                        />
                      </div>
                      <span
                        className={`w-11 shrink-0 text-right text-[10px] tabular-nums ${
                          me ? "font-bold text-gray-100" : "text-gray-400"
                        }`}
                      >
                        {formatNumber(r.v)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

/** 수상 뱃지 — MVP(자체 분석, 금색) / ACE·JOKER(게임 공식 표식) */
function AwardChip({ kind }: { kind: "MVP" | "ACE" | "JOKER" }) {
  const style =
    kind === "MVP"
      ? { color: "#e3b23c", backgroundColor: "#e3b23c20" }
      : kind === "ACE"
        ? { color: "#ff5470", backgroundColor: "#ff547020" }
        : { color: "#a15bf0", backgroundColor: "#a15bf020" };
  return (
    <span
      className="chip shrink-0 px-1 py-0 text-[9px] font-bold leading-none"
      style={style}
      title={kind === "MVP" ? "자체 분석 팀 MVP" : `게임 공식 ${kind}`}
    >
      {kind}
    </span>
  );
}

function TeamBlock({
  team,
  index,
  highlightPlayerId,
  mvpIds,
}: {
  team: MatchDetailTeam;
  index: number;
  highlightPlayerId?: string;
  mvpIds: Set<string>;
}) {
  const known = team.result === "win" || team.result === "lose";
  const win = team.result === "win";
  return (
    <div className="rounded-md border border-line bg-surface p-2">
      <div
        className={`mb-1.5 text-xs font-bold ${
          known ? (win ? "text-blue-300" : "text-red-300") : "text-gray-400"
        }`}
      >
        {known ? (win ? "승리 팀" : "패배 팀") : `팀 ${index + 1}`}
      </div>
      <ul className="space-y-1">
        {team.players.map((pl) => {
          const me = pl.playerId === highlightPlayerId;
          const pi = pl.playInfo;
          return (
            <li
              key={pl.playerId}
              className={`flex items-center gap-2 rounded px-1.5 py-1 ${me ? "bg-primary/10" : ""}`}
            >
              <Avatar characterId={pi.characterId} characterName={pi.characterName} size={24} zoom={1} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/players/${pl.playerId}`}
                    className={`min-w-0 truncate text-xs ${
                      me ? "font-bold text-primary" : "text-gray-300 hover:text-primary"
                    }`}
                  >
                    {pl.nickname || pi.characterName}
                  </Link>
                  {mvpIds.has(pl.playerId) && <AwardChip kind="MVP" />}
                  {pi.aceInfo?.name === "ACE" && <AwardChip kind="ACE" />}
                  {pi.aceInfo?.name === "JOKER" && <AwardChip kind="JOKER" />}
                </div>
                {hasKdaFields(pi) && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] tabular-nums">
                    <span style={{ color: "#4f8ff0" }}>가한 {formatNumber(pi.attackPoint)}</span>
                    <span style={{ color: "#ff5470" }}>받은 {formatNumber(pi.damagePoint)}</span>
                    <span style={{ color: "#4fbf6b" }}>시야 {formatNumber(pi.sightPoint)}</span>
                    <span className="text-gray-500">전투 {formatNumber(pi.battlePoint)}</span>
                  </div>
                )}
              </div>
              {hasKdaFields(pi) && (
                <div className="shrink-0 text-right">
                  <div className="text-[9px] font-medium tracking-wide text-gray-500">K/D/A</div>
                  <div className="text-[11px] font-semibold tabular-nums text-gray-300">
                    {pi.killCount ?? 0}/{pi.deathCount ?? 0}/{pi.assistCount ?? 0}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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
  const resultKnown = p.result === "win" || p.result === "lose";
  const win = p.result === "win";
  const hasKDA = hasKdaFields(p);
  const kda = calcKDA(p.killCount, p.deathCount, p.assistCount);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !detail && !loading) {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/matches/${encodeURIComponent(match.matchId)}`);
        if (!r.ok) throw new Error("상세 정보를 불러오지 못했습니다.");
        setDetail((await r.json()) as MatchDetail);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
  }

  const detailHref = highlightPlayerId
    ? `/matches/${match.matchId}?highlight=${encodeURIComponent(highlightPlayerId)}`
    : `/matches/${match.matchId}`;

  const borderClass = resultKnown
    ? win
      ? "border-l-win"
      : "border-l-lose"
    : "border-l-gray-400";

  // 펼침 시: 내 아이템 빌드 (일반전은 KDA가 없어 이 빌드가 핵심 정보)
  const mine = detail
    ? detail.teams.flatMap((t) => t.players).find((pl) => pl.playerId === highlightPlayerId)
    : undefined;
  const buildItems = (mine?.items ?? [])
    .filter((it) => it.itemId)
    .slice()
    .sort((a, b) => (a.equipSlotCode ?? "").localeCompare(b.equipSlotCode ?? ""));

  // 팀별 MVP(자체 분석) — buildMatchSummary 재사용. 일반전/무스탯이면 빈 배열.
  const mvpIds = new Set(
    (detail ? buildMatchSummary(detail, highlightPlayerId).mvps : [])
      .map((mv) => mv.playerId)
      .filter(Boolean),
  );

  // 개인 스냅샷 — 상세(teams)의 내 스탯이 더 완전하므로 우선 사용, 없으면 리스트 값(p) 폴백.
  const meStats: MatchPlayInfo = mine?.playInfo ?? p;
  const highlights = hasKDA ? computeHighlights(meStats) : [];

  return (
    <div className={`overflow-hidden rounded-lg border border-l-4 border-line bg-surface ${borderClass}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
      >
        <div className="flex items-center gap-3">
          <div className="flex w-14 shrink-0 flex-col items-center text-center">
            {resultKnown ? (
              <>
                <span className={`text-sm font-bold ${win ? "text-blue-300" : "text-red-300"}`}>
                  {win ? "승리" : "패배"}
                </span>
                <span className="text-[11px] text-gray-500">{gameTypeLabel(gameTypeId)}</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-gray-400">{gameTypeLabel(gameTypeId)}</span>
                <span className="text-[10px] text-gray-500">결과 미제공</span>
              </>
            )}
          </div>

          <Avatar characterId={p.characterId} characterName={p.characterName} size={44} zoom={1} />

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-100">{p.characterName ?? "-"}</div>
            {p.playTime ? (
              <div className="truncate text-xs leading-tight text-gray-500">{formatPlayTime(p.playTime)}</div>
            ) : null}
            <div className="truncate text-xs leading-tight text-gray-500">{formatMatchListDate(match.date)}</div>
          </div>

          <div className="w-24 shrink-0 text-center">
            {hasKDA ? (
              <>
                <div className="text-[9px] font-medium tracking-wide text-gray-500">K / D / A</div>
                <div className="text-sm font-bold text-gray-100">
                  {p.killCount ?? 0} <span className="text-gray-500">/</span>{" "}
                  <span className="text-red-400">{p.deathCount ?? 0}</span>{" "}
                  <span className="text-gray-500">/</span> {p.assistCount ?? 0}
                </div>
                <div className="text-xs font-semibold" style={{ color: kdaColor(kda) }}>
                  {formatKDA(p.killCount, p.deathCount, p.assistCount)} 평점
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500">KDA 미제공</div>
            )}
          </div>

          <svg
            className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

      </button>

      {open && (
        <div className="border-t border-line/60 px-3 py-3">
          {loading && <div className="py-4 text-center text-xs text-gray-500">불러오는 중…</div>}
          {error && <div className="py-4 text-center text-xs text-red-300">{error}</div>}
          {detail && (
            <div className="space-y-3">
              {hasKDA ? (
                <div className="space-y-2">
                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {highlights.map((h, i) => (
                        <HighlightBadge key={i} text={h.text} kind={h.kind} />
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="전투 점수" value={formatNumber(meStats.battlePoint)} accent="#a15bf0" />
                    <MiniStat label="가한 피해" value={formatNumber(meStats.attackPoint)} accent="#4f8ff0" />
                    <MiniStat label="받은 피해" value={formatNumber(meStats.damagePoint)} accent="#ff5470" />
                    <MiniStat label="시야" value={formatNumber(meStats.sightPoint)} accent="#4fbf6b" />
                    <MiniStat label="힐량" value={formatNumber(meStats.healAmount)} accent="#4fbf6b" />
                    <MiniStat label="백어택" value={formatNumber(meStats.backAttackCount)} />
                    <MiniStat label="타워 공격" value={formatNumber(meStats.towerAttackPoint)} accent="#e3b23c" />
                    <MiniStat label="콤보" value={formatNumber(meStats.comboCount)} />
                    <MiniStat label="레벨" value={meStats.level ?? "-"} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface-2 px-3 py-2 text-xs text-gray-500">
                  <span>레벨 {p.level ?? "-"}</span>
                  {p.playTime ? <span>· 플레이 {formatPlayTime(p.playTime)}</span> : null}
                  {detail.map?.name ? <span>· 맵 {detail.map.name}</span> : null}
                  <span className="text-gray-400">· 일반전은 KDA·승패를 제공하지 않습니다</span>
                </div>
              )}

              {/* 아이템 빌드 */}
              {buildItems.length > 0 && (
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-gray-500">아이템 빌드</div>
                  <div className="flex flex-wrap gap-1">
                    {buildItems.map((it, i) => (
                      <span
                        key={it.itemId ?? i}
                        title={`${it.slotName ?? ""}${it.itemName ? ` · ${it.itemName}` : ""}`}
                      >
                        <ItemIcon
                          itemId={it.itemId ?? ""}
                          itemName={it.itemName ?? undefined}
                          rarityCode={it.rarityCode ?? undefined}
                          size={28}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.teams.length > 0 && (
                <FullStatCompare teams={detail.teams} highlightPlayerId={highlightPlayerId} />
              )}

              {detail.teams.length > 0 && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {detail.teams.map((team, ti) => (
                      <TeamBlock
                        key={team.teamId ?? ti}
                        team={team}
                        index={ti}
                        highlightPlayerId={highlightPlayerId}
                        mvpIds={mvpIds}
                      />
                    ))}
                  </div>
                  {(mvpIds.size > 0 ||
                    detail.teams.some((t) => t.players.some((pl) => pl.playInfo.aceInfo?.name))) && (
                    <p className="text-center text-[10px] leading-relaxed text-gray-500">
                      <span className="font-bold" style={{ color: "#e3b23c" }}>
                        MVP
                      </span>{" "}
                      자체 분석(팀당 1명) ·{" "}
                      <span className="font-bold" style={{ color: "#ff5470" }}>
                        ACE
                      </span>
                      ·
                      <span className="font-bold" style={{ color: "#a15bf0" }}>
                        JOKER
                      </span>{" "}
                      게임 공식 표식
                    </p>
                  )}
                  {mvpIds.size > 0 && <MvpCriteria />}
                </div>
              )}

              <div className="flex justify-end">
                <Link href={detailHref} className="btn-primary px-3 py-1.5 text-xs">
                  상세 보기 →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
