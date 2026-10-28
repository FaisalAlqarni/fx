// generated from src/scripts/system-flow-prose.test.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var assert = __toESM(require("assert"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_json = require("../lib/json.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const F = "docs/system-flow/model/fragments";
const LINK = [{ path: "app/x.rb", lines: "1-4", symbol: "Link" }];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const read = (f, name) => (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, F, `${name}.json`), "utf8"));
const edit = (f, name, change) => {
  const o = read(f, name);
  change(o);
  f.fragment(name, o);
};
const set = (change = () => void 0) => {
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  change(f);
  return f;
};
const s1 = (change) => (f) => edit(f, "chapters", (c) => change(c.sections[4]));
const bullets = (counts, prefix = "b") => counts.map((n, i) => ({ id: `${prefix}${i + 1}`, text: (0, import_sf_fixture.sentence)(n), evidence: LINK }));
const warningsOf = (stdout) => (0, import_json.parseJson)(stdout).warnings;
const fails = (why, change, file, pointer, message, args = ["check"]) => {
  const r = set(change).run(args);
  assert.strictEqual(r.status, 1, `${why}: exits 1
${r.stdout}${r.stderr}`);
  const line = file === "" ? `system-flow: ${args[0]}: ${message}` : `${F}/${file}:${pointer}: ${message}`;
  assert.match(r.stderr, new RegExp(`^${esc(line)}$`, "m"), `${why}
${r.stderr}`);
};
const passes = (why, change) => {
  const r = set(change).run(["check"]);
  assert.strictEqual(r.status, 0, `${why}: exits 0
${r.stdout}${r.stderr}`);
  return warningsOf(r.stdout);
};
assert.deepStrictEqual(passes("the good set", () => void 0), []);
for (const [sample, pad] of [["A b. C d? E!", " F. G."], ["Use e.g. this. Then go.", " A. B. C."], ["Run `a. b` now. Done.", " A. B. C."], ["v1.2 is out. Yes.", " A. B. C."], ["See i.e. that. Fine.", " A. B. C."]]) {
  fails(`sentences in "${sample}"`, s1((s) => {
    s.lead = `${sample}${pad}`;
  }), "chapters.json", "/sections/4/lead", "section s1: lead has 5 sentences; 2 to 4 required");
}
const intro = (n) => (f) => edit(f, "meta", (m) => {
  m.meta.intro = Array.from({ length: n }, () => (0, import_sf_fixture.sentence)(5)).join(" ");
});
fails("a 1-sentence intro", intro(1), "meta.json", "/meta/intro", "meta.intro has 1 sentences; 2 to 5 required");
passes("a 2-sentence intro", intro(2));
passes("a 5-sentence intro", intro(5));
fails("a 6-sentence intro", intro(6), "meta.json", "/meta/intro", "meta.intro has 6 sentences; 2 to 5 required");
fails("no intro", (f) => edit(f, "meta", (m) => {
  delete m.meta.intro;
}), "meta.json", "/meta", "meta.intro missing");
fails("no name", (f) => edit(f, "meta", (m) => {
  delete m.meta.name;
}), "meta.json", "/meta", "meta.name missing");
const lead = (n, each) => s1((s) => {
  s.lead = Array.from({ length: n }, () => (0, import_sf_fixture.sentence)(each)).join(" ");
});
fails("a 1-sentence lead", lead(1, 40), "chapters.json", "/sections/4/lead", "section s1: lead has 1 sentences; 2 to 4 required");
passes("a 2-sentence lead", lead(2, 20));
passes("a 4-sentence lead", lead(4, 10));
fails("a 5-sentence lead", lead(5, 8), "chapters.json", "/sections/4/lead", "section s1: lead has 5 sentences; 2 to 4 required");
fails("no lead", s1((s) => {
  delete s.lead;
}), "chapters.json", "/sections/4", "section s1: lead missing");
fails("3 bullets", s1((s) => {
  s.bullets = bullets([20, 20, 20]);
}), "chapters.json", "/sections/4/bullets", "section s1: 3 bullets; 4 to 8 required");
passes("4 bullets", s1((s) => {
  s.bullets = bullets([20, 20, 20, 20]);
}));
passes("8 bullets", s1((s) => {
  s.bullets = bullets([20, 20, 20, 20, 20, 20, 20, 20]);
}));
fails("9 bullets", s1((s) => {
  s.bullets = bullets([10, 10, 10, 10, 10, 10, 10, 10, 10]);
}), "chapters.json", "/sections/4/bullets", "section s1: 9 bullets; 4 to 8 required");
passes("a 40-word bullet", s1((s) => {
  s.bullets = bullets([40, 20, 20, 20]);
}));
fails("a 41-word bullet", s1((s) => {
  s.bullets = bullets([41, 20, 20, 20]);
}), "chapters.json", "/sections/4/bullets/0", "bullet b1: 41 words; at most 40");
const WORDS = "words of lead, bullets and not owned";
fails("99 words", s1((s) => {
  s.bullets = bullets([15, 15, 15, 14]);
}), "chapters.json", "/sections/4/lead", `section s1: 99 ${WORDS}; at least 100 required`);
assert.deepStrictEqual(
  passes("100 words", s1((s) => {
    s.bullets = bullets([15, 15, 15, 15]);
  })),
  [`${F}/chapters.json:/sections/4/lead: section s1: 100 ${WORDS}; 120 to 200 expected`]
);
assert.deepStrictEqual(passes("200 words", s1((s) => {
  s.bullets = bullets([40, 40, 40, 40]);
})), []);
assert.deepStrictEqual(
  passes("201 words", s1((s) => {
    s.lead = `${(0, import_sf_fixture.sentence)(20)} ${(0, import_sf_fixture.sentence)(21)}`;
    s.bullets = bullets([40, 40, 40, 40]);
  })),
  [`${F}/chapters.json:/sections/4/lead: section s1: 201 ${WORDS}; 120 to 200 expected`]
);
const notOwned = (n) => (f) => edit(f, "chapters", (c) => {
  c.sections[0].notOwned = Array.from({ length: n }, (_, i) => ({ id: `not-${i + 1}`, text: (0, import_sf_fixture.sentence)(10), evidence: LINK }));
});
fails("1 notOwned bullet", notOwned(1), "chapters.json", "/sections/0/notOwned", "section start-what: 1 notOwned bullets; 2 to 6 required");
passes("2 notOwned bullets", notOwned(2));
passes("6 notOwned bullets", notOwned(6));
fails("7 notOwned bullets", notOwned(7), "chapters.json", "/sections/0/notOwned", "section start-what: 7 notOwned bullets; 2 to 6 required");
fails("no code section", (f) => edit(f, "chapters", (c) => {
  c.sections.splice(3, 1);
}), "chapters.json", "/sections", "Start here role code missing");
fails(
  "parts and request swapped",
  (f) => edit(f, "chapters", (c) => {
    [c.sections[1], c.sections[2]] = [c.sections[2], c.sections[1]];
  }),
  "chapters.json",
  "/sections/1",
  "section start-request has role request; the first four sections must be what, parts, request, code in that order"
);
fails("two request sections", s1((s) => {
  s.role = "request";
  s.sequences = ["turn"];
}), "chapters.json", "/sections/4", "role request appears 2 times; exactly one required");
fails(
  "parts without the level-0 diagram",
  (f) => edit(f, "chapters", (c) => {
    c.sections[1].diagrams = [];
  }),
  "chapters.json",
  "/sections/1",
  "section start-parts: diagrams must include the level-0 diagram system"
);
const other = (chapter) => ({ id: "other", title: "Other", chapter, summary: "The client asks the service for a second time.", participants: [{ id: "a", label: "A", look: "client", evidence: LINK }, { id: "b", label: "B", look: "service", evidence: LINK }], messages: [{ n: 1, from: "a", to: "b", label: "A asks B.", evidence: LINK }] });
fails(
  "a second sequence naming the request chapter",
  (f) => edit(f, "app", (a) => {
    a.sequences.push(other("start-request"));
  }),
  "chapters.json",
  "/sections/2",
  "section start-request: 2 sequences; exactly one required"
);
fails(
  "a second sequence listed by the request chapter",
  (f) => {
    edit(f, "app", (a) => {
      a.sequences.push(other("s1"));
    });
    edit(f, "chapters", (c) => {
      c.sections[2].sequences = ["other"];
    });
  },
  "chapters.json",
  "/sections/2",
  "section start-request: 2 sequences; exactly one required"
);
passes("the request sequence both listed and named", (f) => edit(f, "chapters", (c) => {
  c.sections[2].sequences = ["turn"];
}));
const guide = (f) => {
  edit(f, "meta", (m) => {
    m.meta.roots.push({ id: "guide" });
  });
  f.fxJson({ system_flow: { roots: { guide: "../guide" } } });
  edit(f, "chapters", (c) => {
    c.sections[3].bullets[0].evidence = [{ root: "guide", path: "README.md", lines: "1", symbol: "Guide" }];
  });
};
fails("a cited root with no code map entry", guide, "chapters.json", "/sections/3", "section start-code: root guide has no code map entry; items cite it");
passes("a cited root with a code map entry", (f) => {
  guide(f);
  edit(f, "app", (a) => {
    a.codeMap.push({ id: "guide", root: "guide", path: "docs/", owns: "The guide.", unconfirmed: true });
  });
});
const summary = (text) => (f) => edit(f, "app", (a) => {
  a.sequences[0].summary = text;
});
fails("a 5-word summary", summary((0, import_sf_fixture.sentence)(5)), "app.json", "/sequences/0/summary", "sequence turn: summary has 5 words; 6 to 30 required");
passes("a 6-word summary", summary((0, import_sf_fixture.sentence)(6)));
passes("a 30-word summary", summary((0, import_sf_fixture.sentence)(30)));
fails("a 31-word summary", summary((0, import_sf_fixture.sentence)(31)), "app.json", "/sequences/0/summary", "sequence turn: summary has 31 words; 6 to 30 required");
fails("a 2-sentence summary", summary(`${(0, import_sf_fixture.sentence)(6)} ${(0, import_sf_fixture.sentence)(6)}`), "app.json", "/sequences/0/summary", "sequence turn: summary has 2 sentences; one required");
fails("a sequence with no summary", (f) => edit(f, "app", (a) => {
  delete a.sequences[0].summary;
}), "app.json", "/sequences/0", "sequence turn: summary missing");
fails("a diagram summary of 3 words", (f) => edit(f, "level0", (l) => {
  l.levels.diagrams[0].summary = "The whole system.";
}), "level0.json", "/levels/diagrams/0/summary", "diagram system: summary has 3 words; 6 to 30 required");
fails(
  "a store flow with no summary",
  (f) => edit(f, "app", (a) => {
    a.storeFlows = [{ id: "save", trigger: "A save", chapter: "s1", steps: [{ n: 1, actor: "link", op: "write", store: "sql", evidence: LINK }] }];
  }),
  "app.json",
  "/storeFlows/0",
  "store flow save: summary missing"
);
const participants = (n) => (f) => edit(f, "app", (a) => {
  for (let i = a.sequences[0].participants.length; i < n; i++) a.sequences[0].participants.push({ id: `p${i}`, label: `P${i}`, look: "service", evidence: LINK });
});
passes("12 participants", participants(12));
fails("13 participants", participants(13), "app.json", "/sequences/0", "sequence turn: 13 participants; at most 12 (split it)");
const terms = (n) => (f) => edit(f, "glossary", (g) => {
  g.glossary = g.glossary.slice(0, n);
  for (let i = g.glossary.length; i < n; i++) g.glossary.push({ id: `t${i}`, term: `term ${i}`, tag: "concept", meaning: "A term.", evidence: LINK });
});
fails("14 terms", terms(14), "glossary.json", "/glossary", "glossary has 14 terms; 15 to 40 required");
passes("15 terms", terms(15));
passes("40 terms", terms(40));
fails("41 terms", terms(41), "glossary.json", "/glossary", "glossary has 41 terms; 15 to 40 required");
fails("alias link beside term Link", (f) => edit(f, "glossary", (g) => {
  g.glossary[0].aliases = ["link"];
}), "glossary.json", "/glossary/0", 'term "link" is also used by term:link');
const area = (lead2, counts) => (f) => {
  edit(f, "chapters", (c) => {
    c.sections.push({ id: "s2", title: "More", question: "What else?" });
  });
  f.fragment("area", { sections: [{ id: "s2", lead: lead2, bullets: bullets(counts, "a") }] });
};
const fragment = (why, lead2, counts, extra = () => void 0) => {
  const f = set((g) => {
    area(lead2, counts)(g);
    extra(g);
  });
  return { why, r: f.run(["check", "--fragment", `${F}/area.json`]) };
};
{
  const { why, r } = fragment("a 5-sentence lead in an area fragment", Array.from({ length: 5 }, () => (0, import_sf_fixture.sentence)(8)).join(" "), [20, 20, 20, 20]);
  assert.strictEqual(r.status, 1, `${why}
${r.stdout}${r.stderr}`);
  assert.match(r.stderr, new RegExp(`^${esc(`${F}/area.json:/sections/0/lead: section s2: lead has 5 sentences; 2 to 4 required`)}$`, "m"), why);
}
{
  const { why, r } = fragment(
    "an area fragment with no glossary",
    `${(0, import_sf_fixture.sentence)(20)} ${(0, import_sf_fixture.sentence)(20)}`,
    [20, 20],
    (f) => fs.renameSync(path.join(f.host, F, "glossary.json"), path.join(f.base, "glossary.json"))
  );
  assert.strictEqual(r.status, 0, `${why}
${r.stdout}${r.stderr}`);
  assert.deepStrictEqual(warningsOf(r.stdout), [], why);
}
{
  const { why, r } = fragment("a 9-bullet section in an area fragment", `${(0, import_sf_fixture.sentence)(20)} ${(0, import_sf_fixture.sentence)(20)}`, [10, 10, 10, 10, 10, 10, 10, 10, 10]);
  assert.strictEqual(r.status, 1, `${why}
${r.stdout}${r.stderr}`);
  assert.match(r.stderr, new RegExp(`^${esc(`${F}/area.json:/sections/0/bullets: section s2: 9 bullets; 4 to 8 required`)}$`, "m"), why);
}
fails("build with no lead", s1((s) => {
  delete s.lead;
}), "chapters.json", "/sections/4", "section s1: lead missing", ["build"]);
{
  const f = set();
  f.commit("host", "model");
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 0, `build exits 0
${r.stdout}${r.stderr}`);
  const out = (0, import_json.parseJson)(r.stdout);
  assert.deepStrictEqual(out.prose.chapters.find((c) => c.id === "s1"), { id: "s1", words: 120, leadSentences: 2, bullets: 4 });
  assert.deepStrictEqual(out.prose.chapters.find((c) => c.id === "start-what"), { id: "start-what", words: 140, leadSentences: 2, bullets: 4 });
  assert.strictEqual(out.prose.chapters.length, 5);
  assert.strictEqual(out.prose.averageWords, 124);
  assert.strictEqual(out.prose.glossary, 15);
  assert.strictEqual(out.prose.lifelines, 0);
  assert.deepStrictEqual(out.problems.filter((p) => p.message.includes(WORDS)), [], "no prose warning");
}
fails("an en dash in a lead", s1((s) => {
  s.lead = `${(0, import_sf_fixture.sentence)(20)} One \u2013 two ${(0, import_sf_fixture.sentence)(18)}`;
}), "chapters.json", "/sections/4/lead", "em or en dash");
console.log("system-flow-prose.test.js: OK");
