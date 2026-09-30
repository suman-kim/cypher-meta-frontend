/**
 * UltimateSwitch — 캐릭터 상세의 1차/2차 궁극기 페이지 전환(서버 컴포넌트, 2차 궁극기 보유 캐릭터만).
 *
 * 1차·2차 궁극기 카드 두 장이 곧 탭이다. 카드를 누르면 ?ult=1st|2nd 로 이동해
 * 상단 지표·추천 빌드·슬롯별 채택률이 그 궁극기로 판별된 판(수집한 매칭 경기)만으로 바뀐다.
 * 카드에는 궁극기 스킬명·공식 역할군·그 궁극기의 픽률·승률·선택 비율을 함께 보여 준다.
 * 전환은 같은 페이지의 쿼리만 바꾸므로 스크롤 위치를 유지한다(Link scroll={false}).
 */
import Link from "next/link";
import { UltimateBadge } from "@/components/characters/UltimateBadge";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import { roleByName, type CharacterUltimate, type UltimateStatRow, type UltimateType } from "@/lib/official";

/**
 * @param ultimates — 이 캐릭터의 궁극기 정의(1차·2차)
 * @param stats — 이 캐릭터의 궁극기 단위 통계
 * @param selected — 현재 선택 궁극기
 * @param hrefFor — 궁극기별 이동 경로(랭커 지표 등 다른 쿼리 유지)
 */
export default function UltimateSwitch({
  ultimates,
  stats,
  selected,
  hrefFor,
}: {
  ultimates: CharacterUltimate[];
  stats: UltimateStatRow[];
  selected: UltimateType;
  hrefFor: (ult: UltimateType) => string;
}) {
  const totalPicks = stats.reduce((n, s) => n + s.picks, 0);
  const ordered = [...ultimates].sort((a, b) => a.ultimateType.localeCompare(b.ultimateType));

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold text-gray-100">궁극기 선택</h2>
        <span className="text-xs text-gray-500">
          궁극기에 따라 역할군·빌드가 달라져요 · 판마다 장착 아이템으로 1차/2차를 판별해 따로 집계합니다
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2" role="tablist" aria-label="궁극기 선택">
        {ordered.map((u) => {
          const on = u.ultimateType === selected;
          const s = stats.find((x) => x.ultimateType === u.ultimateType);
          const share = totalPicks && s ? Math.round((s.picks / totalPicks) * 1000) / 10 : null;
          const role = roleByName(u.officialRole);
          return (
            <Link
              key={u.ultimateType}
              href={hrefFor(u.ultimateType)}
              scroll={false}
              role="tab"
              aria-selected={on}
              className={`card flex flex-col gap-2.5 p-4 transition-all ${
                on ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-line"
              }`}
            >
              <div className="flex items-center gap-2">
                <UltimateBadge ultimateType={u.ultimateType} />
                <span className="min-w-0 flex-1 truncate font-bold text-gray-100">{u.skillName}</span>
                <span className="chip inline-flex items-center gap-1 bg-surface-3 text-gray-300">
                  <OfficialRoleIcon role={u.officialRole} size={14} />
                  {u.officialRole}
                </span>
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
                    <div className="text-sm font-bold" style={{ color: s.winRate >= 50 ? "rgb(var(--win))" : "rgb(var(--lose))" }}>
                      {s.winRate}%
                    </div>
                  </div>
                  <div className="rounded-md bg-surface-2 py-1.5">
                    <div className="text-[11px] text-gray-500">선택 비율</div>
                    <div className="text-sm font-bold text-gray-100">{share != null ? `${share}%` : "-"}</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">아직 수집된 표본이 없습니다.</p>
              )}
              <span className={`text-right text-[11px] font-semibold ${on ? "text-primary" : "text-gray-500"}`}>
                {on ? "보는 중" : "이 궁극기로 보기 →"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
