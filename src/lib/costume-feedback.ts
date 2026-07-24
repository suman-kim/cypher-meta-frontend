/** 코스튬 피드백(시세 신고 / 수정 요청) 클라이언트 — 동일 출처 프록시(app/api/costumes/*) 호출 */

export type FeedbackKind = "price" | "correction";

export interface Feedback {
  id: number;
  kind: FeedbackKind;
  price: number | null;
  priceUnit: string;
  field: string;
  content: string;
  authorName: string | null;
  status: string; // correction: open | resolved
  createdAt: string;
  hasPassword: boolean;
}

export interface FeedbackData {
  prices: Feedback[];
  corrections: Feedback[];
  priceSummary: {
    count: number;
    average: number | null;
    min: number | null;
    max: number | null;
    unit: string;
  };
}

async function readErr(r: Response): Promise<string> {
  const d = (await r.json().catch(() => null)) as { message?: string } | null;
  return d?.message ?? `요청 실패 (${r.status})`;
}

/** 코스튬 피드백 조회 */
export async function getFeedback(costumeId: number): Promise<FeedbackData> {
  const r = await fetch(`/api/costumes/${costumeId}/feedback`, { cache: "no-store" });
  if (!r.ok) throw new Error(await readErr(r));
  return r.json();
}

export interface CreateFeedbackBody {
  kind: FeedbackKind;
  price?: number;
  priceUnit?: string;
  field?: string;
  content?: string;
  authorName?: string;
  password?: string;
}

/** 코스튬 피드백 작성 */
export async function createFeedback(costumeId: number, body: CreateFeedbackBody): Promise<Feedback> {
  const r = await fetch(`/api/costumes/${costumeId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await readErr(r));
  return r.json();
}

/** 코스튬 피드백 삭제 (본인 비밀번호 또는 관리자 토큰) */
export async function deleteFeedback(
  id: number,
  opts: { password?: string; adminToken?: string } = {},
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.adminToken) headers["x-admin-token"] = opts.adminToken;
  const r = await fetch(`/api/costumes/feedback/${id}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ password: opts.password ?? "" }),
  });
  if (!r.ok) throw new Error(await readErr(r));
}

/** 수정요청 상태 변경 (관리자) */
export async function resolveFeedback(
  id: number,
  status: "open" | "resolved",
  adminToken: string,
): Promise<void> {
  const r = await fetch(`/api/admin/costumes/feedback/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error(await readErr(r));
}

/** 가격 포맷 (예: 1,200,000) */
export function formatPrice(n: number | null): string {
  if (n == null) return "-";
  return n.toLocaleString("ko-KR");
}
