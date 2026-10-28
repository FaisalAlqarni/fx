# Self-check for compare-evidence.py. Run: python3 -I compare-evidence.test.py
# Writes two tiny models under the system temp folder (scripts/scratch-env points it into the scratchpad).
import json, os, subprocess, sys, tempfile

here = os.path.dirname(os.path.abspath(__file__))
d = tempfile.mkdtemp(prefix="cmp-ev-")

ref = {
    "levels": {"root": "system", "diagrams": [{"id": "system", "nodes": [
        {"id": "a", "evidence": [{"path": "Shamel.Backend/src/A.cs", "lines": "10-20", "symbol": "A"}]},
        {"id": "b", "evidence": [{"path": "Shamel.Backend/src/B.cs", "lines": "5", "symbol": "B"}]},
        {"id": "other", "evidence": [{"path": "Shamel.Engine/x.ts", "lines": "1-9"}]}],
        "edges": [{"from": "a", "to": "b", "evidence": [{"path": "Shamel.Backend/src/A.cs", "lines": "30-40"}]}]}]},
    "sequences": [{"id": "turn", "participants": [], "messages": [
        {"n": 1, "evidence": [{"path": "Shamel.Backend/src/C.cs", "lines": "1-3,50-60"}]}]}],
    "stores": {"sql": [{"table": "dbo.t", "evidence": [{"path": "Shamel.Backend/src/D.cs", "lines": "7"}]}], "redis": [], "memory": [], "files": [], "client": []},
    "storeFlows": [{"id": "f", "steps": [{"n": 1, "evidence": [{"path": "Shamel.Backend/src/E.cs"}]}]}],
    "sections": [{"id": "s", "bullets": [{"text": "x", "evidence": [{"path": "Shamel.Backend/src/F.cs", "lines": "2-4"}]}]}],
}
new = {
    "levels": {"root": "system", "diagrams": [{"id": "l0", "nodes": [
        {"id": "api", "evidence": [{"path": "src/A.cs", "lines": "15-25"}]},
        {"id": "extra", "evidence": [{"path": "src/Z.cs", "lines": "1-2"}]}], "edges": []}]},
    "sequences": [{"id": "t", "participants": [], "messages": [
        {"n": 1, "evidence": [{"path": "src/C.cs", "lines": "55"}]}]}],
    "stores": {"sql": [{"id": "row", "evidence": [{"path": "src/D.cs", "lines": "8"}]}], "cache": [], "memory": [], "files": [], "client": []},
    "storeFlows": [{"id": "f", "steps": [{"n": 1, "evidence": [{"path": "src/E.cs", "lines": "100"}]}]}],
    "sections": [{"id": "s", "bullets": [{"id": "bl", "text": "x", "evidence": [{"path": "src/F.cs", "lines": "2-4"}]}]}],
}
for name, m in (("ref.json", ref), ("new.json", new)):
    with open(os.path.join(d, name), "w") as f:
        json.dump(m, f)

out = subprocess.run([sys.executable, "-I", os.path.join(here, "compare-evidence.py"),
                      os.path.join(d, "ref.json"), os.path.join(d, "new.json")],
                     capture_output=True, text=True)
assert out.returncode == 0, out.stderr
r = json.loads(out.stdout)
# Shamel.Backend items: node a, node b, edge a>b, message 1, sql row, step 1, bullet = 7. The Engine node is excluded.
assert r["systemFlowItems"] == 7, r
# matched: a (15-25 overlaps 10-20), message (55 in 50-60), sql row (7 vs 8 does not overlap -> missed),
# step (no lines on ref entry: whole file, new has E.cs -> matched), bullet (same range) = 4
assert r["matched"] == 4, r
assert r["share"] == 0.57, r
missed = sorted(m["item"] for m in r["missed"])
assert missed == ["edge:system:a>b", "node:b", "store:sql#1"], missed
assert all(m["reason"] for m in r["missed"]), r
# added: new items overlapping no system-flow item: extra node, and the sql row (7 vs 8)
assert sorted(r["added"]) == ["node:extra", "store:row"], r["added"]
print("compare-evidence self-check passed")
