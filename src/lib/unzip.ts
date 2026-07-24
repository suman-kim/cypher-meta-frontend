import { inflateRawSync } from "zlib";

/** ZIP 엔트리 1건 */
export interface ZipEntry {
  name: string;
  data: Buffer;
}

/**
 * 의존성 없는 최소 ZIP 리더 (Node 내장 zlib 기반).
 * ------------------------------------------------------------------
 * 중앙 디렉터리(End of Central Directory → Central Directory Header)를 파싱해
 * 각 엔트리의 압축 방식·압축크기·로컬헤더 오프셋을 읽고, 로컬 헤더에서 데이터 시작
 * 위치를 계산해 stored(0)/deflate(8) 를 해제한다. (adm-zip 등 외부 패키지 불필요)
 *
 * 파일명은 UTF-8 로 디코딩한다(코스튬 zip 은 Python zipfile UTF-8 플래그로 압축, 이미지명은 ASCII).
 * zip64/암호화는 다루지 않는다(수백 KB짜리 캡처 이미지 배치엔 불필요).
 * ------------------------------------------------------------------
 */
export function readZipEntries(buf: Buffer): ZipEntry[] {
  const EOCD_SIG = 0x06054b50; // End Of Central Directory
  const CDH_SIG = 0x02014b50; // Central Directory Header

  // EOCD 레코드를 파일 끝에서부터 탐색(주석 없는 zip 이면 마지막 22바이트).
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("EOCD not found (invalid zip)");

  const cdCount = buf.readUInt16LE(eocd + 10); // 중앙 디렉터리 엔트리 수
  const cdOffset = buf.readUInt32LE(eocd + 16); // 중앙 디렉터리 시작 오프셋

  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let n = 0; n < cdCount; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== CDH_SIG) break;
    const method = buf.readUInt16LE(p + 10); // 0=stored, 8=deflate
    const compSize = buf.readUInt32LE(p + 20); // 압축 크기(중앙 디렉터리 값은 항상 정확)
    const fnLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + fnLen);

    const next = p + 46 + fnLen + extraLen + commentLen;

    // 디렉터리 엔트리는 건너뜀
    if (!name.endsWith("/")) {
      // 로컬 헤더에서 실제 데이터 시작 위치 계산(로컬 파일명/extra 길이는 중앙과 다를 수 있음)
      const lfnLen = buf.readUInt16LE(localOff + 26);
      const lextraLen = buf.readUInt16LE(localOff + 28);
      const dataStart = localOff + 30 + lfnLen + lextraLen;
      const comp = buf.subarray(dataStart, dataStart + compSize);
      if (method === 0) {
        entries.push({ name, data: Buffer.from(comp) });
      } else if (method === 8) {
        entries.push({ name, data: inflateRawSync(comp) });
      }
      // 그 외 압축 방식은 스킵
    }
    p = next;
  }
  return entries;
}
