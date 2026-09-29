"use client";

/**
 * OfficialCompVote — 공식 역할군 조합 투표 폼.
 * 편성 프리셋(백엔드 GET /votes/official/formations)을 고르고, 슬롯별 역할군에 맞는 "캐릭터(1차/2차)"를 채운다.
 * 같은 캐릭터는 1차/2차가 달라도 한 번만 고를 수 있다. 저장/조회는 /api/votes/official/comp 프록시.
 * (legacy 체계는 기존 CompVote 를 그대로 쓴다)
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UltimatePicker } from "./UltimatePicker";
import {
  dualCharacterIds,
  groupUltimatesByRole,
  roleByName,
  UNKNOWN_ROLE_COLOR,
  type CharacterUltimate,
  type OfficialFormation,
} from "@/lib/official";

/**
 * @param ultimates — 캐릭터별 1차/2차 궁극기 정의 목록
 * @param formations — 공식 편성 프리셋 목록
 */
export default function OfficialCompVote({
  ultimates,
  formations,
}: {
  ultimates: CharacterUltimate[];
  formations: OfficialFormation[];
}) {
  const router = useRouter();
  const byRole = useMemo(() => groupUltimatesByRole(ultimates), [ultimates]);
  const dual = useMemo(() => dualCharacterIds(ultimates), [ultimates]);

  const [formationKey, setFormationKey] = useState(formations[0]?.key ?? "");
  const formation = formations.find((f) => f.key === formationKey);
  // 슬롯별 선택 unitKey("캐릭터ID:궁극기")
  const [units, setUnits] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  // 내 기존 투표 불러오기(편성·슬롯 복원)
  useEffect(() => {
    let ok = true;
    fetch("/api/votes/official/comp")
      .then((r) => r.json())
      .then((d) => {
        if (!ok || !d?.comp) return;
        if (formations.some((f) => f.key === d.comp.formationKey)) {
          setFormationKey(d.comp.formationKey);
          setUnits(Array.isArray(d.comp.units) ? d.comp.units : []);
        }
      })
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, [formations]);

  /** 편성 변경 — 슬롯 구성이 바뀌므로 선택 초기화 */
  const changeFormation = (key: string) => {
    setFormationKey(key);
    setUnits([]);
    setMsg("");
  };
  /** 슬롯 선택/해제(같은 값을 다시 누르면 해제) */
  const setSlot = (i: number, unit: string) =>
    setUnits((prev) => {
      const next = [...prev];
      next[i] = next[i] === unit ? "" : unit;
      return next;
    });

  const slotCount = formation?.roles.length ?? 0;
  const filled = units.filter(Boolean).length;
  /** i번째 칸을 제외하고 이미 고른 캐릭터 — 중복 선택 방지 */
  const takenExcept = (i: number) =>
    new Set(units.filter((u, j) => u && j !== i).map((u) => u.split(":")[0]));

  /** 투표 저장 — 역할군 불일치·중복은 서버에서도 400 으로 막는다 */
  const submit = async () => {
    if (!formation) return;
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/votes/official/comp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formationKey, units: formation.roles.map((_, i) => units[i] ?? "") }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(Array.isArray(d?.message) ? d.message[0] : d?.message || "저장에 실패했습니다.");
      setStatus("saved");
      setMsg("투표가 저장되었습니다. 결과에 반영됩니다.");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setMsg((e as Error).message);
    }
  };

  if (formations.length === 0) {
    return (
      <div className="card grid place-items-center p-6 text-center text-sm text-gray-500">
        편성 정보를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-100">
          내 조합 투표 <span className="text-xs font-normal text-gray-500">공식 역할군 편성</span>
        </h3>
        <span className="text-xs text-gray-500">
          {filled}/{slotCount} 선택
        </span>
      </div>

      {/* 편성 선택 */}
      <div className="flex flex-wrap gap-1.5">
        {formations.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => changeFormation(f.key)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              f.key === formationKey ? "bg-primary text-white" : "border border-line bg-surface text-gray-400 hover:text-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 슬롯별 선택 */}
      {formation?.roles.map((roleName, i) => {
        const role = roleByName(roleName);
        return (
          <div key={`${formationKey}-${i}`}>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-300">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: role?.color ?? UNKNOWN_ROLE_COLOR }} />
              {i + 1}번 · {roleName}
            </div>
            <UltimatePicker
              options={role ? byRole[role.key] : []}
              dual={dual}
              value={units[i]}
              onSelect={(u) => setSlot(i, u)}
              disabledCharacterIds={takenExcept(i)}
            />
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={status === "saving" || filled !== slotCount}
          className="btn-primary px-4 py-2 disabled:opacity-50"
        >
          {status === "saving" ? "저장 중…" : "투표 저장"}
        </button>
        {msg && <span className={`text-xs ${status === "error" ? "text-red-400" : "text-primary"}`}>{msg}</span>}
      </div>
      <p className="text-[11px] text-gray-500">
        로그인 없이 브라우저 기준 1표이며, 다시 저장하면 이전 투표를 덮어씁니다. 편성은 실제 공식전 5인 팀에서 많이 나온
        역할군 구성입니다.
      </p>
    </div>
  );
}
