export interface SchemaTable {
  name: string;
  kind: 'object' | 'array' | 'junction';
  primaryKey: string;
  parent: string | null;
  foreignKey: string | null;
  columns: string[];
}

export interface SchemaEdge {
  /** Child table name */
  from: string;
  /** Parent table name */
  to: string;
  /** FK column on the child table, e.g. "users_id" */
  via: string;
}

export interface SchemaModel {
  tables: SchemaTable[];
  edges: SchemaEdge[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === 'string';
}

function parseTable(raw: unknown, index: number): SchemaTable {
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`schema.tables[${index}] is not an object`);
  }
  const t = raw as Record<string, unknown>;

  if (!isString(t['name'])) throw new Error(`schema.tables[${index}].name must be a string`);
  const kind = t['kind'];
  if (kind !== 'object' && kind !== 'array' && kind !== 'junction') {
    throw new Error(`schema.tables[${index}].kind must be 'object'|'array'|'junction', got ${String(kind)}`);
  }
  if (!isString(t['primaryKey'])) throw new Error(`schema.tables[${index}].primaryKey must be a string`);
  if (!isStringOrNull(t['parent'])) throw new Error(`schema.tables[${index}].parent must be string|null`);
  if (!isStringOrNull(t['foreignKey'])) throw new Error(`schema.tables[${index}].foreignKey must be string|null`);
  if (!Array.isArray(t['columns'])) throw new Error(`schema.tables[${index}].columns must be an array`);
  const columns: string[] = [];
  for (let i = 0; i < (t['columns'] as unknown[]).length; i++) {
    const col = (t['columns'] as unknown[])[i];
    if (!isString(col)) throw new Error(`schema.tables[${index}].columns[${i}] must be a string`);
    columns.push(col);
  }

  return {
    name: t['name'] as string,
    kind: kind as 'object' | 'array' | 'junction',
    primaryKey: t['primaryKey'] as string,
    parent: t['parent'] as string | null,
    foreignKey: t['foreignKey'] as string | null,
    columns,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses and validates the raw schema.json emitted by json2relcsv.
 * Derives `edges` from each table's `parent` + `foreignKey` fields.
 */
export function parseSchema(raw: unknown): SchemaModel {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('schema must be a non-null object');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj['tables'])) {
    throw new Error('schema.tables must be an array');
  }

  const tables: SchemaTable[] = (obj['tables'] as unknown[]).map((t, i) => parseTable(t, i));

  const tableNames = new Set(tables.map((t) => t.name));

  const edges: SchemaEdge[] = [];
  for (const table of tables) {
    if (table.parent !== null && table.foreignKey !== null) {
      if (!tableNames.has(table.parent)) {
        throw new Error(
          `schema table "${table.name}" references unknown parent "${table.parent}"`,
        );
      }
      edges.push({
        from: table.name,
        to: table.parent,
        via: table.foreignKey,
      });
    }
  }

  return { tables, edges };
}
