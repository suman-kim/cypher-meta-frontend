"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterPicker } from "./CharacterPicker";
import {
  FORMATIONS,
  FORMATION_MAP,
  ROLE_LABELS,
  VOTE_ROLES,
  type RosterEntry,
  type RoleCode,
} from "@/lib/votes";

export default function CompVote({ roster }: { roster: RosterEntry[] }) {
  const router = useRouter();
  const byRole = useMemo(() => {
    const m: Record<RoleCode, RosterEntry[]> = { tank: [], melee: [], ranged: [], support: [] };
    for (const r of roster) if (r.role !== "etc") m[r.role].push(r);
    for (const k of VOTE_ROLES)
      m[k].sort((a, b) => (a.characterName ?? "").localeCompare(b.characterName ?? "", "ko"));
    return m;
  }, [roster]);

  const [formationKey, setFormationKey] = useState<string>(FORMATIONS[0].key);
  const formation = FORMATION_MAP[formationKey] ?? FORMATIONS[0];
  const [slots, setSlots] = useState<string[]>(() => Array(formation.roles.length).fill(""));
  const [loadedMine, setLoadedMine] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  // 내 조합 불러오기(최초 1회) — 편성/슬롯 프리필
  useEffect(() => {
    let ok = true;
    fetch("/api/votes/comp")
      .then((r) => r.json())
      .then((d) => {
        if (!ok) return;
        const c = d?.comp;
        if (c?.formationKey && FORMATION_MAP[c.formationKey] && Array.isArray(c.ids)) {
          setFormationKey(c.formationKey);
          setSlots(c.ids);
        }
        setLoadedMine(true);
      })
      .catch(() => setLoadedMine(true));
    return () => {
      ok = false;
    };
  }, []);

  // 편성이 바뀌면 슬롯 초기화 (내 투표 프리필 로드 후에만)
  useEffect(() => {
    if (!loadedMine) return;
    setSlots((prev) =>
      prev.length === formation.roles.length ? prev : Array(formation.roles.length).fill(""),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationKey, loadedMine]);

  const chosenIds = useMemo(() => new Set(slots.filter(Boolean)), [slots]);
  const setSlot = (i: number, id: string) =>
    setSlots((s) => {
      const n = [...s];
      n[i] = n[i] === id ? "" : id;
      return n;
    });
  const filled = slots.filter(Boolean).length;
  const complete = filled === formation.roles.length;

  const changeFormation = (key: string) => {
    setFormationKey(key);
    setSlots(Array((FORMATION_MAP[key] ?? FORMATIONS[0]).roles.length).fill(""));
    setStatus("idle");
    setMsg("");
  };

  const submit = async () => {
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/votes/comp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formationKey, ids: slots }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message || "저장에 실패했습니다.");
      setStatus("saved");
      setMsg("조합 투표가 저장되었습니다. 결과에 반영됩니다.");
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
          내 조합 투표 <span className="text-xs font-normal text-gray-500">편성 선택 후 슬롯별 캐릭터</span>
        </h3>
        <span className="text-xs text-gray-500">
          {filled}/{formation.roles.length} 선택
        </span>
      </div>

      {/* 편성 선택 */}
      <div>
        <div className="mb-1 text-xs font-semibold text-gray-300">편성</div>
        <div className="flex flex-wrap gap-1.5">
          {FORMATIONS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => changeFormation(f.key)}
              className={`chip px-2.5 py-1 text-xs font-medium ${
                f.key === formationKey ? "bg-primary text-white" : "bg-surface-2 text-gray-300 hover:bg-surface-3"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 슬롯별 캐릭터 선택 */}
      {formation.roles.map((role, i) => (
        <div key={`${formationKey}-${i}`}>
          <div className="mb-1 text-xs font-semibold text-gray-300">
            슬롯 {i + 1} · <span className="text-gray-400">{ROLE_LABELS[role]}</span>
          </div>
          <CharacterPicker
            options={byRole[role]}
            value={slots[i]}
            onSelect={(id) => setSlot(i, id)}
            disabledIds={chosenIds}
          />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={status === "saving" || !complete}
          className="btn-primary px-4 py-2 disabled:opacity-50"
        >
          {status === "saving" ? "저장 중…" : "조합 투표 저장"}
        </button>
        {msg && (
          <span className={`text-xs ${status === "error" ? "text-red-400" : "text-primary"}`}>{msg}</span>
        )}
      </div>
      <p className="text-[11px] text-gray-500">로그인 없이 브라우저 기준 1표이며, 다시 저장하면 이전 투표를 덮어씁니다.</p>
    </div>
  );
}
