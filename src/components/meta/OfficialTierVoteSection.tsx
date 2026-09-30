/**
 * OfficialTierVoteSection — /meta 투표 탭의 공식 역할군 버전(서버 컴포넌트).
 * 왼쪽: 역할군별 득표 상위 "캐릭터(1차/2차)", 오른쪽: 내 투표 폼(OfficialTierVote).
 */
import { Avatar } from "@/components/CharacterAvatar";
import { UltimateBadge } from "@/components/characters/UltimateBadge";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import OfficialTierVote from "./OfficialTierVote";
import {
  OFFICIAL_ROLES,
  dualCharacterIds,
  unitKey,
  type CharacterUltimate,
  type OfficialTierVotesResult,
} from "@/lib/official";

/**
 * @param ultimates — 캐릭터별 1차/2차 궁극기 정의 목록
 * @param votes — 공식 티어 투표 집계(없으면 결과 칸을 비움)
 */
export default function OfficialTierVoteSection({
  ultimates,
  votes,
}: {
  ultimates: CharacterUltimate[];
  votes: OfficialTierVotesResult | null;
}) {
  const byUnit = new Map(ultimates.map((u) => [unitKey(u.characterId, u.ultimateType), u]));
  const dual = dualCharacterIds(ultimates);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-gray-100">커뮤니티 티어 투표</h2>
        <span className="text-xs text-gray-500">
          공식 역할군별 최고 캐릭터 1명씩 선택 {votes ? `· 총 ${votes.totalBallots.toLocaleString()}표` : ""}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 결과: 역할군별 득표 1~5위 */}
        <div className="grid gap-3 sm:grid-cols-2">
          {OFFICIAL_ROLES.map((r) => {
            const list = votes?.roles?.[r.key] ?? [];
            return (
              <div key={r.key} className="card p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-200" title={r.desc}>
                  <OfficialRoleIcon role={r.key} size={18} />
                  {r.name}
                </div>
                {list.length === 0 ? (
                  <div className="py-3 text-center text-xs text-gray-500">아직 투표가 없습니다</div>
                ) : (
                  <ol className="space-y-1.5">
                    {list.map((e, i) => {
                      const u = byUnit.get(e.unit);
                      return (
                        <li key={e.unit} className="flex items-center gap-2">
                          <span className="w-4 shrink-0 text-center text-xs font-bold text-gray-500">{i + 1}</span>
                          <Avatar characterId={e.characterId} characterName={u?.characterName} size={26} zoom={1} />
                          <span className="min-w-0 flex-1 truncate text-xs text-gray-200">
                            {u?.characterName ?? e.characterId}
                          </span>
                          {dual.has(e.characterId) && <UltimateBadge ultimateType={e.ultimateType} />}
                          <span className="shrink-0 text-xs font-semibold text-primary">{e.votes}표</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </div>

        {/* 투표 폼 */}
        <OfficialTierVote ultimates={ultimates} />
      </div>
    </section>
  );
}
