import Link from "next/link";
import {
  getCharacterMeta,
  getMetaSummary,
  withTiers,
  groupByTier,
  TIER_ORDER,
  TIER_META,
  TIER_BASIS_LABEL,
  type TierBasis,
  type CharacterMeta,
  type MetaSummary,
} from "@/lib/meta";
import { Avatar } from "@/components/CharacterAvatar";
import MetaTable from "@/components/MetaTable";
import { EmptyState, ErrorState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "메타 통계" };

const GAME_TABS = [
  { key: "", label: "전체" },
  { key: "rating", label: "공식전" },
  { key: "normal", label: "일반전" },
] as const;

const BASIS_TABS: { key: TierBasis; label: string }[] = [
  { key: "score", label: "종합" },
  { key: "win", label: "승률" },
  { key: "pick", label: "픽률" },
];

/** gameType·tierBy 를 함께 유지하는 /meta URL 생성 (기본값은 생략) */
function metaHref(gameType: string, tierBy: TierBasis): string {
  const p: string[] = [];
  if (gameType) p.push(`gameType=${gameType}`);
  if (tierBy !== "score") p.push(`tierBy=${tierBy}`);
  return p.length ? `/meta?${p.join("&")}` : "/meta";
}

interface Props {
  searchParams: { gameType?: string; tierBy?: string };
}

export default async function MetaPage({ searchParams }: Props) {
  const gameType = GAME_TABS.some((t) => t.key === searchParams.gameType)
    ? (searchParams.gameType as string)
    : "";
  const tierBy: TierBasis = BASIS_TABS.some((b) => b.key === searchParams.tierBy)
    ? (searchParams.tierBy as TierBasis)
    : "score";

  let rows: CharacterMeta[] = [];
  let summary: MetaSummary | null = null;
  let failed = false;
  try {
    [rows, summary] = await Promise.all([
      getCharacterMeta(gameType || undefined),
      getMetaSummary(),
    ]);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <ErrorState
        message="메타 데이터를 불러오지 못했습니다."
        hint="백엔드 서버(:4000)가 실행 중인지 확인하세요."
      />
    );
  }

  const tiered = withTiers(rows, tierBy);
  const grouped = groupByTier(tiered);
  const activeTiers = TIER_ORDER.filter((t) => grouped[t].length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-50">메타 통계</h1>
        <p className="mt-1 text-sm text-gray-500">
          상위 랭커의 매치를 수집·집계한 캐릭터 통계입니다. 픽률은 판 기준 등장률, 티어는 점수 상대 평가입니다.
        </p>
      </div>

      {/* 요약 칩 */}
      {summary && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="chip bg-surface-2 text-gray-300">
            표본 매치 {summary.matches.toLocaleString()}
          </span>
          <span className="chip bg-surface-2 text-gray-300">
            플레이어 기록 {summary.playerRecords.toLocaleString()}
          </span>
          <span className="chip bg-surface-2 text-gray-300">캐릭터 {summary.characters}종</span>
          {summary.lastCollect?.lastRun && (
            <span className="chip bg-surface-2 text-gray-500">
              최근 수집 {new Date(summary.lastCollect.lastRun).toLocaleString("ko-KR")}
            </span>
          )}
        </div>
      )}

      {/* 게임 타입 세그먼트 탭 */}
      <div className="inline-flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
        {GAME_TABS.map((t) => {
          const active = t.key === gameType;
          return (
            <Link
              key={t.key}
              href={metaHref(t.key, tierBy)}
              className={`segtab ${active ? "segtab-active" : ""}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="아직 수집된 데이터가 없습니다"
          description="백엔드에서 수집을 먼저 실행하세요 → POST /api/meta/collect?rankers=20&perPlayer=10"
          icon="📊"
        />
      ) : (
        <>
          {/* 티어 리스트 */}
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-gray-100">티어 리스트</h2>
                <span className="text-xs text-gray-500">
                  {TIER_BASIS_LABEL[tierBy]} 기준 상대 평가 · 상위 10% S / 25% A / 50% B / 80% C
                </span>
              </div>
              {/* 티어 기준 선택 */}
              <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
                <span className="px-1.5 text-xs font-medium text-gray-500">기준</span>
                {BASIS_TABS.map((b) => (
                  <Link
                    key={b.key}
                    href={metaHref(gameType, b.key)}
                    className={`segtab text-xs ${b.key === tierBy ? "segtab-active" : ""}`}
                  >
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="card divide-y divide-line">
              {activeTiers.map((t) => (
                <div key={t} className="flex items-stretch gap-3 p-3">
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-lg font-black text-white"
                    style={{ backgroundColor: TIER_META[t].color }}
                    title={TIER_META[t].desc}
                  >
                    {t}
                  </div>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {grouped[t].map((c) => (
                      <Link
                        key={c.characterId}
                        href={`/characters/${c.characterId}`}
                        className="flex w-[68px] flex-col items-center gap-1 rounded-md p-1 transition-colors hover:bg-surface-2"
                        title={`${c.characterName ?? c.characterId} · 픽률 ${c.pickRate}% · 승률 ${c.winRate}%`}
                      >
                        <Avatar characterId={c.characterId} characterName={c.characterName ?? undefined} size={44} />
                        <span className="w-full truncate text-center text-[11px] font-medium text-gray-300">
                          {c.characterName ?? c.characterId}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 상세 표 (정렬 가능) */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">캐릭터 상세</h2>
              <span className="text-xs text-gray-500">헤더를 눌러 정렬</span>
            </div>
            <MetaTable rows={tiered} />
          </section>
        </>
      )}
    </div>
  );
}
