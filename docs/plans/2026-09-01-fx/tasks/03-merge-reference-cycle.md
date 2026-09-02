# 03: Merge the reference cycle

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** design decision D-C. `codebase-design`, `deepening` and
`design-it-twice` become one reference, and the two remaining stray links are
removed: making the leaf invariant true for the first time.

That invariant is not cosmetic: §1 of the design uses it to argue that a lane
pulls one file rather than a graph, and it was recorded as "verified" while a
three-way cycle existed.

**Files:**
- Modify: `references/vocab/codebase-design.md` (absorbs the other two)
- Delete: `references/vocab/deepening.md`, `references/vocab/design-it-twice.md`
- Modify: `references/vocab/defense-in-depth.md` (drop link to `root-cause-tracing`)
- Modify: `references/stacks/rails.md` (drop link to `observability`)
- Modify: `skills/fx-architecture/SKILL.md`, `skills/fx-tdd/SKILL.md` (pointers)
- Modify: `SURFACE.md`, `docs/plans/2026-09-01-fx/design.md` (counts: 26 → 24)

**Interfaces:**
- Produces: `references/vocab/codebase-design.md`: the single design vocabulary reference
- Consumes: nothing

**Seam:** the reference directory. Assert on the link graph, not on wording.

**Risks:** merging can silently drop a heading. Keep **every** heading from all
three files; the merge is a concatenation with deduplicated framing, not a
rewrite. `root-cause-tracing.md` also points at `find-polluter.sh` "in the
upstream skill directory": that file vanishes when superpowers is uninstalled,
so the sentence goes too.

**Idempotency:** deletes are guarded by existence checks; the merge is skipped
when the source files are already gone.

**Testing:** a check asserting no reference file links to another reference file.

## Acceptance criteria
- [ ] One file replaces three; **every heading from all three survives**
- [ ] No reference links to another reference: 0 cross-links, verified by grep
- [ ] No reference points at a file outside the plugin
- [ ] No lane points at a deleted file
- [ ] Reference count corrected to 24 in `SURFACE.md` and the design doc

## Steps

- [ ] **1. Write the failing check**

```bash
# fails while any reference links to another reference
n=$(grep -rhoE '`[a-z0-9-]+\.md`' references/vocab references/stacks \
     | sort -u | while read -r f; do
         b=$(echo "$f" | tr -d '`'); [ -e "references/vocab/$b" ] && echo "$b"; done | wc -l)
[ "$n" -eq 0 ] || { echo "FAIL: $n reference-to-reference links"; exit 1; }
```

- [ ] **2. Run it: verify RED**

Expected: FAIL, reporting the known cross-links.

- [ ] **3. Merge the three files, keeping every heading**

- [ ] **4. Remove the two stray links and the `find-polluter.sh` sentence**

- [ ] **5. Repoint the lanes**

- [ ] **6. Run the check: verify GREEN**
