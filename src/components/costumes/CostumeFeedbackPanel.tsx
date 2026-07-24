"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { relativeTime } from "@/lib/format";
import type { Costume } from "@/lib/costumes";
import {
  createFeedback,
  deleteFeedback,
  formatPrice,
  getFeedback,
  resolveFeedback,
  type Feedback,
  type FeedbackData,
} from "@/lib/costume-feedback";

/** 사이퍼즈 코스튬 거래 단위 — 주괴 */
const PRICE_UNIT = "주괴";
const FIELDS: { v: string; label: string }[] = [
  { v: "name", label: "이름" },
  { v: "year", label: "출시년도" },
  { v: "image", label: "이미지" },
  { v: "etc", label: "기타" },
];
function fieldLabel(v: string): string {
  return FIELDS.find((f) => f.v === v)?.label ?? "기타";
}

/**
 * 코스튬 상세 피드백 패널 — 현재 시세 신고 + 정보 수정 요청.
 * 익명(닉네임 + 선택 비밀번호)으로 작성하고, 비밀번호를 남기면 본인이 삭제할 수 있다.
 * 브라우저에 관리자 토큰(cy_admin_token)이 있으면 비번 없이 삭제/반영완료 처리 가능.
 */
export default function CostumeFeedbackPanel({ costume }: { costume: Costume }) {
  const [tab, setTab] = useState<"price" | "correction">("price");
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // 시세 폼
  const [pPrice, setPPrice] = useState("");
  const [pMemo, setPMemo] = useState("");
  // 수정요청 폼
  const [cField, setCField] = useState(FIELDS[0].v);
  const [cContent, setCContent] = useState("");
  // 공통(닉네임/비번)
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // 삭제 인라인 상태
  const [delId, setDelId] = useState<number | null>(null);
  const [delPw, setDelPw] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);

  useEffect(() => {
    setAdminToken(typeof window !== "undefined" ? window.localStorage.getItem("cy_admin_token") : null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getFeedback(costume.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [costume.id]);

  // 코스튬이 바뀌면 리로드 + 입력/삭제 상태 초기화
  useEffect(() => {
    load();
    setFormErr(null);
    setDelId(null);
    setDelPw("");
    setPPrice("");
    setPMemo("");
    setCContent("");
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormErr(null);
    try {
      if (tab === "price") {
        const priceNum = Math.floor(Number(pPrice.replace(/[,\s]/g, "")));
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
          setFormErr("시세(가격)를 올바르게 입력해주세요.");
          return;
        }
        setBusy(true);
        await createFeedback(costume.id, {
          kind: "price",
          price: priceNum,
          priceUnit: PRICE_UNIT,
          content: pMemo.trim() || undefined,
          authorName: name.trim() || undefined,
          password: pw.trim() || undefined,
        });
        setPPrice("");
        setPMemo("");
      } else {
        if (!cContent.trim()) {
          setFormErr("수정 요청 내용을 입력해주세요.");
          return;
        }
        setBusy(true);
        await createFeedback(costume.id, {
          kind: "correction",
          field: cField,
          content: cContent.trim(),
          authorName: name.trim() || undefined,
          password: pw.trim() || undefined,
        });
        setCContent("");
      }
      setPw("");
      await load();
    } catch (e) {
      setFormErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: Feedback, password?: string) {
    setDelErr(null);
    try {
      await deleteFeedback(item.id, { password, adminToken: adminToken ?? undefined });
      setDelId(null);
      setDelPw("");
      await load();
    } catch (e) {
      setDelErr((e as Error).message);
    }
  }

  async function toggleResolve(item: Feedback) {
    if (!adminToken) return;
    try {
      await resolveFeedback(item.id, item.status === "resolved" ? "open" : "resolved", adminToken);
      await load();
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  function onDeleteClick(item: Feedback) {
    if (adminToken) {
      if (window.confirm("이 항목을 삭제할까요?")) removeItem(item);
      return;
    }
    setDelId(delId === item.id ? null : item.id);
    setDelPw("");
    setDelErr(null);
  }

  const prices = data?.prices ?? [];
  const corrections = data?.corrections ?? [];
  const summary = data?.priceSummary ?? null;

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex items-center gap-1 rounded-full border border-line bg-bg-soft p-1">
        {(
          [
            ["price", "시세", prices.length],
            ["correction", "수정요청", corrections.length],
          ] as const
        ).map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k);
              setFormErr(null);
            }}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-bold transition-all ${
              tab === k ? "bg-surface text-primary shadow-sm ring-1 ring-line" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
            <span className={`ml-1 text-xs ${tab === k ? "text-primary/70" : "text-gray-600"}`}>{n}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-500">불러오는 중…</div>
      ) : error ? (
        <div className="rounded-lg bg-lose/10 px-3 py-2 text-sm text-red-300">{error}</div>
      ) : tab === "price" ? (
        <>
          {/* 현재 시세 요약 */}
          <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface-2 to-surface p-4">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-gray-500">
              현재 시세 <span className="font-semibold text-gray-600">(평균)</span>
            </div>
            {summary && summary.average != null ? (
              <>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-gray-50">{formatPrice(summary.average)}</span>
                  <span className="text-sm font-semibold text-primary">{summary.unit || "주괴"}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  시세 {summary.count}건 평균
                  {summary.min != null && summary.max != null && summary.min !== summary.max && (
                    <> · 최저 {formatPrice(summary.min)} ~ 최고 {formatPrice(summary.max)}</>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-gray-400">아직 시세 정보가 없어요. 첫 시세를 남겨보세요.</div>
            )}
          </div>

          {/* 시세 등록 폼 */}
          <form onSubmit={submit} className="rounded-2xl border border-line bg-surface-2 p-3.5">
            <div className="mb-2 text-xs font-bold text-gray-300">시세 등록</div>
            <div className="relative">
              <input
                inputMode="numeric"
                value={pPrice}
                onChange={(e) => setPPrice(e.target.value)}
                placeholder="가격"
                className="input pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary">
                {PRICE_UNIT}
              </span>
            </div>
            <input
              value={pMemo}
              onChange={(e) => setPMemo(e.target.value)}
              maxLength={200}
              placeholder="메모(선택) — 예: 급처, 시즌한정"
              className="input mt-2"
            />
            <CredsRow name={name} setName={setName} pw={pw} setPw={setPw} />
            {formErr && <p className="mt-2 text-xs text-red-300">{formErr}</p>}
            <div className="mt-2 flex justify-end">
              <button type="submit" disabled={busy} className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50">
                {busy ? "등록 중…" : "시세 등록"}
              </button>
            </div>
          </form>

          {/* 시세 목록 */}
          <ul className="space-y-2">
            {prices.length === 0 && (
              <li className="py-6 text-center text-sm text-gray-500">등록된 시세가 없습니다.</li>
            )}
            {prices.map((item) => (
              <li key={item.id} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-gray-50">{formatPrice(item.price)}</span>
                    <span className="text-xs font-semibold text-primary">{item.priceUnit}</span>
                  </div>
                  <DeleteBtn item={item} adminToken={adminToken} onClick={() => onDeleteClick(item)} />
                </div>
                {item.content && <p className="mt-1 break-words text-sm text-gray-300">{item.content}</p>}
                <div className="mt-1 text-[11px] text-gray-500">
                  {item.authorName ?? "익명"} · {relativeTime(item.createdAt)}
                </div>
                {delId === item.id && (
                  <DeleteForm
                    delPw={delPw}
                    setDelPw={setDelPw}
                    delErr={delErr}
                    onConfirm={() => removeItem(item, delPw)}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {/* 수정요청 폼 */}
          <form onSubmit={submit} className="rounded-2xl border border-line bg-surface-2 p-3.5">
            <div className="mb-2 text-xs font-bold text-gray-300">수정 요청</div>
            <select value={cField} onChange={(e) => setCField(e.target.value)} className="input">
              {FIELDS.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.label} 수정
                </option>
              ))}
            </select>
            <textarea
              value={cContent}
              onChange={(e) => setCContent(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="어떤 정보가 잘못됐는지, 올바른 값은 무엇인지 적어주세요."
              className="input mt-2 resize-y"
            />
            <CredsRow name={name} setName={setName} pw={pw} setPw={setPw} />
            {formErr && <p className="mt-2 text-xs text-red-300">{formErr}</p>}
            <div className="mt-2 flex justify-end">
              <button type="submit" disabled={busy} className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50">
                {busy ? "등록 중…" : "수정 요청"}
              </button>
            </div>
          </form>

          {/* 수정요청 목록 */}
          <ul className="space-y-2">
            {corrections.length === 0 && (
              <li className="py-6 text-center text-sm text-gray-500">등록된 수정 요청이 없습니다.</li>
            )}
            {corrections.map((item) => (
              <li key={item.id} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="chip bg-surface-2 text-gray-300">{fieldLabel(item.field)}</span>
                    <span
                      className={`chip ${
                        item.status === "resolved" ? "bg-up/15 text-green-300" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {item.status === "resolved" ? "반영완료" : "접수"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {adminToken && (
                      <button
                        type="button"
                        onClick={() => toggleResolve(item)}
                        className="text-[11px] font-semibold text-gray-400 hover:text-primary"
                      >
                        {item.status === "resolved" ? "되돌리기" : "반영완료"}
                      </button>
                    )}
                    <DeleteBtn item={item} adminToken={adminToken} onClick={() => onDeleteClick(item)} />
                  </div>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-gray-200">{item.content}</p>
                <div className="mt-1 text-[11px] text-gray-500">
                  {item.authorName ?? "익명"} · {relativeTime(item.createdAt)}
                </div>
                {delId === item.id && (
                  <DeleteForm
                    delPw={delPw}
                    setDelPw={setDelPw}
                    delErr={delErr}
                    onConfirm={() => removeItem(item, delPw)}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* 닉네임 + 비밀번호 입력 행 */
function CredsRow({
  name,
  setName,
  pw,
  setPw,
}: {
  name: string;
  setName: (v: string) => void;
  pw: string;
  setPw: (v: string) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="닉네임(선택)" className="input" />
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        maxLength={40}
        placeholder="비번(삭제용,선택)"
        className="input"
      />
    </div>
  );
}

/* 삭제 버튼 (관리자면 항상, 아니면 비번 있는 항목만 노출) */
function DeleteBtn({
  item,
  adminToken,
  onClick,
}: {
  item: Feedback;
  adminToken: string | null;
  onClick: () => void;
}) {
  if (!adminToken && !item.hasPassword) return null;
  return (
    <button type="button" onClick={onClick} aria-label="삭제" className="shrink-0 text-xs text-gray-500 hover:text-lose">
      삭제
    </button>
  );
}

/* 인라인 비밀번호 삭제 확인 폼 */
function DeleteForm({
  delPw,
  setDelPw,
  delErr,
  onConfirm,
}: {
  delPw: string;
  setDelPw: (v: string) => void;
  delErr: string | null;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="password"
        value={delPw}
        onChange={(e) => setDelPw(e.target.value)}
        placeholder="비밀번호"
        className="input h-8 w-32 py-1 text-xs"
        autoFocus
      />
      <button type="button" onClick={onConfirm} className="btn-primary px-2.5 py-1 text-xs">
        삭제 확인
      </button>
      {delErr && <span className="w-full text-xs text-red-300">{delErr}</span>}
    </div>
  );
}
