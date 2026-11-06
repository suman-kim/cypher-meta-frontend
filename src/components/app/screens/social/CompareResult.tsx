"use client";

/**
 * 앱 플레이어 비교 결과 (시안 10 아래쪽) — 함께한 경기 / 상대 전적 / 경기 기록.
 *
 * 웹 PlayerCompare 와 같은 GET /api/meta/history/duo 를 부르고, 처음 조회하는 플레이어의 전적 적립(pending)이나
 * 일반전 팀 확인(teamPending)이 남아 있으면 몇 초마다 다시 불러와 채운다(최대 MAX_POLLS 회).
 * 요약 타일(같은 팀으로 N판 · 상대 팀으로 N판) 아래에 서버가 만든 지표 막대(middle)를 끼워 넣고, 그 아래에 경기 기록을 둔다.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getJSON } from "@/lib/api-client";
import type { DuoGameType, DuoMatch, DuoPlayer, DuoRelation, DuoResult, DuoSide } from "@/lib/duo";
import { formatMatchListDate } from "@/lib/format";
import { Icon } from "../../icons";
import { CharImg, Segmented, Skel, StateBox, UltBadge, wrClass } from "../../ui";
import { Notice, Spinner } from "./social-ui";

/** 자동 다시 불러오기 간격(ms)·최대 횟수 (웹과 같음) */
const POLL_MS = 4000;
const MAX_POLLS = 15;
/** 경기 기록을 한 번에 보여 줄 수 */
const PAGE = 15;

/** 경기 기록 칸 (팀 확인 대기 경기는 판별되면 들어간다) */
type ListTab = Exclude<DuoRelation, "checking">;

/**
 * @param a 플레이어 A
 * @param b 플레이어 B
 * @param gameType 비교 기준 (전체/공식전/일반전)
 * @param middle 요약 타일과 경기 기록 사이에 넣을 요소 (지표 막대)
 */
export default function CompareResult({
  a,
  b,
  gameType,
  middle,
}: {
  a: DuoPlayer;
  b: DuoPlayer;
  gameType: DuoGameType;
  middle?: ReactNode;
}) {
  const [data, setData] = useState<DuoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ListTab>("together");
  const [shown, setShown] = useState(PAGE);
  const polls = useRef(0);
  // 첫 결과에서 한 번만 판수가 있는 칸으로 맞춘다(그 뒤로는 사용자가 고른 칸 유지)
  const autoTabbed = useRef(false);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ a: a.playerId, b: b.playerId, gameType, an: a.nickname, bn: b.nickname });
    try {
      const d = await getJSON<DuoResult>(`/api/meta/history/duo?${q.toString()}`);
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message || "비교 결과를 불러오지 못했어요.");
    }
  }, [a.playerId, a.nickname, b.playerId, b.nickname, gameType]);

  // 기준·대상이 바뀌면 처음부터
  useEffect(() => {
    setData(null);
    setShown(PAGE);
    polls.current = 0;
    autoTabbed.current = false;
    load();
  }, [load]);

  // 적립·팀 확인이 남아 있으면 자동으로 다시
  const working = !!data && (data.a.pending || data.b.pending || data.teamPending > 0);
  useEffect(() => {
    if (!working || polls.current >= MAX_POLLS) return;
    const t = setTimeout(() => {
      polls.current += 1;
      load();
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [working, data, load]);

  // 첫 결과(적립 끝)가 나오면 판수가 있는 칸으로 한 번 맞춘다
  useEffect(() => {
    if (!data || autoTabbed.current || data.a.pending || data.b.pending) return;
    autoTabbed.current = true;
    setTab(data.together.games === 0 && data.opponents.games > 0 ? "opponent" : "together");
  }, [data]);

  if (error && !data) {
    return (
      <>
        <StateBox
          kind="error"
          title="비교 결과를 불러오지 못했어요"
          desc={error}
          action={
            <button
              type="button"
              onClick={() => {
                setError(null);
                load();
              }}
              className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
            >
              <Icon name="refresh" size={15} />
              다시 시도
            </button>
          }
        />
        {middle}
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="grid grid-cols-2 gap-2.5" aria-busy="true">
          <Skel className="h-[104px] rounded-[20px]" />
          <Skel className="h-[104px] rounded-[20px]" />
        </div>
        {middle}
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <Skel key={i} className="h-[64px] rounded-[14px]" />
          ))}
        </div>
      </>
    );
  }

  const collecting = data.a.pending || data.b.pending;
  const t = data.together;
  const o = data.opponents;
  const list = data.matches.filter((m) => m.relation === tab);
  const tabs: { key: ListTab; label: string }[] = [
    { key: "together", label: `함께한 경기 ${t.games}` },
    { key: "opponent", label: `상대 전적 ${o.games}` },
    ...(data.unknown > 0 ? [{ key: "unknown" as const, label: `판별 불가 ${data.unknown}` }] : []),
  ];

  return (
    <>
      {working && polls.current < MAX_POLLS && (
        <Notice icon="clock" tone="ac">
          <span className="flex items-center gap-2">
            <Spinner size={13} />
            {collecting
              ? "처음 조회하는 플레이어의 전적을 모으는 중이에요. 잠시 뒤 자동으로 채워져요."
              : `일반전 ${data.teamPending}판의 팀 구성을 확인하는 중이에요.`}
          </span>
        </Notice>
      )}

      {/* 요약 — 같은 팀으로 / 상대 팀으로 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="a-card grid content-start gap-1 p-4">
          <span className="text-xs text-gray-500">같은 팀으로</span>
          <span className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-gray-50 tabular-nums">{t.games.toLocaleString()}판</span>
          <span className="text-xs text-gray-500">
            {t.decided > 0 && t.winRate != null ? (
              <>
                승률 <b className={wrClass(t.winRate)}>{t.winRate}%</b> · {t.wins}승 {t.losses}패
              </>
            ) : t.games > 0 ? (
              "일반전은 승패 정보가 없어요"
            ) : (
              "같은 팀으로 뛴 기록이 없어요"
            )}
          </span>
        </div>
        <div className="a-card grid content-start gap-1 p-4">
          <span className="text-xs text-gray-500">상대 팀으로</span>
          <span className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-gray-50 tabular-nums">{o.games.toLocaleString()}판</span>
          <span className="text-xs text-gray-500">
            {o.decided > 0 ? (
              <>
                <b className="text-primary">{o.aWins}승</b> : <b className="text-app-loss-tx">{o.bWins}승</b>
                <span className="block truncate text-[11px]">
                  {a.nickname} 대 {b.nickname}
                </span>
              </>
            ) : o.games > 0 ? (
              "일반전은 승패 정보가 없어 판수만 보여 줘요"
            ) : (
              "상대 팀으로 만난 기록이 없어요"
            )}
          </span>
        </div>
      </div>

      {middle}

      {/* 경기 기록 */}
      <section className="grid gap-2.5" aria-label="경기 기록">
        <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-gray-100">경기 기록</h2>
        <Segmented
          size="sm"
          items={tabs}
          value={tab}
          onChange={(k) => {
            setTab(k as ListTab);
            setShown(PAGE);
          }}
        />
        {list.length === 0 ? (
          <StateBox
            icon="users"
            title={
              collecting
                ? "전적을 모으는 중이에요"
                : tab === "together"
                  ? "같은 팀으로 뛴 경기가 없어요"
                  : tab === "opponent"
                    ? "상대 팀으로 만난 경기가 없어요"
                    : "판별 불가 경기가 없어요"
            }
            desc={collecting ? "잠시 뒤 자동으로 채워져요." : "두 플레이어의 누적 전적에서 찾은 결과예요."}
          />
        ) : (
          <div className="grid gap-2">
            {list.slice(0, shown).map((m) => (
              <DuoRow key={m.matchId} m={m} />
            ))}
            {list.length > shown && (
              <button
                type="button"
                onClick={() => setShown((s) => s + PAGE)}
                className="a-press h-11 rounded-[14px] border border-line bg-surface text-sm font-bold text-gray-200"
              >
                더 보기 <span className="font-semibold text-gray-500">· {list.length - shown}경기 남음</span>
              </button>
            )}
          </div>
        )}
        <p className="px-1 text-[11px] leading-relaxed text-gray-500">
          두 플레이어의 누적 전적에서 같은 경기를 찾아 같은 팀·상대 팀으로 나눴어요. 처음 조회하는 플레이어는 이번 시즌 경기부터 쌓여요.
          일반전은 게임 API 가 승패를 주지 않아 같은 팀·상대만 보여 주고, 지난 시즌 일반전은 팀을 확인할 수 없어 &lsquo;판별 불가&rsquo;로 둬요.
        </p>
      </section>
    </>
  );
}

/**
 * 경기 한 줄 — 결과·종류·날짜 + 두 플레이어의 캐릭터·승패·KDA. 누르면 매치 상세.
 * @param m 경기
 */
function DuoRow({ m }: { m: DuoMatch }) {
  const rating = m.gameTypeId === "rating";
  const teamResult = m.relation === "together" ? m.a.result : null;
  return (
    <Link href={`/matches/${m.matchId}`} className="a-tile a-press flex items-center gap-2.5 px-3 py-2.5">
      <span className="grid w-[50px] shrink-0 gap-0.5">
        {teamResult && (
          <span className={`text-[11px] font-extrabold ${teamResult === "win" ? "text-app-win-tx" : "text-app-loss-tx"}`}>
            {teamResult === "win" ? "승리" : "패배"}
          </span>
        )}
        <span className={`text-[10px] font-bold ${rating ? "text-primary" : "text-gray-500"}`}>{rating ? "공식전" : "일반전"}</span>
        <span className="truncate text-[10px] text-gray-500" suppressHydrationWarning>
          {formatMatchListDate(m.playedAt ?? undefined)}
        </span>
      </span>
      {m.relation === "together" ? (
        <span className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <Side s={m.a} tag="a" />
          <Side s={m.b} tag="b" />
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <Side s={m.a} tag="a" />
          <span
            className={`grid h-6 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-extrabold ${
              m.relation === "opponent" ? "bg-app-loss-bg text-app-loss-tx" : "bg-surface-2 text-gray-500"
            }`}
            aria-label={m.relation === "opponent" ? "상대 팀" : "팀 판별 불가"}
          >
            {m.relation === "opponent" ? "VS" : "?"}
          </span>
          <Side s={m.b} tag="b" right />
        </span>
      )}
    </Link>
  );
}

/**
 * 경기 속 한 플레이어 — 캐릭터(A/B 표시·2차 궁극기)·이름·승패·KDA.
 * @param s 기록
 * @param tag 플레이어 A / B
 * @param right 오른쪽 정렬(상대 전적의 B)
 */
function Side({ s, tag, right = false }: { s: DuoSide; tag: "a" | "b"; right?: boolean }) {
  return (
    <span className={`flex min-w-0 flex-1 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      <span className="relative shrink-0">
        <CharImg id={s.characterId} name={s.characterName} size={34} radius={10} />
        <span
          className={`absolute -bottom-1 grid h-4 w-4 place-items-center rounded-[5px] text-[9px] font-extrabold ring-2 ring-surface ${
            right ? "-left-1" : "-right-1"
          } ${tag === "a" ? "a-grad" : "bg-app-live text-white"}`}
          aria-label={tag === "a" ? "플레이어 A" : "플레이어 B"}
        >
          {tag === "a" ? "A" : "B"}
        </span>
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className={`flex min-w-0 items-center gap-1 ${right ? "flex-row-reverse" : ""}`}>
          <span className="truncate text-[13px] font-bold text-gray-100">{s.characterName ?? "-"}</span>
          {s.ultimateType === "2nd" && <UltBadge label="2차" />}
        </span>
        {s.result && (
          <span className={`flex items-center gap-1 text-[11px] text-gray-500 ${right ? "flex-row-reverse" : ""}`}>
            <span className={`font-extrabold ${s.result === "win" ? "text-app-win-tx" : "text-app-loss-tx"}`}>
              {s.result === "win" ? "승" : "패"}
            </span>
            <span className="tabular-nums">
              {s.kill}/{s.death}/{s.assist}
            </span>
          </span>
        )}
      </span>
    </span>
  );
}
