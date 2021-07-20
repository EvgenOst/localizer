type Struct = Map<string, unknown>;

type InputObject = { [key: string]: unknown };
type OutputObject = InputObject;
type OutputDeepObject = { [key: string]: string | OutputDeepObject };

const delimeter = '.';

export function getUnique(arr: any[]) {
  return Array.from(new Set(arr));
}

function isObject(o: unknown): o is InputObject {
  return !!o && (o as Object).constructor === Object;
}

export function createEmptyStruct(fields: string[]): Struct {
  return new Map(getUnique(fields).map((f) => [f, '']));
}

export function createStructFromObject(obj: InputObject): Struct {
  const result = new Map();

  (function deepSearch(o: { [key: string]: unknown }, deep = 0, path?: string[]) {
    if (deep >= 20) {
      console.warn('Превышено ограничение глубины объекта');
      return;
    }
    for (const [key, value] of Object.entries(o)) {
      const p = path ? [...path, key] : [key];
      if (isObject(value)) {
        deepSearch(value, deep + 1, p);
      } else {
        result.set(p.join(delimeter), value || '');
      }
    }
  })(obj);

  return result;
}

export function createObjectFromStruct(struct: Struct): OutputObject {
  return Object.fromEntries(struct);
}

export function createDeepObjectFromStruct(struct: Struct): OutputDeepObject {
  const obj = {} as OutputDeepObject;

  for (const [key, value] of struct) {
    const parts = key.split(delimeter);
    let o: any = obj;
    for (let i = 0, len = parts.length; i < len; i++) {
      const key = parts[i];
      const isLast = i === len - 1;

      if (!isLast) {
        o[key] = o[key] || {};

        if (!isObject(o[key])) {
          o[key] = { '!': o[key] };
        }
      } else {
        o[key] = value;
      }

      o = o[key];
    }
  }

  return obj;
}

export function merge(struct: Struct, struct2: Struct): Struct {
  return new Map([...struct, ...struct2]);
}

export function apply(target: Struct, source: Struct, reset = false): Struct {
  const result = new Map() as Struct;

  for (const [key, value] of target) {
    const sourceValue = source.get(key) || '';
    result.set(key, value && !reset ? value : sourceValue);
  }

  return result;
}

export function getStructInfo(out: Struct, origin?: Struct) {
  const emptyKeys = [];
  const diffKeys = [];

  for (const [key, value] of out) {
    if (origin && !origin.has(key)) diffKeys.push(key);
    else if (!value) emptyKeys.push(key);
  }

  return { emptyKeys, diffKeys };
}

export function sortStruct(struct: Struct): Struct {
  const regex = new RegExp(`(.*?\\${delimeter})`, 'g');

  const structArr = Array.from(struct);
  const sorted = structArr
    .map(([key], i) => ({ index: i, key: key.replace(regex, String.fromCharCode(1999) + '$1') }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((v) => structArr[v.index]);

  return new Map(sorted);
}
