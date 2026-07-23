import Link from "next/link";
import { getCharacterMeta, getMetaSummary, type CharacterMeta, type MetaSummary } from "@/lib/meta";
import { Avatar } from "@/components/CharacterAvatar";
import { EmptyState, ErrorState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "메타 통계" };

export default async function MetaPage() {
  let rows: CharacterMeta[] = [];
  let summary: MetaSummary | null = null;
  let failed = false;
  try {
    [rows, summary] = await Promise.all([getCharacterMeta(), getMetaSummary()]);
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-50">메타 통계</h1>
        <p className="mt-1 text-sm text-gray-500">
          상위 랭커의 매치를 수집·집계한 캐릭터 픽률·승률·KDA입니다.
        </p>
      </div>

      {summary && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="chip bg-surface-2 text-gray-300">표본 매치 {summary.matches.toLocaleString()}</span>
          <span className="chip bg-surface-2 text-gray-300">플레이어 기록 {summary.playerRecords.toLocaleString()}</span>
          <span className="chip bg-surface-2 text-gray-300">캐릭터 {summary.characters}종</span>
          {summary.lastCollect?.lastRun && (
            <span className="chip bg-surface-2 text-gray-500">
              최근 수집 {new Date(summary.lastCollect.lastRun).toLocaleString("ko-KR")}
            </span>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="아직 수집된 데이터가 없습니다"
          description="백엔드에서 수집을 먼저 실행하세요 → POST /api/meta/collect?rankers=20&perPlayer=10"
          icon="📊"
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-xs font-semibold text-gray-500">
                <th className="w-12 px-3 py-3 text-left">#</th>
                <th className="px-3 py-3 text-left">캐릭터</th>
                <th className="px-3 py-3 text-right">픽률</th>
                <th className="px-3 py-3 text-right">승률</th>
                <th className="px-3 py-3 text-right">KDA</th>
                <th className="hidden px-3 py-3 text-right sm:table-cell">표본</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.characterId}
                  className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="px-3 py-2.5 font-medium text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/characters/${r.characterId}`}
                      className="inline-flex items-center gap-2 font-semibold text-gray-100 hover:text-primary"
                    >
                      <Avatar characterId={r.characterId} characterName={r.characterName ?? undefined} size={30} />
                      {r.characterName ?? r.characterId}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-primary">{r.pickRate}%</td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className="font-semibold"
                      style={{ color: r.winRate >= 50 ? "rgb(var(--win))" : undefined }}
                    >
                      {r.winRate}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-gray-200">{r.kda.toFixed(2)}</td>
                  <td className="hidden px-3 py-2.5 text-right text-gray-500 sm:table-cell">{r.picks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
