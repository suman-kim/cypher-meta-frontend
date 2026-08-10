#!/usr/bin/env node
/**
 * Cloudflare Pages (next-on-pages@1.13.5) async_hooks 픽스.
 *
 * 문제: Next 14.2가 생성한 edge 코드는 bare `require("async_hooks")`를 쓴다.
 *   - next-on-pages의 esbuild external은 "node:*"만 잡아서 bare 이름을 놓침 → 빌드 에러
 *     (✘ Could not resolve "async_hooks")
 *   - external에 bare 이름을 억지로 넣으면 `require("async_hooks")`가 그대로 남아
 *     런타임에 "Dynamic require of async_hooks is not supported" → 모든 동적 페이지 500.
 *
 * 해결: next-on-pages의 built-in modules esbuild 플러그인 onResolve를 확장해서,
 *   bare 내장모듈(require-call)도 `node:` 접두사를 붙여 built-in-modules 네임스페이스로
 *   보낸다. 그러면 onLoad가 `export * from 'node:async_hooks'`로 재-export 하고,
 *   런타임엔 nodejs_compat 플래그가 node:async_hooks를 제공한다.
 *
 * - 멱등: 이미 패치됐으면 건너뜀.
 * - 안전: 대상 파일/문자열이 없으면 조용히 통과하고 설치를 실패시키지 않는다.
 */
const fs = require("fs");
const path = require("path");

try {
  const target = path.join(
    __dirname, "..",
    "node_modules", "@cloudflare", "next-on-pages", "dist", "index.js"
  );
  if (!fs.existsSync(target)) {
    console.log("[patch-nop] next-on-pages dist not found, skipping.");
    process.exit(0);
  }
  let s = fs.readFileSync(target, "utf8");

  if (s.includes("node:|cloudflare:|(?:")) {
    console.log("[patch-nop] already patched, skipping.");
    process.exit(0);
  }

  const find1 = "filter: /^(node|cloudflare):/";
  const find2 = '{ path: path2, namespace: "built-in-modules" }';
  if (!s.includes(find1) || !s.includes(find2)) {
    console.log("[patch-nop] target strings not found (version changed?), skipping.");
    process.exit(0);
  }

  const builtins = require("module").builtinModules.filter((m) => !m.startsWith("node:"));
  // 정규식 리터럴 안이라 '/'(fs/promises 등)는 escape 해야 한다.
  const list = builtins.map((m) => m.replace(/\//g, "\\/")).join("|");

  // 1) onResolve 필터를 넓혀 bare 내장모듈 이름도 매칭
  s = s.split(find1).join(`filter: /^(node:|cloudflare:|(?:${list})$)/`);
  // 2) bare 이름이면 node: 를 붙여 넘김 (node:/cloudflare: 접두사는 그대로)
  s = s
    .split(find2)
    .join(
      '{ path: /^(node|cloudflare):/.test(path2) ? path2 : "node:" + path2, namespace: "built-in-modules" }'
    );

  fs.writeFileSync(target, s);
  console.log(
    `[patch-nop] patched built-in module resolver (+${builtins.length} bare builtins -> node:).`
  );
} catch (e) {
  console.log("[patch-nop] non-fatal error:", e && e.message);
  process.exit(0);
}
