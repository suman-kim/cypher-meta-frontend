/**
 * 앱 멀티서치 화면 (시안 09).
 *
 * 구성: 상단바(뒤로 + "멀티서치") → 제목·설명 → 팀 입력(MultiForm, 클라이언트)
 *       → 결과: 팀마다 평균 묶음 카드(평균 승률·평균 RP·인원) + 플레이어 카드
 *         (대표 캐릭터·티어·RP, 최근 공식전 승률·KDA, 승패 띠, 많이 한 캐릭터 3).
 * - 데이터는 웹 멀티서치 페이지(app/players/multi/page.tsx)의 loadCard 결과를 그대로 받는다.
 *   조회가 끝날 때까지 결과 자리에 자리 표시를 보이고(Suspense 스트리밍), 끝나면 채운다.
 * - 점검(CY980)이면 카드마다 같은 오류를 띄우지 않고 한 번만 안내한다(웹과 같음).
 */
import Link from "next/link";
import { Suspense } from "react";
import { MULTI_RECENT, type MultiSummary } from "@/lib/multi";
import { NeopleApiError, neopleErrorView } from "@/lib/neople";
import type { MultiCardPlayer } from "@/components/player/MultiPlayerCard";
import { AppTopBar } from "../../AppChrome";
import { Icon } from "../../icons";
import { AppPage, Badge, CharImg, Skel, StateBox, WinLossStrip, tierKo, wrClass } from "../../ui";
import MultiForm from "./MultiForm";

/** 플레이어 1명 조회 결과 (웹 페이지 loadCard 와 같은 모양) */
export type MultiCardResult =
  | {
      /** 입력한 닉네임 */
      nickname: string;
      /** 찾음 */
      ok: true;
      /** 플레이어 정보(티어·RP·대표 캐릭터) */
      player: MultiCardPlayer;
      /** 최근 공식전 요약 */
      summary: MultiSummary;
    }
  | {
      /** 입력한 닉네임 */
      nickname: string;
      /** 못 찾음·오류 */
      ok: false;
      /** 안내 글 */
      message: string;
      /** 원래 오류 (점검 판단용) */
      error?: unknown;
    };

/** 앱 멀티서치 화면이 받는 데이터 */
export interface AppMultiProps {
  /** 내 팀 닉네임 (주소 a=) */
  a: string[];
  /** 상대 팀 닉네임 (주소 b=) */
  b: string[];
  /** [내 팀 결과, 상대 팀 결과] — 입력이 없으면 null. 화면이 기다리는 동안 자리 표시를 보인다 */
  results: Promise<[MultiCardResult[], MultiCardResult[]]> | null;
}

/**
 * @param props AppMultiProps
 */
export default function AppMulti({ a, b, results }: AppMultiProps) {
  return (
    <div className="min-h-[100dvh]" style={{ background: "radial-gradient(120% 42% at 50% -8%, var(--a-amb), transparent 70%)" }}>
      <AppTopBar title="멀티서치" backHref="/more" />
      <AppPage className="!gap-4">
        <div className="grid gap-1 px-0.5">
          <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-gray-50">
            두 팀 전적을
            <br />
            한 화면에서
          </h1>
          <p className="text-xs leading-relaxed text-gray-500">
            닉네임을 넣고 Enter나 쉼표로 추가하세요. 여러 명을 붙여 넣어도 돼요. 5명을 다 채우지 않아도 돼요.
          </p>
        </div>

        {/* 주소(팀 구성)가 바뀌면(뒤로 가기 등) 입력도 그 주소 값으로 다시 시작한다 */}
        <MultiForm key={[...a, "|", ...b].join(",")} defaultA={a} defaultB={b} />

        {/* 검색 뒤 이 자리로 내려온다(상단바에 가리지 않게 여백) */}
        <div id="multi-result" className="-mb-4 scroll-mt-20" aria-hidden="true" />

        {results ? (
          <Suspense key={[...a, "|", ...b].join(",")} fallback={<MultiSkeleton a={a.length} b={b.length} />}>
            <MultiResults results={results} />
          </Suspense>
        ) : (
          <MultiGuide />
        )}
      </AppPage>
    </div>
  );
}

/**
 * 결과 — 조회가 끝나면 팀별 묶음을 그린다.
 * @param results 팀별 조회 결과 Promise
 */
async function MultiResults({ results }: { results: Promise<[MultiCardResult[], MultiCardResult[]]> }) {
  const [ca, cb] = await results;
  const maintenance = [...ca, ...cb].find((c) => !c.ok && c.error instanceof NeopleApiError && c.error.code === "CY980");
  if (maintenance && !maintenance.ok) {
    return (
      <StateBox
        kind="error"
        icon="clock"
        title="사이퍼즈 서버 점검 중이에요"
        desc="정기 점검은 보통 목요일 오전에 진행돼요. 점검 중에도 캐릭터 티어·커뮤니티는 볼 수 있어요."
        action={
          <Link
            href="/meta"
            className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
          >
            캐릭터 티어 보기
          </Link>
        }
      />
    );
  }
  return (
    <div className="grid gap-5">
      {ca.length > 0 && <TeamBlock team="a" cards={ca} />}
      {cb.length > 0 && <TeamBlock team="b" cards={cb} />}
      <p className="px-1 text-[11px] text-gray-500">플레이어마다 최근 공식전 {MULTI_RECENT}판 기준이에요. 카드를 누르면 전적 화면으로 가요.</p>
    </div>
  );
}

/**
 * 팀 묶음 — 평균 카드 + 플레이어 카드들.
 * @param team a 내 팀 / b 상대 팀
 * @param cards 조회 결과
 */
function TeamBlock({ team, cards }: { team: "a" | "b"; cards: MultiCardResult[] }) {
  const isA = team === "a";
  const found = cards.flatMap((c) => (c.ok ? [c] : []));
  const rates = found.flatMap((c) => (c.summary.winRate != null ? [c.summary.winRate] : []));
  const avgWr = rates.length ? Math.round(rates.reduce((n, r) => n + r, 0) / rates.length) : null;
  const rps = found.flatMap((c) => (c.player.ratingPoint ? [c.player.ratingPoint] : []));
  const avgRp = rps.length ? Math.round(rps.reduce((n, r) => n + r, 0) / rps.length) : null;

  return (
    <section className="grid gap-2.5" aria-label={isA ? "내 팀 결과" : "상대 팀 결과"}>
      <div className={`flex items-center gap-3 rounded-[20px] px-4 py-3.5 ${isA ? "bg-app-ac-soft" : "bg-app-loss-bg"}`}>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className={`text-[17px] font-extrabold ${isA ? "text-app-ac-tx" : "text-app-loss-tx"}`}>{isA ? "내 팀" : "상대 팀"}</span>
          <span className="text-xs text-gray-500 tabular-nums">
            {avgRp !== null ? `평균 ${avgRp.toLocaleString()} RP · ` : ""}
            {cards.length}명{found.length < cards.length ? ` (찾은 ${found.length}명)` : ""}
          </span>
        </div>
        <div className="grid shrink-0 justify-items-end">
          <span className={`text-[28px] font-extrabold leading-none tabular-nums ${avgWr !== null ? wrClass(avgWr) : "text-gray-500"}`}>
            {avgWr !== null ? `${avgWr}%` : "-"}
          </span>
          <span className="mt-1 text-[11px] text-gray-500">팀 평균 승률</span>
        </div>
      </div>
      {cards.map((c) => (c.ok ? <PlayerCard key={c.player.playerId} c={c} /> : <MissingCard key={c.nickname} c={c} />))}
    </section>
  );
}

/**
 * 플레이어 카드 — 누르면 전적 화면.
 * @param c 찾은 플레이어 결과
 */
function PlayerCard({ c }: { c: Extract<MultiCardResult, { ok: true }> }) {
  const { player: p, summary: s } = c;
  const tier = tierKo(p.tierName);
  return (
    <Link href={`/players/${p.playerId}`} className="a-card a-press grid gap-3 p-3.5">
      <span className="flex items-center gap-3">
        <CharImg id={p.representId} name={p.representName ?? p.nickname} size={48} radius={14} zoom={2} />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-base font-extrabold text-gray-50">{p.nickname}</span>
            {tier && <Badge tone="soft">{tier}</Badge>}
          </span>
          <span className="truncate text-xs text-gray-500">{p.representName ? `대표 캐릭터 ${p.representName}` : "대표 캐릭터 없음"}</span>
        </span>
        <span className="grid shrink-0 justify-items-end">
          <span className="text-xl font-extrabold leading-none tracking-[-0.02em] text-primary tabular-nums">
            {p.ratingPoint ? p.ratingPoint.toLocaleString() : "-"}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-gray-500">RP</span>
        </span>
      </span>

      {s.games > 0 ? (
        <>
          <span className="grid grid-cols-2 gap-2">
            <span className="grid gap-0.5 rounded-[14px] bg-surface-2 px-3 py-2.5">
              <span className="text-[11px] text-gray-500">최근 {s.games}판 승률</span>
              <span className={`text-lg font-extrabold leading-tight tabular-nums ${wrClass(s.winRate)}`}>
                {s.winRate !== null ? `${s.winRate}%` : "-"}
                <span className="ml-1.5 text-[11px] font-semibold text-gray-500">
                  {s.wins}승 {s.losses}패
                </span>
              </span>
            </span>
            <span className="grid gap-0.5 rounded-[14px] bg-surface-2 px-3 py-2.5">
              <span className="text-[11px] text-gray-500">최근 KDA</span>
              <span className="text-lg font-extrabold leading-tight text-gray-100 tabular-nums">
                {s.kda !== null ? s.kda.toFixed(2) : "-"}
                <span className="ml-1.5 text-[11px] font-semibold text-gray-500">
                  {s.avgKill}/{s.avgDeath}/{s.avgAssist}
                </span>
              </span>
            </span>
          </span>

          <WinLossStrip results={s.form} />

          {s.characters.length > 0 && (
            <span className="grid grid-cols-3 gap-1.5">
              {s.characters.map((ch) => (
                <span key={ch.characterId} className="flex min-w-0 items-center gap-1.5 rounded-[12px] bg-surface-2 p-1.5 pr-2">
                  <CharImg id={ch.characterId} name={ch.characterName} size={28} radius={8} />
                  <span className="grid min-w-0 leading-tight">
                    <span className="truncate text-[11.5px] font-bold text-gray-100">{ch.characterName}</span>
                    <span className="text-[10.5px] tabular-nums text-gray-500">
                      {ch.games}판 <span className={`font-bold ${wrClass(ch.winRate)}`}>{ch.winRate}%</span>
                    </span>
                  </span>
                </span>
              ))}
            </span>
          )}
        </>
      ) : (
        <span className="text-xs text-gray-500">최근 {MULTI_RECENT}판 안에 공식전 기록이 없어요.</span>
      )}
    </Link>
  );
}

/**
 * 찾지 못한 닉네임·오류 카드 — 검색 화면으로 이어 준다.
 * @param c 실패 결과
 */
function MissingCard({ c }: { c: Extract<MultiCardResult, { ok: false }> }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-dashed border-line px-4 py-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-gray-500">
        <Icon name="user" size={18} />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-[15px] font-bold text-gray-300">{c.nickname}</span>
        <span className="text-xs text-gray-500">{c.message}</span>
      </span>
      <Link
        href={`/search?nickname=${encodeURIComponent(c.nickname)}`}
        className="a-press shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-gray-200"
      >
        검색해 보기
      </Link>
    </div>
  );
}

/** 입력 전 안내 — 멀티서치로 볼 수 있는 것 */
const GUIDE = [
  { title: "팀 단위로 한 번에", desc: "내 팀·상대 팀 닉네임을 최대 5명씩, 원하는 만큼만 넣어요" },
  { title: "최근 전적 요약", desc: `티어·RP, 최근 공식전 ${MULTI_RECENT}판 승률과 KDA, 최근 10판 흐름` },
  { title: "주력 캐릭터", desc: "요즘 많이 쓰는 캐릭터 3개와 캐릭터별 승률" },
];

/** 입력 전 안내 카드 */
function MultiGuide() {
  return (
    <div className="a-card grid gap-3 p-4">
      <p className="text-[13px] font-bold text-gray-200">멀티서치로 볼 수 있어요</p>
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
    </div>
  );
}

/**
 * 결과 자리 표시 — 넣은 인원만큼 카드 자리.
 * @param a 내 팀 인원
 * @param b 상대 팀 인원
 */
function MultiSkeleton({ a, b }: { a: number; b: number }) {
  const col = (n: number, key: string) => (
    <div key={key} className="grid gap-2.5">
      <Skel className="h-[68px] rounded-[20px]" />
      {Array.from({ length: n }, (_, i) => (
        <Skel key={i} className="h-[210px] rounded-[20px]" />
      ))}
    </div>
  );
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="전적을 불러오는 중">
      <p className="flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-primary" aria-hidden="true" />
        {a + b}명의 최근 전적을 불러오는 중이에요
      </p>
      {a > 0 && col(a, "a")}
      {b > 0 && col(b, "b")}
    </div>
  );
}
