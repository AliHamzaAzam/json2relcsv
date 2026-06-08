#!/usr/bin/env node
// smoke.mjs — Node ESM smoke test for the json2relcsv WASM module.
// Usage: node web/test/smoke.mjs

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SAMPLE_JSON_PATH = path.resolve(REPO_ROOT, 'tests', 'sample.json');

// ---------------------------------------------------------------------------
// Load the module factory (ES module emitted by emcc with EXPORT_ES6=1)
// ---------------------------------------------------------------------------
const { default: createJson2relcsv } = await import('../src/wasm/json2relcsv.mjs');

// ---------------------------------------------------------------------------
// Helper: run the WASM module with the given JSON string as stdin.
// Returns { exitCode, ast, schema, tables, stderr }
// ---------------------------------------------------------------------------
async function convert(json) {
  const inputBytes = Buffer.from(json, 'utf8');
  let inputPos = 0;

  let stdoutStr = '';
  let stderrStr = '';
  let exitCode = 0;

  const module = await createJson2relcsv({
    // Stream bytes from json into stdin; return null (EOF) when exhausted.
    stdin() {
      if (inputPos < inputBytes.length) {
        return inputBytes[inputPos++];
      }
      return null; // EOF
    },

    print(text) {
      stdoutStr += text + '\n';
    },

    printErr(text) {
      stderrStr += text + '\n';
    },

    // onExit is a recognized Module hook (fired by proc_exit before the
    // ExitStatus throw); captures the exit code on the happy path. The catch
    // block below reads ExitStatus.status as the authoritative fallback.
    onExit(code) {
      exitCode = code;
    },
  });

  // Set up MEMFS output directory.
  try {
    module.FS.mkdir('/out');
  } catch (e) {
    // Already exists (shouldn't happen for a fresh module, but be safe).
  }

  // Run main. callMain throws on non-zero exit when EXIT_RUNTIME=1;
  // we catch it so the smoke test can assert on failure cases.
  //
  // In Node, Emscripten sets `process.exitCode = status` before throwing.
  // We save and restore it so the test runner doesn't inherit a non-zero exit
  // code from a deliberately-failing sub-run.
  const savedExitCode = process.exitCode;
  process.exitCode = 0;
  try {
    const rc = module.callMain(['--print-ast', '--emit-schema', '--out-dir', '/out']);
    if (rc !== undefined) exitCode = rc;
  } catch (e) {
    // Emscripten throws ExitStatus { status: N } on process.exit() with EXIT_RUNTIME=1.
    if (e && typeof e.status === 'number') {
      exitCode = e.status;
    } else if (process.exitCode !== 0) {
      exitCode = process.exitCode;
    } else {
      // Unknown throw — treat as failure.
      exitCode = 1;
    }
  } finally {
    // Restore the outer exit code (0 while tests are passing).
    process.exitCode = savedExitCode ?? 0;
  }

  // Read back files from MEMFS.
  let schema = null;
  const tables = {};

  try {
    const schemaText = module.FS.readFile('/out/schema.json', { encoding: 'utf8' });
    schema = JSON.parse(schemaText);
  } catch (_) {
    // Not present on failure runs — that's fine.
  }

  try {
    const outFiles = module.FS.readdir('/out');
    for (const name of outFiles) {
      if (name === '.' || name === '..') continue;
      if (name.endsWith('.csv')) {
        const tableName = name.slice(0, -4);
        tables[tableName] = module.FS.readFile('/out/' + name, { encoding: 'utf8' });
      }
    }
  } catch (_) {
    // /out may not exist on a very early failure.
  }

  return {
    exitCode,
    ast: stdoutStr,
    schema,
    tables,
    stderr: stderrStr,
  };
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------
let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    failures++;
  }
}

// ---------------------------------------------------------------------------
// Test 1: valid input (tests/sample.json)
// ---------------------------------------------------------------------------
console.log('--- Test 1: valid input (tests/sample.json) ---');
const sampleJson = readFileSync(SAMPLE_JSON_PATH, 'utf8');
const valid = await convert(sampleJson);

assert(valid.exitCode === 0, `exitCode should be 0, got ${valid.exitCode}`);
assert(typeof valid.ast === 'string' && valid.ast.trim().length > 0, 'AST should be non-empty');
assert(valid.schema !== null && typeof valid.schema === 'object', 'schema.json should parse to an object');
assert(Array.isArray(valid.schema?.tables), 'schema.tables should be an array');

// sample.json has users, address, hobbies, orders tables
const tableNames = (valid.schema?.tables ?? []).map((t) => t.name);
assert(tableNames.includes('users'), `schema should include "users", got: ${JSON.stringify(tableNames)}`);

const csvCount = Object.keys(valid.tables).length;
assert(csvCount >= 1, `at least 1 CSV should be present, got ${csvCount}`);

// Every CSV present should have at least a header line.
for (const [name, content] of Object.entries(valid.tables)) {
  const firstLine = content.split('\n')[0] ?? '';
  assert(firstLine.length > 0, `CSV "${name}" should have a non-empty header row`);
}

if (failures === 0) {
  console.log('  exitCode:', valid.exitCode);
  console.log('  schema tables:', tableNames.join(', '));
  console.log('  CSV files:', Object.keys(valid.tables).join(', '));
  console.log('  AST length:', valid.ast.trim().length, 'chars');
  console.log('  PASS');
}

// ---------------------------------------------------------------------------
// Test 2: invalid JSON input
// ---------------------------------------------------------------------------
console.log('--- Test 2: invalid JSON input ---');
const invalid = await convert('{ not valid json');

assert(invalid.exitCode !== 0, `invalid JSON should produce a non-zero exit, got ${invalid.exitCode}`);
assert(invalid.stderr.trim().length > 0, `invalid JSON should write a parser error to stderr, got ${JSON.stringify(invalid.stderr)}`);

if (failures === 0) {
  console.log('  exitCode:', invalid.exitCode);
  console.log('  stderr excerpt:', invalid.stderr.slice(0, 120).trim());
  console.log('  PASS');
}

// ---------------------------------------------------------------------------
// Final result
// ---------------------------------------------------------------------------
if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  process.exit(1);
} else {
  console.log('\nSMOKE OK');
}
