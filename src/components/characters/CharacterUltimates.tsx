/**
 * CharacterUltimates — 캐릭터 상세의 "궁극기·공식 역할군" 섹션 (포지션 체계 official 전용, 서버 컴포넌트).
 * 1차/2차 궁극기마다 스킬명·공식 역할군과, 수집된 경기에서 판별한 궁극기별 픽률·승률을 보여 준다.
 */
import { UltimateBadge, OfficialRoleChip } from "@/components/characters/UltimateBadge";
import { roleByName, UNKNOWN_ROLE_COLOR, type CharacterUltimate, type UltimateStatRow } from "@/lib/official";

/**
 * @param ultimates — 이 캐릭터의 궁극기 정의(1~2행)
 * @param stats — 이 캐릭터의 궁극기 단위 통계(없으면 통계 칸을 비움)
 */
export default function CharacterUltimates({
  ultimates,
  stats,
}: {
  ultimates: CharacterUltimate[];
  stats: UltimateStatRow[];
}) {
  if (ultimates.length === 0) return null;
  const dual = ultimates.length > 1;
  const totalPicks = stats.reduce((n, s) => n + s.picks, 0);

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-gray-100">궁극기 · 공식 역할군</h2>
        <span className="text-xs text-gray-500">
          {dual ? "궁극기 선택에 따라 역할군이 정해집니다 · 판마다 장착 아이템으로 1차/2차를 판별" : "1차 궁극기만 있는 캐릭터"}
        </span>
      </div>
      <div className={`grid gap-2.5 ${dual ? "sm:grid-cols-2" : ""}`}>
        {ultimates.map((u) => {
          const role = roleByName(u.officialRole);
          const s = stats.find((x) => x.ultimateType === u.ultimateType);
          const share = totalPicks && s ? Math.round((s.picks / totalPicks) * 1000) / 10 : null;
          return (
            <div key={u.ultimateType} className="card flex flex-col gap-2.5 p-4">
              <div className="flex items-center gap-2">
                <UltimateBadge ultimateType={u.ultimateType} />
                <span className="min-w-0 flex-1 truncate font-bold text-gray-100">{u.skillName}</span>
                <OfficialRoleChip name={u.officialRole} color={role?.color ?? UNKNOWN_ROLE_COLOR} />
              </div>
              {role && <p className="text-xs text-gray-500">{role.desc}</p>}
              {s ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-surface-2 py-1.5">
                    <div className="text-[11px] text-gray-500">픽률</div>
                    <div className="text-sm font-bold text-primary">{s.pickRate}%</div>
                  </div>
                  <div className="rounded-md bg-surface-2 py-1.5">
                    <div className="text-[11px] text-gray-500">승률</div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: s.winRate >= 50 ? "rgb(var(--win))" : "rgb(var(--lose))" }}
                    >
                      {s.winRate}%
                    </div>
                  </div>
                  <div className="rounded-md bg-surface-2 py-1.5">
                    <div className="text-[11px] text-gray-500">{dual ? "선택 비율" : "표본"}</div>
                    <div className="text-sm font-bold text-gray-100">
                      {dual && share != null ? `${share}%` : s.picks.toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">아직 수집된 표본이 없습니다.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
