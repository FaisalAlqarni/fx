# Claude Code hook context size limit, version v2.1.278

Scope: how large a single hook's output can be before Claude Code stops
showing it inline and switches to a `<persisted-output>` preview block.
Primary sources: the installed CLI bundle itself (docs and CHANGELOG are
silent on the exact numbers, confirmed below), cross-checked with two live
`claude -p` runs against a throwaway plugin.

## What the docs say

Fetched `https://code.claude.com/docs/en/hooks` (hooks reference) directly.
It documents the `stdout`, `systemMessage`, and `hookSpecificOutput.additionalContext`
fields and their meaning, but states no character or byte limit, no mention
of `<persisted-output>`, and no truncation behavior for any of them.

Fetched `https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md`.
No entry anywhere in the file mentions hook output size limits, truncation,
"Output too large", or "persisted-output". The docs and changelog are both
silent, so the answer below comes from reading the shipped CLI and from
measurement, per the fallback instruction.

## What the installed CLI, v2.1.278, does

Located the binary with `readlink -f "$(command -v claude)"`:
`/home/faisal/.local/share/claude/versions/2.1.278` (a Bun-compiled ELF
executable, `claude --version` confirms `2.1.278 (Claude Code)`). `strings`
on the binary (grep does not work directly on the ELF; `strings -a` extracts
the bundled, minified JavaScript source as text) surfaces the exact
minified functions responsible.

The hook-output path is a dedicated function, referred to below by its
minified name `bee`, distinct from the general tool-result persist path:

```js
async function bee(e, r, n, { threshold: s = YJr, storageV5: a } = {}) {
  if (e.length <= s) return e
  let o = await I1(e, `hook-${r}-${n}`, S_(), a)
  ...
}
```

Constants (found immediately above, in the same chunk as the persist
helper `I1`):

```js
var c$ = 50000, qJr = 4000, Rje = 128000, P_e = 500000
var I_e = 4, VJr = 400000, c8t = 200000, fk = 50, KJr = 1073741824, YJr = 1e4, EEt = 1e4, UQe = 1e5
var Hge = 2000
```

- `YJr = 1e4` = **10,000 characters**. This is the default `threshold` for
  `bee()`, and no call site in the binary overrides it: every call passes
  only `(text, sourceA, sourceB, {storageV5: ze})`, never a custom
  `threshold`, so 10,000 chars is a fixed constant for hook output, not a
  tunable default.
- `Hge = 2000` = **2,000 characters**, used for the preview: `gFe(m, Hge)`
  produces the preview text, and the render template is:

  ```js
  function gae(e) {
    let r = `${_ee}\n`
    r += e.truncatedAtBytes === void 0
      ? `Output too large (${$t(e.originalSize)}). Full output saved to: ${e.filepath}\n`
      : `Output exceeded the ${$t(e.truncatedAtBytes)} persist limit; only the first ${$t(e.truncatedAtBytes)} were saved to: ${e.filepath}\n`
    r += `Preview (first ${$t(Hge)}):\n`
    ...
  }
  ```

  `$t` is a byte-formatter, so `$t(Hge)` renders as `"2KB"`. This is the
  literal source of the observed "Preview (first 2KB)" line.

So: **the threshold is 10,000 characters of hook output text; the preview
shown inline is the first 2,000 characters of that text** (cut at the last
newline before the 2,000-char mark, via `gFe`, so the preview can be
slightly shorter than exactly 2,000 chars).

### Per hook, not per event

`bee()` is called once per individual hook result, keyed by a unique id
built from that hook's own identifiers, and the result of each call is
placed into an array before any concatenation:

```js
// hookSpecificOutput.additionalContext, one call per hook result "mr"
yield { additionalContexts: [await bee(mr.additionalContext, `${s}-${jr}`, "additionalContext", { storageV5: ze })] }
```

The `<=` check inside `bee()` (`if (e.length <= s) return e`) runs against
that single hook's own string, before the per-hook results are joined into
`additionalContexts`. There is no later size check against the
concatenation of multiple hooks' output for the same event.

### stdout, systemMessage, and additionalContext are the same code path

All three go through `bee()` with the same default threshold and the same
2,000-char preview, from the same source region:

```js
let Wo = await bee(To.stdout.trim(), go, "stdout", { storageV5: ze })
let jr = await bee(cr.systemMessage, `${s}-${_r}`, "systemMessage", { storageV5: ze })
yield { additionalContexts: [await bee(cr.additionalContext, `${s}-${_r}`, "additionalContext", { storageV5: ze })] }
yield { initialUserMessage: await bee(cr.initialUserMessage, `${s}-${_r}`, "initialUserMessage", { storageV5: ze }) }
```

No field gets special-cased to a different limit; the mechanism is
identical for all four hook output channels.

### No documented setting to raise it

Grepped the binary for every `CLAUDE_CODE_*` / `MAX_*` environment variable
name it defines (`MAX_MCP_OUTPUT_TOKENS`, `CLAUDE_CODE_MAX_OUTPUT_TOKENS`,
`BASH_MAX_OUTPUT_LENGTH`, `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`, and
about a dozen more). None of them is read anywhere near `bee()` or `YJr`.
The only threshold in the codebase that is adjustable is a *different*
mechanism entirely, `cTe()`, which controls the general tool-result
persist size (`maxResultSizeChars` per tool, or the `tengu_velvet_ibis`
internal experiment map), and that function is never called from the hook
path. So there is no settings.json key, env var, or CLI flag that raises
the 10,000-character hook-output threshold; it is a hardcoded constant in
this build.

## Empirical confirmation

Docs and changelog being silent, built a throwaway plugin per the
fallback instructions to check the source reading against real behavior.

**Setup** (all inside `mktemp -d` scratch directories, deleted afterward):
a plugin with `.claude-plugin/plugin.json` and `hooks/hooks.json`
registering two `SessionStart` hooks, each a shell script that emits a
`hookSpecificOutput.additionalContext` JSON payload. First run: two hooks,
each with 5,866 characters of filler text ending in a distinct sentinel
(`SENTINEL_ONE_END` / `SENTINEL_TWO_END`), each individually under the
10,000-char threshold, but their concatenation (11,732 chars) is over it.
Second run: a single `SessionStart` hook with 12,316 characters ending in
`SENTINEL_BIG_END`, comparable to the ~12.3KB case in the prompt.

Ran `claude -p` with `--plugin-dir <plugin dir>`, and `HOME`,
`CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`, and `CODEX_HOME` all pointed at a
separate scratch directory holding only a copied, `0600`-permission
`.credentials.json` (copied once from `/home/faisal/.claude/.credentials.json`,
never written back).

**Result, two-hook run:** asked the model to quote the 40 characters
immediately before each sentinel. It quoted both exactly and in full
(`"uick brown fox jumps over the lazy dog. "` before each), meaning both
hooks' additional context landed inline in full, no truncation, even
though the *combined* size (11,732 chars) exceeds the 10,000-char
threshold. This confirms the threshold is evaluated per hook, not against
the sum of hooks for the event.

**Result, single 12.3KB-hook run:** asked the model to report on its own
session-start context. It reported:

> Output too large (12KB). Full output saved to:
> /tmp/tmp.osfcJr15oL/projects/-tmp-tmp-YwLu4Umpuv/.../hook-65f8e869-...-1-additionalContext.txt

and confirmed `SENTINEL_BIG_END` was not visible in what it could see,
only in the file it could optionally re-read. This reproduces the
originally reported behavior (a ~12.3KB hook producing an "Output too
large" wrapper with a short preview) and is consistent with a ~10,000-char
cutoff.

## Answers

1. **Threshold**: 10,000 characters (`YJr = 1e4`) per hook output string.
   Preview size: 2,000 characters (`Hge = 2000`), trimmed to the last
   newline before that point.
2. **Scope**: per individual hook invocation, keyed by a per-hook id
   (`hook-${sessionOrToolId}-${hookIndexOrName}`). Not applied to the
   concatenation of multiple hooks' output for one event.
3. **Two SessionStart hooks under threshold**: both land inline in full,
   independently, confirmed empirically above.
4. **stdout / systemMessage / additionalContext**: all three (plus
   `initialUserMessage`) go through the same `bee()` function with the
   same 10,000-char threshold and the same 2,000-char preview. No
   field-specific behavior difference exists in this build.
5. **Setting to raise it**: none found. No environment variable, CLI flag,
   or settings.json key reaches `bee()`'s threshold parameter in this
   build; every call site uses the hardcoded default.

## What this means for a plugin

- Budget hook `additionalContext` (and `systemMessage`/`stdout`) to
  **under 10,000 characters per hook**, not per event. A `SessionStart`
  preamble like `fx`'s (observed at 13.6KB in this session, per the
  `<persisted-output>` block already visible in this transcript) will
  reliably get wrapped and truncated to a 2,000-character preview, with
  the model only seeing the rest if it chooses to re-read the saved file.
  Since the model cannot be relied on to always re-read that file, content
  past roughly 2,000 characters into a large hook payload should be
  treated as "probably not read" unless something in the flow forces a
  follow-up read.
- Splitting one large hook into several smaller hooks under 10,000 chars
  each is a valid, source-confirmed way to stay inline in full, since the
  threshold is per hook, not per event. A 13.6KB preamble split into two
  ~7KB hooks (each under 10,000 chars) would both land in full, based on
  the two-hook empirical run above. This is a real lever: keeping any
  single hook's context under 10,000 characters is sufficient regardless
  of how many hooks register for the same event.
- Because the limit is a hardcoded constant with no override, a plugin
  cannot ask the user or the operator to raise it. The only mitigation is
  keeping payloads small or accepting that anything past ~2,000
  characters requires the model to actively open the saved file, which it
  is not guaranteed to do.
- This applies identically to `SubagentStart` and other hook events using
  the same `additionalContext`/`systemMessage`/`stdout` fields (confirmed
  by this very session: the `SubagentStart` `PONYTAIL MODE ACTIVE` context
  injected into this run triggered the exact same `<persisted-output>`
  wrapper described above), so the same 10,000-char-per-hook budget
  applies to every hook event that can carry these fields, not just
  `SessionStart`.
