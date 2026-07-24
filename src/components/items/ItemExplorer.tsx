"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/CharacterAvatar";
import ItemIcon from "@/components/ItemIcon";
import { orderSlots, ROLE_LABELS, type CharacterItemMeta, type RoleOrEtc } from "@/lib/meta";
import { rarityMeta } from "@/lib/constants";

export interface CharItem {
  characterId: string;
  characterName: string | null;
  role: RoleOrEtc;
  pickRate: number;
  winRate: number;
  matchCount: number;
}

const ROLE_FILTERS: { key: "all" | RoleOrEtc; label: string; color?: string }[] = [
  { key: "all", label: "전체" },
  { key: "tank", label: "탱커", color: "#5b8def" },
  { key: "melee", label: "근접딜러", color: "#e2506a" },
  { key: "ranged", label: "원거리딜러", color: "#4fbf6b" },
  { key: "support", label: "서포터", color: "#a15bf0" },
];

export default function ItemExplorer({
  characters,
  initial,
}: {
  characters: CharItem[];
  initial: { characterId: string; data: CharacterItemMeta } | null;
}) {
  const [selected, setSelected] = useState(initial?.characterId ?? characters[0]?.characterId ?? "");
  const [cache, setCache] = useState<Record<string, CharacterItemMeta>>(
    initial ? { [initial.characterId]: initial.data } : {},
  );
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | RoleOrEtc>("all");
  const [pickerOpen, setPickerOpen] = useState(true); // 모바일/태블릿 캐릭터 선택 섹션 접기/펼치기

  useEffect(() => {
    if (!selected || cache[selected]) return;
    let ok = true;
    setLoading(true);
    fetch(`/api/characters/${selected}/items`)
      .then((r) => r.json())
      .then((d) => {
        if (ok) {
          setCache((c) => ({ ...c, [selected]: d }));
          setLoading(false);
        }
      })
      .catch(() => ok && setLoading(false));
    return () => {
      ok = false;
    };
  }, [selected, cache]);

  const filtered = useMemo(
    () =>
      characters.filter(
        (c) => (role === "all" || c.role === role) && (!q || (c.characterName ?? "").includes(q.trim())),
      ),
    [characters, q, role],
  );

  const current = cache[selected];
  const selectedChar = characters.find((c) => c.characterId === selected);
  const slots = current ? orderSlots(current.slots) : [];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* 캐릭터 선택 사이드바 */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="card overflow-hidden">
          {/* 모바일/태블릿 토글 헤더 (lg 이상은 항상 펼쳐 표시) */}
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            className="flex w-full items-center justify-between gap-2 border-b border-line px-3 py-2.5 text-left lg:hidden"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-gray-100">
              캐릭터 선택
              {selectedChar && (
                <span className="truncate text-xs font-normal text-gray-500">
                  · {selectedChar.characterName ?? selectedChar.characterId}
                </span>
              )}
            </span>
            <svg
              className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <div className={pickerOpen ? "block" : "hidden lg:block"}>
          <div className="border-b border-line p-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="캐릭터 검색"
                className="w-full rounded-lg border border-line bg-surface-2 py-2 pl-9 pr-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-primary focus:outline-none"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {ROLE_FILTERS.map((r) => {
                const active = role === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className={`chip border transition-colors ${
                      active
                        ? "border-transparent bg-primary text-white"
                        : "border-line bg-surface-2 text-gray-400 hover:text-gray-100"
                    }`}
                  >
                    {r.color && !active && (
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                    )}
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[320px] space-y-0.5 overflow-y-auto p-2 lg:max-h-[520px]">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">검색 결과가 없습니다</div>
            ) : (
              filtered.map((c) => {
                const sel = c.characterId === selected;
                return (
                  <button
                    key={c.characterId}
                    type="button"
                    onClick={() => setSelected(c.characterId)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      sel ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-surface-2"
                    }`}
                  >
                    <Avatar
                      characterId={c.characterId}
                      characterName={c.characterName ?? undefined}
                      size={34}
                      zoom={1}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-sm font-medium ${
                        sel ? "text-primary" : "text-gray-200"
                      }`}
                    >
                      {c.characterName ?? c.characterId}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-gray-500">{c.pickRate}%</span>
                  </button>
                );
              })
            )}
          </div>
          </div>
        </div>
      </aside>

      {/* 선택 캐릭터의 부위별 아이템 */}
      <div className="space-y-4">
        {selectedChar && (
          <div className="card relative overflow-hidden">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex flex-wrap items-center gap-4 p-4 sm:p-5">
              <Avatar
                characterId={selectedChar.characterId}
                characterName={selectedChar.characterName ?? undefined}
                size={60}
                zoom={2}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-gray-50">
                    {selectedChar.characterName ?? selectedChar.characterId}
                  </h2>
                  {selectedChar.role !== "etc" && (
                    <span className="chip bg-surface-3 text-gray-300">{ROLE_LABELS[selectedChar.role]}</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>
                    픽률 <span className="font-semibold text-primary">{selectedChar.pickRate}%</span>
                  </span>
                  <span>
                    승률 <span className="font-semibold text-gray-300">{selectedChar.winRate}%</span>
                  </span>
                  <span>
                    표본 <span className="font-semibold text-gray-300">{selectedChar.matchCount.toLocaleString()}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && !current ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-44 animate-pulse bg-surface-2" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-500">이 캐릭터의 아이템 데이터가 없습니다.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {slots.map((s) => (
              <div key={s.equipSlotCode} className="card overflow-hidden shadow-sm transition-shadow hover:shadow-float">
                <div className="flex items-center justify-between border-b border-line bg-surface-2 px-3.5 py-2.5">
                  <span className="text-sm font-bold text-gray-100">{s.label}</span>
                  <span className="chip bg-surface-3 text-gray-500">{s.items.length}종</span>
                </div>
                <div className="divide-y divide-line">
                  {s.items.slice(0, 5).map((it, i) => {
                    const r = rarityMeta(it.rarityCode ?? undefined);
                    return (
                      <div
                        key={it.itemId}
                        className={`flex items-center gap-2.5 p-2.5 ${i === 0 ? "bg-primary/[0.04]" : ""}`}
                      >
                        <div className="relative shrink-0">
                          <ItemIcon
                            itemId={it.itemId}
                            itemName={it.itemName ?? undefined}
                            rarityCode={it.rarityCode ?? undefined}
                            size={38}
                          />
                          {i === 0 && (
                            <span className="absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-black text-white shadow">
                              ★
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-semibold text-gray-100">
                              {it.itemName ?? "—"}
                            </span>
                            {r && (
                              <span
                                className="shrink-0 rounded px-1 text-[9px] font-bold"
                                style={{ color: r.color, backgroundColor: `${r.color}22` }}
                              >
                                {r.name}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(it.rate, 100)}%`,
                                  backgroundColor: r?.color ?? "rgb(var(--primary))",
                                }}
                              />
                            </div>
                            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-400">
                              {it.rate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
