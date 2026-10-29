// generated from src/references/visual/fx-map-2.ts by scripts/build: edit there, not here
"use strict";
(() => {
  function field(v, k) {
    return typeof v === "object" && v !== null ? Reflect.get(v, k) : void 0;
  }
  const isStr = (v) => typeof v === "string";
  const everyObj = (v, keys) => Array.isArray(v) && v.every((x) => keys.every((k) => isStr(field(x, k))));
  const isGroups = (v) => Array.isArray(v) && v.every((g) => isStr(field(g, "id")) && isStr(field(g, "label")) && Array.isArray(field(g, "members")));
  function isMapData(v) {
    const levels = field(v, "levels");
    return isStr(field(v, "root")) && Array.isArray(levels) && levels.every((l) => isStr(field(l, "id")) && isStr(field(l, "title")) && everyObj(field(l, "nodes"), ["id", "label", "kind"]) && everyObj(field(l, "edges"), ["from", "to", "mode"]) && isGroups(field(l, "groups")));
  }
  function validateMapData(data) {
    if (!isMapData(data)) return ["map data needs root and levels, each level with id, title, groups, nodes and edges"];
    const ids = new Set(data.levels.map((l) => l.id));
    const out = [];
    if (!ids.has(data.root)) out.push(`root level ${data.root} missing`);
    for (const l of data.levels) {
      for (const n of l.nodes) {
        if (n.children !== void 0 && !ids.has(n.children)) out.push(`level ${l.id}: node ${n.id} opens missing level ${n.children}`);
      }
      const nodeIds = new Set(l.nodes.map((n) => n.id));
      for (const g of l.groups) {
        for (const m of g.members) if (!nodeIds.has(m)) out.push(`level ${l.id}: group ${g.id} names a missing node ${m}`);
      }
      for (const e of l.edges) {
        if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) out.push(`level ${l.id}: edge ${e.from} -> ${e.to} names a missing node`);
      }
    }
    return out;
  }
  function levelPath(data, levelId) {
    if (!isMapData(data)) return [];
    const byId = new Map(data.levels.map((l) => [l.id, l]));
    const walk = (id, seen) => {
      if (seen.includes(id)) return [];
      if (id === levelId) return [...seen, id];
      for (const n of byId.get(id)?.nodes ?? []) {
        if (n.children === void 0) continue;
        const p = walk(n.children, [...seen, id]);
        if (p.length) return p;
      }
      return [];
    };
    return walk(data.root, []);
  }
  const NODE_W = 200;
  const NODE_H = 64;
  const PAD = 22;
  const FADED = 0.45;
  function groupBoxes(level, pos) {
    const byId = new Map(level.groups.map((g) => [g.id, g]));
    const boxes = /* @__PURE__ */ new Map();
    const box = (id, seen) => {
      const g = byId.get(id);
      if (!g || seen.includes(id)) return null;
      const parts = [
        ...g.members.flatMap((m) => {
          const p = pos.get(m);
          return p ? [{ x0: p.x, y0: p.y, x1: p.x + NODE_W, y1: p.y + NODE_H }] : [];
        }),
        ...(g.groups ?? []).flatMap((c) => {
          const b2 = box(c, [...seen, id]);
          return b2 ? [b2] : [];
        })
      ];
      if (parts.length === 0) return null;
      const b = {
        x0: Math.min(...parts.map((q) => q.x0)) - PAD,
        y0: Math.min(...parts.map((q) => q.y0)) - PAD - 14,
        x1: Math.max(...parts.map((q) => q.x1)) + PAD,
        y1: Math.max(...parts.map((q) => q.y1)) + PAD
      };
      boxes.set(id, { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 });
      return b;
    };
    for (const g of level.groups) box(g.id, []);
    return boxes;
  }
  function mount(host, data) {
    const R = Reflect.get(globalThis, "React");
    const RD = Reflect.get(globalThis, "ReactDOM");
    const RF = Reflect.get(globalThis, "ReactFlow");
    const Elk = Reflect.get(globalThis, "ELK");
    const elk = new Elk();
    const h = R.createElement;
    const levels = new Map(data.levels.map((l) => [l.id, l]));
    function layout(level) {
      const g = {
        id: "root",
        layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.spacing.nodeNode": "40", "elk.layered.spacing.nodeNodeBetweenLayers": "72" },
        children: level.nodes.map((n) => ({ id: n.id, width: NODE_W, height: NODE_H })),
        edges: level.edges.map((e, i) => ({ id: `e${i}`, sources: [e.from], targets: [e.to] }))
      };
      return elk.layout(g).then((res) => {
        const pos = new Map((res.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
        const boxes = groupBoxes(level, pos);
        const groupNodes = level.groups.flatMap((gr) => {
          const bx = boxes.get(gr.id);
          return bx ? [{
            id: `group:${gr.id}`,
            position: { x: bx.x, y: bx.y },
            sourcePosition: "right",
            targetPosition: "left",
            zIndex: -1,
            selectable: false,
            style: { width: bx.w, height: bx.h, border: "1.5px dashed var(--muted)", background: "transparent", borderRadius: 14 },
            data: { label: h("div", { className: "fxm-group" }, gr.label) }
          }] : [];
        });
        return {
          nodes: [...groupNodes, ...level.nodes.map((n) => {
            const p = pos.get(n.id);
            return {
              id: n.id,
              position: { x: p?.x ?? 0, y: p?.y ?? 0 },
              sourcePosition: "right",
              targetPosition: "left",
              style: { width: NODE_W, height: NODE_H, opacity: n.primary ? 1 : FADED, borderStyle: n.primary ? "solid" : "dashed" },
              data: { label: h(
                "div",
                { className: `fxm-node k-${n.kind}${n.primary ? "" : " fxm-context"}` },
                h("div", { className: "fxm-kind" }, n.primary ? n.kind : `${n.kind}, context`),
                h("div", { className: "fxm-label" }, n.label),
                n.children === void 0 ? null : h("span", { className: "fxm-open" }, "opens")
              ) }
            };
          })],
          edges: level.edges.map((e, i) => ({
            id: `e${i}`,
            source: e.from,
            target: e.to,
            label: e.label,
            type: "smoothstep",
            markerEnd: { type: "arrowclosed" },
            animated: e.mode === "async",
            style: e.mode === "async" ? { strokeDasharray: "6 4" } : {}
          }))
        };
      });
    }
    function evidenceList(ev) {
      if (!ev || ev.length === 0) return h("p", { className: "fxm-muted" }, "No evidence recorded.");
      return h("ul", null, ev.map((e, i) => h(
        "li",
        { key: i },
        h("code", null, e.lines ? `${e.path}:${e.lines}` : e.path),
        e.symbol ? ` ${e.symbol}` : ""
      )));
    }
    function App() {
      const [path, setPath] = R.useState([data.root]);
      const [sel, setSel] = R.useState(null);
      const [flow, setFlow] = R.useState(null);
      const [failed, setFailed] = R.useState(null);
      const [showContext, setShowContext] = R.useState(true);
      const [allArrows, setAllArrows] = R.useState(false);
      const curId = path[path.length - 1] ?? data.root;
      const cur = levels.get(curId);
      R.useEffect(() => {
        let dead = false;
        setFlow(null);
        setFailed(null);
        if (cur) {
          layout(cur).then((f) => {
            if (!dead) setFlow(f);
          }).catch((e) => {
            if (!dead) setFailed(String(e));
          });
        }
        return () => {
          dead = true;
        };
      }, [curId]);
      if (!cur) return null;
      const contextIds = new Set(cur.nodes.filter((n) => !n.primary).map((n) => n.id));
      const touches = (e) => sel?.kind === "node" ? e.source === sel.id || e.target === sel.id : sel?.kind === "edge" ? e.id === sel.id : true;
      const shown = flow && {
        nodes: flow.nodes.filter((n) => showContext || !contextIds.has(n.id)),
        edges: flow.edges.filter((e) => (showContext || !contextIds.has(e.source) && !contextIds.has(e.target)) && (allArrows || touches(e)))
      };
      const open = (id) => {
        setPath(levelPath(data, id));
        setSel(null);
      };
      const node = sel?.kind === "node" ? cur.nodes.find((n) => n.id === sel.id) : void 0;
      const edge = sel?.kind === "edge" ? cur.edges[Number(sel.id.slice(1))] : void 0;
      let panel = h("p", { className: "fxm-muted" }, "Select a node or an edge to see its evidence.");
      if (node) {
        panel = h(
          "div",
          null,
          h("h3", null, node.label),
          h("p", { className: "fxm-muted" }, node.kind),
          node.role ? h("p", null, node.role) : null,
          node.primary ? null : h("p", { className: "fxm-muted" }, "Context node: part of another area, drawn for reference."),
          node.children === void 0 ? null : h("button", { type: "button", onClick: () => open(node.children ?? data.root) }, "Open next level"),
          h("h4", null, "Evidence"),
          evidenceList(node.evidence)
        );
      } else if (edge) {
        panel = h(
          "div",
          null,
          h("h3", null, `${edge.from} to ${edge.to}`),
          h("p", { className: "fxm-muted" }, edge.mode),
          edge.label ? h("p", null, edge.label) : null,
          h("h4", null, "Evidence"),
          evidenceList(edge.evidence)
        );
      }
      const crumbs = path.map((id, i) => h("button", {
        key: id,
        type: "button",
        "aria-current": i === path.length - 1 ? "true" : void 0,
        onClick: () => {
          setPath(path.slice(0, i + 1));
          setSel(null);
        }
      }, levels.get(id)?.title ?? id));
      return h(
        "div",
        { className: "fxm" },
        h("nav", { className: "fxm-bar", "aria-label": "Map levels" }, crumbs),
        h(
          "div",
          { className: "fxm-bar" },
          h("button", { type: "button", "aria-pressed": showContext, onClick: () => setShowContext(!showContext) }, "Show context nodes"),
          h("button", { type: "button", "aria-pressed": allArrows, onClick: () => setAllArrows(!allArrows) }, "Show all arrows")
        ),
        h(
          "div",
          { className: "fxm-body" },
          h("div", { className: "fxm-canvas" }, shown ? h(RF.default, {
            key: curId,
            nodes: shown.nodes,
            edges: shown.edges,
            fitView: true,
            fitViewOptions: { padding: 0.1 },
            minZoom: 0.2,
            nodesDraggable: false,
            nodesConnectable: false,
            onNodeClick: (_e, n) => setSel({ kind: "node", id: n.id }),
            onEdgeClick: (_e, ed) => setSel({ kind: "edge", id: ed.id }),
            onPaneClick: () => setSel(null)
          }, h(RF.Controls, null)) : h("p", { className: "fxm-muted" }, failed === null ? "Laying out the map." : `The map could not be laid out: ${failed}`)),
          h("aside", { className: "fxm-panel", "aria-live": "polite" }, panel)
        )
      );
    }
    RD.createRoot(host).render(h(App));
  }
  function start(dataEl) {
    const host = document.getElementById("map-root");
    if (!host) return;
    const data = JSON.parse(dataEl.textContent ?? "");
    const errors = validateMapData(data);
    if (errors.length || !isMapData(data)) {
      host.textContent = `Map data is invalid: ${errors.join("; ")}`;
      return;
    }
    mount(host, data);
  }
  Reflect.set(globalThis, "fxMap", { validateMapData, levelPath, mount });
  if (typeof document !== "undefined") {
    const dataEl = document.getElementById("map-data");
    if (dataEl) start(dataEl);
  }
})();
