import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { convert } from '../src/runner.ts';
import { parseCsv } from '../src/csv.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const sampleJson = readFileSync(path.resolve(REPO_ROOT, 'tests', 'sample.json'), 'utf8');

describe('convert() — valid input', () => {
  it('returns ok:true for tests/sample.json', async () => {
    const result = await convert(sampleJson);
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
  });

  it('schema includes expected tables', async () => {
    const result = await convert(sampleJson);
    expect(result.schema).not.toBeNull();
    const names = result.schema!.tables.map((t) => t.name);
    expect(names).toContain('users');
    expect(names).toContain('orders');
  });

  it('schema edges include orders→users FK relationship', async () => {
    const result = await convert(sampleJson);
    expect(result.schema).not.toBeNull();
    const edges = result.schema!.edges;
    // orders table is a child of users
    const ordersEdge = edges.find((e) => e.from === 'orders');
    expect(ordersEdge).toBeDefined();
    expect(ordersEdge!.to).toBe('users');
    expect(ordersEdge!.via).toMatch(/users_id/i);
  });

  it('at least one table CSV parses to headers+rows via parseCsv', async () => {
    const result = await convert(sampleJson);
    expect(result.tables.length).toBeGreaterThanOrEqual(1);
    const first = result.tables[0];
    expect(first).toBeDefined();
    const parsed = parseCsv(first!.csv);
    expect(parsed.headers.length).toBeGreaterThan(0);
    expect(parsed.rows.length).toBeGreaterThan(0);
  });

  it('AST string is non-empty', async () => {
    const result = await convert(sampleJson);
    expect(result.ast.trim().length).toBeGreaterThan(0);
  });
});

describe('convert() — invalid input', () => {
  it('returns ok:false for invalid JSON', async () => {
    const result = await convert('{ not valid json');
    expect(result.ok).toBe(false);
  });

  it('error field is non-empty for invalid JSON', async () => {
    const result = await convert('{ not valid json');
    expect(result.error).not.toBeNull();
    expect((result.error ?? '').length).toBeGreaterThan(0);
  });

  it('does not throw for invalid JSON', async () => {
    await expect(convert('{ not valid json')).resolves.toBeDefined();
  });
});
