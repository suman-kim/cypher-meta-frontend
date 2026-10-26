"use client";

/**
 * 금칙어 관리 — 목록 조회(검색), 여러 단어 한 번에 추가, 삭제, 기본 금칙어 추가.
 * 백엔드 /community/admin/banned-words 를 관리자 커뮤니티 프록시(/api/admin/community/*)로 호출한다.
 */
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface BannedWordRow {
  id: number;
  word: string;
  createdAt: string;
}
interface AddResult {
  added: string[];
  skipped: string[];
}

const BASE = "/api/admin/community/banned-words";

/**
 * 입력창 문자열을 단어 목록으로 나눈다(쉼표·줄바꿈 구분, 빈 값 제거).
 * @param raw — 입력창 원문
 * @returns 단어 배열
 */
function splitWords(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((w) => w.trim())
    .filter(Boolean);
}

/**
 * 추가 결과 안내 문구.
 * @param r — 백엔드 추가 결과
 * @returns "3개 추가 · 1개 건너뜀(이미 있거나 기호만 있는 단어: …)" 형태
 */
function resultText(r: AddResult): string {
  const parts = [`${r.added.length}개 추가`];
  if (r.skipped.length) {
    parts.push(`${r.skipped.length}개 건너뜀(이미 있거나 기호만 있는 단어: ${r.skipped.join(", ")})`);
  }
  return parts.join(" · ");
}

/** 금칙어 관리 패널 */
export default function BannedWordManager({ token }: { token: string }) {
  const [items, setItems] = useState<BannedWordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(BASE, { headers: { "x-admin-token": token } });
      if (!r.ok) throw new Error(`목록 조회 실패 (${r.status})`);
      setItems((await r.json()) as BannedWordRow[]);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  /** 관리자 POST 호출 — 실패하면 백엔드 메시지로 에러를 던진다 */
  async function post<T>(url: string, body?: unknown): Promise<T> {
    const r = await fetch(url, {
      method: "POST",
      headers: { "x-admin-token": token, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (data as { message?: string | string[] })?.message;
      throw new Error((Array.isArray(msg) ? msg.join(", ") : msg) ?? `요청 실패 (${r.status})`);
    }
    return data as T;
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const words = splitWords(input);
    if (words.length === 0) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const r = await post<AddResult>(BASE, { words });
      setNotice(resultText(r));
      setInput("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addDefaults() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const r = await post<AddResult>(`${BASE}/defaults`);
      setNotice(`기본 금칙어 ${resultText(r)}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: BannedWordRow) {
    setDeleting(row.id);
    setError(null);
    try {
      await post(`${BASE}/${row.id}/delete`);
      setItems((prev) => prev.filter((x) => x.id !== row.id));
      setNotice(`"${row.word}" 삭제됨`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  const q = filter.trim().toLowerCase();
  const shown = useMemo(
    () => (q ? items.filter((x) => x.word.toLowerCase().includes(q)) : items),
    [items, q],
  );

  return (
    <div className="space-y-3">
      {/* 안내 + 추가 */}
      <div className="card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-bold text-gray-100">금칙어 추가</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            게시판·업데이트 노트의 글과 댓글(제목·내용·닉네임)에 아래 단어가 들어가면 등록되지 않고, 작성자에게 걸린
            부분이 표시됩니다. 기호를 끼우거나 띄어 쓴 표기(씨.발 · 씨 발)도 함께 걸러지고, 영문은 대소문자를 구분하지
            않습니다.
          </p>
        </div>
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            maxLength={5000}
            placeholder="추가할 단어 (쉼표나 줄바꿈으로 여러 개 입력)"
            className="input min-w-0 flex-1 resize-y"
          />
          <div className="flex gap-2 sm:flex-col">
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary flex-1 disabled:opacity-50">
              추가
            </button>
            <button type="button" onClick={addDefaults} disabled={busy} className="btn-ghost flex-1 whitespace-nowrap disabled:opacity-50">
              기본 금칙어 추가
            </button>
          </div>
        </form>
        {notice && <p className="text-xs text-primary">{notice}</p>}
        {error && <p className="rounded-md bg-lose/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      </div>

      {/* 목록 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-400">
          등록된 금칙어 <b className="text-gray-200">{items.length.toLocaleString("ko-KR")}</b>개
          {q && <span className="text-gray-500"> · 검색 결과 {shown.length}개</span>}
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="금칙어 검색"
          className="input h-9 w-44"
        />
      </div>

      <div className="card p-4">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-500">불러오는 중…</p>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            {q ? "검색 결과가 없습니다." : "등록된 금칙어가 없습니다. 위에서 추가하거나 기본 금칙어를 넣어 보세요."}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {shown.map((row) => (
              <li
                key={row.id}
                title={`등록 ${new Date(row.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 py-1 pl-2.5 pr-1 text-sm text-gray-200"
              >
                <span className="break-all">{row.word}</span>
                <button
                  type="button"
                  onClick={() => remove(row)}
                  disabled={deleting === row.id}
                  aria-label={`${row.word} 삭제`}
                  className="grid h-5 w-5 place-items-center rounded text-gray-500 transition-colors hover:bg-lose/15 hover:text-lose disabled:opacity-40"
                >
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
