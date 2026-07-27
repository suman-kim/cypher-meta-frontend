"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import UpdateBody from "@/components/updates/UpdateBody";

interface UpdateNote {
  id: string;
  version: string | null;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 본문 삽입 툴바 버튼 정의 */
const TAG_BUTTONS: { label: string; prefix: string; cls: string }[] = [
  { label: "신규", prefix: "[신규] ", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400" },
  { label: "개선", prefix: "[개선] ", cls: "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20" },
  { label: "수정", prefix: "[수정] ", cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400" },
  { label: "긴급", prefix: "[긴급] ", cls: "border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 dark:text-red-400" },
  { label: "• 불릿", prefix: "- ", cls: "border-line bg-surface-2 text-gray-400 hover:bg-surface-3" },
];

/** 업데이트 노트 관리 — 작성/수정/삭제/발행 토글 + 태그 툴바 + 실시간 미리보기 */
export default function UpdateManager({ token }: { token: string }) {
  const [list, setList] = useState<UpdateNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/updates`, { headers: { "x-admin-token": token } });
      if (!r.ok) throw new Error(`업데이트 조회 실패 (${r.status})`);
      const data = (await r.json()) as { items: UpdateNote[] };
      setList(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function reset() {
    setEditingId(null);
    setVersion("");
    setTitle("");
    setContent("");
    setPublished(true);
  }

  function edit(u: UpdateNote) {
    setEditingId(u.id);
    setVersion(u.version ?? "");
    setTitle(u.title);
    setContent(u.content);
    setPublished(u.published);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** 커서가 위치한 줄 맨 앞에 태그/불릿을 삽입 */
  function insertLinePrefix(prefix: string) {
    const ta = contentRef.current;
    const value = content;
    const pos = ta?.selectionStart ?? value.length;
    const lineStart = value.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    setContent(next);
    const caret = pos + prefix.length;
    window.setTimeout(() => {
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    }, 0);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const url = editingId ? `/api/admin/updates/${editingId}/update` : `/api/admin/updates`;
      const body = {
        version: version.trim() || undefined,
        title: title.trim(),
        content,
        published,
      };
      const r = await fetch(url, {
        method: "POST",
        headers: { "x-admin-token": token, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.json().catch(() => ({}));
        throw new Error((t as { message?: string })?.message ?? `저장 실패 (${r.status})`);
      }
      reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(u: UpdateNote) {
    try {
      const r = await fetch(`/api/admin/updates/${u.id}/update`, {
        method: "POST",
        headers: { "x-admin-token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ published: !u.published }),
      });
      if (!r.ok) throw new Error(`상태 변경 실패 (${r.status})`);
      await load();
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function del(u: UpdateNote) {
    if (!window.confirm(`업데이트 "${u.title}" 를 삭제할까요?`)) return;
    try {
      const r = await fetch(`/api/admin/updates/${u.id}/delete`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      if (!r.ok) throw new Error(`삭제 실패 (${r.status})`);
      if (editingId === u.id) reset();
      await load();
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      {/* 작성/수정 폼 */}
      <form onSubmit={submit} className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-100">
            {editingId ? "✏️ 업데이트 수정" : "🆕 새 업데이트 등록"}
          </h3>
          {editingId && (
            <button type="button" onClick={reset} className="text-xs text-gray-500 hover:text-gray-300">
              + 새 업데이트 작성
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="버전 (선택) 예: v1.4.0"
            maxLength={40}
            className="input h-10 w-48"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="업데이트 제목"
            maxLength={120}
            className="input h-10 min-w-[200px] flex-1"
          />
        </div>

        {/* 태그 삽입 툴바 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-gray-500">태그 삽입</span>
          {TAG_BUTTONS.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => insertLinePrefix(b.prefix)}
              className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-colors ${b.cls}`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={"[신규] 새로 추가된 기능을 적어요\n[개선] 개선한 점을 적어요\n[수정] 고친 버그를 적어요"}
          rows={8}
          maxLength={20000}
          className="input resize-y font-mono text-[13px] leading-relaxed"
        />

        {/* 작성 규칙 안내 */}
        <div className="rounded-lg border border-line bg-surface-2/50 p-3 text-xs leading-relaxed text-gray-500">
          <p className="mb-1.5 font-bold text-gray-400">✍️ 작성 규칙</p>
          <ul className="space-y-1">
            <li>· 한 줄에 한 항목씩 작성해요.</li>
            <li>
              · 변경 유형은 줄 맨 앞에{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[11px] text-gray-300">[신규]</code>{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[11px] text-gray-300">[개선]</code>{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[11px] text-gray-300">[수정]</code>{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[11px] text-gray-300">[긴급]</code>{" "}
              를 붙이면 색상 태그로 표시돼요. (위 버튼으로 바로 삽입 가능)
            </li>
            <li>
              · 태그 없이{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[11px] text-gray-300">-</code> 로
              시작하면 일반 불릿, 빈 줄은 문단 구분이에요.
            </li>
          </ul>
        </div>

        {/* 실시간 미리보기 */}
        {(title.trim() || content.trim()) && (
          <div className="rounded-lg border border-dashed border-line bg-surface-2/30 p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">미리보기</div>
            <div className="flex flex-wrap items-center gap-2">
              {version.trim() && (
                <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-300">
                  {version.trim()}
                </span>
              )}
              {!published && <span className="chip bg-surface-3 text-gray-500">초안</span>}
            </div>
            {title.trim() && <h4 className="mt-1.5 text-base font-bold text-gray-50">{title}</h4>}
            {content.trim() && <UpdateBody content={content} className="mt-2.5" />}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 accent-[rgb(var(--primary))]"
            />
            발행(체크 해제 시 초안 — 공개 화면에 노출되지 않음)
          </label>
          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={reset} className="btn-ghost">
                취소
              </button>
            )}
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? "저장 중…" : editingId ? "수정 저장" : "등록"}
            </button>
          </div>
        </div>
        {error && <p className="rounded-md bg-lose/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      </form>

      {/* 목록 */}
      <div className="space-y-2">
        <div className="text-sm text-gray-400">
          등록된 업데이트 <b className="text-gray-200">{list.length}</b>개
        </div>
        {loading ? (
          <div className="card p-8 text-center text-sm text-gray-500">불러오는 중…</div>
        ) : list.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500">등록된 업데이트가 없습니다.</div>
        ) : (
          <ul className="space-y-2">
            {list.map((u) => (
              <li key={u.id} className="card flex items-center gap-3 p-3">
                {u.version ? (
                  <span className="chip shrink-0 bg-primary/15 font-bold text-primary">{u.version}</span>
                ) : (
                  <span className="chip shrink-0 bg-surface-3 text-gray-500">버전없음</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-gray-100">{u.title}</span>
                    {!u.published && (
                      <span className="chip shrink-0 bg-surface-3 text-gray-500">초안</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{fmtDate(u.createdAt)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePublish(u)}
                  className="btn-ghost h-8 shrink-0 px-3 text-xs"
                >
                  {u.published ? "숨기기" : "발행"}
                </button>
                <button
                  type="button"
                  onClick={() => edit(u)}
                  className="btn-ghost h-8 shrink-0 px-3 text-xs"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => del(u)}
                  className="h-8 shrink-0 rounded-md border border-lose/40 px-3 text-xs font-semibold text-red-300 transition-colors hover:bg-lose/10"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
