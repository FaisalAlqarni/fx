# Overlap report of system-flow's model against a new model, for the files of one repo.
#   python3 -I compare-evidence.py <system-flow system-model.json> <new system-model.json> [reasons.json] [prefix]
# prefix: the folder name that system-flow evidence paths start with (default Shamel.Backend/).
# reasons.json: {"<handle>": "<reason>"} written by hand; a missed item without one prints "reason not written".
import json, re, sys


def spans(lines):
    """'10-20,50' -> [(10, 20), (50, 50)]; no lines -> None (whole file)."""
    if not lines:
        return None
    out = [(int(a), int(b or a)) for a, b in re.findall(r"(\d+)(?:\s*-\s*(\d+))?", str(lines))]
    return out or None


def hit(a, b):
    (pa, sa), (pb, sb) = a, b
    if pa != pb:
        return False
    if sa is None or sb is None:
        return True
    return any(x1 <= y2 and y1 <= x2 for x1, x2 in sa for y1, y2 in sb)


def entries(evidence, prefix):
    """Evidence entries as (path, spans) with the repo prefix stripped; owner entries are skipped."""
    out = []
    for e in evidence or []:
        p = e.get("path")
        if not p:
            continue
        if prefix:
            if not p.startswith(prefix):
                continue
            p = p[len(prefix):]
        out.append((p, spans(e.get("lines"))))
    return out


def items(m, legacy):
    """(handle, kind, evidence list) for the compared kinds, in model order."""
    out = []
    for d in m["levels"]["diagrams"]:
        for n in d.get("nodes", []):
            out.append(("node:" + n["id"], n.get("evidence")))
        for e in d.get("edges", []):
            out.append(("edge:%s:%s>%s" % (d["id"], e["from"], e["to"]), e.get("evidence")))
    for s in m.get("sequences", []):
        for p in s.get("participants", []):
            out.append(("participant:%s.%s" % (s["id"], p["id"]), p.get("evidence")))
        for g in s.get("messages", []):
            out.append(("message:%s#%s" % (s["id"], g["n"]), g.get("evidence")))
    for name, rows in m.get("stores", {}).items():
        for i, r in enumerate(rows, 1):
            rid = ("%s#%d" % (name, i)) if legacy else r["id"]
            out.append(("store:" + rid, r.get("evidence")))
    for f in m.get("storeFlows", []):
        for st in f.get("steps", []):
            out.append(("step:%s#%s" % (f["id"], st["n"]), st.get("evidence")))
    for sec in m.get("sections", []):
        for i, b in enumerate(sec.get("bullets", []), 1):
            bid = ("%s#%d" % (sec["id"], i)) if legacy else b["id"]
            out.append(("bullet:" + bid, b.get("evidence")))
    return out


def extra(m):
    """Evidence of kinds outside the compared list, so a new item of those kinds can still match."""
    out = []
    for d in m["levels"]["diagrams"]:
        out += [g.get("evidence") for g in d.get("groups", [])]
    for k in ("catalogue", "rules", "inventory"):
        out += [x.get("evidence") for x in m.get(k, [])]
    return out


def main(argv):
    if len(argv) < 3:
        print("usage: compare-evidence.py <system-flow model> <new model> [reasons.json] [prefix]", file=sys.stderr)
        return 2
    ref = json.load(open(argv[1]))
    new = json.load(open(argv[2]))
    reasons = json.load(open(argv[3])) if len(argv) > 3 and argv[3] else {}
    prefix = argv[4] if len(argv) > 4 else "Shamel.Backend/"

    ref_items = [(h, entries(ev, prefix)) for h, ev in items(ref, True)]
    ref_items = [(h, es) for h, es in ref_items if es]
    new_items = [(h, entries(ev, "")) for h, ev in items(new, False)]
    new_all = [es for _, es in new_items] + [entries(ev, "") for ev in extra(new)]
    ref_all = [es for _, es in ref_items]

    def overlaps(es, pool):
        return any(hit(a, b) for a in es for other in pool for b in other)

    matched = [h for h, es in ref_items if overlaps(es, new_all)]
    missed = [{"item": h, "reason": reasons.get(h, "reason not written")}
              for h, es in ref_items if h not in set(matched)]
    added = [h for h, es in new_items if not es or not overlaps(es, ref_all)]
    n = len(ref_items)
    print(json.dumps({"systemFlowItems": n, "matched": len(matched),
                      "share": round(len(matched) / n, 2) if n else 0,
                      "missed": missed, "added": added}, indent=2))
    return 0


sys.exit(main(sys.argv))
