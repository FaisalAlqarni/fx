// The drill-down map for pages fx writes: React Flow draws the nodes, ELK lays
// them out in the browser, and the side panel shows the evidence of the
// selected node or edge. The page supplies the data inline in
// <script type="application/json" id="map-data"> and an empty #map-root.
// scripts/build wraps this in an IIFE for the browser; loaded with no DOM
// (the gate test, node) it only exports fxMap.

interface Evidence { path: string; lines?: string; symbol?: string }
interface MapNode { id: string; label: string; kind: string; role?: string; children?: string; evidence?: Evidence[] }
interface MapEdge { from: string; to: string; label?: string; evidence?: Evidence[] }
interface Level { id: string; title: string; nodes: MapNode[]; edges: MapEdge[] }
interface MapData { root: string; levels: Level[] }

function field(v: unknown, k: string): unknown {
  return typeof v === 'object' && v !== null ? Reflect.get(v, k) : undefined;
}
const isStr = (v: unknown): v is string => typeof v === 'string';
const everyObj = (v: unknown, keys: string[]): boolean =>
  Array.isArray(v) && v.every((x) => keys.every((k) => isStr(field(x, k))));

function isMapData(v: unknown): v is MapData {
  const levels = field(v, 'levels');
  return isStr(field(v, 'root')) && Array.isArray(levels) && levels.every((l) =>
    isStr(field(l, 'id')) && isStr(field(l, 'title')) &&
    everyObj(field(l, 'nodes'), ['id', 'label', 'kind']) && everyObj(field(l, 'edges'), ['from', 'to']));
}

function validateMapData(data: unknown): string[] {
  if (!isMapData(data)) return ['map data needs root and levels, each level with id, title, nodes and edges'];
  const ids = new Set(data.levels.map((l) => l.id));
  const out: string[] = [];
  if (!ids.has(data.root)) out.push(`root level ${data.root} missing`);
  for (const l of data.levels) {
    for (const n of l.nodes) {
      if (n.children !== undefined && !ids.has(n.children)) out.push(`level ${l.id}: node ${n.id} opens missing level ${n.children}`);
    }
    const nodeIds = new Set(l.nodes.map((n) => n.id));
    for (const e of l.edges) {
      if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) out.push(`level ${l.id}: edge ${e.from} -> ${e.to} names a missing node`);
    }
  }
  return out;
}

// The level ids from the root down to levelId; empty when the root does not reach it.
function levelPath(data: unknown, levelId: string): string[] {
  if (!isMapData(data)) return [];
  const byId = new Map(data.levels.map((l) => [l.id, l]));
  const walk = (id: string, seen: string[]): string[] => {
    if (seen.includes(id)) return [];
    if (id === levelId) return [...seen, id];
    for (const n of byId.get(id)?.nodes ?? []) {
      if (n.children === undefined) continue;
      const p = walk(n.children, [...seen, id]);
      if (p.length) return p;
    }
    return [];
  };
  return walk(data.root, []);
}

interface ReactApi {
  createElement(type: unknown, props?: object | null, ...children: unknown[]): unknown;
  useState<T>(init: T): [T, (v: T) => void];
  useEffect(f: () => void | (() => void), deps: unknown[]): void;
}
interface ReactDomApi { createRoot(el: Element): { render(node: unknown): void } }
interface FlowApi { default: unknown; Controls: unknown }
interface ElkNode { id: string; x?: number; y?: number; width?: number; height?: number; children?: ElkNode[]; edges?: { id: string; sources: string[]; targets: string[] }[]; layoutOptions?: Record<string, string> }
interface ElkApi { layout(g: ElkNode): Promise<ElkNode> }
interface FlowNode { id: string; position: { x: number; y: number }; data: { label: unknown }; sourcePosition: string; targetPosition: string; style: object }
interface FlowEdge { id: string; source: string; target: string; label?: string; type: string; markerEnd: object }
interface Flow { nodes: FlowNode[]; edges: FlowEdge[] }
type Picked = { kind: 'node' | 'edge'; id: string } | null;

const NODE_W = 200;
const NODE_H = 64;

function mount(host: Element, data: MapData): void {
  const R: ReactApi = Reflect.get(globalThis, 'React');
  const RD: ReactDomApi = Reflect.get(globalThis, 'ReactDOM');
  const RF: FlowApi = Reflect.get(globalThis, 'ReactFlow');
  const Elk: new () => ElkApi = Reflect.get(globalThis, 'ELK');
  const elk = new Elk();
  const h = R.createElement;
  const levels = new Map(data.levels.map((l) => [l.id, l]));

  function layout(level: Level): Promise<Flow> {
    const g: ElkNode = {
      id: 'root',
      layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.spacing.nodeNode': '28', 'elk.layered.spacing.nodeNodeBetweenLayers': '64' },
      children: level.nodes.map((n) => ({ id: n.id, width: NODE_W, height: NODE_H })),
      edges: level.edges.map((e, i) => ({ id: `e${i}`, sources: [e.from], targets: [e.to] })),
    };
    return elk.layout(g).then((res) => ({
      nodes: level.nodes.map((n) => {
        const c = (res.children ?? []).find((x) => x.id === n.id);
        return {
          id: n.id, position: { x: c?.x ?? 0, y: c?.y ?? 0 }, sourcePosition: 'right', targetPosition: 'left',
          style: { width: NODE_W, height: NODE_H },
          data: { label: h('div', { className: `fxm-node k-${n.kind}` },
            h('div', { className: 'fxm-kind' }, n.kind), h('div', { className: 'fxm-label' }, n.label),
            n.children === undefined ? null : h('span', { className: 'fxm-open' }, 'opens')) },
        };
      }),
      edges: level.edges.map((e, i) => ({ id: `e${i}`, source: e.from, target: e.to, label: e.label, type: 'smoothstep', markerEnd: { type: 'arrowclosed' } })),
    }));
  }

  function evidenceList(ev: Evidence[] | undefined) {
    if (!ev || ev.length === 0) return h('p', { className: 'fxm-muted' }, 'No evidence recorded.');
    return h('ul', null, ev.map((e, i) => h('li', { key: i },
      h('code', null, e.lines ? `${e.path}:${e.lines}` : e.path), e.symbol ? ` ${e.symbol}` : '')));
  }

  function App() {
    const [path, setPath] = R.useState<string[]>([data.root]);
    const [sel, setSel] = R.useState<Picked>(null);
    const [flow, setFlow] = R.useState<Flow | null>(null);
    const curId = path[path.length - 1] ?? data.root;
    const cur = levels.get(curId);
    R.useEffect(() => {
      let dead = false;
      setFlow(null);
      if (cur) layout(cur).then((f) => { if (!dead) setFlow(f); });
      return () => { dead = true; };
    }, [curId]);
    if (!cur) return null;
    const open = (id: string) => { setPath(levelPath(data, id)); setSel(null); };

    const node = sel?.kind === 'node' ? cur.nodes.find((n) => n.id === sel.id) : undefined;
    const edge = sel?.kind === 'edge' ? cur.edges[Number(sel.id.slice(1))] : undefined;
    let panel: unknown = h('p', { className: 'fxm-muted' }, 'Select a node or an edge to see its evidence.');
    if (node) {
      panel = h('div', null, h('h4', null, node.label), h('p', { className: 'fxm-muted' }, node.kind),
        node.role ? h('p', null, node.role) : null,
        node.children === undefined ? null : h('button', { type: 'button', onClick: () => open(node.children ?? data.root) }, 'Open next level'),
        h('h5', null, 'Evidence'), evidenceList(node.evidence));
    } else if (edge) {
      panel = h('div', null, h('h4', null, `${edge.from} to ${edge.to}`), edge.label ? h('p', null, edge.label) : null,
        h('h5', null, 'Evidence'), evidenceList(edge.evidence));
    }
    const crumbs = path.map((id, i) => h('button', {
      key: id, type: 'button', 'aria-current': i === path.length - 1 ? 'true' : undefined,
      onClick: () => { setPath(path.slice(0, i + 1)); setSel(null); },
    }, levels.get(id)?.title ?? id));

    return h('div', { className: 'fxm' },
      h('nav', { className: 'fxm-bar', 'aria-label': 'Map levels' }, crumbs),
      h('div', { className: 'fxm-body' },
        h('div', { className: 'fxm-canvas' }, flow
          ? h(RF.default, {
            key: curId, nodes: flow.nodes, edges: flow.edges, fitView: true, nodesDraggable: false, nodesConnectable: false,
            onNodeClick: (_e: unknown, n: { id: string }) => setSel({ kind: 'node', id: n.id }),
            onEdgeClick: (_e: unknown, ed: { id: string }) => setSel({ kind: 'edge', id: ed.id }),
            onPaneClick: () => setSel(null),
          }, h(RF.Controls, null))
          : h('p', { className: 'fxm-muted' }, 'Laying out the map.')),
        h('aside', { className: 'fxm-panel', 'aria-live': 'polite' }, panel)));
  }

  RD.createRoot(host).render(h(App));
}

function start(dataEl: HTMLElement): void {
  const host = document.getElementById('map-root');
  if (!host) return;
  const data: unknown = JSON.parse(dataEl.textContent ?? ''); // ts-gate-ok: page-supplied map data, validated on the next line
  const errors = validateMapData(data);
  if (errors.length || !isMapData(data)) {
    host.textContent = `Map data is invalid: ${errors.join('; ')}`;
    return;
  }
  mount(host, data);
}

Reflect.set(globalThis, 'fxMap', { validateMapData, levelPath, mount });
// mount runs only on a page that has map data, so node can load this file.
if (typeof document !== 'undefined') {
  const dataEl = document.getElementById('map-data');
  if (dataEl) start(dataEl);
}
