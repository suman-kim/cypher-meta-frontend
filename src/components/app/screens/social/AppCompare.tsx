/**
 * 앱 플레이어 비교 화면 (시안 10).
 *
 * - 두 닉네임이 다 없으면 입력 화면(CompareInput). 플레이어 화면에서 ?a=닉네임 으로 오면 A 가 채워져 있다.
 * - 결과: 두 플레이어 카드(대표 캐릭터·닉네임·RP) vs → 상대 바꾸기 칩(즐겨찾기·최근 검색)
 *   → 비교 기준(전체·공식전·일반전) → 같은 팀으로 N판(승률) · 상대 팀으로 N판(전적)
 *   → RP·승률·KDA·평균 딜 비교 막대 → 경기 기록.
 * - 함께한 경기·상대 전적은 웹 PlayerCompare 와 같은 duo API(클라이언트, CompareResult),
 *   지표 막대는 서버에서 최근 공식전으로 계산한다(compare-stats).
 */
import Link from "next/link";
import { DUO_GAME_TYPES, type DuoGameType, type DuoPlayer } from "@/lib/duo";
import { AppTopBar, TopIconButton } from "../../AppChrome";
import { AppPage, Badge, CharImg, GhostLink, Segmented, StateBox, tierKo } from "../../ui";
import { COMPARE_RECENT, loadCompareStats, type CompareStats } from "./compare-stats";
import { CompareInput, CompareSwitch } from "./CompareInput";
import CompareResult from "./CompareResult";
import { compactNum, compareHref } from "./social-ui";

/** 앱 비교 화면이 받는 데이터 */
export interface AppCompareProps {
  /** 주소의 플레이어 A 닉네임 (없으면 "") */
  na: string;
  /** 주소의 플레이어 B 닉네임 (없으면 "") */
  nb: string;
  /** 비교 기준 */
  gt: DuoGameType;
  /** 닉네임으로 찾은 A (입력 화면이거나 못 찾으면 undefined) */
  a?: DuoPlayer;
  /** 닉네임으로 찾은 B */
  b?: DuoPlayer;
  /** 조회 오류 안내 (없으면 null) */
  errorMsg?: string | null;
}

/**
 * @param props AppCompareProps
 */
export default async function AppCompare({ na, nb, gt, a, b, errorMsg }: AppCompareProps) {
  const ready = !!(na && nb && !errorMsg && a && b && a.playerId !== b.playerId);
  const title = "플레이어 비교";

  // 입력 화면 — 닉네임이 다 없을 때
  if (!na || !nb) {
    return (
      <>
        <AppTopBar title={title} backHref="/more" />
        <AppPage className="!gap-4">
          <div className="grid gap-1 px-0.5">
            <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-gray-50">두 플레이어를 비교해요</h1>
            <p className="text-xs leading-relaxed text-gray-500">같은 팀으로 함께한 경기와 서로 맞붙은 전적, RP·승률·KDA를 한눈에 봐요.</p>
          </div>
          <CompareInput key={`${na}|${nb}`} defaultA={na} defaultB={nb} gameType={gt} />
          <CompareGuide />
        </AppPage>
      </>
    );
  }

  // 결과 화면이 아닐 때(오류·못 찾음·같은 사람) — 입력을 다시 보여 주며 이유를 알린다
  if (!ready || !a || !b) {
    const missing = [!a ? na : null, !b ? nb : null].filter(Boolean);
    return (
      <>
        <AppTopBar title={title} backHref="/more" />
        <AppPage className="!gap-4">
          {errorMsg ? (
            <StateBox kind="error" title="플레이어 정보를 불러오지 못했어요" desc={errorMsg} />
          ) : a && b && a.playerId === b.playerId ? (
            <StateBox icon="users" title="같은 플레이어예요" desc="서로 다른 두 플레이어를 넣어 주세요." />
          ) : (
            <StateBox
              icon="user"
              title="플레이어를 찾을 수 없어요"
              desc={`${missing.map((n) => `"${n}"`).join(", ")} 닉네임을 정확히 넣었는지 확인해 주세요.`}
            />
          )}
          <CompareInput key={`${na}|${nb}`} defaultA={na} defaultB={nb} gameType={gt} />
        </AppPage>
      </>
    );
  }

  const [sa, sb] = await Promise.all([loadCompareStats(a.playerId), loadCompareStats(b.playerId)]);

  return (
    <>
      <AppTopBar
        title={title}
        backHref="/more"
        right={
          <>
            <TopIconButton icon="swap" label="A와 B 맞바꾸기" href={compareHref(b.nickname, a.nickname, gt)} />
            <TopIconButton icon="pen" label="다른 플레이어로 비교" href={`/players/compare?a=${encodeURIComponent(a.nickname)}`} />
          </>
        }
      />
      <AppPage className="!gap-4">
        {/* A vs B */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <PlayerHead p={a} s={sa} tag="a" />
          <span className="text-sm font-extrabold italic text-gray-500">vs</span>
          <PlayerHead p={b} s={sb} tag="b" />
        </div>

        <CompareSwitch a={a.nickname} b={b.nickname} gameType={gt} />

        <Segmented
          size="sm"
          items={DUO_GAME_TYPES.map((t) => ({ key: t.key, label: t.label, href: compareHref(a.nickname, b.nickname, t.key) }))}
          value={gt}
        />

        <CompareResult a={a} b={b} gameType={gt} middle={<StatBars a={a} b={b} sa={sa} sb={sb} />} />
      </AppPage>
    </>
  );
}

/**
 * 머리 카드 한 장 — 대표 캐릭터·닉네임·RP. 누르면 전적 화면.
 * @param p 플레이어
 * @param s 비교 지표 (RP·티어)
 * @param tag a | b
 */
function PlayerHead({ p, s, tag }: { p: DuoPlayer; s: CompareStats; tag: "a" | "b" }) {
  const tier = tierKo(s.tierName);
  return (
    <Link href={`/players/${p.playerId}`} className="a-card a-press grid min-w-0 justify-items-center gap-1.5 px-2 py-4 text-center">
      <span className="relative">
        <CharImg id={p.representId} name={p.representName ?? p.nickname} size={60} radius={30} zoom={2} />
        <span
          className={`absolute -bottom-1 left-1/2 grid h-5 min-w-5 -translate-x-1/2 place-items-center rounded-md px-1 text-[10px] font-extrabold ring-2 ring-surface ${
            tag === "a" ? "a-grad" : "bg-app-live text-white"
          }`}
        >
          {tag === "a" ? "A" : "B"}
        </span>
      </span>
      <span className="mt-1 w-full truncate text-base font-extrabold text-gray-50">{p.nickname}</span>
      <span className="text-[13px] font-bold text-primary tabular-nums">{s.rp ? `${s.rp.toLocaleString()} RP` : "RP 없음"}</span>
      {tier && <Badge tone="soft">{tier}</Badge>}
    </Link>
  );
}

/** 지표 막대 한 줄 정의 */
interface StatRow {
  /** 지표 이름 */
  label: string;
  /** A 값 (모르면 null) */
  a: number | null;
  /** B 값 (모르면 null) */
  b: number | null;
  /** 값 표시 형식 */
  fmt: (v: number) => string;
}

/**
 * RP · 승률 · KDA · 평균 딜 비교 막대 — 더 높은 쪽을 강조색으로.
 * @param a 플레이어 A
 * @param b 플레이어 B
 * @param sa A 지표
 * @param sb B 지표
 */
function StatBars({ a, b, sa, sb }: { a: DuoPlayer; b: DuoPlayer; sa: CompareStats; sb: CompareStats }) {
  const rows: StatRow[] = [
    { label: "RP", a: sa.rp, b: sb.rp, fmt: (v) => v.toLocaleString() },
    { label: "승률", a: sa.winRate, b: sb.winRate, fmt: (v) => `${Math.round(v)}%` },
    { label: "KDA", a: sa.kda, b: sb.kda, fmt: (v) => v.toFixed(2) },
    { label: "평균 딜", a: sa.avgDamage, b: sb.avgDamage, fmt: (v) => compactNum(v) },
  ];
  const noData = rows.every((r) => r.a === null && r.b === null);
  return (
    <section className="a-card grid gap-3.5 p-4" aria-label="지표 비교">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate font-bold text-primary">{a.nickname}</span>
        <span className="shrink-0 text-gray-500">RP 외 최근 공식전 {COMPARE_RECENT}판 기준</span>
        <span className="truncate text-right font-bold text-app-loss-tx">{b.nickname}</span>
      </div>
      {noData ? (
        <p className="py-2 text-center text-xs text-gray-500">두 플레이어 모두 최근 공식전 기록이 없어요.</p>
      ) : (
        rows.map((r) => <Bar key={r.label} row={r} />)
      )}
    </section>
  );
}

/**
 * 비교 막대 한 줄 — 가운데 지표 이름, 양쪽 값, 가운데에서 바깥으로 자라는 막대.
 * @param row 지표 한 줄
 */
function Bar({ row }: { row: StatRow }) {
  const max = Math.max(row.a ?? 0, row.b ?? 0);
  const pct = (v: number | null) => (v !== null && max > 0 ? Math.max(4, Math.round((v / max) * 100)) : 0);
  const aWin = row.a !== null && row.b !== null && row.a > row.b;
  const bWin = row.a !== null && row.b !== null && row.b > row.a;
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2">
        <span className={`text-[15px] font-extrabold tabular-nums ${aWin ? "text-gray-50" : "text-gray-500"}`}>
          {row.a !== null ? row.fmt(row.a) : "-"}
        </span>
        <span className="text-[11px] text-gray-500">{row.label}</span>
        <span className={`text-right text-[15px] font-extrabold tabular-nums ${bWin ? "text-gray-50" : "text-gray-500"}`}>
          {row.b !== null ? row.fmt(row.b) : "-"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <span className="flex h-1.5 justify-end overflow-hidden rounded-full bg-surface-2">
          <span className={`h-full rounded-full ${aWin ? "a-grad" : "bg-gray-500/50"}`} style={{ width: `${pct(row.a)}%` }} />
        </span>
        <span className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
          <span className={`h-full rounded-full ${bWin ? "bg-app-live" : "bg-gray-500/50"}`} style={{ width: `${pct(row.b)}%` }} />
        </span>
      </div>
    </div>
  );
}

/** 입력 전 안내 — 비교로 볼 수 있는 것 */
const GUIDE = [
  { title: "함께한 경기", desc: "같은 팀으로 뛴 경기 수와 함께할 때의 공식전 승률" },
  { title: "상대 전적", desc: "서로 맞붙었을 때 누가 더 많이 이겼는지 스코어로" },
  { title: "지표 비교", desc: `RP와 최근 공식전 ${COMPARE_RECENT}판의 승률·KDA·평균 딜` },
  { title: "경기 기록", desc: "판마다 고른 캐릭터와 KDA, 누르면 매치 상세로" },
];

/** 입력 전 안내 카드 */
function CompareGuide() {
  return (
    <div className="a-card grid gap-3 p-4">
      <p className="text-[13px] font-bold text-gray-200">비교로 볼 수 있어요</p>
      {GUIDE.map((g, i) => (
        <div key={g.title} className="flex items-start gap-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-app-ac-soft text-[11px] font-extrabold text-app-ac-tx">
            {i + 1}
          </span>
          <span className="grid gap-0.5">
            <span className="text-sm font-bold text-gray-100">{g.title}</span>
            <span className="text-xs leading-relaxed text-gray-500">{g.desc}</span>
          </span>
        </div>
      ))}
      <div>
        <GhostLink href="/search" icon="search">
          닉네임 검색하러 가기
        </GhostLink>
      </div>
    </div>
  );
}
