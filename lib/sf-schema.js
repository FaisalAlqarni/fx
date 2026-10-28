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
const KEYWORDS = /* @__PURE__ */ new Set([
  "type",
  "required",
  "properties",
  "additionalProperties",
  "items",
  "enum",
  "pattern",
  "maxLength",
  "$ref",
  "$defs",
  "$id",
  "$schema",
  "title",
  "description",
  "allOf",
  "anyOf",
  "oneOf",
  "not",
  "const",
  "minLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "minItems",
  "maxItems",
  "minProperties",
  "maxProperties",
  "propertyNames",
  "prefixItems"
]);
function validate(schema, value, refs = {}) {
  const check = (doc, s, v, pointer) => {
    const errors = [];
    const sub = (child, x, at, d = doc) => check(d, child, x, at);
    for (const k of Object.keys(s)) if (!KEYWORDS.has(k)) errors.push({ pointer, message: `unsupported keyword ${k}` });
    if (errors.length) return errors;
    if (typeof s.$ref === "string") return resolve(doc, s.$ref, refs, (d, t) => sub(t, v, pointer, d));
    if (typeof s.type === "string" && typeOf(v) !== s.type && !(s.type === "number" && typeOf(v) === "integer")) return [{ pointer, message: `expected ${s.type}` }];
    if (Array.isArray(s.enum) && !s.enum.includes(v)) errors.push({ pointer, message: `value ${JSON.stringify(v)} not in enum` });
    if ("const" in s && JSON.stringify(v) !== JSON.stringify(s.const)) errors.push({ pointer, message: `value ${JSON.stringify(v)} is not ${JSON.stringify(s.const)}` });
    if (typeof s.pattern === "string" && typeof v === "string" && !new RegExp(s.pattern, "u").test(v)) errors.push({ pointer, message: `does not match ${s.pattern}` });
    if (typeof v === "string") {
      const n = [...v].length;
      if (typeof s.maxLength === "number" && n > s.maxLength) errors.push({ pointer, message: `longer than ${s.maxLength} characters` });
      if (typeof s.minLength === "number" && n < s.minLength) errors.push({ pointer, message: `shorter than ${s.minLength} characters` });
    }
    if (typeof v === "number") {
      if (typeof s.minimum === "number" && v < s.minimum) errors.push({ pointer, message: `less than ${s.minimum}` });
      if (typeof s.exclusiveMinimum === "number" && v <= s.exclusiveMinimum) errors.push({ pointer, message: `less than ${s.exclusiveMinimum}` });
      if (typeof s.maximum === "number" && v > s.maximum) errors.push({ pointer, message: `more than ${s.maximum}` });
    }
    for (const sch of s.allOf ?? []) errors.push(...sub(sch, v, pointer));
    if (Array.isArray(s.anyOf) && !s.anyOf.some((sch) => sub(sch, v, pointer).length === 0)) errors.push({ pointer, message: "does not match any of anyOf" });
    if (Array.isArray(s.oneOf) && s.oneOf.filter((sch) => sub(sch, v, pointer).length === 0).length !== 1) errors.push({ pointer, message: "does not match exactly one of oneOf" });
    if (isObject(s.not) && sub(s.not, v, pointer).length === 0) errors.push({ pointer, message: "matches a not schema" });
    if (isObject(v)) {
      for (const k of s.required ?? []) if (!Object.hasOwn(v, k)) errors.push({ pointer, message: `required property ${k} missing` });
      const keys = Object.keys(v);
      if (typeof s.minProperties === "number" && keys.length < s.minProperties) errors.push({ pointer, message: `fewer than ${s.minProperties} properties` });
      if (typeof s.maxProperties === "number" && keys.length > s.maxProperties) errors.push({ pointer, message: `more than ${s.maxProperties} properties` });
      const props = s.properties ?? {};
      for (const [k, child] of Object.entries(v)) {
        if (isObject(s.propertyNames)) errors.push(...sub(s.propertyNames, k, `${pointer}/${k}`));
        const ps = Object.hasOwn(props, k) ? props[k] : void 0;
        if (ps) errors.push(...sub(ps, child, `${pointer}/${k}`));
        else if (s.additionalProperties === false) errors.push({ pointer, message: `property ${k} not allowed` });
        else if (isObject(s.additionalProperties)) errors.push(...sub(s.additionalProperties, child, `${pointer}/${k}`));
      }
    }
    if (Array.isArray(v)) {
      if (typeof s.minItems === "number" && v.length < s.minItems) errors.push({ pointer, message: `fewer than ${s.minItems} items` });
      if (typeof s.maxItems === "number" && v.length > s.maxItems) errors.push({ pointer, message: `more than ${s.maxItems} items` });
      const prefix = s.prefixItems ?? [];
      v.forEach((x, i) => {
        if (i < prefix.length) errors.push(...sub(prefix[i], x, `${pointer}/${i}`));
        else if (s.items === false) errors.push({ pointer: `${pointer}/${i}`, message: "item not allowed" });
        else if (isObject(s.items)) errors.push(...sub(s.items, x, `${pointer}/${i}`));
      });
    }
    return errors;
  };
  return check(schema, schema, value, "");
}
function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function resolve(doc, ref, refs, use) {
  const [file, frag = ""] = ref.split("#");
  const root = file ? refs[file] : doc;
  const name = frag.startsWith("/$defs/") ? frag.slice("/$defs/".length) : void 0;
  const target = root && name !== void 0 && isObject(root.$defs) && Object.hasOwn(root.$defs, name) ? root.$defs[name] : void 0;
  if (!root || !target) throw new Error(`schema: cannot resolve $ref ${ref}`);
  return use(root, target);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validate
});
