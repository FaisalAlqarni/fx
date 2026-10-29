# Visual assets: the vendored libraries and the copy rules

Any lane that writes an HTML page loads this file. A page opens with no internet
connection: it loads only files copied from fx into its output root's `_assets/`
folder. It holds the one list of what a page may load.

## Assets table

The library files live in fx's `vendor/` folder, one level up from this file in the
references tree. fx's own kit files sit beside this file.

| File | Library | Version | Package path | Source URL | SHA-256 | Licence file |
|---|---|---|---|---|---|---|
| `react-18.3.1.production.min.js` | React | 18.3.1 | `react/umd/react.production.min.js` | `https://registry.npmjs.org/react/-/react-18.3.1.tgz` | `d949f1c3687aedadcedac85261865f29b17cd273997e7f6b2bfc53b2f9d4c4dd` | `LICENSE-react` |
| `react-dom-18.3.1.production.min.js` | React DOM | 18.3.1 | `react-dom/umd/react-dom.production.min.js` | `https://registry.npmjs.org/react-dom/-/react-dom-18.3.1.tgz` | `35f4f974f4b2bcd44da73963347f8952e341f83909e4498227d4e26b98f66f0d` | `LICENSE-react` |
| `reactflow-11.11.4.min.js` | React Flow | 11.11.4 | `reactflow/dist/umd/index.js` | `https://registry.npmjs.org/reactflow/-/reactflow-11.11.4.tgz` | `a914438458d38e79495825ddc407d9078e941b6d929f9a9fbf035b8b4edac7e3` | `LICENSE-reactflow` |
| `reactflow-11.11.4.style.css` | React Flow | 11.11.4 | `reactflow/dist/style.css` | `https://registry.npmjs.org/reactflow/-/reactflow-11.11.4.tgz` | `8bb2def0f075030d4da2fc24570e12d0b8ddcb6cbc79566f8a5ff2c587a2b9b1` | `LICENSE-reactflow` |
| `elkjs-0.9.3.bundled.js` | elkjs | 0.9.3 | `elkjs/lib/elk.bundled.js` | `https://registry.npmjs.org/elkjs/-/elkjs-0.9.3.tgz` | `b0745abd7f23cd91690a1587e377edbe19fd7233c783300290936720546216d4` | `LICENSE-elkjs` |
| `fx-tokens-1.css` | fx | 0.7.0 |  |  | `5039daa841abe2b61dd062da9ff80c7408d2098c3d06b6eae502c7d81ea8b4d8` |  |
| `fx-map-1.js` | fx | 0.7.0 |  |  | `5270743f34aa8baa67f4bc9a1ac6cb117236c06aef5aab46aeeb21bb210fb04b` |  |
| `fx-map-2.js` | fx | 0.9.0 |  |  | `d4658aae6eb4daad533a24b9a5e2bd3f7080e0a0543c6435bbda69fbf65e511c` |  |
| `fx-flow-2.js` | fx | 0.9.0 |  |  | `894e3d39f80a6bf4e8c83913ca5bd119b9c99d316767da1799c2f317bbb9f77a` |  |

React and React DOM are MIT and share one licence file. React Flow is MIT. elkjs is
EPL-2.0. Each licence is carried verbatim in fx's `vendor/` folder.

## Output roots

| Page kind | Output root | Page location | Path from the page |
|---|---|---|---|
| Report | `docs/plans/_assets/` | `docs/plans/<slug>/<page>.html` | `../_assets/` |
| Docs page | `docs/html/_assets/` | `docs/html/<section>/<page>.html` | `../_assets/` |
| System flow site | `<site>/assets/` | `<site>/index.html` and `<site>/diagrams/<name>.html` | `assets/` from the page, `../assets/` from a diagram page |

A page loads `../_assets/<name>` and nothing else: no CDN, no host, no other path. The system flow site is the one exception: its folder is `assets/`, as the row says.

## Copy rule

Before writing a page, copy the files it loads into the output root:

1. Create the `_assets/` folder if it does not exist.
2. For each file the page loads, copy it into `_assets/` **only when no file of
   that name is already there.** The kit files come from the folder beside this file,
   the libraries from fx's `vendor/` folder.
3. Copy the `LICENSE-*` file of each copied library beside it, under the same rule.
4. In a system flow site, `theme.css` is generated from the repository's design language and written into `assets/`; it is never copied from fx.

A page with no map copies only `fx-tokens-1.css`. The map needs the five library files and one map file (`fx-map-1.js` or `fx-map-2.js`); `fx-flow-2.js` needs no library;
elkjs alone is about 1.6 MB, so copy it only for a page that has a map.

## Missing-file rule

A file named in the table but absent from its source folder stops the writer before
the page is written. Name the missing file and stop; do not write a page with a
broken script tag.

## Mismatch rule

A file of that name already in `_assets/` whose SHA-256 differs from the table is
left untouched. The report step says so, naming the file and both checksums, rather
than overwriting a copy that may be a deliberate local variant.

## Renaming rule

Any byte change to an fx kit file bumps the number in its name (`fx-map-2.js`,
`fx-tokens-2.css`), the table row changes with it, and templates point at the new
name. A repo then never keeps an old copy under the new name.

## Map data

The page writer fills the map's data inline in
`<script type="application/json" id="map-data">`, with every `<` written as
`\u003c`:

```json
{ "root": "l0",
  "levels": [ { "id": "l0", "title": "System", "nodes": [
      { "id": "api", "label": "API", "kind": "service", "role": "one line", "children": "l1-api",
        "evidence": [ { "path": "app/api.rb", "lines": "10-42", "symbol": "Api#call" } ] } ],
    "edges": [ { "from": "api", "to": "db", "label": "writes", "evidence": [] } ] } ] }
```

A node with `children` opens the level of that id. Every node and edge carries its
evidence; the side panel shows it. `fxMap.validateMapData` reports a missing root
level, a node that opens a missing level, and an edge that names a missing node; the
page shows those messages in place of the map.

`fx-map-2.js` reads the same block with these additions: each level has `groups` (`{ id, label, members, groups? }`), each node has `primary` (false draws it faded as a context node), each edge has `mode` (`sync` or `async`), and evidence of another root is written `@<root id>/<path>`. It also reports a group that names a missing node. `fx-flow-2.js` reads `<script type="application/json" id="diagrams">`, an object of figure specs keyed by figure key, and fills each card `figure.card` holding `div.fig` and `div.ctl[data-fx-flow="<key>"]`: it draws the figure at 1:1 into `.fig` (a box figure from `nodes` and `edges`, a lifeline sequence from `lanes` and `rows`) and puts the player's buttons, narration and count before the bar's `a.deep`.
