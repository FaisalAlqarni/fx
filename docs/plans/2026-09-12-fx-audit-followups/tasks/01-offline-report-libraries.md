# 01: Offline report libraries and the remote-script gate

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Core

**What to build:** an architecture report opens fully styled and with its
diagrams rendered on a machine with no internet connection. Pinned copies of
Tailwind's version 3 Play CDN script and Mermaid 11's single-file browser build
ship inside the plugin. A new shared reference says how a report copies them
into the project once and loads them by a relative path. `fx-architecture`'s
report guidance follows it. A gate fails whenever a skill, agent, command or
reference loads a script or stylesheet from the internet again.

**Files:**
- Create: `references/vendor/tailwindcss-play-3.4.17.js`
- Create: `references/vendor/mermaid-<version>.min.js`, where `<version>` is the exact 11.x version resolved in step 6
- Create: `references/vendor/LICENSE-tailwindcss`
- Create: `references/vendor/LICENSE-mermaid`
- Create: `references/report-assets.md`
- Modify: `skills/fx-architecture/HTML-REPORT.md`
- Modify: `skills/fx-architecture/COVERAGE.md`
- Modify: `scripts/check-artifacts`
- Modify: `scripts/check-all`
- Modify: `docs/adr/0015-artifacts-live-in-the-repository.md`
- Test: `tests/gates/check-artifacts-remote.sh`

**Interfaces:**
- Produces: `references/report-assets.md`, cited as `../../references/report-assets.md`. It holds, in this order: a table with one row per vendored file (file name, library, exact version, source URL, SHA-256, licence file); the copy rule; the missing-file rule; the mismatch rule; the exact `<script>` tags a report places in its `<head>`.
- Produces: `scripts/check-artifacts [root]`. With no argument it checks this repository as today. Given a directory, it checks that tree instead. Exit 0 when clean, exit 1 with each offending `path:line` listed.
- Produces: the report tags, exactly:
  `<script src="../_assets/tailwindcss-play-3.4.17.js"></script>`,
  `<script src="../_assets/mermaid-<version>.min.js"></script>`,
  `<script>mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });</script>`
- Consumed by: task 02, which cites the same reference from the audit skill.

**Seam:** `scripts/check-all`, and a report opened offline in a local headless browser (design seams 1 and 2).

**Risks:**
- A vendored library's own minified code contains strings that look like a remote `<script src>` or `import ... from "https:"`. The remote rule skips `references/vendor/`, which holds upstream code and no instruction to an agent, and names that it did.
- `https://cdn.tailwindcss.com/3.4.17` serving an HTML page instead of the script. Step 6 checks the first byte and the size, and stops rather than trying another address.
- The relative path `../_assets/` is correct only for a report that sits directly inside a directory under `docs/plans/`. Both report locations do; say so in the reference.

**Idempotency:** the downloads overwrite the same pinned files with the same bytes, and step 7 records checksums that a re-run reproduces. The copy rule copies only a missing file. The gate and the test write nothing outside their scratch directory, removed on exit.

**Testing:** a shell test of the gate against scratch trees, run by `check-all`; checksums of the vendored files against the reference's table; an offline render in a headless browser.

## Acceptance criteria

- [ ] `tests/gates/check-artifacts-remote.sh` passes, and `scripts/check-all` runs it.
- [ ] `python3 scripts/check-artifacts` exits 0 on the repository, and it failed on `skills/fx-architecture/HTML-REPORT.md` before the scaffold changed.
- [ ] No file under `skills/`, `agents/`, `commands/` or `references/`, outside `references/vendor/`, loads a script or stylesheet from a URL.
- [ ] The four vendored files exist, and each JavaScript file's SHA-256 equals the value in `references/report-assets.md`.
- [ ] `references/report-assets.md` states the copy rule into `docs/plans/_assets/`, the stop-and-name rule for a missing vendored file, and the leave-and-say rule for a mismatched copy.
- [ ] `skills/fx-architecture/HTML-REPORT.md` cites `../../references/report-assets.md`, its scaffold holds the three local tags, and no sentence in it still says the report needs a connection.
- [ ] A sample report written by following `references/report-assets.md` and opened with the network switched off shows Tailwind styles applied, a Mermaid diagram rendered as SVG, and no failed request.
- [ ] `python3 scripts/check-paths` passes and reports one more citation than before.
- [ ] `bash scripts/check-reference-leaves` and `python3 scripts/check-prose` pass.

## Steps

- [ ] **1. Write the failing test**

Create `tests/gates/check-artifacts-remote.sh`:

```bash
#!/usr/bin/env bash
# The remote-asset rule in scripts/check-artifacts, run against scratch trees.
# Test scaffolding: the scratch directory is removed on every exit.
set -euo pipefail
cd "$(dirname "$0")/../.."
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
fails=0

# expect <exit> <label> <path inside the scratch tree> <line to write>
expect() {
  local want="$1" label="$2" rel="$3" content="$4" root="$SCRATCH/$2"
  mkdir -p "$root/$(dirname "$rel")"
  printf '%s\n' "$content" > "$root/$rel"
  set +e
  python3 scripts/check-artifacts "$root" > "$SCRATCH/$label.out" 2>&1
  local got=$?
  set -e
  if [ "$got" -ne "$want" ]; then
    echo "FAIL: $label: exit $got, want $want"
    cat "$SCRATCH/$label.out"
    fails=$((fails + 1))
  else
    echo "ok: $label"
  fi
}

expect 1 remote-script-in-skill      skills/x/SKILL.md '<script src="https://cdn.tailwindcss.com"></script>'
expect 1 remote-import-in-reference  references/x.md   'import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";'
expect 1 remote-stylesheet-in-agent  agents/x.md       '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">'
expect 1 protocol-relative-command   commands/x.md     '<script src="//cdn.example.com/a.js"></script>'
expect 0 local-script                skills/x/SKILL.md '<script src="../_assets/mermaid-11.0.0.min.js"></script>'
expect 0 marked-exception            skills/x/SKILL.md '<script src="https://cdn.tailwindcss.com"></script> artifact-gate: ok'
expect 0 remote-image-is-not-a-script skills/x/SKILL.md '<img src="https://example.com/a.png">'
expect 0 vendored-upstream-code      references/vendor/lib.min.js 'x="<script src=\"https://example.com/a.js\">"'

if [ "$fails" -ne 0 ]; then
  echo "check-artifacts remote rule: $fails failed"
  exit 1
fi
echo "check-artifacts remote rule: all passed"
```

- [ ] **2. Run it: verify RED**

Run: `bash tests/gates/check-artifacts-remote.sh`
Expected: FAIL. `scripts/check-artifacts` ignores the root argument and scans this repository, and it has no remote rule, so the four `expect 1` cases report exit 0.

- [ ] **3. Implement the minimum that passes**

In `scripts/check-artifacts`: take an optional root directory as the first argument; keep the temp-directory rule over `skills/`, `agents/` and `commands/` exactly as it is; add a remote rule over `skills/`, `agents/`, `commands/` and `references/` that fails on a `<script>` whose `src` is an `http:`, `https:` or protocol-relative `//` URL, an `import ... from` such a URL, and a `<link>` whose `href` is such a URL; skip `references/vendor/` for the remote rule and print that it did; honour `artifact-gate: ok` on a line for both rules. Update the module docstring to describe both rules. `fx-tdd` drives it from the test.

- [ ] **4. Run it: verify GREEN**

Run: `bash tests/gates/check-artifacts-remote.sh`
Expected: `check-artifacts remote rule: all passed`.

- [ ] **5. See the repository's own violation**

Run: `python3 scripts/check-artifacts`
Expected: FAIL, naming `skills/fx-architecture/HTML-REPORT.md` at its Tailwind `<script>` line and its Mermaid `import` line. Record the output in the report. Any other file it names is a finding to fix in this task.

- [ ] **6. Download the pinned libraries**

This is the one network use in the whole change, requested by the user. Run each command and stop at the first failure; never try a different address.

```bash
mkdir -p references/vendor
curl -fsSL -o references/vendor/tailwindcss-play-3.4.17.js https://cdn.tailwindcss.com/3.4.17
MERMAID_VERSION="$(curl -fsSL https://cdn.jsdelivr.net/npm/mermaid@11/package.json \
  | python3 -c 'import json, sys; print(json.load(sys.stdin)["version"])')"
echo "mermaid version: $MERMAID_VERSION"
curl -fsSL -o "references/vendor/mermaid-${MERMAID_VERSION}.min.js" \
  "https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js"
curl -fsSL -o references/vendor/LICENSE-tailwindcss https://cdn.jsdelivr.net/npm/tailwindcss@3.4.17/LICENSE
curl -fsSL -o references/vendor/LICENSE-mermaid "https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/LICENSE"
```

Then check what arrived:

```bash
for f in references/vendor/*.js; do
  size=$(wc -c < "$f"); first=$(head -c 1 "$f")
  echo "$f: $size bytes, first byte '$first'"
  [ "$size" -gt 100000 ] && [ "$first" != "<" ] || { echo "STOP: $f is not a script"; exit 1; }
done
grep -qi 'MIT' references/vendor/LICENSE-tailwindcss && grep -qi 'MIT' references/vendor/LICENSE-mermaid && echo "licences: MIT"
sha256sum references/vendor/*.js
```

Expected: two files over 100 KB whose first byte is not `<`, both licences MIT, and two checksums. If the Tailwind file is not a script, stop and report: do not substitute another version.

- [ ] **7. Write the shared reference**

Create `references/report-assets.md` with the interface above: the table filled from step 6's names, versions, URLs and checksums; the copy rule (create `docs/plans/_assets/` at the repository root when it is missing, and copy each vendored file there when no file of that name exists); the missing-file rule (a vendored file absent from the plugin stops the report before it is written, naming the file); the mismatch rule (a file of that name already in `_assets` whose SHA-256 differs from the table is left untouched, and the report step says so); the three tags; and that `../_assets/` is correct for a report directly inside a directory under `docs/plans/`. It names no other reference file.

- [ ] **8. Point the architecture report at it**

In `skills/fx-architecture/HTML-REPORT.md`: replace the sentences saying Tailwind and Mermaid load from CDNs and that the report needs a connection; replace the supply-chain paragraph with one saying both libraries are vendored, pinned and served from the project, citing `../../references/report-assets.md`; replace the scaffold's two remote tags with the three local tags; add the copy step before writing the file; change the style guidance line that names the Tailwind CDN and the Mermaid ESM import. In `skills/fx-architecture/COVERAGE.md`, update the two lines that mention the CDN. In `docs/adr/0015-artifacts-live-in-the-repository.md`, add one paragraph stating the remote rule and its areas.

- [ ] **9. Run the gates**

Run: `python3 scripts/check-artifacts && python3 scripts/check-paths && bash scripts/check-reference-leaves && python3 scripts/check-prose references/report-assets.md skills/fx-architecture/HTML-REPORT.md skills/fx-architecture/COVERAGE.md docs/adr/0015-artifacts-live-in-the-repository.md`
Expected: every command passes; `check-paths` reports one more citation than before this task.

- [ ] **10. Render a report offline**

Build a sample report by following `references/report-assets.md` as written, in the ephemeral workspace, never the OS temp directory:

```bash
R=.fx/2026-09-12-fx-audit-followups/render-check
mkdir -p "$R/docs/plans/2026-09-12-render-check"
# copy the vendored files into "$R/docs/plans/_assets/" exactly as the reference's copy rule says
```

Write `$R/docs/plans/2026-09-12-render-check/report-render-check.html` with the reference's three tags in its `<head>` and this body:

```html
<body class="bg-stone-50">
  <main class="max-w-5xl mx-auto px-6 py-12">
    <h1 id="probe" class="text-3xl font-bold text-emerald-700">render check</h1>
    <pre class="mermaid">flowchart LR
  A[Intake] --> B[Queue]
  B -.leak.-> C[Provider]</pre>
  </main>
</body>
```

With the local browser tools: open a new page, set network emulation to offline, navigate to the file's `file://` URL, then evaluate:

```js
async () => {
  for (let i = 0; i < 50 && !document.querySelector('pre.mermaid svg'); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    h1Color: getComputedStyle(document.getElementById('probe')).color,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    diagramRendered: !!document.querySelector('pre.mermaid svg'),
  };
}
```

Expected: `h1Color` is `rgb(4, 120, 87)`, `bodyBackground` is `rgb(250, 250, 249)`, `diagramRendered` is `true`; the page's network requests are all `file://`; the console shows no error. Take a screenshot into `$R/`. If the browser tools are not available to you, say so in the report and leave this step for the controller: do not mark it done.

- [ ] **11. Register the test in the combined gate**

In `scripts/check-all`, after `run check-artifacts`, add `run check-artifacts-remote.sh bash tests/gates/check-artifacts-remote.sh`.

- [ ] **12. Run the combined gate**

Run: `scripts/check-all`
Expected: `ALL GREEN`, exit 0, read directly and not through a pipe.

- [ ] **13. Commit**

```
git add references/vendor/tailwindcss-play-3.4.17.js "references/vendor/mermaid-${MERMAID_VERSION}.min.js" references/vendor/LICENSE-tailwindcss references/vendor/LICENSE-mermaid references/report-assets.md skills/fx-architecture/HTML-REPORT.md skills/fx-architecture/COVERAGE.md scripts/check-artifacts scripts/check-all docs/adr/0015-artifacts-live-in-the-repository.md tests/gates/check-artifacts-remote.sh
git commit -m "feat(reports): vendor Tailwind and Mermaid so reports render offline, and gate remote scripts"
```

No attribution trailers. Then continue to the next task: never stop and wait.
