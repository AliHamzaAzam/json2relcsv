import { describe, it, expect } from 'vitest';
import { parseCsv } from '../src/csv.ts';

describe('parseCsv', () => {
  it('parses a simple header + one row', () => {
    const result = parseCsv('id,name\n1,Alice\n');
    expect(result.headers).toEqual(['id', 'name']);
    expect(result.rows).toEqual([['1', 'Alice']]);
  });

  it('handles quoted fields containing commas', () => {
    const result = parseCsv('name,address\nAlice,"1 Main St, Springfield"\n');
    expect(result.headers).toEqual(['name', 'address']);
    expect(result.rows).toEqual([['Alice', '1 Main St, Springfield']]);
  });

  it('handles doubled "" inside quoted fields', () => {
    // RFC4180: "" inside a quoted field → single "
    const result = parseCsv('id,quote\n1,"He said ""hello"""\n');
    expect(result.headers).toEqual(['id', 'quote']);
    expect(result.rows).toEqual([['1', 'He said "hello"']]);
  });

  it('handles multiple quoted fields per row', () => {
    const result = parseCsv('"first","last"\n"Jane","Doe"\n');
    expect(result.headers).toEqual(['first', 'last']);
    expect(result.rows).toEqual([['Jane', 'Doe']]);
  });

  it('handles CRLF line endings', () => {
    const result = parseCsv('id,name\r\n1,Bob\r\n');
    expect(result.headers).toEqual(['id', 'name']);
    expect(result.rows).toEqual([['1', 'Bob']]);
  });

  it('does not add a phantom empty row when input ends with newline', () => {
    const result = parseCsv('id,name\n1,Alice\n');
    expect(result.rows.length).toBe(1);
  });

  it('returns empty headers+rows for blank input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] });
    expect(parseCsv('   ')).toEqual({ headers: [], rows: [] });
  });

  it('handles embedded newline-free quoted field adjacent to next field', () => {
    // "a","b,c","d"
    const result = parseCsv('"a","b,c","d"\n"x","y,z","w"\n');
    expect(result.headers).toEqual(['a', 'b,c', 'd']);
    expect(result.rows).toEqual([['x', 'y,z', 'w']]);
  });

  it('handles a quoted field containing an embedded newline', () => {
    // RFC4180 §2.6: fields may contain newlines if enclosed in double-quotes.
    const result = parseCsv('"a\nb",c\n');
    expect(result.headers).toEqual(['a\nb', 'c']);
    expect(result.rows).toHaveLength(0);
  });

  it('parses real tool output — RFC4180 quoted string values', () => {
    // Tool doubles internal quotes and wraps string fields in quotes.
    const csv = 'id,name,age\n1,"Alice",30\n2,"Bob",25\n';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(['id', 'name', 'age']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['1', 'Alice', '30']);
    expect(result.rows[1]).toEqual(['2', 'Bob', '25']);
  });
});
