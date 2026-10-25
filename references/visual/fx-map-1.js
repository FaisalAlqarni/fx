// generated from src/references/visual/fx-map-1.ts by scripts/build: edit there, not here
"use strict";
(() => {
  function field(v, k) {
    return typeof v === "object" && v !== null ? Reflect.get(v, k) : void 0;
  }
  const isStr = (v) => typeof v === "string";
  const everyObj = (v, keys) => Array.isArray(v) && v.every((x) => keys.every((k) => isStr(field(x, k))));
  function isMapData(v) {
    const levels = field(v, "levels");
    return isStr(field(v, "root")) && Array.isArray(levels) && levels.every((l) => isStr(field(l, "id")) && isStr(field(l, "title")) && everyObj(field(l, "nodes"), ["id", "label", "kind"]) && everyObj(field(l, "edges"), ["from", "to"]));
  }
  function validateMapData(data) {
    if (!isMapData(data)) return ["map data needs root and levels, each level with id, title, nodes and edges"];
    const ids = new Set(data.levels.map((l) => l.id));
    const out = [];
    if (!ids.has(data.root)) out.push(`root level ${data.root} missing`);
    for (const l of data.levels) {
      for (const n of l.nodes) {
        if (n.children !== void 0 && !ids.has(n.children)) out.push(`level ${l.id}: node ${n.id} opens missing level ${n.children}`);
      }
      const nodeIds = new Set(l.nodes.map((n) => n.id));
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
        layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.spacing.nodeNode": "28", "elk.layered.spacing.nodeNodeBetweenLayers": "64" },
        children: level.nodes.map((n) => ({ id: n.id, width: NODE_W, height: NODE_H })),
        edges: level.edges.map((e, i) => ({ id: `e${i}`, sources: [e.from], targets: [e.to] }))
      };
      return elk.layout(g).then((res) => ({
        nodes: level.nodes.map((n) => {
          const c = (res.children ?? []).find((x) => x.id === n.id);
          return {
            id: n.id,
            position: { x: c?.x ?? 0, y: c?.y ?? 0 },
            sourcePosition: "right",
            targetPosition: "left",
            style: { width: NODE_W, height: NODE_H },
            data: { label: h(
              "div",
              { className: `fxm-node k-${n.kind}` },
              h("div", { className: "fxm-kind" }, n.kind),
              h("div", { className: "fxm-label" }, n.label),
              n.children === void 0 ? null : h("span", { className: "fxm-open" }, "opens")
            ) }
          };
        }),
        edges: level.edges.map((e, i) => ({ id: `e${i}`, source: e.from, target: e.to, label: e.label, type: "smoothstep", markerEnd: { type: "arrowclosed" } }))
      }));
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
          h("h4", null, node.label),
          h("p", { className: "fxm-muted" }, node.kind),
          node.role ? h("p", null, node.role) : null,
          node.children === void 0 ? null : h("button", { type: "button", onClick: () => open(node.children ?? data.root) }, "Open next level"),
          h("h5", null, "Evidence"),
          evidenceList(node.evidence)
        );
      } else if (edge) {
        panel = h(
          "div",
          null,
          h("h4", null, `${edge.from} to ${edge.to}`),
          edge.label ? h("p", null, edge.label) : null,
          h("h5", null, "Evidence"),
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
          { className: "fxm-body" },
          h("div", { className: "fxm-canvas" }, flow ? h(RF.default, {
            key: curId,
            nodes: flow.nodes,
            edges: flow.edges,
            fitView: true,
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
