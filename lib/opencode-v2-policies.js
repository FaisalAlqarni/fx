// generated from src/lib/opencode-v2-policies.ts by scripts/build: edit there, not here
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var opencode_v2_policies_exports = {};
__export(opencode_v2_policies_exports, {
  GUARD_POLICIES: () => GUARD_POLICIES
});
module.exports = __toCommonJS(opencode_v2_policies_exports);
const forms = (prefix, flag) => [`${prefix} ${flag} *`, `${prefix} * ${flag} *`];
const leading = (prefix, flag) => [`${prefix} ${flag} *`];
const FAMILIES = [
  [
    ["--force", "-f", "--force-with-lease", "--force-with-lease=*"].flatMap((f) => forms("git push", f)),
    ["git push origin feature", "git push -u origin feature-f"]
  ],
  [
    ["main", "master", "trunk"].flatMap((b) => [`git push * ${b}`, `git push * ${b} *`, `git push * *:${b}`, `git push * *:${b} *`]),
    ["git push origin feature", "git push origin main-fix", "git push origin feature:main-fix"]
  ],
  [
    [...["--delete", "-d"].flatMap((f) => forms("git push", f)), "git push * :*"],
    ["git push origin feature", "git push origin HEAD:feature"]
  ],
  [leading("git commit", "--no-verify"), ["git commit -m x", "git log --grep no-verify", 'git commit -m "explain --no-verify flag"']],
  [leading("git push", "--no-verify"), ["git push origin feature", "git log --grep no-verify"]],
  [forms("git reset", "--hard"), ["git reset --soft HEAD~1", "git reset HEAD file.txt"]],
  [
    ["-f", "-fd", "-df", "-fx", "-xf", "-fdx", "-fxd", "-dfx", "-dxf", "-xfd", "-xdf", "--force"].flatMap((f) => forms("git clean", f)),
    ["git clean -n", "git clean -nd", "git clean --dry-run"]
  ],
  [forms("git branch", "-D"), ["git branch feature", "git branch -d merged"]],
  [["git stash drop *", "git stash clear *"], ["git stash pop", "git stash list"]],
  [
    ["checkout", "restore"].flatMap((s) => [`git ${s} .`, `git ${s} . *`, `git ${s} * .`, `git ${s} * . *`]),
    ["git checkout .github/x", "git checkout feature", "git restore src/x.js"]
  ],
  [["-d", "--delete"].flatMap((f) => leading("git tag", f)), ["git tag v1", "git tag -l", 'git tag -a v1 -m "delete with -d flag"']]
];
const GUARD_POLICIES = FAMILIES.flatMap(([patterns, allowed]) => patterns.map((p) => ({
  action: "permission",
  resource: `shell:${p}`,
  effect: "deny",
  sample: p.replace(/\*/g, "x"),
  allowed
})));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GUARD_POLICIES
});
