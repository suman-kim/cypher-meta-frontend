import { NextResponse } from "next/server";

// 코스튬 import는 이미지 파일을 public/costumes 에 저장(fs)해야 해서 Edge/서버리스에선 불가.
// 로컬 개발 환경에서 실행 후 생성된 이미지를 커밋하는 방식으로 운영한다.
export const runtime = "edge";

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "코스튬 import는 로컬에서 실행하세요 (Edge 런타임 미지원)." },
    { status: 501 },
  );
}
