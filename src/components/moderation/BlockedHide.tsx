"use client";

/**
 * BlockedHide — 차단한 작성자의 글·댓글을 숨기는 감싸개(웹·앱 공용).
 * 서버 컴포넌트 목록의 각 줄을 감싸도 된다(자식은 서버에서 그린 그대로 넘어온다).
 * 서버 렌더·첫 화면에서는 그대로 보이고, 하이드레이션 뒤 차단 목록(이 기기)에 있으면 숨긴다.
 */
import type { ReactNode } from "react";
import { useIsBlocked } from "@/lib/moderation";

/**
 * @param name 작성자 닉네임
 * @param children 보여 줄 내용
 * @param placeholder 차단했을 때 대신 보일 내용(없으면 아무것도 안 보임)
 */
export default function BlockedHide({ name, children, placeholder = null }: { name: string | null | undefined; children: ReactNode; placeholder?: ReactNode }) {
  const blocked = useIsBlocked(name);
  return <>{blocked ? placeholder : children}</>;
}
