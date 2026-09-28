#!/usr/bin/env python3
"""fx-implement cost report: subagent time/tokens by role + test-command counts. stdlib only."""
import json, glob, os, re, shlex, collections
from datetime import datetime

P = os.path.expanduser("~/.claude/projects/-development")
SESSIONS = ["3ea3f51e-5073-4907-955e-5e2f7591378b", "e3b16772-2b94-4dd7-9c00-c13c75ab978a"]
ROLES = ["implementer", "fix", "task review", "re-review", "lens-security", "lens-database",
         "lens-a11y", "lens-silent-failure", "lens-pipeline", "devils-advocate", "other"]
TYPE_RULES = {"fx:fx-lens-security": "lens-security", "fx:fx-lens-database": "lens-database",
              "fx:fx-lens-a11y": "lens-a11y", "fx:fx-lens-silent-failure": "lens-silent-failure",
              "fx:fx-lens-pipeline": "lens-pipeline", "fx:fx-devils-advocate": "devils-advocate"}
# ordered; first match wins; applied to lowercased description
DESC_RULES = [
    (r"re-?review", "re-review"),
    (r"review", "task review"),
    (r"\bfix|fixes\b", "fix"),
    (r"^(revise|research|explore|audit|verify|write|plan|pre-flight|coverage|finish)", "other"),
    (r"implement|\btasks?\s*\d|^p\d+\s|\ba-\d+|\bd-\d+", "implementer"),
]

def classify(atype, desc):
    if atype in TYPE_RULES: return TYPE_RULES[atype]
    d = (desc or "").lower()
    for rx, role in DESC_RULES:
        if re.search(rx, d): return role
    return "other"

def ts(s):
    try: return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except Exception: return None

def family(m):
    m = (m or "").lower()
    for f in ("opus", "sonnet", "haiku", "fable"):
        if f in m: return f
    return m or "unknown"

def blocks(d):
    c = (d.get("message") or {}).get("content")
    return c if isinstance(c, list) else []

def read(path):
    with open(path, errors="replace") as fh:
        for l in fh:
            try: yield json.loads(l)
            except Exception: pass

# --- dispatch index: tool_use id -> input, from every transcript in both sessions
files = []
for s in SESSIONS:
    files += glob.glob(f"{P}/{s}.jsonl")
    files += glob.glob(f"{P}/{s}/subagents/*.jsonl")
dispatch = {}
for f in files:
    for d in read(f):
        for b in blocks(d):
            if b.get("type") == "tool_use" and b.get("name") in ("Agent", "Task"):
                dispatch[b["id"]] = b.get("input", {})

# --- per-subagent stats
agents = []
for s in SESSIONS:
    for f in sorted(glob.glob(f"{P}/{s}/subagents/*.jsonl")):
        mp = f[:-6] + ".meta.json"
        meta = json.load(open(mp)) if os.path.exists(mp) else {}
        inp = dispatch.get(meta.get("toolUseId"), {})
        atype = meta.get("agentType") or inp.get("subagent_type")
        desc = meta.get("description") or inp.get("description") or ""
        req_model = inp.get("model") or meta.get("model")
        stamps, msgs, models = [], {}, collections.Counter()
        tests = []
        seen_tu = set()
        for d in read(f):
            t = ts(d.get("timestamp", "")) if d.get("timestamp") else None
            if t: stamps.append(t)
            m = d.get("message") or {}
            if d.get("type") == "assistant" and isinstance(m, dict) and m.get("usage"):
                u = m["usage"]; mid = m.get("id") or d.get("uuid")
                cur = msgs.setdefault(mid, dict(out=0, cr=0, cc=0, inp=0))
                # streamed chunks repeat the same message id: keep the max (final) value
                cur["out"] = max(cur["out"], u.get("output_tokens") or 0)
                cur["cr"] = max(cur["cr"], u.get("cache_read_input_tokens") or 0)
                cur["cc"] = max(cur["cc"], u.get("cache_creation_input_tokens") or 0)
                cur["inp"] = max(cur["inp"], u.get("input_tokens") or 0)
                if m.get("model") and not m["model"].startswith("<"):
                    models[family(m["model"])] += 1 if not cur.get("m") else 0
                    cur["m"] = 1
            for b in blocks(d):
                if b.get("type") == "tool_use" and b.get("name") == "Bash" and b["id"] not in seen_tu:
                    seen_tu.add(b["id"]); tests.append((b.get("input") or {}).get("command", ""))
        model = models.most_common(1)[0][0] if models else "unknown"
        agents.append(dict(
            file=f, session=s, atype=atype or "unknown", desc=desc, req=family(req_model) if req_model else None,
            model=model, mixed=len(models) > 1, has_ts=len(stamps) >= 2,
            mins=(max(stamps) - min(stamps)) / 60 if len(stamps) >= 2 else 0.0,
            out=sum(v["out"] for v in msgs.values()), cr=sum(v["cr"] for v in msgs.values()),
            cc=sum(v["cc"] for v in msgs.values()), role=classify(atype, desc), tests=tests, nmsg=len(msgs)))

# --- output
print("KEYWORD RULES (first match wins)")
print("  1. subagent_type: " + ", ".join(f"{k} -> {v}" for k, v in TYPE_RULES.items()))
print("  2. description (lowercased regex), in order:")
for rx, r in DESC_RULES: print(f"       /{rx}/ -> {r}")
print("  3. otherwise -> other.  Type comes from meta.json agentType, else the dispatching Agent tool_use input.")
print("  Tokens: per assistant message id, max of streamed usage chunks (avoids double count).")
print("  Duration: first to last timestamp in the file. Minutes are AGENT-minutes (parallel agents overlap).\n")

tm = sum(a["mins"] for a in agents); to = sum(a["out"] for a in agents)
print(f"{'role':20}{'n':>5}{'tot_min':>10}{'mean_min':>10}{'out_tok':>12}{'cacheR_tok':>15}{'%min':>7}{'%out':>7}   models(opus/sonnet/haiku/other)")
for r in ROLES:
    g = [a for a in agents if a["role"] == r]
    if not g: print(f"{r:20}{0:>5}"); continue
    n = len(g); mi = sum(a["mins"] for a in g); o = sum(a["out"] for a in g); c = sum(a["cr"] for a in g)
    mc = collections.Counter(a["model"] for a in g)
    oth = n - mc["opus"] - mc["sonnet"] - mc["haiku"]
    print(f"{r:20}{n:>5}{mi:>10.1f}{mi/n:>10.1f}{o:>12,}{c:>15,}{100*mi/tm if tm else 0:>6.1f}%{100*o/to if to else 0:>6.1f}%   {mc['opus']}/{mc['sonnet']}/{mc['haiku']}/{oth}")
print(f"{'TOTAL':20}{len(agents):>5}{tm:>10.1f}{tm/len(agents):>10.1f}{to:>12,}{sum(a['cr'] for a in agents):>15,}")
print(f"  (cache-creation tokens total: {sum(a['cc'] for a in agents):,})")

print("\nBY AGENT TYPE (agentType from meta)")
tc = collections.Counter(a["atype"] for a in agents)
for k, v in tc.most_common(): print(f"  {k:32}{v:>5}")
print("\nBY SESSION")
for s in SESSIONS:
    g = [a for a in agents if a["session"] == s]
    print(f"  {s[:8]}  agents={len(g)}  agent-min={sum(a['mins'] for a in g):.1f}  out={sum(a['out'] for a in g):,}")

print("\nCOVERAGE")
print(f"  subagent transcripts found: {len(agents)} (with meta.json: {sum(1 for a in agents if os.path.exists(a['file'][:-6]+'.meta.json'))})")
oth = [a for a in agents if a["role"] == "other"]
print(f"  classified into a named role: {len(agents)-len(oth)}; 'other': {len(oth)}")
print(f"  lacking >=2 timestamps (0 minutes counted): {sum(1 for a in agents if not a['has_ts'])}")
print(f"  no usage/assistant messages: {sum(1 for a in agents if a['nmsg']==0)}")
print(f"  model unknown: {sum(1 for a in agents if a['model']=='unknown')}; agents using >1 model family: {sum(1 for a in agents if a['mixed'])}")
rm = [a for a in agents if a["req"] and a["req"] != "inherit" and a["model"] != "unknown"]
print(f"  requested model (dispatch/meta) differs from actual: {sum(1 for a in rm if a['req']!=a['model'])} of {len(rm)} with an explicit request")
print("  'other' descriptions (top):")
for k, v in collections.Counter(f"{a['atype']} | {re.sub(r'[0-9]+','N',a['desc'])[:50]}" for a in oth).most_common(12): print(f"    {v:>3}  {k}")
print(f"  main transcripts (not analysed for cost): {[os.path.basename(f) for f in files if '/subagents/' not in f]}")
print("  ~/.claude/projects/-development-advantage-backend*/ hold main transcripts only, no subagent dirs; not included.")

# --- test commands
OPTV = {"-I", "-r", "-f", "-o", "-e", "-t", "--format", "--require", "--seed", "--out", "--tag", "--example", "--default-path"}
ASSIGN = re.compile(r"^\w+=")
def is_op(t): return bool(t) and all(c in ";&|<>()" for c in t) or t.startswith(">") or t.startswith("2>")
def find_cmds(cmd):
    out = []; lines = cmd.split("\n"); skip = None
    for ln in lines:
        if skip:
            if ln.strip() == skip: skip = None
            continue
        hm = re.search(r"<<-?\s*['\"]?(\w+)['\"]?", ln)
        try:
            sh = shlex.shlex(ln, posix=True, punctuation_chars=True); sh.whitespace_split = True; sh.commenters = "#"
            toks = list(sh)
        except Exception:
            toks = ln.split()
        for i, t in enumerate(toks):
            prev = toks[i-1] if i else None
            pos = i == 0 or is_op(prev) or prev in ("exec", "bundle", "then", "do") or ASSIGN.match(prev or "") or (prev or "").endswith("bin/")
            base = os.path.basename(t)
            if not pos: continue
            if base == "rspec" or base == "t.sh":
                kind = "rspec" if base == "rspec" else "t.sh"
                args = []; j = i + 1
                while j < len(toks):
                    a = toks[j]
                    if is_op(a) or (a.isdigit() and j+1 < len(toks) and toks[j+1].startswith(">")): break
                    args.append(a); j += 1
                out.append((kind, args))
            elif t == "make" and i+1 < len(toks) and toks[i+1].startswith("test"):
                out.append(("make", [toks[i+1]]))
            elif "test_all" in t or "test-all" in t and pos:
                out.append(("make", [t]))
        if hm: skip = hm.group(1)
    return out
def rspec_class(args):
    pos = []; k = 0
    while k < len(args):
        a = args[k]
        if a in OPTV: k += 2; continue
        if a.startswith("-"): k += 1; continue
        pos.append(a); k += 1
    if not pos: return "full (rspec, no path)"
    if all("$" in p for p in pos): return "unresolved shell variable path"
    if all(re.search(r":\d+$", p) or p.endswith(".rb") for p in pos if "$" not in p): return "targeted (file/:line)"
    return "directory"
FULL_MAKE = {"test", "test-parallel", "test-full", "test_all", "test-all"}
cnt = collections.Counter(); byrole = collections.defaultdict(collections.Counter); cmds_with = 0
for a in agents:
    n = 0
    for c in a["tests"]:
        for kind, args in find_cmds(c):
            if kind == "make":
                tgt = args[0]
                cl = f"make {tgt} (FULL)" if tgt in FULL_MAKE else f"make {tgt} (lane/other)"
            else:
                cl = rspec_class(args) + (" [via t.sh wrapper]" if kind == "t.sh" else "")
            cnt[cl] += 1; byrole[a["role"]][cl.split(" [")[0].split(" (")[0]] += 1; n += 1
    cmds_with += n > 0
print("\nTEST COMMANDS in subagent Bash tool_use (deduped by tool_use id; heredoc bodies skipped)")
for k, v in sorted(cnt.items(), key=lambda x: -x[1]): print(f"  {v:>5}  {k}")
full = sum(v for k, v in cnt.items() if "(FULL)" in k or k.startswith("full"))
print(f"  full-suite runs (make test/test-parallel/test-full/test_all + rspec with no path): {full}")
print(f"  total test invocations: {sum(cnt.values())} across {cmds_with} agents; total Bash calls scanned: {sum(len(a['tests']) for a in agents)}")
print("  by role (rspec/make class -> count):")
for r in ROLES:
    if byrole[r]: print(f"    {r:20}{dict(byrole[r])}")
