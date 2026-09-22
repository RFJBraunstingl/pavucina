import type { FieldChange } from "@/types/graph/graph-sync.ts";

export function equalValue(left: unknown, right: unknown) {
  return left === right || JSON.stringify(left) === JSON.stringify(right);
}

export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const changes: Record<string, FieldChange> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!equalValue(before[key], after[key])) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }
  return changes;
}

export function entityFields(value: object): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "properties") {
      for (const [name, property] of Object.entries(item)) {
        fields[`properties.${name}`] = property;
      }
    } else {
      fields[key] = item;
    }
  }
  return fields;
}

function defineEnumerableField(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
  });
}

export function fieldsEntity(fields: Record<string, unknown>) {
  const value: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(fields)) {
    if (item === undefined) continue;
    if (key.startsWith("properties.")) {
      const properties = (value.properties ??= {}) as Record<string, unknown>;
      defineEnumerableField(properties, key.slice("properties.".length), item);
    } else {
      defineEnumerableField(value, key, item);
    }
  }
  if ("type" in value && !("sourceId" in value)) value.properties ??= {};
  return value;
}
