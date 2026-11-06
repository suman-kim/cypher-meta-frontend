"use client";

/**
 * 앱 매치 상세 화면의 상호작용 조각들.
 *
 * - MatchShell: 상단바(뒤로 + "매치 상세") 아래에 붙는 종합·분석 세그먼트와 두 화면 전환.
 *   두 화면 내용은 서버가 그려서 넘기고, 여기서는 보이기만 바꾼다(펼친 행 상태가 탭을 오가도 남는다).
 * - TeamList: 팀 하나의 플레이어 행 목록. 행을 누르면 특이 기록·최종 장착 아이템(누르면 아이템 요약 시트)·구매 순서·
 *   주요 숫자·코인·그 플레이어 전적 보기 링크가 펼쳐진다.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { calcKDA, formatNumber } from "@/lib/format";
import type { MatchDetailItem, MatchDetailPlayer, MatchDetailTeam, MatchPlayInfo } from "@/lib/types";
import { AppTopBar } from "../../AppChrome";
import { Icon } from "../../icons";
import { Badge, CharImg, Segmented } from "../../ui";
import { ItemButton } from "./ItemSheet";
import { MiniStat, SubLabel, shortSlot } from "./parts";

/* ── 화면 틀 ───────────────────────────────────── */

/**
 * 매치 상세 화면 틀 — 상단바 + 종합·분석 전환.
 * @param overview 종합 화면 내용
 * @param analysis 분석 화면 내용
 * @param backHref 이전 화면이 없을 때 뒤로 가기가 갈 주소
 */
export function MatchShell({ overview, analysis, backHref }: { overview: ReactNode; analysis: ReactNode; backHref: string }) {
  const [tab, setTab] = useState<"overview" | "analysis">("overview");
  return (
    <div className="min-h-[100dvh]" style={{ background: "radial-gradient(120% 42% at 50% -8%, var(--a-amb), transparent 70%)" }}>
      <AppTopBar variant="back" title="매치 상세" backHref={backHref}>
        <Segmented
          size="sm"
          value={tab}
          onChange={(k) => {
            setTab(k as "overview" | "analysis");
            window.scrollTo({ top: 0 });
          }}
          items={[
            { key: "overview", label: "종합" },
            { key: "analysis", label: "분석" },
          ]}
        />
      </AppTopBar>
      <div hidden={tab !== "overview"}>{overview}</div>
      <div hidden={tab !== "analysis"}>{analysis}</div>
    </div>
  );
}

/* ── 팀 목록 ───────────────────────────────────── */

/** 숫자 필드 읽기 (없으면 0) */
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

/**
 * K/D/A 값이 있는지 (일반전은 없다).
 * @param pi 플레이 정보
 */
function hasKda(pi: Partial<MatchPlayInfo>): boolean {
  return pi.killCount !== undefined || pi.deathCount !== undefined || pi.assistCount !== undefined;
}

/** 멀티킬 표기 순서 */
const MULTI = [
  { key: "genocide", label: "제노사이드" },
  { key: "quadruple", label: "쿼드러플킬" },
  { key: "triple", label: "트리플킬" },
  { key: "double", label: "더블킬" },
] as const;

/** 팀 안 1위를 "주요 포인트"로 보여 줄 지표 (앞에 있을수록 먼저) */
const TEAM_FIRST: { key: keyof MatchPlayInfo; label: string }[] = [
  { key: "attackPoint", label: "팀 내 딜량 1위" },
  { key: "killCount", label: "팀 내 킬 1위" },
  { key: "assistCount", label: "팀 내 어시스트 1위" },
  { key: "damagePoint", label: "팀 내 받은 피해 1위" },
  { key: "sightPoint", label: "팀 내 시야 1위" },
  { key: "healAmount", label: "팀 내 힐량 1위" },
  { key: "battlePoint", label: "팀 내 전투 점수 1위" },
];

/**
 * 팀 안에서 이 플레이어가 1위인 지표들 (값이 0이면 빼고, 최대 4개).
 * @param p 플레이어
 * @param team 같은 팀
 */
function teamFirsts(p: MatchDetailPlayer, team: MatchDetailTeam): string[] {
  const out: string[] = [];
  for (const m of TEAM_FIRST) {
    const v = num(p.playInfo[m.key]);
    if (v <= 0) continue;
    if (team.players.every((o) => num(o.playInfo[m.key]) <= v)) out.push(m.label);
  }
  if (num(p.playInfo.deathCount) === 0 && hasKda(p.playInfo)) out.push("노데스");
  return out.slice(0, 4);
}

/**
 * 팀 하나의 플레이어 행 목록 (카드 한 장).
 * @param team 팀
 * @param highlight 강조할 플레이어 ID (이 매치를 보는 기준 플레이어)
 * @param mvpIds 자체 분석 팀 MVP 플레이어 ID 목록
 * @param maxDmg 매치 전체 가한 피해 최댓값 (딜량 막대 기준)
 */
export function TeamList({
  team,
  highlight,
  mvpIds,
  maxDmg,
}: {
  team: MatchDetailTeam;
  highlight?: string;
  mvpIds: string[];
  maxDmg: number;
}) {
  // 기준 플레이어가 있으면 그 행을 처음부터 펼쳐 둔다
  const [openId, setOpenId] = useState<string | null>(
    highlight && team.players.some((p) => p.playerId === highlight) ? highlight : null,
  );
  const known = team.result === "win" || team.result === "lose";
  const bar = known ? (team.result === "win" ? "bg-app-win-tx" : "bg-app-loss-tx") : "bg-gray-500";

  return (
    <div className="a-card overflow-hidden">
      {team.players.map((p, i) => (
        <PlayerRow
          key={p.playerId || i}
          p={p}
          team={team}
          me={!!highlight && p.playerId === highlight}
          mvp={mvpIds.includes(p.playerId)}
          maxDmg={maxDmg}
          barClass={bar}
          open={openId === p.playerId}
          onToggle={() => setOpenId((cur) => (cur === p.playerId ? null : p.playerId))}
          last={i === team.players.length - 1}
        />
      ))}
    </div>
  );
}

/**
 * 플레이어 한 행 (눌러서 펼침).
 * @param p 플레이어
 * @param team 같은 팀 (주요 포인트 계산)
 * @param me 기준 플레이어인지 (강조)
 * @param mvp 팀 MVP 인지
 * @param maxDmg 딜량 막대 기준 최댓값
 * @param barClass 딜량 막대 색 (팀 승패)
 * @param open 펼침 여부
 * @param onToggle 누를 때
 * @param last 마지막 행인지 (구분선 생략)
 */
function PlayerRow({
  p,
  team,
  me,
  mvp,
  maxDmg,
  barClass,
  open,
  onToggle,
  last,
}: {
  p: MatchDetailPlayer;
  team: MatchDetailTeam;
  me: boolean;
  mvp: boolean;
  maxDmg: number;
  barClass: string;
  open: boolean;
  onToggle: () => void;
  last: boolean;
}) {
  const pi = p.playInfo;
  const stats = hasKda(pi);
  const name = p.nickname || pi.characterName || "-";
  const dmgPct = maxDmg > 0 ? Math.max(3, Math.round((num(pi.attackPoint) / maxDmg) * 100)) : 0;

  return (
    <div className={`${last ? "" : "border-b border-app-hair"} ${me ? "bg-app-ac-soft" : ""}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
        <CharImg id={pi.characterId} name={pi.characterName} size={36} radius={10} />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex min-w-0 items-center gap-1">
            <span className={`truncate text-[13px] ${me ? "font-extrabold text-app-ac-tx" : "font-semibold text-gray-100"}`}>{name}</span>
            {mvp && <Badge tone="grad">MVP</Badge>}
            {(pi.aceInfo?.name === "ACE" || pi.aceInfo?.name === "JOKER") && <Badge tone="soft">{pi.aceInfo.name}</Badge>}
          </span>
          <span className="truncate text-[11px] text-gray-500">
            {pi.characterName}
            {pi.level ? ` · ${pi.level}레벨` : ""}
          </span>
        </span>
        {stats ? (
          <span className="grid w-[92px] shrink-0 justify-items-end gap-1">
            <span className="text-xs font-bold tabular-nums text-gray-100">
              {num(pi.killCount)}/{num(pi.deathCount)}/{num(pi.assistCount)}
            </span>
            <span className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
              <span className={`block h-full rounded-full ${barClass}`} style={{ width: `${dmgPct}%` }} />
            </span>
            <span className="text-[10px] tabular-nums text-gray-500">{formatNumber(pi.attackPoint)}</span>
          </span>
        ) : null}
        <span className={`shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <Icon name="chevronDown" size={16} />
        </span>
      </button>
      {open && <PlayerDetail p={p} team={team} mvp={mvp} />}
    </div>
  );
}

/**
 * 펼친 플레이어 상세 — 특이 기록, 최종 장착 아이템, 구매 순서, 주요 포인트, 코인, 전적 보기.
 * @param p 플레이어
 * @param team 같은 팀
 * @param mvp 팀 MVP 인지
 */
function PlayerDetail({ p, team, mvp }: { p: MatchDetailPlayer; team: MatchDetailTeam; mvp: boolean }) {
  const pi = p.playInfo;
  const stats = hasKda(pi);
  const name = p.nickname || pi.characterName || "플레이어";
  const mk = (pi.multiKillCount ?? {}) as Record<string, number | undefined>;
  const multis = MULTI.map((m) => ({ ...m, n: num(mk[m.key]) })).filter((m) => m.n > 0);
  const firsts = stats ? teamFirsts(p, team) : [];

  // 구매 순서 아이콘의 이름·희귀도·부위는 최종 장착 아이템에서 찾는다
  const meta = new Map<string, MatchDetailItem>();
  for (const it of p.items ?? []) if (it.itemId) meta.set(it.itemId, it);
  const equipped = (p.items ?? [])
    .filter((it) => it.itemId)
    .slice()
    .sort((a, b) => (a.equipSlotCode ?? "").localeCompare(b.equipSlotCode ?? ""));
  const buys = p.itemPurchase ?? [];
  const hasCoin = pi.getCoin !== undefined || pi.spendCoin !== undefined;

  return (
    <div className="grid gap-3.5 px-3 pb-3.5 pt-0.5">
      {(mvp || multis.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {mvp && <Badge tone="grad">팀 MVP</Badge>}
          {multis.map((m) => (
            <Badge key={m.key} tone={m.key === "double" ? "soft" : "grad"}>
              {m.label}
              {m.n > 1 ? ` ×${m.n}` : ""}
            </Badge>
          ))}
        </div>
      )}

      {equipped.length > 0 && (
        <div className="grid gap-1.5">
          <SubLabel right="눌러서 효과 보기">최종 장착 아이템</SubLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {equipped.map((it, i) => (
              <ItemButton
                key={`${it.itemId}-${i}`}
                itemId={it.itemId}
                itemName={it.itemName}
                rarityCode={it.rarityCode}
                slotName={it.slotName}
                size={26}
                className="min-w-0 gap-1.5 rounded-[10px] bg-bg p-1.5"
                label={<span className="truncate text-[10px] text-gray-300">{shortSlot(it.slotName) || "아이템"}</span>}
              />
            ))}
          </div>
        </div>
      )}

      {buys.length > 0 && (
        <div className="grid gap-1.5">
          <SubLabel right={`${buys.length}번 구매`}>구매 순서</SubLabel>
          <div className="a-hscroll -mx-3 gap-2 px-3 pt-1.5">
            {buys.map((id, i) => {
              const m = meta.get(id);
              return (
                <span key={`${id}-${i}`} className="relative shrink-0 pl-1">
                  <span className="a-grad absolute -top-1.5 left-0 z-10 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold">
                    {i + 1}
                  </span>
                  <ItemButton itemId={id} itemName={m?.itemName} rarityCode={m?.rarityCode} slotName={m?.slotName} size={32} />
                </span>
              );
            })}
          </div>
        </div>
      )}

      {stats && (
        <div className="grid gap-1.5">
          <SubLabel>주요 포인트</SubLabel>
          {firsts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {firsts.map((t) => (
                <span key={t} className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-semibold text-gray-300">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            <MiniStat label="평점" value={calcKDA(num(pi.killCount), num(pi.deathCount), num(pi.assistCount)).toFixed(2)} tone="ac" />
            <MiniStat label="가한 피해" value={formatNumber(pi.attackPoint)} />
            <MiniStat label="받은 피해" value={formatNumber(pi.damagePoint)} />
            <MiniStat label="전투 점수" value={formatNumber(pi.battlePoint)} />
            <MiniStat label="시야" value={formatNumber(pi.sightPoint)} />
            <MiniStat label="힐량" value={formatNumber(pi.healAmount)} />
            <MiniStat label="백어택" value={formatNumber(pi.backAttackCount)} />
            <MiniStat label="타워 공격" value={formatNumber(pi.towerAttackPoint)} />
            <MiniStat label="콤보" value={formatNumber(pi.comboCount)} />
          </div>
        </div>
      )}

      {hasCoin && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="grid gap-0.5 rounded-xl bg-bg px-3 py-2">
            <span className="text-[10.5px] text-gray-500">코인 획득</span>
            <span className="text-[15px] font-extrabold tabular-nums text-gray-100">{formatNumber(pi.getCoin)}</span>
          </div>
          <div className="grid gap-0.5 rounded-xl bg-bg px-3 py-2">
            <span className="text-[10.5px] text-gray-500">코인 소비</span>
            <span className="text-[15px] font-extrabold tabular-nums text-gray-100">{formatNumber(pi.spendCoin)}</span>
            {pi.spendConsumablesCoin ? (
              <span className="text-[10px] text-gray-500">소모품 {formatNumber(pi.spendConsumablesCoin)}</span>
            ) : null}
          </div>
        </div>
      )}

      {!stats && (
        <p className="text-xs leading-relaxed text-gray-500">일반전은 K/D/A·딜량 같은 경기 지표가 제공되지 않아요.</p>
      )}

      {p.playerId && (
        <Link
          href={`/players/${p.playerId}`}
          className="a-press flex h-10 items-center justify-center gap-0.5 rounded-full border border-line text-[13px] font-semibold text-gray-100"
        >
          <span className="max-w-[70%] truncate">{name}</span> 전적 보기
          <Icon name="chevronRight" size={15} />
        </Link>
      )}
    </div>
  );
}
