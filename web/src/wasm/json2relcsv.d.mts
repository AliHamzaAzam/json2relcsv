// Type shim for the Emscripten-generated self-contained ES module.
// Matches the runtime shape used by runner.ts.

export interface EmscriptenFS {
  mkdir(path: string): void;
  readFile(path: string, opts: { encoding: 'utf8' }): string;
  readdir(path: string): string[];
}

export interface EmscriptenModule {
  FS: EmscriptenFS;
  callMain(args: string[]): number | undefined;
}

export interface ModuleOptions {
  stdin?(): number | null;
  print?(text: string): void;
  printErr?(text: string): void;
  onExit?(code: number): void;
}

declare function createJson2relcsv(options?: ModuleOptions): Promise<EmscriptenModule>;
export default createJson2relcsv;
