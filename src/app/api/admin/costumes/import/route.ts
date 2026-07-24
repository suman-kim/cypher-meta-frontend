import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { readZipEntries } from "@/lib/unzip";

/**
 * 코스튬 ZIP 업로드 처리(관리자).
 * ------------------------------------------------------------------
 * 흐름:
 *   1) multipart 로 받은 ZIP 을 메모리에서 해제(내장 zlib, 외부 의존성 없음)
 *   2) 안의 CSV(image_file, character_name, release_year, costume_name) 파싱
 *   3) CSV 행과 이미지 파일명을 매칭해 public/costumes/{연도}/{파일명} 에 저장
 *   4) 저장된 이미지 웹 경로를 담은 rows 를 백엔드 /costumes/import 로 보내 DB upsert
 *
 * 이미지 파일은 프론트 public 폴더(=CDN 정적 서빙)에 저장한다. 이는 Vercel 서버리스
 * 함수로 이미지를 서빙하는 것보다 훨씬 가볍고 빠르다(함수 호출 0, CDN 캐시).
 * 다만 Vercel 배포 런타임은 디스크가 읽기전용/휘발성이라 여기서 저장이 불가하므로,
 * 업로드는 로컬 개발 환경에서 수행하고 public/costumes 를 커밋·배포하는 흐름을 쓴다.
 * ------------------------------------------------------------------
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";
const PUBLIC_DIR = path.join(process.cwd(), "public");

interface ParsedRow {
  imageFile: string;
  characterName: string;
  releaseYear: number;
  costumeName: string;
}
interface OutRow extends ParsedRow {
  imagePath: string;
  seq: number;
}

/** CSV(utf-8-sig) 파싱. 코스튬명에 콤마가 있어도 안전하게 마지막 컬럼으로 합친다. */
function parseCsv(text: string): ParsedRow[] {
  const clean = text.replace(/^﻿/, ""); // BOM 제거
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: ParsedRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && /image_file/i.test(line)) continue; // 헤더 스킵
    const parts = line.split(",");
    if (parts.length < 4) continue;
    const imageFile = parts[0].trim();
    const characterName = parts[1].trim();
    const releaseYear = parseInt(parts[2].trim(), 10);
    const costumeName = parts.slice(3).join(",").trim();
    if (!imageFile || !characterName || !Number.isFinite(releaseYear) || !costumeName) continue;
    out.push({ imageFile, characterName, releaseYear, costumeName });
  }
  return out;
}

/** 파일명 끝 번호(luis_00.png → 0)를 세트 정렬 순서로 사용. */
function seqFromName(file: string): number {
  const base = file.split("/").pop() ?? file;
  const m = base.match(/_(\d+)\.[a-zA-Z0-9]+$/);
  return m ? parseInt(m[1], 10) : 0;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token") ?? "";
  if (!token) return NextResponse.json({ message: "관리자 토큰이 필요합니다." }, { status: 401 });

  // Vercel 런타임에선 이미지를 영구 저장할 수 없음 → 로컬 실행 안내
  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        message:
          "프로덕션(Vercel)에서는 이미지가 디스크에 저장되지 않습니다. 로컬 개발 환경에서 업로드한 뒤 public/costumes 를 커밋·배포하세요.",
      },
      { status: 400 },
    );
  }

  const mode = (req.nextUrl.searchParams.get("mode") as "upsert" | "replace") || "upsert";

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: "폼 데이터를 읽을 수 없습니다." }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ message: "ZIP 파일이 필요합니다." }, { status: 400 });
  }

  const buf = Buffer.from(await (file as File).arrayBuffer());

  let entries: { name: string; data: Buffer }[];
  try {
    entries = readZipEntries(buf);
  } catch {
    return NextResponse.json({ message: "ZIP 파일을 열 수 없습니다." }, { status: 400 });
  }

  // CSV 엔트리 찾기
  const csvEntry = entries.find(
    (e) => !e.name.endsWith("/") && e.name.toLowerCase().endsWith(".csv"),
  );
  if (!csvEntry) {
    return NextResponse.json({ message: "ZIP 안에 CSV 파일이 없습니다." }, { status: 400 });
  }

  const parsed = parseCsv(csvEntry.data.toString("utf8"));
  if (parsed.length === 0) {
    return NextResponse.json(
      { message: "CSV 에서 유효한 코스튬 행을 찾지 못했습니다." },
      { status: 400 },
    );
  }

  // 이미지 엔트리 맵 (basename → data)
  const imgByBase = new Map<string, Buffer>();
  for (const e of entries) {
    const name = e.name.split("/").pop() ?? e.name;
    if (/\.(png|jpe?g|webp|gif)$/i.test(name)) imgByBase.set(name, e.data);
  }

  const rows: OutRow[] = [];
  const written: string[] = [];
  const missing: string[] = [];

  for (const r of parsed) {
    const base = r.imageFile.split("/").pop() ?? r.imageFile;
    const data = imgByBase.get(base);
    if (!data) {
      missing.push(r.imageFile);
      continue;
    }
    const destDir = path.join(PUBLIC_DIR, "costumes", String(r.releaseYear));
    try {
      await fs.mkdir(destDir, { recursive: true });
      await fs.writeFile(path.join(destDir, base), data);
    } catch (e) {
      return NextResponse.json(
        { message: `이미지 저장 실패(${base}): ${(e as Error).message}` },
        { status: 500 },
      );
    }
    written.push(base);
    rows.push({
      ...r,
      imagePath: `/costumes/${r.releaseYear}/${base}`,
      seq: seqFromName(base),
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { message: "CSV 행과 매칭되는 이미지가 없습니다.", missing },
      { status: 400 },
    );
  }

  // 백엔드로 DB upsert 위임
  let dbResult: any = null;
  try {
    const r = await fetch(`${API}/costumes/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ rows, mode }),
      cache: "no-store",
    });
    dbResult = await r.json().catch(() => null);
    if (!r.ok) {
      return NextResponse.json(
        {
          message: dbResult?.message ?? `DB 저장 실패 (${r.status})`,
          imagesWritten: written.length,
        },
        { status: r.status },
      );
    }
  } catch (e) {
    return NextResponse.json(
      {
        message: `백엔드 서버(:4000)에 연결할 수 없습니다: ${(e as Error).message}`,
        imagesWritten: written.length,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    character: parsed[0]?.characterName ?? null,
    year: parsed[0]?.releaseYear ?? null,
    imagesWritten: written.length,
    missing,
    db: dbResult,
  });
}
