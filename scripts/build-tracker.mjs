// Builds the tracker (design §8.1): public/js/lynq.js plus an immutable
// content-hashed twin for pinned installs. Prints the gzipped size against
// the 3 KB budget for the core.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const BUDGET_BYTES = 3 * 1024;
const outDir = "public/js";
mkdirSync(outDir, { recursive: true });

const result = await build({
  entryPoints: ["packages/tracker/src/index.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  write: false,
  legalComments: "none",
});
const code = result.outputFiles[0].text;
const hash = createHash("sha256").update(code).digest("hex").slice(0, 12);
for (const f of readdirSync(outDir))
  if (/^lynq\.[0-9a-f]{12}\.js$/.test(f)) unlinkSync(`${outDir}/${f}`);
writeFileSync(`${outDir}/lynq.js`, code);
writeFileSync(`${outDir}/lynq.${hash}.js`, code);
const gz = gzipSync(code).length;
console.log(
  `public/js/lynq.js ${code.length} bytes, ${gz} gzipped (budget ${BUDGET_BYTES}); hashed twin lynq.${hash}.js`
);
if (gz > BUDGET_BYTES) {
  console.error("tracker core exceeds its size budget");
  process.exit(1);
}
