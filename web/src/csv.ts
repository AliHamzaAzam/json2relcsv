export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/**
 * Minimal RFC4180-style CSV parser.
 *
 * Handles:
 *  - Quoted fields (delimited by `"`)
 *  - Embedded commas inside quoted fields
 *  - Doubled `""` inside quoted fields → single `"`
 *  - Unquoted fields
 *  - CRLF and LF line endings
 *
 * Returns the first row as `headers` and all subsequent rows as `rows`.
 * Empty input returns `{ headers: [], rows: [] }`.
 */
export function parseCsv(text: string): ParsedCsv {
  if (text.trim() === '') {
    return { headers: [], rows: [] };
  }

  // Normalise line endings so we only deal with LF.
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const allRows: string[][] = [];
  let pos = 0;
  const len = normalised.length;

  while (pos <= len) {
    const row = parseRow();
    allRows.push(row);
    // Consume the trailing newline (if any).
    if (pos < len && normalised[pos] === '\n') {
      pos++;
    } else {
      break;
    }
  }

  // Strip a single trailing empty row that can appear when the file ends with \n.
  if (allRows.length > 0) {
    const last = allRows[allRows.length - 1];
    if (last.length === 1 && last[0] === '') {
      allRows.pop();
    }
  }

  const [headerRow = [], ...dataRows] = allRows;

  return { headers: headerRow, rows: dataRows };

  // ------------------------------------------------------------------
  // Inner helpers (closures over `pos` and `normalised`)
  // ------------------------------------------------------------------

  function parseRow(): string[] {
    const fields: string[] = [];
    // Parse at least one field.
    do {
      if (pos < len && normalised[pos] === '"') {
        fields.push(parseQuotedField());
      } else {
        fields.push(parseUnquotedField());
      }
    } while (pos < len && normalised[pos] === ',' && (pos++ >= 0));
    return fields;
  }

  function parseQuotedField(): string {
    pos++; // consume opening `"`
    let value = '';
    while (pos < len) {
      const ch = normalised[pos];
      if (ch === '"') {
        if (pos + 1 < len && normalised[pos + 1] === '"') {
          // Escaped quote: "" → "
          value += '"';
          pos += 2;
        } else {
          pos++; // consume closing `"`
          break;
        }
      } else {
        value += ch;
        pos++;
      }
    }
    return value;
  }

  function parseUnquotedField(): string {
    let start = pos;
    while (pos < len && normalised[pos] !== ',' && normalised[pos] !== '\n') {
      pos++;
    }
    return normalised.slice(start, pos);
  }
}
