"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
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

type UpStatus = "pending" | "processing" | "done" | "error";
interface UpItem {
  name: string;
  status: UpStatus;
  summary?: string;
  error?: string;
}

function fmtSize(n: number): string {
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 코스튬 관리 — ZIP **다중** 업로드(드래그&드롭/여러 개 선택) + 등록된 코스튬 조회/삭제.
 * 파일별로 순차 처리하며 진행 상태를 표시한다. 업로드는 로컬 개발 환경에서 실행해야
 * 이미지가 public/costumes 에 저장된다(Vercel 런타임은 디스크 휘발).
 */
export default function CostumeManager({ token }: { token: string }) {
  const [list, setList] = useState<Costume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [replace, setReplace] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<UpItem[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
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

  /** 파일 추가(.zip 만, 이름+크기로 중복 제거) */
  function addFiles(incoming: FileList | File[]) {
    const zips = Array.from(incoming).filter((f) => /\.zip$/i.test(f.name));
    if (zips.length === 0) return;
    setUploads(null);
    setFiles((prev) => {
      const key = (f: File) => `${f.name}__${f.size}`;
      const seen = new Set(prev.map(key));
      return [...prev, ...zips.filter((f) => !seen.has(key(f)))];
    });
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    if (fileRef.current) fileRef.current.value = ""; // 같은 파일 다시 선택 가능하게
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }
  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onUpload() {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setError(null);
    const queue = files;
    setUploads(queue.map((f) => ({ name: f.name, status: "pending" as UpStatus })));

    for (let i = 0; i < queue.length; i++) {
      setUploads((prev) =>
        prev ? prev.map((u, idx) => (idx === i ? { ...u, status: "processing" } : u)) : prev,
      );
      try {
        const fd = new FormData();
        fd.append("file", queue[i]);
        const r = await fetch(`/api/admin/costumes/import?mode=${replace ? "replace" : "upsert"}`, {
          method: "POST",
          headers: { "x-admin-token": token }, // multipart 경계는 브라우저가 설정
          body: fd,
        });
        const data = (await r.json().catch(() => ({}))) as ImportResult;
        if (!r.ok) throw new Error(data?.message ?? `업로드 실패 (${r.status})`);
        const miss = data.missing && data.missing.length ? ` · 누락 ${data.missing.length}` : "";
        const summary = `${data.character ?? ""} ${data.year ?? ""} · 이미지 ${data.imagesWritten ?? 0} · 추가 ${
          data.db?.inserted ?? 0
        }/갱신 ${data.db?.updated ?? 0}${miss}`;
        setUploads((prev) =>
          prev ? prev.map((u, idx) => (idx === i ? { ...u, status: "done", summary } : u)) : prev,
        );
      } catch (e) {
        setUploads((prev) =>
          prev ? prev.map((u, idx) => (idx === i ? { ...u, status: "error", error: (e as Error).message } : u)) : prev,
        );
      }
    }

    setUploading(false);
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
    await load();
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
  const doneCount = uploads?.filter((u) => u.status === "done").length ?? 0;
  const errCount = uploads?.filter((u) => u.status === "error").length ?? 0;

  return (
    <div className="space-y-4">
      {/* 업로드 카드 */}
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-100">📦 코스튬 ZIP 업로드 <span className="text-gray-500">(여러 개 가능)</span></h3>
          <span className="text-xs text-gray-500">전체 {list.length}종 등록됨</span>
        </div>

        <p className="text-xs leading-relaxed text-gray-500">
          ZIP 형식: 내부에 <code className="text-gray-300">CSV</code>(image_file, character_name, release_year,
          costume_name)와 <code className="text-gray-300">images/*.png</code>. 이미지는{" "}
          <code className="text-gray-300">public/costumes/&#123;연도&#125;/</code> 에 저장됩니다.
          <br />
          <b className="text-gray-400">로컬 개발 환경에서 업로드</b>한 뒤 public/costumes 를 커밋·배포해야 실서비스에 반영됩니다.
        </p>

        {/* 드래그&드롭 존 */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-line bg-surface-2 hover:border-primary/50"
          }`}
        >
          <svg className="h-7 w-7 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M20 16.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5" />
          </svg>
          <div className="text-sm font-semibold text-gray-200">ZIP 파일을 끌어다 놓거나 클릭해서 선택</div>
          <div className="text-xs text-gray-500">여러 개 한 번에 선택할 수 있어요</div>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            multiple
            onChange={onInputChange}
            className="hidden"
          />
        </div>

        {/* 선택된 파일 큐 */}
        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((f, i) => (
              <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                <span className="text-gray-500">📦</span>
                <span className="min-w-0 flex-1 truncate text-gray-200" title={f.name}>{f.name}</span>
                <span className="shrink-0 text-xs text-gray-500">{fmtSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={uploading}
                  aria-label="제거"
                  className="shrink-0 text-gray-500 hover:text-lose disabled:opacity-40"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 컨트롤 */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
              className="h-3.5 w-3.5 accent-[rgb(var(--primary))]"
            />
            같은 캐릭터·연도 세트 교체(replace)
          </label>
          <div className="ml-auto flex items-center gap-2">
            {files.length > 0 && !uploading && (
              <button type="button" onClick={() => setFiles([])} className="btn-ghost px-3 py-1.5 text-sm">
                모두 지우기
              </button>
            )}
            <button
              type="button"
              onClick={onUpload}
              disabled={files.length === 0 || uploading}
              className="btn-primary disabled:opacity-50"
            >
              {uploading ? "업로드 중…" : files.length > 0 ? `${files.length}개 업로드` : "업로드"}
            </button>
          </div>
        </div>

        {error && <p className="rounded-md bg-lose/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        {/* 파일별 결과 */}
        {uploads && (
          <div className="space-y-1.5">
            <div className="text-xs text-gray-500">
              결과 · 완료 <b className="text-blue-300">{doneCount}</b>
              {errCount > 0 && <> · 실패 <b className="text-red-300">{errCount}</b></>}
            </div>
            <ul className="space-y-1.5">
              {uploads.map((u, i) => (
                <li
                  key={`${u.name}-${i}`}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    u.status === "error" ? "border-lose/30 bg-lose/10" : "border-line bg-surface-2"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="shrink-0">
                      {u.status === "done" ? "✅" : u.status === "error" ? "⚠️" : u.status === "processing" ? "⏳" : "•"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-gray-200" title={u.name}>{u.name}</span>
                    {u.status === "processing" && <span className="shrink-0 text-xs text-gray-500">처리 중…</span>}
                  </div>
                  {u.status === "done" && u.summary && (
                    <div className="mt-0.5 pl-6 text-xs text-blue-200">{u.summary}</div>
                  )}
                  {u.status === "error" && u.error && (
                    <div className="mt-0.5 pl-6 text-xs text-red-300">{u.error}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
                      <img src={c.imagePath} alt={c.costumeName} loading="lazy" className="h-full w-full object-contain" />
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
