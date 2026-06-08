import type { SchemaModel } from './schema.ts';
import { parseSchema } from './schema.ts';

export interface ConvertResult {
  ok: boolean;
  tables: { name: string; csv: string }[];
  schema: SchemaModel | null;
  ast: string;
  error: string | null;
}

/**
 * Runs the json2relcsv WASM tool against the provided JSON string.
 *
 * The factory module is cached by import(), but calling the factory creates a
 * fresh Emscripten INSTANCE each time — so MEMFS state and the C runtime are
 * fully isolated between invocations.
 *
 * Mirrors the driving pattern used in web/test/smoke.mjs.
 */
export async function convert(json: string): Promise<ConvertResult> {
  // Dynamic import: the module is cached but each factory call yields a new instance.
  const { default: createJson2relcsv } = await import('./wasm/json2relcsv.mjs');

  const inputBytes = new TextEncoder().encode(json);
  let inputPos = 0;

  let stdoutStr = '';
  let stderrStr = '';
  let exitCode = 0;

  const module = await createJson2relcsv({
    stdin() {
      if (inputPos < inputBytes.length) {
        return inputBytes[inputPos++];
      }
      return null; // EOF
    },
    print(text: string) {
      stdoutStr += text + '\n';
    },
    printErr(text: string) {
      stderrStr += text + '\n';
    },
    onExit(code: number) {
      exitCode = code;
    },
  });

  // Create MEMFS output directory.
  try {
    module.FS.mkdir('/out');
  } catch {
    // Already exists — shouldn't happen for a fresh module, but be safe.
  }

  // Run callMain. With EXIT_RUNTIME=1 Emscripten throws ExitStatus on any
  // exit() call (even exit(0)); we catch it to retrieve the actual exit code.
  try {
    module.callMain(['--print-ast', '--emit-schema', '--out-dir', '/out']);
  } catch (e) {
    // Emscripten throws ExitStatus { status } on exit() with EXIT_RUNTIME=1 (even status 0).
    if (e && typeof (e as { status?: unknown }).status === 'number') {
      exitCode = (e as { status: number }).status;
    } else if (exitCode === 0) {
      exitCode = 1; // unknown throw → treat as failure
    }
  }

  // Read back results from MEMFS.
  const tables: { name: string; csv: string }[] = [];
  let schemaModel: SchemaModel | null = null;

  let schemaRaw: unknown = null;
  try {
    const schemaText = module.FS.readFile('/out/schema.json', { encoding: 'utf8' });
    schemaRaw = JSON.parse(schemaText) as unknown;
  } catch {
    // Not present on failure.
  }

  if (schemaRaw !== null) {
    try {
      schemaModel = parseSchema(schemaRaw);
    } catch {
      // Malformed schema — surface as error but don't throw.
    }
  }

  try {
    const outFiles = module.FS.readdir('/out');
    for (const name of outFiles) {
      if (name === '.' || name === '..') continue;
      if (name.endsWith('.csv')) {
        const tableName = name.slice(0, -4);
        const csv = module.FS.readFile('/out/' + name, { encoding: 'utf8' });
        tables.push({ name: tableName, csv });
      }
    }
  } catch {
    // /out may not exist on a very early failure.
  }

  const ok = exitCode === 0 && stderrStr.trim() === '';
  const error = ok ? null : stderrStr.trim() || `Process exited with code ${exitCode}`;

  return {
    ok,
    tables,
    schema: schemaModel,
    ast: stdoutStr,
    error,
  };
}
