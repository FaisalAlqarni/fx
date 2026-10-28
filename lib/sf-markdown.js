// generated from src/lib/sf-markdown.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sf_markdown_exports = {};
__export(sf_markdown_exports, {
  GENERATED: () => GENERATED,
  escapeCell: () => escapeCell,
  escapeMermaid: () => escapeMermaid,
  evidenceLine: () => evidenceLine,
  renderCoverage: () => renderCoverage,
  renderMarkdown: () => renderMarkdown,
  renderReadme: () => renderReadme,
  renderRules: () => renderRules
});
module.exports = __toCommonJS(sf_markdown_exports);
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_sf_evidence = require("./sf-evidence.js");
const GENERATED = "<!-- fx-system-flow generated: edit the model, then rebuild -->";
const html = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const oneLine = (s) => s.replace(/\r\n|[\r\n\u2028\u2029]/g, " ");
const noLinks = (s) => s.replace(/[[\]]/g, "\\$&");
const prose = (s) => noLinks(oneLine(html(s)).replace(/\\/g, "\\\\"));
const escapeCell = (s) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r\n|[\r\n]/g, " ");
const cell = (s) => noLinks(escapeCell(html(s ?? "")));
const code = (s) => {
  const fence = "`".repeat(Math.max(0, ...[...s.matchAll(/`+/g)].map((m) => m[0].length)) + 1);
  const pad = fence.length > 1 && (s.startsWith("`") || s.endsWith("`")) ? " " : "";
  return `${fence}${pad}${s}${pad}${fence}`;
};
const MERMAID = { "#": "#35;", ";": "#59;", ":": "#58;", '"': "#quot;", "<": "#lt;", ">": "#gt;", "&": "#amp;" };
const escapeMermaid = (s) => s.replace(/[#;:"<>&]/g, (c) => MERMAID[c] ?? c).replace(/\r\n|[\r\n]/g, " ");
function evidenceItems(evidence, hostId) {
  const out = [];
  for (const e of evidence) {
    if (!("path" in e)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(e.owner)) out.push(`owner, ${e.owner}`);
      continue;
    }
    const p = `${e.root !== void 0 && e.root !== hostId ? `@${e.root}/` : ""}${e.path}`;
    const sym = e.symbol === void 0 ? "" : ` ${code(e.symbol.replace(/\s+/g, " ").replace(/; /g, ";"))}`;
    if (e.lines === void 0) out.push(`${code(p)}${sym}`);
    else for (const part of e.lines.split(",")) out.push(`${code(`${p}:${part.trim()}`)}${sym}`);
  }
  return out;
}
function evidenceLine(evidence, hostId) {
  const items = evidenceItems(evidence, hostId);
  return items.length === 0 ? "" : `Evidence: ${items.join("; ")}`;
}
const evCell = (e, hostId) => escapeCell(evidenceItems(e.evidence ?? [], hostId).join("; "));
const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => " --- |").join("")}`, ...rows.map((r) => `| ${r.join(" | ")} |`)];
const pid = (id) => `p_${id}`;
function sequenceBlock(q, hostId) {
  const label = new Map(q.participants.map((p) => [p.id, p.label]));
  const arrow = (m) => m.mode === "async" ? "-)" : "->>";
  return [
    `### ${prose(q.title)}`,
    "",
    "```mermaid",
    "sequenceDiagram",
    ...q.participants.map((p) => `    participant ${pid(p.id)} as ${escapeMermaid(p.label)}`),
    ...q.messages.map((m) => `    ${pid(m.from)}${arrow(m)}${pid(m.to)}: ${escapeMermaid(m.label)}`),
    "```",
    "",
    ...table(["#", "From", "To", "Message", "Evidence"], q.messages.map((m) => [String(m.n), cell(label.get(m.from) ?? m.from), cell(label.get(m.to) ?? m.to), cell(m.label), evCell(m, hostId)])),
    ""
  ];
}
function flowBlock(fl, hostId) {
  return [
    `### ${prose(fl.id)}`,
    "",
    `Trigger: ${prose(fl.trigger)}`,
    "",
    ...table(["#", "Actor", "Op", "Store", "Key", "When", "Evidence"], fl.steps.map((s) => [String(s.n), cell(s.actor), s.op, s.store, cell(s.key), cell(s.when), evCell(s, hostId)])),
    ""
  ];
}
function oldestVerified(items, roots, hostId, ages) {
  const host = roots.get(hostId);
  const shas = [...new Set(items.map((i) => i.verified?.[hostId]).filter((s) => s !== void 0))];
  if (shas.length === 0) return host?.head ?? null;
  for (const sha of shas) {
    if (!ages.has(sha)) {
      try {
        if (!import_sf_evidence.COMMIT.test(sha)) throw new Error("not a commit id");
        ages.set(sha, Number((0, import_child_process.execFileSync)("git", ["rev-list", "--count", sha], { cwd: host?.dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })));
      } catch {
        ages.set(sha, null);
      }
    }
  }
  if (shas.some((s) => ages.get(s) === null)) return null;
  return shas.sort((a, b) => (ages.get(a) ?? 0) - (ages.get(b) ?? 0))[0] ?? null;
}
const posix = (p) => p.split(path.sep).join("/");
function renderMarkdown(model, roots, hostId, markdownRoot, site = "docs/system-flow") {
  const ages = /* @__PURE__ */ new Map();
  const docs = [];
  const emit = (file, body, items) => {
    const sha = oldestVerified(items, roots, hostId, ages);
    docs.push({ path: file, text: `${[...body, "", GENERATED, ...sha === null ? [] : [`<!-- fx-docs verified: ${sha} -->`]].join("\n")}
` });
  };
  const siteLink = (dir) => `${posix(path.relative(dir, site))}/index.html`;
  const secPath = (s) => posix(path.join(markdownRoot, s.folder ?? "", `${s.id}.md`));
  for (const s of model.sections) {
    const dir = path.posix.dirname(secPath(s));
    const sequences = model.sequences.filter((q) => q.chapter === s.id);
    const flows = model.storeFlows.filter((f) => f.chapter === s.id);
    const bullets = s.bullets ?? [];
    const body = [`# ${prose(s.title)}`, "", prose(s.question), ""];
    for (const b of bullets) {
      const line = evidenceLine(b.evidence ?? [], hostId);
      body.push(`- ${prose(b.text)}${line === "" && b.unconfirmed ? " (unconfirmed)" : ""}`);
      if (line !== "") body.push(`  ${line}`);
    }
    if (bullets.length > 0) body.push("");
    if (sequences.length > 0) body.push("## Sequences", "", ...sequences.flatMap((q) => sequenceBlock(q, hostId)));
    if (flows.length > 0) body.push("## Store flows", "", ...flows.flatMap((f) => flowBlock(f, hostId)));
    body.push(`[Figures for this chapter in the site](${siteLink(dir)}#${s.id})`);
    emit(secPath(s), body, [...bullets, ...sequences.flatMap((q) => [...q.participants, ...q.messages]), ...flows.flatMap((f) => f.steps)]);
  }
  const catalogue = ["stream", "gateway", "queue", "scheduler", "cache", "integration", "component"].flatMap((kind) => {
    const rows = model.catalogue.filter((c) => c.kind === kind);
    return rows.length === 0 ? [] : [`## ${kind}`, "", ...table(["Name", "Role", "Owner", "Connects", "Evidence"], rows.map((c) => [cell(c.name), cell(c.role), cell(c.owner), cell((c.connects ?? []).join(", ")), evCell(c, hostId)])), ""];
  });
  emit(posix(path.join(markdownRoot, "components.md")), ["# Components", "", ...catalogue.length > 0 ? catalogue : ["No components are listed."]], model.catalogue);
  const columns = {
    sql: [["Table", "table"], ["Database", "database"], ["Purpose", "purpose"], ["Written by", "writtenBy"], ["Read by", "readBy"], ["When", "when"]],
    cache: [["Pattern", "pattern"], ["Owner", "owner"], ["Value", "value"], ["TTL", "ttl"], ["Written by", "writtenBy"], ["Read by", "readBy"], ["When", "when"]],
    memory: [["Owner", "owner"], ["Name", "name"], ["Holds", "holds"], ["Key", "key"], ["Lifetime", "lifetime"]],
    files: [["Owner", "owner"], ["Path", "path"], ["Purpose", "purpose"], ["Written by", "writtenBy"], ["Read by", "readBy"]],
    client: [["Owner", "owner"], ["Path", "path"], ["Purpose", "purpose"], ["Written by", "writtenBy"], ["Read by", "readBy"]]
  };
  const storeRows = Object.entries(columns).flatMap(([kind, cols]) => {
    const rows = model.stores[kind];
    if (rows.length === 0) return [];
    return [`## ${kind}`, "", ...table(["Id", ...cols.map(([h]) => h), "Evidence"], rows.map((r) => [cell(r.id), ...cols.map(([, k]) => cell(r[k])), evCell(r, hostId)])), ""];
  });
  emit(posix(path.join(markdownRoot, "stores.md")), ["# Stores", "", ...storeRows.length > 0 ? storeRows : ["No stores are listed."]], Object.values(model.stores).flat());
  const indexOf = (dir, sections, extra) => {
    const rel = (s) => posix(path.relative(dir, secPath(s)));
    emit(posix(path.join(dir, "index.md")), [
      `# ${prose(model.meta.title ?? "System")}`,
      "",
      `[Open the site](${siteLink(dir)})`,
      "",
      ...sections.map((s) => `- [${prose(s.title)}](${rel(s)}): ${prose(s.question)}`),
      ...extra
    ], []);
  };
  indexOf(markdownRoot, model.sections, ["- [Components](components.md)", "- [Stores](stores.md)"]);
  for (const folder of new Set(model.sections.flatMap((s) => s.folder === void 0 ? [] : [s.folder]))) {
    indexOf(posix(path.join(markdownRoot, folder)), model.sections.filter((s) => s.folder === folder), []);
  }
  return docs;
}
function renderCoverage(model, cov, markdownRoot) {
  const title = new Map(model.sections.map((s) => [s.id, s.title]));
  const body = [
    "# Coverage",
    "",
    ...table(["Kind", "Covered", "Total"], Object.entries(cov.counts).map(([k, c]) => [k, String(c.covered), String(c.total)])),
    "",
    ...table(["Kind", "Name", "Chapter"], cov.entries.map((e) => [e.kind, cell(e.name), e.chapter === null ? "not covered" : cell(`${title.get(e.chapter) ?? e.chapter} (${e.chapter})`)])),
    "",
    GENERATED
  ];
  return { path: posix(path.join(markdownRoot, "coverage.md")), text: `${body.join("\n")}
` };
}
function renderRules(model, roots, hostId, markdownRoot) {
  const body = ["# Rules in force", ""];
  for (const r of model.rules) {
    const adr = r.adr === void 0 ? "" : (r.adr.root ?? hostId) === hostId ? ` ([${prose(r.adr.path)}](${posix(path.relative(markdownRoot, r.adr.path))}))` : ` (@${prose(r.adr.root ?? "")}/${prose(r.adr.path)})`;
    body.push(`- ${r.id}: ${prose(r.text)}${adr}${r.decision === void 0 ? "" : ` ${prose(r.decision)}`}`);
    const line = evidenceLine(r.evidence ?? [], hostId);
    if (line !== "") body.push(`  ${line}`);
  }
  if (model.rules.length === 0) body.push("No rules are listed.");
  const sha = oldestVerified(model.rules, roots, hostId, /* @__PURE__ */ new Map());
  return { path: posix(path.join(markdownRoot, "rules-in-force.md")), text: `${[...body, "", GENERATED, ...sha === null ? [] : [`<!-- fx-docs verified: ${sha} -->`]].join("\n")}
` };
}
function renderReadme() {
  return `${[
    "# System flow",
    "",
    "This folder holds the generated description of the system.",
    "",
    "- `model/fragments/` holds the model. The fragments are the record: edit them, never the generated files.",
    "- `model/system-model.json` is the merged model, written for readers and other tools. Nothing reads it back.",
    "- `index.html`, `diagrams/` and the Markdown docs are generated from the fragments.",
    "",
    "To rebuild, run `system-flow check` to verify the model against the code, then `system-flow build` to write the generated files (`scripts/system-flow` in the fx plugin folder).",
    "",
    GENERATED
  ].join("\n")}
`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GENERATED,
  escapeCell,
  escapeMermaid,
  evidenceLine,
  renderCoverage,
  renderMarkdown,
  renderReadme,
  renderRules
});
