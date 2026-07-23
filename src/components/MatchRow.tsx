"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import type { MatchRow as MatchRowType, MatchDetail, MatchDetailTeam } from "@/lib/types";
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

function hasKdaFields(pi: {
  killCount?: number;
  deathCount?: number;
  assistCount?: number;
}): boolean {
  return pi.killCount !== undefined || pi.deathCount !== undefined || pi.assistCount !== undefined;
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md bg-surface-2 px-2 py-1.5 text-center">
      <div className="truncate text-sm font-bold text-gray-100">{value}</div>
      <div className="mt-0.5 text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function TeamBlock({
  team,
  index,
  highlightPlayerId,
}: {
  team: MatchDetailTeam;
  index: number;
  highlightPlayerId?: string;
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
              className={`flex items-center gap-2 rounded px-1 py-0.5 ${me ? "bg-primary/10" : ""}`}
            >
              <Avatar characterId={pi.characterId} characterName={pi.characterName} size={22} zoom={1} />
              <Link
                href={`/players/${pl.playerId}`}
                className={`min-w-0 flex-1 truncate text-xs ${
                  me ? "font-bold text-primary" : "text-gray-300 hover:text-primary"
                }`}
              >
                {pl.nickname || pi.characterName}
              </Link>
              {hasKdaFields(pi) && (
                <span className="shrink-0 text-[11px] text-gray-500">
                  {pi.killCount ?? 0}/{pi.deathCount ?? 0}/{pi.assistCount ?? 0}
                </span>
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

  return (
    <div className={`overflow-hidden rounded-lg border border-l-4 border-line bg-surface ${borderClass}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
      >
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
          <div className="truncate text-xs text-gray-500">
            {[p.playTime ? formatPlayTime(p.playTime) : "", formatMatchListDate(match.date)]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        <div className="w-24 shrink-0 text-center">
          {hasKDA ? (
            <>
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
      </button>

      {open && (
        <div className="border-t border-line/60 px-3 py-3">
          {loading && <div className="py-4 text-center text-xs text-gray-500">불러오는 중…</div>}
          {error && <div className="py-4 text-center text-xs text-red-300">{error}</div>}
          {detail && (
            <div className="space-y-3">
              {hasKDA ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <MiniStat label="레벨" value={p.level ?? "-"} />
                  <MiniStat label="피해" value={formatNumber(p.damagePoint)} />
                  <MiniStat label="전투" value={formatNumber(p.battlePoint)} />
                  <MiniStat label="타워" value={formatNumber(p.towerAttackPoint)} />
                  <MiniStat label="시야" value={formatNumber(p.sightPoint)} />
                  <MiniStat label="백어택" value={formatNumber(p.backAttackCount)} />
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
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {detail.teams.map((team, ti) => (
                    <TeamBlock
                      key={team.teamId ?? ti}
                      team={team}
                      index={ti}
                      highlightPlayerId={highlightPlayerId}
                    />
                  ))}
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
