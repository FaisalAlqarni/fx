// A JSON Schema subset validator, so fx ships the model schema without a
// runtime dependency. It enforces the keywords below; any other keyword is an error, never skipped.
type Schema = Record<string, unknown>;
type SchemaError = { pointer: string; message: string };

// $defs, $id, $schema, title and description are read or skipped, never enforced.
const KEYWORDS = new Set([
  'type', 'required', 'properties', 'additionalProperties', 'items', 'enum', 'pattern', 'maxLength', '$ref', '$defs', '$id', '$schema', 'title', 'description',
  'allOf', 'anyOf', 'oneOf', 'not', 'const', 'minLength', 'minimum', 'maximum', 'exclusiveMinimum', 'minItems', 'maxItems', 'minProperties', 'maxProperties', 'propertyNames', 'prefixItems',
]);

// `refs` maps a file name such as common.schema.json to its schema, for a $ref into another file's $defs.
export function validate(schema: object, value: unknown, refs: Record<string, object> = {}): SchemaError[] {
  const check = (doc: Schema, s: Schema, v: unknown, pointer: string): SchemaError[] => {
    const errors: SchemaError[] = [];
    const sub = (child: Schema, x: unknown, at: string, d: Schema = doc): SchemaError[] => check(d, child, x, at);
    for (const k of Object.keys(s)) if (!KEYWORDS.has(k)) errors.push({ pointer, message: `unsupported keyword ${k}` });
    if (errors.length) return errors;
    if (typeof s.$ref === 'string') return resolve(doc, s.$ref, refs, (d, t) => sub(t, v, pointer, d));
    // A value of the wrong type gets one error, not one per keyword.
    if (typeof s.type === 'string' && typeOf(v) !== s.type && !(s.type === 'number' && typeOf(v) === 'integer')) return [{ pointer, message: `expected ${s.type}` }];
    if (Array.isArray(s.enum) && !s.enum.includes(v)) errors.push({ pointer, message: `value ${JSON.stringify(v)} not in enum` });
    if ('const' in s && JSON.stringify(v) !== JSON.stringify(s.const)) errors.push({ pointer, message: `value ${JSON.stringify(v)} is not ${JSON.stringify(s.const)}` });
    if (typeof s.pattern === 'string' && typeof v === 'string' && !new RegExp(s.pattern, 'u').test(v)) errors.push({ pointer, message: `does not match ${s.pattern}` });
    // JSON Schema counts code points, so an emoji is one character.
    if (typeof v === 'string') {
      const n = [...v].length;
      if (typeof s.maxLength === 'number' && n > s.maxLength) errors.push({ pointer, message: `longer than ${s.maxLength} characters` });
      if (typeof s.minLength === 'number' && n < s.minLength) errors.push({ pointer, message: `shorter than ${s.minLength} characters` });
    }
    if (typeof v === 'number') {
      if (typeof s.minimum === 'number' && v < s.minimum) errors.push({ pointer, message: `less than ${s.minimum}` });
      if (typeof s.exclusiveMinimum === 'number' && v <= s.exclusiveMinimum) errors.push({ pointer, message: `less than ${s.exclusiveMinimum}` });
      if (typeof s.maximum === 'number' && v > s.maximum) errors.push({ pointer, message: `more than ${s.maximum}` });
    }
    for (const sch of (s.allOf ?? []) as Schema[]) errors.push(...sub(sch, v, pointer));
    if (Array.isArray(s.anyOf) && !(s.anyOf as Schema[]).some((sch) => sub(sch, v, pointer).length === 0)) errors.push({ pointer, message: 'does not match any of anyOf' });
    if (Array.isArray(s.oneOf) && (s.oneOf as Schema[]).filter((sch) => sub(sch, v, pointer).length === 0).length !== 1) errors.push({ pointer, message: 'does not match exactly one of oneOf' });
    if (isObject(s.not) && sub(s.not as Schema, v, pointer).length === 0) errors.push({ pointer, message: 'matches a not schema' });
    if (isObject(v)) {
      for (const k of (s.required ?? []) as string[]) if (!Object.hasOwn(v, k)) errors.push({ pointer, message: `required property ${k} missing` });
      const keys = Object.keys(v);
      if (typeof s.minProperties === 'number' && keys.length < s.minProperties) errors.push({ pointer, message: `fewer than ${s.minProperties} properties` });
      if (typeof s.maxProperties === 'number' && keys.length > s.maxProperties) errors.push({ pointer, message: `more than ${s.maxProperties} properties` });
      const props = (s.properties ?? {}) as Record<string, Schema>;
      for (const [k, child] of Object.entries(v)) {
        if (isObject(s.propertyNames)) errors.push(...sub(s.propertyNames as Schema, k, `${pointer}/${k}`));
        // Own properties only: an inherited name such as constructor is not a schema property.
        const ps = Object.hasOwn(props, k) ? props[k] : undefined;
        if (ps) errors.push(...sub(ps, child, `${pointer}/${k}`));
        else if (s.additionalProperties === false) errors.push({ pointer, message: `property ${k} not allowed` });
        else if (isObject(s.additionalProperties)) errors.push(...sub(s.additionalProperties as Schema, child, `${pointer}/${k}`));
      }
    }
    if (Array.isArray(v)) {
      if (typeof s.minItems === 'number' && v.length < s.minItems) errors.push({ pointer, message: `fewer than ${s.minItems} items` });
      if (typeof s.maxItems === 'number' && v.length > s.maxItems) errors.push({ pointer, message: `more than ${s.maxItems} items` });
      const prefix = (s.prefixItems ?? []) as Schema[];
      v.forEach((x, i) => {
        if (i < prefix.length) errors.push(...sub(prefix[i] as Schema, x, `${pointer}/${i}`));
        else if (s.items === false) errors.push({ pointer: `${pointer}/${i}`, message: 'item not allowed' });
        else if (isObject(s.items)) errors.push(...sub(s.items as Schema, x, `${pointer}/${i}`));
      });
    }
    return errors;
  };
  return check(schema as Schema, schema as Schema, value, '');
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// `#/$defs/x` is read in the current document; `file.json#/$defs/x` in the document refs names.
function resolve<T>(doc: Schema, ref: string, refs: Record<string, object>, use: (doc: Schema, target: Schema) => T): T {
  const [file, frag = ''] = ref.split('#');
  const root = file ? (refs[file] as Schema | undefined) : doc;
  const name = frag.startsWith('/$defs/') ? frag.slice('/$defs/'.length) : undefined;
  const target = root && name !== undefined && isObject(root.$defs) && Object.hasOwn(root.$defs, name) ? (root.$defs[name] as Schema) : undefined;
  if (!root || !target) throw new Error(`schema: cannot resolve $ref ${ref}`);
  return use(root, target);
}
