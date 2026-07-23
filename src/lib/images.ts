/**
 * Neople 이미지 리소스 URL 헬퍼.
 * 이미지 서버는 공개 리소스라 API 키가 필요 없습니다.
 */

const IMG_BASE = "https://img-api.neople.co.kr/cy";

/** 캐릭터 이미지. zoom: 1(작게) ~ 3(크게) */
export function characterImage(characterId?: string, zoom: 1 | 2 | 3 = 2): string {
  if (!characterId) return "";
  return `${IMG_BASE}/characters/${characterId}?zoom=${zoom}`;
}

/** 아이템 이미지 */
export function itemImage(itemId?: string): string {
  if (!itemId) return "";
  return `${IMG_BASE}/items/${itemId}`;
}

/** 포지션 속성 이미지 */
export function positionAttributeImage(attributeId?: string): string {
  if (!attributeId) return "";
  return `${IMG_BASE}/position/attribute/${attributeId}`;
}
