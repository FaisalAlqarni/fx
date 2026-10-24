// generated from src/index.ts by scripts/build: edit there, not here
import { spawnSync } from "node:child_process";
function detectMajor() {
  const forced = process.env.FX_OPENCODE_MAJOR;
  if (forced === "1") return 1;
  if (forced === "2") return 2;
  try {
    const r = spawnSync("opencode", ["--version"], { timeout: 3e3, encoding: "utf8" });
    const m = r.status === 0 && r.stdout ? r.stdout.match(/\d+/) : null;
    return m && Number(m[0]) === 2 ? 2 : 1;
  } catch {
    return 1;
  }
}
const major = detectMajor();
const plugin = major === 2 ? (await import("./plugins/fx-opencode-v2.js")).default : (await import("./plugins/fx-opencode-v1.js")).fx;
if (!plugin) throw new Error(`fx: no plugin export found for major ${major}`);
var index_default = plugin;
export {
  index_default as default
};
