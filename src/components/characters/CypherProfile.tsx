import { STAT_DISPLAY, type CypherProfile } from "@/lib/cypher-profiles";
import type { OfficialRoleDef } from "@/lib/official";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import { UltimateBadge } from "@/components/characters/UltimateBadge";

/** 스킬 슬롯 배지 색 */
function slotStyle(slot: string): { bg: string; fg: string } {
  const s = slot.toLowerCase();
  if (s.includes("passive")) return { bg: "rgb(var(--surface-3))", fg: "rgb(var(--g400))" };
  if (s === "q" || s === "e" || s === "f" || s === "space") return { bg: "rgb(var(--primary) / 0.15)", fg: "rgb(var(--primary))" };
  return { bg: "rgb(var(--navy) / 0.12)", fg: "rgb(var(--g300))" };
}

/** 슬롯 코드 → 한글 표기 (마우스 클릭류) */
function slotLabel(slot: string): string {
  const map: Record<string, string> = {
    LMB: "마우스 좌클릭",
    RMB: "마우스 우클릭",
    "LMB+RMB": "마우스 양클릭",
    "Shift+LMB": "Shift+마우스 좌클릭",
    "Shift+RMB": "Shift+마우스 우클릭",
  };
  return map[slot] ?? slot;
}

/**
 * 캐릭터 능력치·스킬(공식 사이트 기준).
 * - 능력치: 1차/2차 공통. 공식 역할군 체계면 그 아래 선택 궁극기 역할군의 "고정 버프"를 함께 보여 준다.
 * - 스킬: ultimateType 이 있으면 공통 스킬 + 그 궁극기 전용 스킬만(전용 스킬엔 1차/2차 배지).
 *   ultimateType 이 없으면(1차만 있는 캐릭터·기존 체계) 전체를 보여 주되 전용 스킬엔 배지를 붙인다.
 * @param profile — 능력치·스킬 정적 데이터
 * @param ultimateType — 선택 궁극기("1st"|"2nd", 2차 보유 캐릭터 상세에서만)
 * @param role — 선택 궁극기의 공식 역할군(고정 버프 표시용, 공식 역할군 체계에서만)
 */
export default function CypherProfileView({
  profile,
  ultimateType,
  role,
}: {
  profile: CypherProfile;
  ultimateType?: "1st" | "2nd";
  role?: OfficialRoleDef;
}) {
  const { stat } = profile;
  const skills = (profile.skills ?? []).filter((s) => !ultimateType || !s.ult || s.ult === ultimateType);
  return (
    <div className="space-y-4">
      {/* 능력치 */}
      {stat && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-100">능력치</h2>
            {profile.attackType && (
              <span className="chip bg-surface-3 text-gray-400">{profile.attackType}</span>
            )}
            {profile.difficulty && (
              <span className="chip bg-surface-3 text-gray-400">
                난이도 {"★".repeat(profile.difficulty)}
                <span className="text-gray-600">{"★".repeat(Math.max(0, 5 - profile.difficulty))}</span>
              </span>
            )}
          </div>
          <div className="card grid grid-cols-2 gap-x-6 gap-y-3.5 p-4 sm:grid-cols-3">
            {STAT_DISPLAY.map((s) => {
              const v = stat[s.key];
              const pct = Math.max(4, Math.min(100, (v / s.max) * 100));
              return (
                <div key={s.key}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-xs font-medium text-gray-500">{s.label}</span>
                    <span className="text-sm font-bold tabular-nums text-gray-100">{v}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* 선택 궁극기 역할군의 고정 버프 — 기본 능력치는 1차/2차 공통이고, 역할군에 따라 이 버프가 달라진다 */}
          {role && (
            <div className="card mt-2 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <OfficialRoleIcon role={role.key} size={18} />
                <span className="text-sm font-bold text-gray-100">{role.name} 역할군 고정 버프</span>
                <span className="text-[11px] text-gray-500">
                  {ultimateType ? `${ultimateType === "2nd" ? "2차" : "1차"} 궁극기 선택 시 적용` : "기본 능력치에 더해 적용"}
                </span>
              </div>
              <ul className="space-y-1">
                {role.buffs.map((b) => (
                  <li key={b} className="flex gap-2 text-[13px] leading-relaxed text-gray-400">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-500" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 스킬 — 선택 궁극기에 맞는 스킬만(공통 + 그 궁극기 전용) */}
      {skills.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-100">스킬</h2>
            <span className="text-xs text-gray-500">
              {skills.length}개{ultimateType ? ` · ${ultimateType === "2nd" ? "2차" : "1차"} 궁극기 기준` : ""}
            </span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {skills.map((sk, i) => {
              const st = slotStyle(sk.slot);
              return (
                <div key={`${sk.slot}-${i}`} className="card p-3.5 transition-shadow hover:shadow-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-black"
                      style={{ backgroundColor: st.bg, color: st.fg }}
                    >
                      {slotLabel(sk.slot)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold text-gray-100">{sk.name}</span>
                    {/* 궁극기 전용 스킬 표시(공통 스킬은 표시 없음) */}
                    {sk.ult && <UltimateBadge ultimateType={sk.ult} />}
                    {sk.cooldown && (
                      <span className="chip shrink-0 bg-surface-2 text-gray-500">쿨타임 {sk.cooldown}</span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-gray-400">
                    {sk.explain}
                  </p>
                  {sk.cost && <p className="mt-1 text-[11px] text-gray-500">소모 {sk.cost}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
