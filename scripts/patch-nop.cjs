#!/usr/bin/env node
/**
 * Cloudflare Pages (next-on-pages) 빌드 픽스 — async_hooks 번들링 에러 해결.
 *
 * next-on-pages@1.13.5 는 esbuild external 목록에 "node:*" 만 넣는다.
 * 그래서 Vercel 이 생성한 edge 함수 코드의 bare `require("async_hooks")`
 * (node: 접두사 없음)가 external 처리되지 않고 번들링되다 실패한다.
 *   ✘ [ERROR] Could not resolve "async_hooks"
 * external 배열에 Node 내장 모듈의 bare 이름을 추가하면 해결된다.
 *
 * - 멱등: 여러 번 실행해도 안전(이미 패치됐으면 건너뜀).
 * - 안전: 대상 파일/패턴이 없으면 조용히 통과하고 설치를 실패시키지 않는다.
 */
const fs = require("fs");
const path = require("path");

const SENTINEL = "__nop_node_builtins_patched__";

try {
  const target = path.join(
    __dirname, "..",
    "node_modules", "@cloudflare", "next-on-pages", "dist", "index.js"
  );
  if (!fs.existsSync(target)) {
    console.log("[patch-nop] next-on-pages dist not found, skipping.");
    process.exit(0);
  }
  let src = fs.readFileSync(target, "utf8");

  if (src.includes(SENTINEL)) {
    console.log("[patch-nop] already patched, skipping.");
    process.exit(0);
  }

  const marker = '["node:*"';
  const count = src.split(marker).length - 1;
  if (count === 0) {
    console.log("[patch-nop] external marker not found (version changed?), skipping.");
    process.exit(0);
  }

  const builtins = require("module")
    .builtinModules.filter((m) => !m.startsWith("node:"))
    .map((m) => JSON.stringify(m))
    .join(",");

  src = src.split(marker).join(`[${JSON.stringify(SENTINEL)},${builtins},"node:*"`);
  fs.writeFileSync(target, src);
  console.log(
    `[patch-nop] patched ${count} esbuild external list(s) with ${builtins.split(",").length} node builtins.`
  );
} catch (e) {
  console.log("[patch-nop] non-fatal error:", e && e.message);
  process.exit(0);
}
