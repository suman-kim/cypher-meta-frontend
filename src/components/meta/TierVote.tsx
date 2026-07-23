"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterPicker } from "./CharacterPicker";
import { VOTE_ROLES, ROLE_LABELS, type RosterEntry, type RoleCode } from "@/lib/votes";

export default function TierVote({ roster }: { roster: RosterEntry[] }) {
  const router = useRouter();
  const byRole = useMemo(() => {
    const m: Record<RoleCode, RosterEntry[]> = { tank: [], melee: [], ranged: [], support: [] };
    for (const r of roster) if (r.role !== "etc") m[r.role].push(r);
    for (const k of VOTE_ROLES)
      m[k].sort((a, b) => (a.characterName ?? "").localeCompare(b.characterName ?? "", "ko"));
    return m;
  }, [roster]);

  const [picks, setPicks] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let ok = true;
    fetch("/api/votes/tier")
      .then((r) => r.json())
      .then((d) => {
        if (ok && d?.picks) setPicks(d.picks);
      })
      .catch(() => {});
    return () => {
      ok = false;
    };
  }, []);

  const set = (role: string, id: string) =>
    setPicks((p) => ({ ...p, [role]: p[role] === id ? "" : id }));
  const chosen = VOTE_ROLES.filter((r) => picks[r]).length;

  const submit = async () => {
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/votes/tier", {
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
          내 티어 투표 <span className="text-xs font-normal text-gray-500">역할별 최고 캐릭터 1명</span>
        </h3>
        <span className="text-xs text-gray-500">{chosen}/4 선택</span>
      </div>
      {VOTE_ROLES.map((r) => (
        <div key={r}>
          <div className="mb-1 text-xs font-semibold text-gray-300">{ROLE_LABELS[r]}</div>
          <CharacterPicker options={byRole[r]} value={picks[r]} onSelect={(id) => set(r, id)} />
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
        {msg && (
          <span className={`text-xs ${status === "error" ? "text-red-400" : "text-primary"}`}>{msg}</span>
        )}
      </div>
      <p className="text-[11px] text-gray-500">로그인 없이 브라우저 기준 1표이며, 다시 저장하면 이전 투표를 덮어씁니다.</p>
    </div>
  );
}
