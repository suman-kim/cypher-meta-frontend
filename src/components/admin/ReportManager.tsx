"use client";

/**
 * 신고 관리 — 사용자가 신고한 글·댓글을 대상별로 묶어 보고 처리한다(Play 사용자 제작 콘텐츠 정책).
 *  - 대기 중 / 처리됨 전환, 묶음마다 신고 건수·사유·신고자 설명·신고 당시 내용 사본·화면 링크.
 *  - 처리: 삭제(대상 지움) / 문제없음(신고만 닫음). 원하면 작성자 닉네임을 금칙어에 넣어 더 쓰지 못하게 한다.
 * 백엔드 /moderation/admin/* 를 관리자 신고 프록시(/api/admin/moderation/*)로 부른다.
 */
import { useCallback, useEffect, useState } from "react";
import { REPORT_REASONS } from "@/lib/moderation-core";

/** 대상별 신고 묶음(백엔드 ReportGroup) */
interface ReportGroup {
  /** 대상 종류(post / comment / update_comment) */
  targetType: string;
  /** 대상 ID */
  targetId: string;
  /** 신고 건수 */
  count: number;
  /** 사유별 건수 */
  reasons: Record<string, number>;
  /** 신고자 설명(최근 것부터) */
  details: string[];
  /** 처리 상태(pending / deleted / dismissed) */
  status: string;
  /** 제목 사본(댓글이면 소속 글·업데이트 제목) */
  title: string | null;
  /** 본문 사본 */
  content: string;
  /** 작성자 닉네임 사본 */
  authorName: string | null;
  /** 대상 화면 경로 */
  link: string | null;
  /** 첫 신고 시각 */
  firstReportedAt: string;
  /** 마지막 신고 시각 */
  lastReportedAt: string;
  /** 처리 시각 */
  handledAt: string | null;
}

/** 목록 응답 */
interface ReportPage {
  /** 이 페이지 묶음 */
  groups: ReportGroup[];
  /** 전체 묶음 수 */
  total: number;
  /** 현재 페이지 */
  page: number;
  /** 페이지 크기 */
  pageSize: number;
  /** 대기 중인 대상 수 */
  pendingTargets: number;
}

/** 처리 응답 */
interface ResolveResult {
  /** 지운 신고 행 수 */
  updated: number;
  /** 대상을 실제로 지웠는지 */
  removed: boolean;
  /** 금칙어 등록 결과 */
  banned: { word: string; added: boolean } | null;
}

/** 보기 */
type View = "pending" | "handled";

/** 대상 종류 이름 */
const TYPE_LABEL: Record<string, string> = { post: "글", comment: "댓글", update_comment: "업데이트 댓글" };
/** 처리 상태 이름 */
const STATUS_LABEL: Record<string, string> = { pending: "대기", deleted: "삭제함", dismissed: "문제없음" };
/** 사유 키 → 이름 */
const REASON_LABEL: Record<string, string> = Object.fromEntries(REPORT_REASONS.map((r) => [r.key, r.label]));
/** 프록시 주소 */
const BASE = "/api/admin/moderation/reports";
/** 페이지 크기 */
const PAGE_SIZE = 20;

/**
 * 몇 분/시간/일 전.
 * @param iso — 시각(ISO)
 * @returns 상대 시간 글자
 */
function ago(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/**
 * 신고 관리 패널.
 * @param props.token 관리자 토큰
 * @param props.onPendingChange 대기 중인 대상 수가 바뀌면 부른다(탭 배지용)
 */
export default function ReportManager({ token, onPendingChange }: { token: string; onPendingChange?: (n: number) => void }) {
  const [view, setView] = useState<View>("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${BASE}?view=${view}&page=${page}&pageSize=${PAGE_SIZE}`, { headers: { "x-admin-token": token } });
      if (!r.ok) throw new Error(r.status === 401 ? "관리자 토큰이 맞지 않습니다." : `목록을 불러오지 못했습니다 (${r.status})`);
      const d = (await r.json()) as ReportPage;
      setData(d);
      onPendingChange?.(d.pendingTargets);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, view, page, onPendingChange]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * 묶음 하나를 처리한다.
   * @param g — 대상 묶음
   * @param action — delete | dismiss
   * @param banAuthor — 작성자 닉네임 금칙어 등록 여부
   */
  async function resolve(g: ReportGroup, action: "delete" | "dismiss", banAuthor: boolean) {
    setNotice(null);
    setError(null);
    const r = await fetch(`${BASE}/resolve`, {
      method: "POST",
      headers: { "x-admin-token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: g.targetType, targetId: g.targetId, action, banAuthor }),
    });
    const body = (await r.json().catch(() => ({}))) as Partial<ResolveResult> & { message?: string | string[] };
    if (!r.ok) {
      const msg = Array.isArray(body.message) ? body.message.join(", ") : body.message;
      throw new Error(msg ?? `처리하지 못했습니다 (${r.status})`);
    }
    const parts: string[] = [];
    if (action === "delete") parts.push(body.removed ? `${TYPE_LABEL[g.targetType] ?? "대상"}을 삭제했어요` : "이미 지워진 대상이라 신고만 닫았어요");
    else parts.push("문제없음으로 닫았어요");
    if (body.banned) parts.push(body.banned.added ? `닉네임 '${body.banned.word}'을 금칙어에 넣었어요` : `닉네임 '${body.banned.word}'은 이미 금칙어에 있어요`);
    setNotice(parts.join(" · "));
    await load();
  }

  const groups = data?.groups ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="space-y-4">
      <div className="card p-5">
        <h2 className="text-base font-bold text-gray-100">신고 관리</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-500">
          사용자가 신고한 글·댓글이에요. 정책에 어긋나면 <b className="text-gray-300">삭제</b>, 괜찮으면 <b className="text-gray-300">문제없음</b>으로 닫아 주세요. 이용약관에 24시간 안에 확인한다고 안내하고 있어요.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
            {(
              [
                ["pending", `대기 중${data ? ` ${data.pendingTargets}` : ""}`],
                ["handled", "처리됨"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setView(key);
                  setPage(1);
                  setNotice(null);
                }}
                className={`segtab ${view === key ? "segtab-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={load} disabled={loading} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50">
            {loading ? "불러오는 중…" : "새로고침"}
          </button>
        </div>
        {notice && <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p>}
        {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      </div>

      {loading && !data ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="card h-36 animate-pulse bg-surface-2" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-sm font-semibold text-gray-200">{view === "pending" ? "처리할 신고가 없어요" : "처리한 신고가 없어요"}</p>
          <p className="mt-1 text-xs text-gray-500">{view === "pending" ? "새 신고가 들어오면 여기에 보여요." : "삭제하거나 문제없음으로 닫은 신고가 여기에 쌓여요."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <ReportCard key={`${g.targetType}:${g.targetId}`} g={g} onResolve={resolve} />
          ))}
        </div>
      )}

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1.5 disabled:opacity-40">
            이전
          </button>
          <span className="text-gray-500">
            {page} / {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1.5 disabled:opacity-40">
            다음
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * 대상 묶음 카드.
 * @param props.g 묶음
 * @param props.onResolve 처리(실패하면 오류를 던진다)
 */
function ReportCard({
  g,
  onResolve,
}: {
  g: ReportGroup;
  onResolve: (g: ReportGroup, action: "delete" | "dismiss", banAuthor: boolean) => Promise<void>;
}) {
  const [ban, setBan] = useState(false);
  const [busy, setBusy] = useState<"delete" | "dismiss" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const pending = g.status === "pending";
  const long = g.content.length > 220;

  /** 처리 버튼 */
  async function run(action: "delete" | "dismiss") {
    setBusy(action);
    setErr(null);
    try {
      await onResolve(g, action, ban);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="chip bg-surface-3 text-gray-300">{TYPE_LABEL[g.targetType] ?? g.targetType}</span>
        <span className="chip bg-amber-500/15 font-bold text-amber-400">신고 {g.count}건</span>
        {Object.entries(g.reasons).map(([k, n]) => (
          <span key={k} className="chip border border-line text-gray-400">
            {REASON_LABEL[k] ?? k} {n}
          </span>
        ))}
        {!pending && (
          <span className={`chip ${g.status === "deleted" ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
            {STATUS_LABEL[g.status] ?? g.status}
          </span>
        )}
        <span className="ml-auto text-gray-500" title={g.lastReportedAt}>
          {pending ? `마지막 신고 ${ago(g.lastReportedAt)}` : g.handledAt ? `${ago(g.handledAt)} 처리` : ""}
        </span>
      </div>

      {g.title && (
        <p className="mt-3 text-sm font-semibold text-gray-100">
          {g.targetType === "post" ? "" : g.targetType === "comment" ? "글: " : "업데이트: "}
          {g.title}
        </p>
      )}
      <div className="mt-2 rounded-lg bg-surface-2 px-3.5 py-3">
        <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200 ${long && !open ? "line-clamp-4" : ""}`}>{g.content}</p>
        {long && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-xs font-semibold text-primary">
            {open ? "접기" : "전체 보기"}
          </button>
        )}
        <p className="mt-2 text-xs text-gray-500">
          작성자 <b className="text-gray-300">{g.authorName ?? "익명"}</b> · 신고 당시 내용
        </p>
      </div>

      {g.details.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-gray-400">
          {g.details.map((d, i) => (
            <li key={i} className="border-l-2 border-line pl-2.5">
              {d}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {g.link && (
          <a href={g.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
            화면에서 보기 ↗
          </a>
        )}
        {pending && (
          <>
            {g.authorName && (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400" title="이 닉네임이 들어간 제목·내용·닉네임은 앞으로 쓸 수 없게 돼요">
                <input type="checkbox" checked={ban} onChange={(e) => setBan(e.target.checked)} />
                닉네임 &lsquo;{g.authorName}&rsquo; 작성 제한(금칙어 등록)
              </label>
            )}
            <span className="ml-auto flex gap-2">
              <button type="button" onClick={() => run("dismiss")} disabled={busy !== null} className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-50">
                {busy === "dismiss" ? "처리 중…" : "문제없음"}
              </button>
              <button
                type="button"
                onClick={() => run("delete")}
                disabled={busy !== null}
                className="rounded-lg bg-red-500/90 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {busy === "delete" ? "삭제 중…" : `${TYPE_LABEL[g.targetType] ?? "대상"} 삭제`}
              </button>
            </span>
          </>
        )}
      </div>
      {ban && pending && (
        <p className="mt-2 text-[11px] text-amber-400/90">금칙어는 제목·내용에도 적용돼요. 흔한 단어 닉네임이면 다른 사람의 글도 막힐 수 있어요.</p>
      )}
      {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
    </article>
  );
}
