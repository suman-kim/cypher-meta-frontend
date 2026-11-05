"use client";

/**
 * 앱 플레이어 화면의 "최근 매치" 목록.
 *
 * - 목록 불러오기 방식은 웹 PlayerMatchList 와 같다: 서버가 준 게임 타입별 최근 ~100판을 20판씩 그리고,
 *   다 그리면 Neople next 커서로 /api/players/{id}/matches 를 불러 이어 붙인다('전적 더 보기' 버튼).
 *   '전체' 보기는 공식전·일반전 흐름을 날짜순으로 합치고, 덜 받은 흐름보다 오래된 경기는 그 흐름을 더 받을 때까지 보류한다.
 * - 행 모양은 시안 03: 승리 행 bg-app-win-bg / 패배 행 bg-app-loss-bg, 캐릭터 얼굴, "승리 · 캐릭터", "공식전 · 12분 전",
 *   오른쪽 K/D/A·딜량, 펼침 화살표. 일반전은 승패를 주지 않아 승패 칸이 회색 "-".
 * - 행을 누르면 /api/matches/{id} 로 상세를 받아 요약(특이 기록·주요 숫자·아이템·양 팀 구성)을 펼치고 "매치 상세"로 이동한다.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getJSON } from "@/lib/api-client";
import { gameTypeLabel } from "@/lib/constants";
import { calcKDA, formatMatchListDate, formatNumber, formatPlayTime } from "@/lib/format";
import { buildMatchSummary } from "@/lib/match-summary";
import type { MatchDetail, MatchDetailTeam, MatchPlayInfo, MatchRow } from "@/lib/types";
import type { MatchStream } from "@/components/player/PlayerMatchList";
import { Icon } from "../../icons";
import { Badge, CharImg, Skel } from "../../ui";
import { ItemButton } from "./ItemSheet";
import { MiniStat, SubLabel } from "./parts";

/** 한 번에 더 그리는 매치 수 (웹과 같음) */
const PAGE_SIZE = 20;

/** 게임 타입을 붙인 매치 한 줄 */
interface TaggedMatch {
  /** 매치 기록 */
  match: MatchRow;
  /** rating | normal */
  gameTypeId: string;
}

/** /api/players/{id}/matches 응답 */
interface MatchesPage {
  /** 다음 페이지 매치 */
  rows?: MatchRow[];
  /** 그다음 커서 (없으면 끝) */
  next?: string | null;
}

/**
 * 흐름에서 가장 오래된 경기 시각.
 * @param s 매치 흐름
 */
function oldestDate(s: MatchStream): string | null {
  let min: string | null = null;
  for (const r of s.rows) {
    const d = r.date ?? "";
    if (min === null || d < min) min = d;
  }
  return min;
}

/**
 * 날짜순 확정을 막고 있는 흐름(커서가 남은 흐름 중 가장 최근에 끊긴 것)과 그 기준 시각.
 * @param streams 전체 흐름
 */
function frontierOf(streams: MatchStream[]): { stream: MatchStream; cutoff: string } | null {
  let best: { stream: MatchStream; cutoff: string } | null = null;
  for (const s of streams) {
    if (!s.next) continue;
    const cutoff = oldestDate(s) ?? "￿";
    if (!best || cutoff > best.cutoff) best = { stream: s, cutoff };
  }
  return best;
}

/**
 * 최근 매치 목록.
 * @param playerId 이 화면의 플레이어 ID (내 기록 강조·매치 상세 기준)
 * @param streams 서버가 처음 내려준 게임 타입별 흐름
 */
export function PlayerMatches({ playerId, streams: initial }: { playerId: string; streams: MatchStream[] }) {
  const [streams, setStreams] = useState<MatchStream[]>(initial);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // 전적 갱신으로 서버 값이 새로 오면 처음부터
  useEffect(() => {
    setStreams(initial);
    setVisible(PAGE_SIZE);
    setError(null);
  }, [initial]);

  const { safe, frontier } = useMemo(() => {
    const seen = new Set<string>();
    const all: TaggedMatch[] = [];
    for (const s of streams) {
      for (const m of s.rows) {
        const key = `${s.gameTypeId}-${m.matchId}`;
        if (!m.matchId || seen.has(key)) continue;
        seen.add(key);
        all.push({ match: m, gameTypeId: s.gameTypeId });
      }
    }
    all.sort((a, b) => (b.match.date ?? "").localeCompare(a.match.date ?? ""));
    const f = frontierOf(streams);
    return { safe: f ? all.filter((t) => (t.match.date ?? "") >= f.cutoff) : all, frontier: f };
  }, [streams]);

  const hasMore = visible < safe.length || frontier !== null;

  /** 다음 묶음 — 받아 둔 것이 남았으면 그리기만, 다 그렸으면 다음 페이지를 받는다 */
  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (visible < safe.length) {
      setVisible((v) => v + PAGE_SIZE);
      return;
    }
    if (!frontier?.stream.next) return;
    const { gameTypeId, next } = frontier.stream;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ gameTypeId, next });
      const page = await getJSON<MatchesPage>(`/api/players/${encodeURIComponent(playerId)}/matches?${q}`);
      const rows = Array.isArray(page.rows) ? page.rows : [];
      setStreams((prev) =>
        prev.map((s) =>
          s.gameTypeId === gameTypeId
            ? { ...s, rows: [...s.rows, ...rows], next: rows.length > 0 ? (page.next ?? undefined) : undefined }
            : s,
        ),
      );
      setVisible((v) => v + PAGE_SIZE);
    } catch (e) {
      setError((e as Error).message || "전적을 더 불러오지 못했어요.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [visible, safe.length, frontier, playerId]);

  const shown = safe.slice(0, visible);

  return (
    <div className="grid gap-2">
      {shown.map((m) => (
        <AppMatchRow key={`${m.gameTypeId}-${m.match.matchId}`} match={m.match} gameTypeId={m.gameTypeId} playerId={playerId} />
      ))}

      {error ? (
        <div className="grid justify-items-center gap-2 py-2 text-center">
          <p className="text-xs text-gray-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
          >
            <Icon name="refresh" size={15} />
            다시 시도
          </button>
        </div>
      ) : loading ? (
        <div className="grid gap-2" role="status" aria-label="전적을 불러오는 중">
          <Skel className="h-[62px] rounded-[14px]" />
          <Skel className="h-[62px] rounded-[14px]" />
        </div>
      ) : hasMore ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          className="a-press mt-1 h-11 rounded-full border border-line text-[13px] font-semibold text-gray-200"
        >
          전적 더 보기
        </button>
      ) : shown.length > 0 ? (
        <p className="py-2 text-center text-xs text-gray-500">
          최근 90일 기록을 모두 불러왔어요 · {shown.length.toLocaleString()}경기
        </p>
      ) : null}
    </div>
  );
}

/* ── 매치 한 줄 ─────────────────────────────── */

/**
 * K/D/A 값이 있는지 (일반전은 없다).
 * @param pi 플레이 정보
 */
function hasKda(pi: Partial<MatchPlayInfo>): boolean {
  return pi.killCount !== undefined || pi.deathCount !== undefined || pi.assistCount !== undefined;
}

/** 숫자 필드 읽기 (없으면 0) */
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

/**
 * 이 경기에서 눈에 띄는 개인 기록 (멀티킬·노데스·ACE/JOKER·MVP).
 * @param pi 플레이 정보
 * @param mvp 자체 분석 팀 MVP 여부
 */
function highlightsOf(pi: MatchPlayInfo, mvp: boolean): string[] {
  const out: string[] = [];
  if (mvp) out.push("팀 MVP");
  if (pi.aceInfo?.name === "ACE" || pi.aceInfo?.name === "JOKER") out.push(pi.aceInfo.name);
  const mk = pi.multiKillCount;
  const x = (n: number) => (n >= 2 ? ` ×${n}` : "");
  if (num(mk?.genocide) > 0) out.push(`제노사이드${x(num(mk?.genocide))}`);
  if (num(mk?.quadruple) > 0) out.push(`쿼드러플킬${x(num(mk?.quadruple))}`);
  if (num(mk?.triple) > 0) out.push(`트리플킬${x(num(mk?.triple))}`);
  if (num(mk?.double) > 0 && !num(mk?.triple) && !num(mk?.quadruple) && !num(mk?.genocide))
    out.push(`더블킬${x(num(mk?.double))}`);
  if (num(pi.deathCount) === 0 && num(pi.killCount) + num(pi.assistCount) >= 5) out.push("노데스");
  return out;
}

/**
 * 최근 매치 한 줄 (눌러서 요약 펼침).
 * @param match 매치 기록 (이 플레이어 기준)
 * @param gameTypeId rating | normal
 * @param playerId 이 화면의 플레이어 ID
 */
function AppMatchRow({ match, gameTypeId, playerId }: { match: MatchRow; gameTypeId: string; playerId: string }) {
  const p = match.playInfo;
  const known = p.result === "win" || p.result === "lose";
  const win = p.result === "win";
  const kda = hasKda(p);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  /** 상세를 받아 온다 */
  const load = async () => {
    setStatus("loading");
    try {
      const r = await fetch(`/api/matches/${encodeURIComponent(match.matchId)}`);
      if (!r.ok) throw new Error(String(r.status));
      setDetail((await r.json()) as MatchDetail);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  /** 펼치기·접기 — 처음 펼칠 때만 불러온다 */
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && status === "idle") void load();
  };

  const bg = known ? (win ? "bg-app-win-bg" : "bg-app-loss-bg") : "bg-surface";
  const resCls = known ? (win ? "text-app-win-tx" : "text-app-loss-tx") : "text-gray-500";

  return (
    <div className={`overflow-hidden rounded-[14px] border border-app-hair ${bg}`}>
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <CharImg id={p.characterId} name={p.characterName} size={42} radius={12} />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate text-[13px] font-bold text-gray-100">
            {known && (
              <>
                <span className={resCls}>{win ? "승리" : "패배"}</span> ·{" "}
              </>
            )}
            {p.characterName ?? "-"}
          </span>
          <span className="truncate text-[11px] text-gray-500" suppressHydrationWarning>
            {gameTypeLabel(gameTypeId)} · {formatMatchListDate(match.date)}
          </span>
        </span>
        <span className="grid shrink-0 justify-items-end gap-0.5">
          {kda ? (
            <>
              <span className="text-[13px] font-bold tabular-nums text-gray-100">
                {num(p.killCount)}/<span className="text-app-loss-tx">{num(p.deathCount)}</span>/{num(p.assistCount)}
              </span>
              <span className="text-[11px] tabular-nums text-gray-500">딜 {formatNumber(p.attackPoint)}</span>
            </>
          ) : (
            <>
              <span className="text-[12px] font-semibold text-gray-500">KDA 미제공</span>
              <span className="text-[11px] text-gray-500">{p.level ? `Lv.${p.level}` : formatPlayTime(p.playTime)}</span>
            </>
          )}
        </span>
        <span className={`shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <Icon name="chevronDown" size={16} />
        </span>
      </button>

      {open && (
        <div className="grid gap-3 px-3 pb-3">
          {status === "loading" && (
            <div className="grid gap-2">
              <Skel className="h-12 rounded-xl" />
              <Skel className="h-8 rounded-xl" />
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2.5">
              <span className="text-xs text-gray-300">요약을 불러오지 못했어요</span>
              <button type="button" onClick={() => void load()} className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Icon name="refresh" size={13} />
                다시 시도
              </button>
            </div>
          )}
          {status === "ready" && detail && <RowSummary detail={detail} row={match} playerId={playerId} />}
          <Link
            href={`/matches/${match.matchId}?highlight=${encodeURIComponent(playerId)}`}
            className="a-press flex h-10 items-center justify-center gap-0.5 rounded-full border border-app-hair bg-surface text-[13px] font-bold text-gray-100 shadow-[var(--a-shadow)]"
          >
            매치 상세
            <Icon name="chevronRight" size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * 펼친 행의 요약 — 특이 기록, 주요 숫자, 아이템, 양 팀 구성.
 * @param detail 매치 상세
 * @param row 목록의 매치 기록 (상세에 내 기록이 없을 때 대신 씀)
 * @param playerId 이 화면의 플레이어 ID
 */
function RowSummary({ detail, row, playerId }: { detail: MatchDetail; row: MatchRow; playerId: string }) {
  const mine = detail.teams.flatMap((t) => t.players).find((pl) => pl.playerId === playerId);
  const pi: MatchPlayInfo = mine?.playInfo ?? row.playInfo;
  const stats = hasKda(pi);
  const mvpIds = new Set(stats ? buildMatchSummary(detail, playerId).mvps.map((m) => m.playerId) : []);
  const tags = stats ? highlightsOf(pi, mvpIds.has(playerId)) : [];
  const items = (mine?.items ?? [])
    .filter((it) => it.itemId)
    .slice()
    .sort((a, b) => (a.equipSlotCode ?? "").localeCompare(b.equipSlotCode ?? ""));
  // 내 팀을 먼저
  const myIdx = detail.teams.findIndex((t) => t.players.some((pl) => pl.playerId === playerId));
  const teams = myIdx > 0 ? [detail.teams[myIdx], ...detail.teams.filter((_, i) => i !== myIdx)] : detail.teams;

  return (
    <div className="grid gap-3">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge key={t} tone={t === "팀 MVP" || t === "ACE" ? "grad" : "soft"}>
              {t}
            </Badge>
          ))}
        </div>
      )}

      {stats ? (
        <div className="grid grid-cols-3 gap-1.5">
          <MiniStat label="평점" value={calcKDA(num(pi.killCount), num(pi.deathCount), num(pi.assistCount)).toFixed(2)} tone="ac" />
          <MiniStat label="전투 점수" value={formatNumber(pi.battlePoint)} />
          <MiniStat label="가한 피해" value={formatNumber(pi.attackPoint)} />
          <MiniStat label="받은 피해" value={formatNumber(pi.damagePoint)} />
          <MiniStat label="시야" value={formatNumber(pi.sightPoint)} />
          <MiniStat label="힐량" value={formatNumber(pi.healAmount)} />
        </div>
      ) : null}
      <p className="text-xs leading-relaxed text-gray-400">
        {[
          !stats ? "일반전은 결과와 KDA가 제공되지 않아요" : null,
          pi.playTime ? `경기 시간 ${formatPlayTime(pi.playTime)}` : null,
          pi.level ? `레벨 ${pi.level}` : null,
          detail.map?.name ? `맵 ${detail.map.name}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {items.length > 0 && (
        <div className="grid gap-1.5">
          <SubLabel right="눌러서 효과 보기">최종 아이템</SubLabel>
          <div className="flex flex-wrap gap-1.5">
            {items.map((it, i) => (
              <ItemButton
                key={`${it.itemId}-${i}`}
                itemId={it.itemId}
                itemName={it.itemName}
                rarityCode={it.rarityCode}
                slotName={it.slotName}
                size={30}
              />
            ))}
          </div>
        </div>
      )}

      {teams.length >= 2 && (
        <div className="grid grid-cols-2 gap-2">
          {teams.slice(0, 2).map((t, i) => (
            <TeamMini key={t.teamId ?? i} team={t} mine={myIdx >= 0 && i === 0} other={myIdx >= 0 && i === 1} playerId={playerId} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 펼친 행 안의 팀 구성 (작은 목록, 닉네임을 누르면 그 플레이어 화면).
 * @param team 팀
 * @param mine 내 팀인지
 * @param other 상대 팀인지 (내 팀을 알 때만)
 * @param playerId 이 화면의 플레이어 ID (강조)
 */
function TeamMini({ team, mine, other, playerId }: { team: MatchDetailTeam; mine: boolean; other: boolean; playerId: string }) {
  const known = team.result === "win" || team.result === "lose";
  const name = mine ? "우리 팀" : other ? "상대 팀" : "팀";
  return (
    <div className="grid content-start gap-1 rounded-xl bg-bg p-2">
      <span className={`text-[11px] font-bold ${known ? (team.result === "win" ? "text-app-win-tx" : "text-app-loss-tx") : "text-gray-500"}`}>
        {name}
        {known ? ` · ${team.result === "win" ? "승리" : "패배"}` : ""}
      </span>
      {team.players.map((pl) => {
        const me = pl.playerId === playerId;
        return (
          <Link
            key={pl.playerId}
            href={`/players/${pl.playerId}`}
            className={`flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 ${me ? "bg-app-ac-soft" : ""}`}
          >
            <CharImg id={pl.playInfo.characterId} name={pl.playInfo.characterName} size={20} radius={6} />
            <span className={`truncate text-[11px] ${me ? "font-bold text-app-ac-tx" : "text-gray-300"}`}>
              {pl.nickname || pl.playInfo.characterName}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
