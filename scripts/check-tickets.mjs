// Validates the ticket system described in CLAUDE.md. Runs as part of `npm run verify`.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ticketsDir = path.join(root, "tickets");
const dirs = {
  pending: ["pending", "blocked"],
  in_progress: ["in-progress", "blocked"],
  done: ["done"],
};
const failures = [];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const template = readFileSync(path.join(ticketsDir, "_template.md"), "utf8");

/** Split a ticket into { heading -> body } keyed by `## ` headings. */
function sections(text) {
  const out = {};
  const parts = text.split(/^## (.+)$/m);
  for (let i = 1; i < parts.length; i += 2)
    out[parts[i].trim()] = parts[i + 1].trim();
  return out;
}
const templateSections = sections(template);

function field(text, name) {
  const m = text.match(new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, "m"));
  return m ? m[1].trim() : null;
}

/** A section is filled when it exists and differs from the template placeholder. */
function filled(secs, name) {
  const body = secs[name];
  return Boolean(body) && body !== templateSections[name];
}

const seen = new Map();

for (const [dir, allowed] of Object.entries(dirs)) {
  const full = path.join(ticketsDir, dir);
  if (!existsSync(full)) {
    failures.push(`tickets/${dir}/ is missing`);
    continue;
  }
  for (const name of readdirSync(full)) {
    if (!name.endsWith(".md")) continue;
    const rel = `tickets/${dir}/${name}`;
    const m = name.match(/^TICKET-(\d{3})-[a-z0-9-]+\.md$/);
    if (!m) {
      failures.push(`${rel}: filename must look like TICKET-NNN-short-slug.md`);
      continue;
    }
    const id = m[1];
    if (seen.has(id))
      failures.push(`${rel}: TICKET-${id} also exists at ${seen.get(id)}`);
    seen.set(id, rel);

    const text = readFileSync(path.join(full, name), "utf8");
    if (!text.startsWith(`# TICKET-${id}:`))
      failures.push(`${rel}: first line must be "# TICKET-${id}: title"`);

    const status = field(text, "Status");
    if (!status) failures.push(`${rel}: missing **Status:**`);
    else if (!allowed.includes(status))
      failures.push(
        `${rel}: status "${status}" is not allowed in ${dir}/ (allowed: ${allowed.join(", ")})`
      );

    const created = field(text, "Created");
    if (!created || !ISO.test(created))
      failures.push(`${rel}: **Created:** must be an ISO date`);
    const area = field(text, "Area");
    if (!area || area.includes("|"))
      failures.push(`${rel}: **Area:** must be a single value`);

    const secs = sections(text);
    for (const required of ["Goal", "Context", "Plan"]) {
      if (!filled(secs, required))
        failures.push(
          `${rel}: ${required} section is empty or still the template text`
        );
    }

    if (dir === "in_progress" || dir === "done") {
      const started = field(text, "Started");
      if (!started || !ISO.test(started))
        failures.push(
          `${rel}: **Started:** must be an ISO date once work has begun`
        );
    }
    if (dir === "in_progress") {
      if (!filled(secs, "Handoff"))
        failures.push(
          `${rel}: Handoff section must be written while in progress`
        );
      if (!/\*\*Next:\*\*\s*\S/.test(secs.Handoff ?? ""))
        failures.push(`${rel}: Handoff must state **Next:**`);
    }
    if (dir === "done") {
      const completed = field(text, "Completed");
      if (!completed || !ISO.test(completed))
        failures.push(`${rel}: **Completed:** must be an ISO date`);
      if (
        !filled(secs, "Verification") ||
        !/```|`[^`]+`/.test(secs.Verification ?? "")
      )
        failures.push(
          `${rel}: Verification must name the command that was run (in backticks or a code block)`
        );
      if (!filled(secs, "Outcome"))
        failures.push(
          `${rel}: Outcome section is empty or still the template text`
        );
    }
  }
}

// Decisions: monotonically increasing ids, every field present.
const decisionsPath = path.join(ticketsDir, "DECISIONS.md");
if (!existsSync(decisionsPath))
  failures.push("tickets/DECISIONS.md is missing");
else {
  const text = readFileSync(decisionsPath, "utf8").replace(
    /^```[\s\S]*?^```/gm,
    ""
  );
  const heads = [...text.matchAll(/^## D-(\d{3}) — .+$/gm)];
  let prev = 0;
  for (const [i, h] of heads.entries()) {
    const n = Number(h[1]);
    if (n <= prev)
      failures.push(`DECISIONS.md: D-${h[1]} is duplicated or out of order`);
    prev = n;
    const block = text.slice(h.index, heads[i + 1]?.index ?? text.length);
    for (const f of [
      "Status",
      "Date",
      "Context",
      "Decision",
      "Rejected alternatives",
      "Consequences",
    ]) {
      if (!new RegExp(`^- \\*\\*${f}:\\*\\*\\s+\\S`, "m").test(block))
        failures.push(`DECISIONS.md: D-${h[1]} is missing ${f}`);
    }
  }
}

if (failures.length) {
  console.error(
    `Ticket check failed:\n${failures.map((f) => `  - ${f}`).join("\n")}`
  );
  process.exit(1);
}
console.log(`Ticket check passed (${seen.size} tickets).`);
