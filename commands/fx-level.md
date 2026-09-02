---
description: Set the fx ceremony level: writes lite|full|ultra to ~/.claude/fx.json, and touches nothing else
---

# /fx:level

**Argument:** `lite`, `full` or `ultra`. Anything else is rejected: do not
coerce a near-miss, ask.

No argument? Print the current value from `~/.claude/fx.json` (`full` when the
key is absent) and stop. Reading is not setting.

---

## The one file

`~/.claude/fx.json` is **the only path outside the repo that fx ever writes.**

**Never `~/.claude/CLAUDE.md`.** That is the user's own file; fx does not own a
line of it, and this command has no business opening it. Same for
`~/.claude/settings.json`, `~/.claude/agents/` and everything else under `~`.
One file, one key.

## Writing it

A **single-key overwrite that preserves every other key**: `fx.json` is a
shared file and may already hold state this command knows nothing about. Read,
set `level`, write back:

```bash
node -e 'const fs=require("fs"),os=require("os"),p=require("path");
const f=p.join(os.homedir(),".claude","fx.json");
const j=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):{};
j.level=process.argv[1];
fs.mkdirSync(p.dirname(f),{recursive:true});
fs.writeFileSync(f,JSON.stringify(j,null,2)+"\n");' <lite|full|ultra>
```

Idempotent: running it twice with the same value leaves the same file.

**If the existing file is not valid JSON, `JSON.parse` throws and nothing is
written. That is the correct outcome: stop and report it.** Do not "repair" it
by writing a fresh `{"level": ...}`, which would silently delete whatever the
user had in there.

## The levels

| Value | Means |
|---|---|
| `lite` | Least ceremony: the lanes run their short paths |
| `full` | The default, and the assumed value when the key is absent |
| `ultra` | Most ceremony: the lanes run everything they have |

The value is machine state: one key, read by whoever reads it. **This command
writes it and does nothing else**: it does not re-run a lane, re-read a
design, or apply the new level to work already in flight. The next invocation
picks it up.

## Report

One line: the old value, the new value, and the path written.
