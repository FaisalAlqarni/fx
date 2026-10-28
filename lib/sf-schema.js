// generated from src/lib/sf-schema.ts by scripts/build: edit there, not here
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
var sf_schema_exports = {};
__export(sf_schema_exports, {
  validate: () => validate
});
module.exports = __toCommonJS(sf_schema_exports);
const KEYWORDS = /* @__PURE__ */ new Set(["type", "required", "properties", "additionalProperties", "items", "enum", "pattern", "maxLength", "$ref", "$defs", "$id", "$schema", "title", "description"]);
function validate(schema, value) {
  const rootSchema = schema;
  const errors = [];
  const walk = (s, v, pointer) => {
    for (const k of Object.keys(s)) if (!KEYWORDS.has(k)) throw new Error(`schema: unsupported schema keyword ${k}`);
    if (typeof s.$ref === "string") {
      walk(resolve(rootSchema, s.$ref), v, pointer);
      return;
    }
    if (typeof s.type === "string" && typeOf(v) !== s.type && !(s.type === "number" && typeOf(v) === "integer")) {
      errors.push({ pointer, message: `expected ${s.type}` });
      return;
    }
    if (Array.isArray(s.enum) && !s.enum.includes(v)) errors.push({ pointer, message: `value ${JSON.stringify(v)} not in enum` });
    if (typeof s.pattern === "string" && typeof v === "string" && !new RegExp(s.pattern, "u").test(v)) errors.push({ pointer, message: `does not match ${s.pattern}` });
    if (typeof s.maxLength === "number" && typeof v === "string" && [...v].length > s.maxLength) errors.push({ pointer, message: `longer than ${s.maxLength} characters` });
    if (isObject(v)) {
      for (const k of s.required ?? []) if (!(k in v)) errors.push({ pointer, message: `required property ${k} missing` });
      const props = s.properties ?? {};
      for (const [k, child] of Object.entries(v)) {
        const ps = props[k];
        if (ps) walk(ps, child, `${pointer}/${k}`);
        else if (s.additionalProperties === false) errors.push({ pointer, message: `property ${k} not allowed` });
      }
    }
    if (Array.isArray(v) && s.items) v.forEach((x, i) => walk(s.items, x, `${pointer}/${i}`));
  };
  walk(rootSchema, value, "");
  return errors;
}
function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function resolve(root, ref) {
  const name = ref.startsWith("#/$defs/") ? ref.slice("#/$defs/".length) : void 0;
  const target = name === void 0 ? void 0 : root.$defs?.[name];
  if (!target) throw new Error(`schema: cannot resolve $ref ${ref}`);
  return target;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validate
});
