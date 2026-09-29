"use client";

/**
 * OfficialTierVote — 공식 역할군 티어 투표 폼(역할군별 최고 "캐릭터(1차/2차)" 1개).
 * 저장/조회는 /api/votes/official/tier 프록시(방문자 쿠키)를 거친다.
 * (legacy 체계는 기존 TierVote 를 그대로 쓴다)
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UltimatePicker } from "./UltimatePicker";
import { OFFICIAL_ROLES, dualCharacterIds, groupUltimatesByRole, type CharacterUltimate } from "@/lib/official";

/**
 * @param ultimates — 캐릭터별 1차/2차 궁극기 정의 목록
 */
export default function OfficialTierVote({ ultimates }: { ultimates: CharacterUltimate[] }) {
  const router = useRouter();
  const byRole = useMemo(() => groupUltimatesByRole(ultimates), [ultimates]);
  const dual = useMemo(() => dualCharacterIds(ultimates), [ultimates]);

  // 역할군 키 → 선택한 unitKey
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  // 내 기존 투표 불러오기
  useEffect(() => {
    let ok = true;
    fetch("/api/votes/official/tier")
      .then((r) => r.json())
      .then((d) => {
        if (ok && d?.picks) setPicks(d.picks);
      })
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, []);

  /** 역할군 칸 선택/해제(같은 값을 다시 누르면 해제) */
  const set = (role: string, unit: string) => setPicks((p) => ({ ...p, [role]: p[role] === unit ? "" : unit }));
  const chosen = OFFICIAL_ROLES.filter((r) => picks[r.key]).length;

  /** 투표 저장 — 역할군이 맞지 않는 선택은 서버가 걸러낸다 */
  const submit = async () => {
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/votes/official/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message || "저장에 실패했습니다.");
      setStatus("saved");
      setMsg("투표가 저장되었습니다. 결과에 반영됩니다.");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setMsg((e as Error).message);
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-100">
          내 티어 투표 <span className="text-xs font-normal text-gray-500">공식 역할군별 최고 캐릭터 1명</span>
        </h3>
        <span className="text-xs text-gray-500">
          {chosen}/{OFFICIAL_ROLES.length} 선택
        </span>
      </div>
      {OFFICIAL_ROLES.map((r) => (
        <div key={r.key}>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-300" title={r.desc}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.color }} />
            {r.name}
          </div>
          <UltimatePicker options={byRole[r.key]} dual={dual} value={picks[r.key]} onSelect={(u) => set(r.key, u)} />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={status === "saving" || chosen === 0}
          className="btn-primary px-4 py-2 disabled:opacity-50"
        >
          {status === "saving" ? "저장 중…" : "투표 저장"}
        </button>
        {msg && <span className={`text-xs ${status === "error" ? "text-red-400" : "text-primary"}`}>{msg}</span>}
      </div>
      <p className="text-[11px] text-gray-500">
        로그인 없이 브라우저 기준 1표이며, 다시 저장하면 이전 투표를 덮어씁니다. 2차 궁극기 캐릭터는 궁극기에 맞는
        역할군 칸에서만 고를 수 있어요.
      </p>
    </div>
  );
}
