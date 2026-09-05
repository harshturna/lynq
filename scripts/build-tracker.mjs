// Builds the tracker (design §8.1): public/js/lynq.js plus an immutable
// content-hashed twin for pinned installs. Prints the gzipped size against
// the 3 KB budget for the core.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const outDir = "public/js";
mkdirSync(outDir, { recursive: true });

async function bundle(entry) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: "iife",
    target: ["es2020"],
    write: false,
    legalComments: "none",
  });
  return result.outputFiles[0].text;
}

// name, entry, gzipped budget (design §8.1: core 3 KB; vitals carries web-vitals attribution)
const chunks = [
  ["lynq", "packages/tracker/src/index.ts", 3 * 1024],
  ["lynq-extras", "packages/tracker/src/extras.ts", 1.5 * 1024],
  ["lynq-vitals", "packages/tracker/src/vitals.ts", 7 * 1024],
];
for (const f of readdirSync(outDir))
  if (/^lynq\.[0-9a-f]{12}\.js$/.test(f)) unlinkSync(`${outDir}/${f}`);
let failed = false;
for (const [name, entry, budget] of chunks) {
  const code = await bundle(entry);
  writeFileSync(`${outDir}/${name}.js`, code);
  const gz = gzipSync(code).length;
  let extra = "";
  if (name === "lynq") {
    const hash = createHash("sha256").update(code).digest("hex").slice(0, 12);
    writeFileSync(`${outDir}/lynq.${hash}.js`, code);
    extra = `; hashed twin lynq.${hash}.js`;
  }
  console.log(
    `public/js/${name}.js ${code.length} bytes, ${gz} gzipped (budget ${budget})${extra}`
  );
  if (gz > budget) failed = true;
}
if (failed) {
  console.error("a tracker chunk exceeds its size budget");
  process.exit(1);
}
