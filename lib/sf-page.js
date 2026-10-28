// generated from src/lib/sf-page.ts by scripts/build: edit there, not here
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sf_page_exports = {};
__export(sf_page_exports, {
  escapeHtml: () => escapeHtml,
  inlineJson: () => inlineJson,
  renderPage: () => renderPage,
  wrapArabic: () => wrapArabic
});
module.exports = __toCommonJS(sf_page_exports);
var import_sf_coverage = require("./sf-coverage.js");
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const inlineJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const AR = "[\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF]+";
const wrapArabic = (escaped) => escaped.replace(new RegExp(`${AR}(?:[ \\u00A0]+${AR})*`, "g"), (run) => `<span lang="ar" dir="rtl">${run}</span>`);
const t = (s) => wrapArabic(escapeHtml(s ?? ""));
const nn = (i) => String(i).padStart(2, "0");
const chapterId = (i, s) => `ch-${nn(i + 1)}-${s.id}`;
const table = (label, head, rows) => `<div class="table-scroll" role="region" aria-label="${escapeHtml(label)}" tabindex="0"><table><thead><tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
function renderPage(input) {
  const { model, roots } = input;
  const hostId = [...roots.values()].find((r) => r.host)?.id ?? model.meta.roots[0]?.id ?? "";
  const where = (e) => `${e.root !== void 0 && e.root !== hostId ? `@${e.root}/` : ""}${e.path}`;
  const evCodes = (list) => (list ?? []).map((e) => "path" in e ? `<code>${escapeHtml(where(e) + (e.lines === void 0 ? "" : `:${e.lines}`))}</code>${e.symbol === void 0 ? "" : ` ${escapeHtml(e.symbol)}`}` : `owner ${escapeHtml(e.owner)}`).join(" ");
  const evCell = (o) => evCodes(o.evidence) + (o.unconfirmed ? " <strong>unconfirmed</strong>" : "");
  const drawnBy = /* @__PURE__ */ new Map();
  const claim = (key, i) => {
    if (!drawnBy.has(key)) drawnBy.set(key, i);
    return drawnBy.get(key) === i;
  };
  const sectionSeqs = (s) => model.sequences.filter((q) => (s.sequences ?? []).includes(q.id) || q.chapter === s.id);
  const sectionFlows = (s) => model.storeFlows.filter((f) => (s.storeFlows ?? []).includes(f.id) || f.chapter === s.id);
  const storeCols = {
    sql: [["Table", "table"], ["Database", "database"], ["Purpose", "purpose"], ["Written by", "writtenBy"], ["Read by", "readBy"], ["When", "when"]],
    cache: [["Pattern", "pattern"], ["Owner", "owner"], ["Value", "value"], ["TTL", "ttl"], ["Written by", "writtenBy"], ["Read by", "readBy"], ["When", "when"]],
    memory: [["Owner", "owner"], ["Name", "name"], ["Holds", "holds"], ["Key", "key"], ["Lifetime", "lifetime"]],
    files: [["Owner", "owner"], ["Path", "path"], ["Purpose", "purpose"], ["Written by", "writtenBy"], ["Read by", "readBy"]],
    client: [["Owner", "owner"], ["Path", "path"], ["Purpose", "purpose"], ["Written by", "writtenBy"], ["Read by", "readBy"]]
  };
  const storeTable = (kind, ids) => {
    const rows = model.stores[kind].filter((r) => ids === null || ids.has(r.id));
    const cols = storeCols[kind] ?? [];
    return rows.length === 0 ? "" : `<h4>Store: ${escapeHtml(kind)}</h4>${table(`Store: ${kind}`, ["Id", ...cols.map(([h]) => h), "Evidence"], rows.map((r) => [t(r.id), ...cols.map(([, k]) => t(r[k])), evCell(r)]))}`;
  };
  const CAT_KINDS = ["stream", "gateway", "queue", "scheduler", "cache", "integration", "component"];
  const catTable = (kind, ids) => {
    const rows = model.catalogue.filter((c) => c.kind === kind && (ids === null || ids.has(c.id)));
    return rows.length === 0 ? "" : `<h4>${escapeHtml(kind)}</h4>${table(kind, ["Name", "Role", "Owner", "Connects", "Evidence"], rows.map((c) => [t(c.name), t(c.role), t(c.owner), t((c.connects ?? []).join(", ")), evCell(c)]))}`;
  };
  const chapterHtml = (s, i) => {
    const id = chapterId(i, s);
    const parts = [`<section id="${id}">`, `<h2>${nn(i + 1)}. ${t(s.title)}</h2>`, `<p class="lead-q">${t(s.question)}</p>`];
    if ((s.bullets ?? []).length > 0) parts.push(`<ul class="facts">${(s.bullets ?? []).map((b) => `<li>${t(b.text)}</li>`).join("")}</ul>`);
    const figure = (key, title2) => {
      if (claim(key, i)) {
        parts.push(`<h3>${t(title2)}</h3><figure data-fx-flow="${escapeHtml(key)}"></figure>`);
        const left = input.figures.find((f) => f.key === key)?.notDrawn ?? [];
        if (left.length > 0) parts.push(`<p class="not-drawn">Arrows not drawn here (the map shows them): ${left.map((id2) => escapeHtml(id2.slice(id2.indexOf(":") + 1).replace(/#\d+$/, "").replace(">", " to "))).join(", ")}.</p>`);
      } else {
        const at = drawnBy.get(key) ?? 0;
        const home = model.sections[at];
        parts.push(`<p>${t(title2)}: <a href="#${home === void 0 ? "" : chapterId(at, home)}">Drawn in chapter ${nn(at + 1)}</a></p>`);
      }
    };
    const diagrams = model.levels.diagrams.filter((d) => (s.diagrams ?? []).includes(d.id));
    const seqs = sectionSeqs(s);
    const flows = sectionFlows(s);
    for (const d of diagrams) figure(`level-${d.id}`, d.title);
    for (const q of seqs) figure(`seq-${q.id}`, q.title);
    for (const f of flows) figure(`flow-${f.id}`, f.trigger);
    const deep = [...diagrams.map((d) => [`diagrams/arch-${d.id}.html`, d.title]), ...seqs.map((q) => [`diagrams/seq-${q.id}.html`, q.title]), ...flows.map((f) => [`diagrams/flow-${f.id}.html`, f.trigger])];
    if (deep.length > 0) parts.push(`<p>Deep diagrams: ${deep.map(([href, title2]) => `<a href="${href}">${t(title2)}</a>`).join(", ")}</p>`);
    for (const f of flows) {
      parts.push(`<h4>Store flow: ${t(f.trigger)}</h4>`, table(`Store flow: ${f.trigger}`, ["#", "Actor", "Op", "Store", "Key", "When", "Evidence"], f.steps.map((st) => [String(st.n), t(st.actor), t(st.op), t(st.store), t(st.key), t(st.when), evCell(st)])));
    }
    const refs = new Set(s.storeRefs ?? []);
    if (refs.size > 0) for (const kind of Object.keys(storeCols)) parts.push(storeTable(kind, refs));
    const cats = new Set(s.catalogueRefs ?? []);
    if (cats.size > 0) for (const kind of CAT_KINDS) parts.push(catTable(kind, cats));
    const groups = [];
    const group = (title2, rows) => {
      if (rows.length > 0) groups.push({ title: title2, rows: rows.map((r) => `<li>${t(r.label)} ${evCell(r.o)}</li>`) });
    };
    group("Facts", (s.bullets ?? []).map((b) => ({ label: b.text, o: b })));
    for (const d of diagrams) {
      group(`Diagram: ${d.title}`, [
        ...d.groups.map((g) => ({ label: `Group ${g.label}`, o: g })),
        ...d.nodes.map((n2) => ({ label: n2.label, o: n2 })),
        ...d.edges.map((e) => ({ label: `${e.from} to ${e.to}: ${e.label}`, o: e }))
      ]);
    }
    for (const q of seqs) group(`Sequence: ${q.title}`, [...q.participants.map((p) => ({ label: p.label, o: p })), ...q.messages.map((m) => ({ label: `${m.n}. ${m.label}`, o: m }))]);
    for (const f of flows) group(`Store flow: ${f.trigger}`, f.steps.map((st) => ({ label: `${st.n}. ${st.actor} ${st.op} ${st.store}`, o: st })));
    const have = new Set((0, import_sf_coverage.sectionItems)(model, s.id).map((x) => x.handle));
    group("Stores", Object.values(model.stores).flat().filter((r) => have.has(`store:${r.id}`)).map((r) => ({ label: r.id, o: r })));
    group("Components", model.catalogue.filter((c) => have.has(`catalogue:${c.id}`)).map((c) => ({ label: c.name, o: c })));
    const n = groups.reduce((a, g) => a + g.rows.length, 0);
    if (n > 0) parts.push(`<details class="evidence"><summary>Files and locations (${n})</summary>${groups.map((g) => `<h4>${escapeHtml(g.title)}</h4><ul>${g.rows.join("")}</ul>`).join("")}</details>`);
    parts.push("</section>");
    return parts.join("\n");
  };
  const sections = model.sections.map(chapterHtml);
  const explore = '<section id="ch-00-explore">\n<h2>00. Explore the system</h2>\n<p class="lead-q">What sits inside each part?</p>\n<div id="map-root"><noscript>The map needs JavaScript. The chapters below hold the same facts.</noscript></div>\n</section>';
  const fixed = [];
  const fixedChapter = (id, title2, question, body) => {
    fixed.push(`<section id="${id}">
<h2>${title2}</h2>
<p class="lead-q">${question}</p>
${body}
</section>`);
  };
  const catalogue = CAT_KINDS.map((k) => catTable(k, null)).join("");
  if (catalogue !== "") fixedChapter("components", "Components", "Which queues, gateways, schedulers and other parts sit around the engines?", catalogue);
  fixedChapter("rules-in-force", "Rules in force", "Which decisions must every change respect?", model.rules.length === 0 ? "<p>No rules are listed.</p>" : `<ul class="facts">${model.rules.map((r) => `<li>${t(r.text)}${r.adr === void 0 ? "" : ` (<code>${escapeHtml(where(r.adr))}</code>)`}${r.decision === void 0 ? "" : ` ${t(r.decision)}`} ${evCell(r)}</li>`).join("")}</ul>`);
  const title = new Map(model.sections.map((s, i) => [s.id, { s, i }]));
  fixedChapter(
    "coverage",
    "Coverage",
    "Which parts of the repository do the chapters cover?",
    table("Coverage by kind", ["Kind", "Covered", "Total"], Object.entries(input.coverage.counts).map(([k, c]) => [escapeHtml(k), String(c.covered), String(c.total)])) + table("Coverage entries", ["Kind", "Name", "Chapter"], input.coverage.entries.map((e) => {
      const hit = e.chapter === null ? void 0 : title.get(e.chapter);
      return [escapeHtml(e.kind), t(e.name), hit === void 0 ? "not covered" : `<a href="#${chapterId(hit.i, hit.s)}">${t(hit.s.title)}</a>`];
    }))
  );
  if (model.questions.length > 0) {
    fixedChapter(
      "open-questions",
      "Open questions",
      "What does the model not yet know?",
      `<ul class="facts">${model.questions.map((q) => `<li>${t(q.text)}${q.answer === void 0 ? "" : ` Answer: ${t(q.answer)}`}${q.recommended === void 0 ? "" : ` Recommended: ${t(q.recommended)}`}${(q.items ?? []).length === 0 ? "" : ` Items: ${(q.items ?? []).map((h) => `<code>${escapeHtml(h)}</code>`).join(" ")}`}</li>`).join("")}</ul>`
    );
  }
  fixedChapter("corrections", "Corrections", "What was changed after the first draft?", model.corrections.length === 0 ? "<p>No corrections are recorded.</p>" : table("Corrections", ["Date", "Item", "Before", "After", "Reason"], model.corrections.map((c) => [escapeHtml(c.date), t(c.item), t(c.before), t(c.after), escapeHtml(c.reason)])));
  const mapEv = (list) => list.flatMap((e) => "path" in e ? [{ path: where(e), lines: e.lines, symbol: e.symbol }] : []);
  const mapData = {
    root: model.levels.root,
    levels: model.levels.diagrams.map((d) => ({
      id: d.id,
      title: d.title,
      groups: d.groups.map((g) => ({ id: g.id, label: g.label, members: g.members, groups: g.groups })),
      nodes: d.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind, role: n.role, children: n.children, primary: n.primary !== false, evidence: mapEv(n.evidence ?? []) })),
      edges: d.edges.map((e) => ({ from: e.from, to: e.to, label: e.label, mode: e.mode ?? "sync", evidence: mapEv(e.evidence ?? []) }))
    }))
  };
  const figures = Object.fromEntries(input.figures.filter((f) => drawnBy.has(f.key)).map((f) => [f.key, f]));
  const nav = `<nav aria-label="Chapters"><ol><li><a href="#ch-00-explore">Explore the system</a></li>${model.sections.map((s, i) => `<li><a href="#${chapterId(i, s)}">${t(s.title)}</a></li>`).join("")}${fixed.map((f) => {
    const id = /id="([^"]+)"/.exec(f)?.[1] ?? "";
    const h = /<h2>([^<]+)<\/h2>/.exec(f)?.[1] ?? "";
    return `<li><a href="#${id}">${h}</a></li>`;
  }).join("")}</ol>
<p>Deep diagrams: ${[
    ...model.levels.diagrams.map((d) => [`diagrams/arch-${d.id}.html`, d.title]),
    ...model.sequences.map((q) => [`diagrams/seq-${q.id}.html`, q.title]),
    ...model.storeFlows.map((f) => [`diagrams/flow-${f.id}.html`, f.trigger])
  ].map(([href, label]) => `<a href="${href}">${t(label)}</a>`).join(", ")}</p></nav>`;
  const rootList = model.meta.roots.map((r) => `${escapeHtml(r.label ?? r.id)}${roots.get(r.id)?.host ? " (this repository)" : ""}`).join(", ");
  const lead = [
    `<p>${t(model.meta.purpose ?? "How this system works, chapter by chapter.")}</p>`,
    '<p>How to read this page: each chapter opens with the question it answers. Play the figures step by step, and open "Files and locations" to see the code behind every claim.</p>',
    `<p>Roots: ${rootList}. Model date: ${escapeHtml(model.meta.date ?? "not recorded")}.</p>`
  ].join("\n");
  const SWATCH = { client: " info", outside: " outside", external: " outside", check: " check", security: " check" };
  const kinds = [...new Set(model.levels.diagrams.flatMap((d) => d.nodes.map((n) => n.kind)))];
  const legend = kinds.map((k) => `<li><span class="sw${SWATCH[k] ?? ""}"></span>${escapeHtml(k)}</li>`).join("\n");
  const slot = (name) => new RegExp(`<!-- slot: ${name}[\\s\\S]*?-->`);
  const pageTitle = escapeHtml(model.meta.title ?? "System");
  return input.template.replace(/<!--\n {2}fx page template[\s\S]*?-->\n/, "").replace(/<!doctype html>/i, (m) => `${m}
<!-- fx-system-flow generated: edit the model, then rebuild -->`).replace(/<!-- slot: TITLE -->/g, () => pageTitle).replace(/<p><!-- slot: LEAD[\s\S]*?--><\/p>/, () => lead).replace(/(<ul class="legend"[^>]*>)[\s\S]*?<\/ul>/, (_m, open) => `${open}
${legend}
</ul>`).replace(slot("NAV"), () => nav).replace(/<section id="map">[\s\S]*?<\/section>\n*/, "").replace(slot("CHAPTERS"), () => [explore, ...sections, ...fixed].join("\n")).replace(/<!-- slot: MAP_DATA[\s\S]*?-->\s*<script type="application\/json" id="map-data">[\s\S]*?<\/script>/, () => `<script type="application/json" id="map-data">${inlineJson(mapData)}</script>`).replace(slot("DIAGRAMS"), () => `<script type="application/json" id="diagrams">${inlineJson(figures)}</script>
<script src="../_assets/fx-flow-1.js"></script>`).replace(/fx-map-1\.js/g, "fx-map-2.js").replace(/<link rel="stylesheet" href="..\/_assets\/fx-tokens-1\.css">/, (m) => `${m}
<link rel="stylesheet" href="../_assets/theme.css">`).replace('details.ev"', 'details.ev, details.evidence"').replace(/\.\.\/_assets\//g, "assets/");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  escapeHtml,
  inlineJson,
  renderPage,
  wrapArabic
});
