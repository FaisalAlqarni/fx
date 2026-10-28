Lens: security, 4 findings

1. [Important] src/lib/sf-stale.ts:47 (`changedPaths`), called from src/scripts/system-flow.ts, in the `query --diff` and `--base` parsing (compiled scripts/system-flow lines 340-346, 409): option injection into git.
   - `base` is the `query --diff &lt;base&gt;` value or a `--base id=&lt;ref&gt;` value. Neither is checked for a leading dash, and git gets no `--` or `--end-of-options` marker. A base of `--output=/some/path` reaches `git diff --no-renames --name-status --output=/some/path...HEAD`. Git then writes the diff to a file instead of stdout.
   - I agree with the task reviewer on the flaw but not on its reach. The `...HEAD` suffix is glued onto the value, so the file created or overwritten is always named `&lt;chosen path&gt;...HEAD`. That limits what an attacker can overwrite. It is still an arbitrary file create or truncate wherever the user can write.
   - Other diff options (`-O&lt;orderfile&gt;`, `--ext-diff`, `--no-index`) are reachable the same way, but I did not test them.
   - `--base` can reach this too. The same unchecked ref goes straight into `bases[root.id]` in `diffBases` (src/lib/sf-stale.ts:65-68), then into `changedPaths`.
   - Exploitable only if an attacker controls the argument, for example an agent or fx-docs text that builds the command. I rate it Important. The reviewer's Critical is defensible if agents pass untrusted refs.
   - Failures are swallowed (stderr ignored, null returned), so this gives no read channel. It is a write or denial primitive only.

2. [Minor] src/lib/sf-stale.ts:70, 72 and 105 (`diffBases`, `staleItems`) and src/lib/doc-index.ts:91-92 (`checkPath`): the `verified` values from fragments are not validated as 40-hex. I downgraded the task reviewer's Important after tracing the call order.
   - Every `verified` value must first pass `cat-file -e &lt;sha&gt;^{commit}`. A value starting with `--` cannot pass that check, because the `^{commit}` suffix breaks any option name and git fails.
   - `staleItems` then marks the item "unverified" and skips `checkPath`, so `git diff ... &lt;verified&gt; HEAD` is never reached with a dash value.
   - `rev-list ...seen` only receives values that already passed the same gate.
   - Remaining weakness: the safety rests on that ordering. `checkPath` is now exported and is unsafe if anyone calls it without the gate. A schema check for 40-hex at load time would make it robust. (prose-gate: quoting, lens reply saved verbatim)

3. [Minor] src/lib/doc-index.ts:92 (reached from src/lib/sf-stale.ts:86): the evidence `path` from fragments is passed as a git pathspec after `--`, and fragment paths are not validated here.
   - Magic prefixes such as `:(top)`, `:(glob)` and `:!` are interpreted. A crafted path can widen or flip what "changed" means, which gives wrong stale results.
   - It is not a file access issue, because the `HEAD:${p}` lookups treat the value as a literal path.
   - `loadModelItems` deliberately skips the `inside()` root-escape check (src/lib/sf-stale.ts:22-29). Nothing reads files here, so this is acceptable. Use `--literal-pathspecs` or reject a leading `:` if the result has to be trusted.

4. [Minor] src/lib/sf-stale.ts:109-110 (`loadModelItems`) and src/lib/sf-stale.ts:138 (`verifyItems`): writes are confined only by a trusted site path.
   - `--site` and `--root` are joined without a containment check. `--site ../../x` makes `verifyItems` rewrite any `*.json` in that directory that parses as a fragment.
   - `writeFileSync` also follows a symlinked `*.json` inside the fragments folder, so it can write to the symlink's target.
   - File names come from `readdirSync`, so there is no traversal through names. The risk needs a hostile repo or a hostile CLI argument. I found no untrusted-input path in the diff, so this is hardening only.

I read the other sf files only to judge these risks. I did not read lines 956 to 1196 of the diff, which are the rest of the test file.
