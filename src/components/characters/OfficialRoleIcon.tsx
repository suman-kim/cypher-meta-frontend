/**
 * OfficialRoleIcon — 공식 역할군 아이콘(사이퍼즈 공식 "역할군 시스템 안내"의 아이콘 이미지).
 * 이미지는 public/icons/roles/{영문 키}.png (43×44 투명 PNG)에 포함해 공식 서버 상태와 무관하게 쓴다.
 * 공식 역할군이 아닌 값("미확정" 등)은 회색 점으로 대신 표시한다.
 * 이미지 저작권: 넥슨/네오플 (푸터에 출처 표기).
 */
import { roleByKey, roleByName, UNKNOWN_ROLE_COLOR } from "@/lib/official";

/**
 * @param role — 공식 역할군 한글명(예: "리퍼") 또는 영문 키(예: "reaper")
 * @param size — 표시 크기(px, 기본 16)
 * @param className — 추가 클래스
 */
export function OfficialRoleIcon({
  role,
  size = 16,
  className = "",
}: {
  role: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const def = roleByName(role) ?? roleByKey(role);
  if (!def) {
    return (
      <span
        className={`inline-block shrink-0 rounded-full ${className}`}
        style={{ width: Math.max(6, size / 2.5), height: Math.max(6, size / 2.5), backgroundColor: UNKNOWN_ROLE_COLOR }}
        aria-hidden
      />
    );
  }
  return (
    // 작은 정적 아이콘이라 next/image 최적화 없이 그대로 쓴다
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/roles/${def.key}.png`}
      alt={def.name}
      title={def.name}
      width={size}
      height={size}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
