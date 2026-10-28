// A JSON Schema subset validator, so fx ships the model schema without a
// runtime dependency. Keywords: type, required, properties,
// additionalProperties false, items, enum, pattern, maxLength, local $ref.
type Schema = Record<string, unknown>;
type SchemaError = { pointer: string; message: string };

// $defs, $id, $schema, title and description are read or skipped, never enforced.
const KEYWORDS = new Set(['type', 'required', 'properties', 'additionalProperties', 'items', 'enum', 'pattern', 'maxLength', '$ref', '$defs', '$id', '$schema', 'title', 'description']);

export function validate(schema: object, value: unknown): SchemaError[] {
  const rootSchema = schema as Schema;
  const errors: SchemaError[] = [];
  const walk = (s: Schema, v: unknown, pointer: string): void => {
    // A keyword this validator ignored would pass values the schema means to reject.
    for (const k of Object.keys(s)) if (!KEYWORDS.has(k)) throw new Error(`schema: unsupported schema keyword ${k}`);
    if (typeof s.$ref === 'string') {
      walk(resolve(rootSchema, s.$ref), v, pointer);
      return;
    }
    // A value of the wrong type gets one error, not one per keyword.
    if (typeof s.type === 'string' && typeOf(v) !== s.type && !(s.type === 'number' && typeOf(v) === 'integer')) {
      errors.push({ pointer, message: `expected ${s.type}` });
      return;
    }
    if (Array.isArray(s.enum) && !s.enum.includes(v)) errors.push({ pointer, message: `value ${JSON.stringify(v)} not in enum` });
    if (typeof s.pattern === 'string' && typeof v === 'string' && !new RegExp(s.pattern, 'u').test(v)) errors.push({ pointer, message: `does not match ${s.pattern}` });
    // JSON Schema counts code points, so an emoji is one character.
    if (typeof s.maxLength === 'number' && typeof v === 'string' && [...v].length > s.maxLength) errors.push({ pointer, message: `longer than ${s.maxLength} characters` });
    if (isObject(v)) {
      for (const k of (s.required ?? []) as string[]) if (!(k in v)) errors.push({ pointer, message: `required property ${k} missing` });
      const props = (s.properties ?? {}) as Record<string, Schema>;
      for (const [k, child] of Object.entries(v)) {
        const ps = props[k];
        if (ps) walk(ps, child, `${pointer}/${k}`);
        else if (s.additionalProperties === false) errors.push({ pointer, message: `property ${k} not allowed` });
      }
    }
    if (Array.isArray(v) && s.items) v.forEach((x, i) => walk(s.items as Schema, x, `${pointer}/${i}`));
  };
  walk(rootSchema, value, '');
  return errors;
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

const isObject =(v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function resolve(root: Schema, ref: string): Schema {
  const name = ref.startsWith('#/$defs/') ? ref.slice('#/$defs/'.length) : undefined;
  const target = name === undefined ? undefined : (root.$defs as Record<string, Schema> | undefined)?.[name];
  if (!target) throw new Error(`schema: cannot resolve $ref ${ref}`);
  return target;
}
