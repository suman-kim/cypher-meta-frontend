/**
 * OfficialCompositionSection — 공식 역할군 체계의 조합 티어(서버 컴포넌트).
 *
 * 조합의 한 칸 = "캐릭터(1차/2차)". 같은 팀 안의 2인(듀오)·3인(트리오) 조합을 빈도/승률로 보여 주고,
 * 조합의 공식 역할군 구성(예: 뱅가드+레인저)으로 거르는 필터를 링크 칩으로 제공한다.
 * 상태는 모두 URL 쿼리(size·roles·basis)에 두어 서버에서 렌더링한다.
 */
import Link from "next/link";
import { Avatar } from "@/components/CharacterAvatar";
import { UltimateBadge } from "@/components/characters/UltimateBadge";
import {
  OFFICIAL_ROLES,
  UNKNOWN_ROLE_COLOR,
  roleByName,
  unitKey,
  type UltimateComposition,
  type UltimateCompositionsResult,
} from "@/lib/official";

/** 목록 기준 — 빈도 / 승률 / 둘 다 */
export type OfficialCompBasis = "freq" | "win" | "both";

/**
 * /meta/comp 링크 생성(공식 조합 필터 상태 보존).
 * @param size — 조합 인원 2|3
 * @param roles — 역할군 구성 필터(영문 키 배열)
 * @param basis — 목록 기준
 * @returns URL
 */
export function officialCompHref(size: 2 | 3, roles: string[], basis: OfficialCompBasis): string {
  const p = new URLSearchParams();
  if (size !== 2) p.set("size", String(size));
  if (roles.length) p.set("roles", roles.join(","));
  if (basis !== "freq") p.set("basis", basis);
  const q = p.toString();
  return q ? `/meta/comp?${q}` : "/meta/comp";
}

/**
 * 역할군 한글명 배열 → 영문 키 배열(필터 링크용).
 * @param names — 공식 역할군 한글명 배열
 * @returns 영문 키 배열(알 수 없는 이름은 제외)
 */
function namesToKeys(names: string[]): string[] {
  return names.map((n) => roleByName(n)?.key).filter((k): k is NonNullable<typeof k> => !!k);
}

/** 조합 카드 1개 — 멤버 아바타(1차/2차 배지) + 역할군 칩 + 승률/판수 */
function UltimateComboCard({ combo, rank }: { combo: UltimateComposition; rank: number }) {
  const wr = combo.winRate;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2.5">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm font-black ${
          rank === 1 ? "bg-primary text-white" : rank === 2 ? "bg-surface-3 text-gray-100" : rank === 3 ? "bg-[#c07b3f] text-white" : "bg-surface-2 text-gray-400"
        }`}
      >
        {rank}
      </span>
      <div className="flex flex-1 flex-wrap items-start gap-3">
        {combo.members.map((m) => {
          const role = roleByName(m.officialRole);
          const color = role?.color ?? UNKNOWN_ROLE_COLOR;
          return (
            <Link
              key={unitKey(m.characterId, m.ultimateType)}
              href={`/characters/${m.characterId}`}
              className="flex flex-col items-center gap-0.5"
              title={`${m.characterName} · ${m.skillName}`}
            >
              <span className="relative">
                <Avatar characterId={m.characterId} characterName={m.characterName} size={42} zoom={1} />
                {m.dual && <UltimateBadge ultimateType={m.ultimateType} className="absolute -right-1.5 -top-1.5" />}
              </span>
              <span className="w-14 truncate text-center text-[9px] leading-tight text-gray-500">{m.characterName}</span>
              <span className="rounded-full px-1.5 text-[8px] font-bold leading-4" style={{ color, background: `${color}22` }}>
                {m.officialRole}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold" style={{ color: wr >= 50 ? "rgb(var(--primary))" : "#9aa7b4" }}>
          {wr}%
        </div>
        <div className="text-[11px] text-gray-500">{combo.games}판</div>
      </div>
    </div>
  );
}

/** 조합 목록 — 비어 있으면 안내 문구 */
function UltimateComboList({ combos, empty }: { combos: UltimateComposition[]; empty: string }) {
  if (combos.length === 0)
    return <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-gray-500">{empty}</div>;
  return (
    <div className="space-y-2">
      {combos.map((c, i) => (
        <UltimateComboCard key={c.members.map((m) => unitKey(m.characterId, m.ultimateType)).join("|")} combo={c} rank={i + 1} />
      ))}
    </div>
  );
}

/**
 * @param data — 궁극기 단위 조합 집계(GET /meta/compositions/ultimates)
 * @param roles — 현재 역할군 구성 필터(영문 키)
 * @param basis — 목록 기준
 */
export default function OfficialCompositionSection({
  data,
  roles,
  basis,
}: {
  data: UltimateCompositionsResult;
  roles: string[];
  basis: OfficialCompBasis;
}) {
  const size = data.size;
  const mixes = data.roleMixes.slice(0, 10);
  const activeMix = roles.join(",");

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-bold text-gray-100">조합 티어</h2>
          <span className="text-xs text-gray-500">
            팀 내 {size}인 조합 · {data.distinctCombos.toLocaleString()}종
            {data.filterRoles.length ? ` · ${data.filterRoles.join("+")} 포함` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 인원 */}
          <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
            {([2, 3] as const).map((n) => (
              <Link key={n} href={officialCompHref(n, [], basis)} className={`segtab text-xs ${n === size ? "segtab-active" : ""}`}>
                {n === 2 ? "듀오" : "트리오"}
              </Link>
            ))}
          </div>
          {/* 기준 */}
          <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
            <span className="px-1.5 text-xs font-medium text-gray-500">기준</span>
            {(
              [
                ["freq", "빈도"],
                ["win", "승률"],
                ["both", "둘 다"],
              ] as const
            ).map(([k, label]) => (
              <Link key={k} href={officialCompHref(size, roles, k)} className={`segtab text-xs ${k === basis ? "segtab-active" : ""}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 역할군 필터 — 역할군 1개 포함 / 자주 나오는 구성 */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 shrink-0 whitespace-nowrap text-xs text-gray-500">역할군</span>
          <Link
            href={officialCompHref(size, [], basis)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${roles.length === 0 ? "bg-primary text-white" : "border border-line bg-surface text-gray-400 hover:text-gray-200"}`}
          >
            전체
          </Link>
          {OFFICIAL_ROLES.map((r) => {
            const on = activeMix === r.key;
            return (
              <Link
                key={r.key}
                href={officialCompHref(size, [r.key], basis)}
                title={`${r.name} 포함 조합`}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${on ? "bg-primary text-white" : "border border-line bg-surface text-gray-400 hover:text-gray-200"}`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                {r.name}
              </Link>
            );
          })}
        </div>
        {mixes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 shrink-0 whitespace-nowrap text-xs text-gray-500">자주 나온 구성</span>
            {mixes.map((m) => {
              const keys = namesToKeys(m.roles);
              const on = activeMix === keys.join(",");
              return (
                <Link
                  key={m.roles.join("+")}
                  href={officialCompHref(size, keys, basis)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${on ? "bg-primary text-white" : "border border-line bg-surface text-gray-400 hover:text-gray-200"}`}
                >
                  {m.roles.join("+")} <span className="opacity-70">{m.games.toLocaleString()}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {basis === "both" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-300">가장 많이 나온 조합</h3>
            <UltimateComboList combos={data.byFrequency} empty="조건에 맞는 조합이 없습니다." />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-300">
              승률 높은 조합 <span className="font-normal text-gray-500">({data.minGames}판 이상)</span>
            </h3>
            <UltimateComboList combos={data.byWinRate} empty={`${data.minGames}판 이상 반복된 조합이 아직 없습니다.`} />
          </div>
        </div>
      ) : basis === "freq" ? (
        <UltimateComboList combos={data.byFrequency} empty="조건에 맞는 조합이 없습니다." />
      ) : (
        <UltimateComboList combos={data.byWinRate} empty={`${data.minGames}판 이상 반복된 조합이 아직 없습니다.`} />
      )}

      <p className="mt-2 text-[11px] text-gray-500">
        * 같은 팀(승패 동일) 안의 {size}인 조합입니다. 한 칸은 캐릭터와 그 판의 궁극기(1차/2차) — 장착 아이템으로 판별 — 이며,
        역할군은 사이퍼즈 공식 역할군입니다. 궁극기를 판별하지 못한 판(약 0.5%)은 제외됩니다.
      </p>
    </section>
  );
}
