// generated from src/lib/doc-evidence.ts by scripts/build: edit there, not here
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
var doc_evidence_exports = {};
__export(doc_evidence_exports, {
  parseDoc: () => parseDoc
});
module.exports = __toCommonJS(doc_evidence_exports);
const EVIDENCE_LINE = /^\s*(?:>\s?)?Evidence:\s*(.*)$/;
const PATH_ITEM = /^`([^`\s]+?)(?::(\d+)(?:-(\d+))?)?`(?: `([^`]+)`)?$/;
const OWNER_ITEM = /^owner, (\d{4}-\d{2}-\d{2})$/;
const MARKER = /<!--\s*fx-docs verified:\s*([0-9a-f]{40})\s*-->/;
const FENCE = /^\s*(```|~~~)/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s/;
function parseItem(item) {
  const o = OWNER_ITEM.exec(item);
  if (o) return { type: "owner", date: o[1] ?? "" };
  const m = PATH_ITEM.exec(item);
  if (!m) return null;
  const start = m[2] === void 0 ? null : Number(m[2]);
  const end = m[3] !== void 0 ? Number(m[3]) : start;
  return { type: "path", path: m[1] ?? "", start, end, symbol: m[4] ?? null };
}
function statusText(lines, fenced) {
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i]) continue;
    const m = /^\s*(?:-\s*\*\*Status:\*\*|Status:)\s*(.*)$/i.exec(lines[i] ?? "");
    if (m) return m[1] ?? "";
    if (/^##\s+Status\s*$/i.test(lines[i] ?? "")) {
      for (let j = i + 1; j < lines.length; j++) if ((lines[j] ?? "").trim() !== "") return lines[j] ?? "";
    }
  }
  return null;
}
function parseDoc(doc, text) {
  const lines = text.split("\n");
  const fenced = [];
  let fence = null;
  for (const l of lines) {
    const f = FENCE.exec(l);
    if (fence === null) {
      fenced.push(f !== null);
      if (f) fence = f[1] ?? null;
    } else {
      fenced.push(true);
      if (f && f[1] === fence) fence = null;
    }
  }
  const kind = doc.split("/").slice(0, -1).some((s) => s === "adr" || s === "decisions") ? "adr" : "doc";
  const status = kind === "adr" && /superseded by/i.test(statusText(lines, fenced) ?? "") ? "superseded" : "current";
  const claims = [];
  const problems = [];
  let verified = null;
  lines.forEach((raw, i) => {
    if (fenced[i]) return;
    const marker = MARKER.exec(raw);
    if (marker && verified === null) verified = marker[1] ?? null;
    const m = EVIDENCE_LINE.exec(raw);
    if (!m) return;
    const rest = m[1] ?? "";
    const claim = claimAbove(lines, fenced, i);
    const items = rest.split("; ").map((s) => parseItem(s.trim()));
    if (claim === "" || items.some((e) => e === null)) {
      problems.push({ doc, line: i + 1, message: `malformed evidence line: ${raw.trim()}` });
      return;
    }
    claims.push({ doc, line: i + 1, text: claim, kind, status, evidence: items.filter((e) => e !== null) });
  });
  return { claims, problems, verified };
}
function claimAbove(lines, fenced, i) {
  const block = [];
  for (let j = i - 1; j >= 0 && !fenced[j]; j--) {
    const l = lines[j] ?? "";
    if (l.trim() === "" || /^#{1,6}\s/.test(l) || EVIDENCE_LINE.test(l)) break;
    const bare = l.replace(/^\s*>\s?/, "");
    block.unshift(bare.trim());
    if (LIST_ITEM.test(bare)) break;
  }
  return block.join(" ");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseDoc
});
