"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { groupByCharacter, type Costume } from "@/lib/costumes";

interface ImportResult {
  ok?: boolean;
  character?: string | null;
  year?: number | null;
  imagesWritten?: number;
  missing?: string[];
  db?: { inserted?: number; updated?: number; total?: number; mode?: string } | null;
  message?: string;
}

/**
 * 코스튬 관리 — ZIP 업로드(이미지 저장 + DB 적재)와 등록된 코스튬 조회/삭제.
 * 업로드는 로컬 개발 환경에서 실행해야 이미지가 public/costumes 에 저장된다.
 */
export default function CostumeManager({ token }: { token: string }) {
  const [list, setList] = useState<Costume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/costumes`, { cache: "no-store" });
      if (!r.ok) throw new Error(`코스튬 조회 실패 (${r.status})`);
      setList((await r.json()) as Costume[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/admin/costumes/import?mode=${replace ? "replace" : "upsert"}`, {
        method: "POST",
        headers: { "x-admin-token": token }, // multipart 경계는 브라우저가 자동 설정
        body: fd,
      });
      const data = (await r.json().catch(() => ({}))) as ImportResult;
      if (!r.ok) throw new Error(data?.message ?? `업로드 실패 (${r.status})`);
      setResult(data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function del(c: Costume) {
    if (!window.confirm(`"${c.characterName} · ${c.costumeName}" 코스튬을 삭제할까요?\n(이미지 파일은 그대로 남습니다)`))
      return;
    try {
      const r = await fetch(`/api/admin/costumes/${c.id}`, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      });
      if (!r.ok) throw new Error(`삭제 실패 (${r.status})`);
      await load();
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  const groups = groupByCharacter(list);

  return (
    <div className="space-y-4">
      {/* 업로드 폼 */}
      <form onSubmit={onUpload} className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-100">📦 코스튬 ZIP 업로드</h3>
          <span className="text-xs text-gray-500">전체 {list.length}종 등록됨</span>
        </div>

        <p className="text-xs leading-relaxed text-gray-500">
          ZIP 형식: 내부에 <code className="text-gray-300">CSV</code>(image_file, character_name,
          release_year, costume_name)와 <code className="text-gray-300">images/*.png</code>. 이미지는{" "}
          <code className="text-gray-300">public/costumes/&#123;연도&#125;/</code> 에 저장됩니다.
          <br />
          <b className="text-gray-400">로컬 개발 환경에서 업로드</b>한 뒤 public/costumes 를 커밋·배포해야 실서비스에 반영됩니다.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full max-w-xs text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-200 hover:file:bg-surface-3"
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
              className="h-3.5 w-3.5 accent-[rgb(var(--primary))]"
            />
            같은 캐릭터·연도 세트 교체(replace)
          </label>
          <button
            type="submit"
            disabled={!file || uploading}
            className="btn-primary ml-auto disabled:opacity-50"
          >
            {uploading ? "업로드 중…" : "업로드"}
          </button>
        </div>

        {error && <p className="rounded-md bg-lose/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        {result?.ok && (
          <div className="rounded-md bg-win/10 px-3 py-2 text-sm text-blue-200">
            <b>{result.character}</b> {result.year} — 이미지 {result.imagesWritten}개 저장 ·{" "}
            추가 {result.db?.inserted ?? 0} · 갱신 {result.db?.updated ?? 0} (전체 {result.db?.total ?? 0}종)
            {result.missing && result.missing.length > 0 && (
              <div className="mt-1 text-xs text-amber-300">
                이미지 누락 {result.missing.length}건: {result.missing.join(", ")}
              </div>
            )}
          </div>
        )}
      </form>

      {/* 등록된 코스튬 (캐릭터별) */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-gray-500">불러오는 중…</div>
      ) : groups.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">등록된 코스튬이 없습니다.</div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.characterName} className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-100">{g.characterName}</h4>
                <span className="chip bg-surface-2 text-gray-400">{g.costumes.length}종</span>
                <span className="text-xs text-gray-500">{g.years.join(" · ")}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {g.costumes.map((c) => (
                  <div key={c.id} className="card overflow-hidden">
                    <div className="aspect-[436/567] w-full bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.imagePath}
                        alt={c.costumeName}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-1 p-1.5">
                      <span className="min-w-0 flex-1 truncate text-[11px] text-gray-300" title={c.costumeName}>
                        {c.costumeName}
                      </span>
                      <button
                        type="button"
                        onClick={() => del(c)}
                        aria-label="삭제"
                        className="shrink-0 rounded px-1 text-xs text-red-300 hover:bg-lose/10"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
