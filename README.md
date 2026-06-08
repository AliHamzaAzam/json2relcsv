# json2relcsv

![C](https://img.shields.io/badge/C-C99-A8B9CC?style=flat-square&logo=c&logoColor=white)
![Flex & Bison](https://img.shields.io/badge/Flex%20%26%20Bison-lexer%20%2B%20parser-555555?style=flat-square)
![WebAssembly](https://img.shields.io/badge/WebAssembly-Emscripten-654FF0?style=flat-square&logo=webassembly&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**A C command-line tool that flattens nested JSON into a set of relational CSV tables — with a live, in-browser playground compiled to WebAssembly.**

json2relcsv reads JSON from standard input, infers a relational schema from its structure, and writes one CSV file per inferred table. Objects become tables with an `id` primary key; nested objects and arrays of objects become their own tables linked by foreign keys (with a `seq` column to preserve array order); arrays of scalars become junction tables. It's built with Flex + Bison + C, and the **same tool runs entirely in your browser** at the playground below.

**▶ Live playground: [json2relcsv.alihamzaazam.com](https://json2relcsv.alihamzaazam.com)**

---

## Live Playground

The playground compiles the real `json2relcsv` tool to **WebAssembly** and runs it client-side — no install, no backend. Paste any JSON and see, in real time:

- **Tables** — every generated CSV, rendered and downloadable (individually or as a `.zip`)
- **Schema** — the inferred relational schema as an ERD: tables, primary keys, and foreign-key links
- **AST** — the parse tree the tool builds from your input

It shares the industrial-brutalist look of [my other projects](https://github.com/AliHamzaAzam), with its own violet accent.

---

## Features

- **Relational schema inference** — objects → tables, nested objects/arrays → foreign-key-linked tables, scalar arrays → junction tables, with `id` primary keys and `seq`/`index` ordering columns
- **Streaming input** — reads JSON from `stdin`, writes one CSV per table to an output directory
- **Schema export** — `--emit-schema` writes a machine-readable `schema.json` describing every table
- **AST inspection** — `--print-ast` dumps the parse tree for debugging
- **Flex + Bison front end** — a proper lexer/parser, not a hand-rolled string scanner
- **Runs anywhere** — natively as a CLI, or in the browser via WebAssembly

---

## Usage

The CLI reads JSON from standard input:

```bash
cat input.json | ./build/json2relcsv --out-dir ./out
```

| Flag | Description |
|------|-------------|
| `--out-dir <dir>` | Directory for the generated CSV files (default: current directory). |
| `--print-ast` | Print a human-readable parse tree (AST) to stdout. |
| `--emit-schema` | Write `<out-dir>/schema.json` describing the inferred schema — each table's name, kind (`object`, `array`, or `junction`), primary key, parent table, foreign-key column, and columns. |

Flags combine freely:

```bash
cat input.json | ./build/json2relcsv --print-ast --emit-schema --out-dir ./out
```

## How It Works

1. **Lex + parse** — Flex tokenizes the input and Bison parses it into an Abstract Syntax Tree.
2. **Schema pass** — `csv_gen.c` walks the AST to discover tables, columns, primary keys, and foreign-key relationships.
3. **Data pass** — it walks the AST again to write each table's rows, assigning IDs consistently with the schema pass.
4. **Output** — one CSV per table (headers + rows), plus `schema.json` when `--emit-schema` is set.

## Building

**macOS** (Homebrew provides a modern Flex and Bison 3.x):

```bash
brew install cmake flex bison
cmake -B build -S .
cmake --build build
# binary at ./build/json2relcsv
```

**Linux** — install `cmake`, `flex`, and `bison` (3.0+) from your package manager. `CMakeLists.txt` pins Homebrew's tool paths for macOS, so on Linux let CMake find the system tools (clear the `FLEX_EXECUTABLE`/`BISON_EXECUTABLE` overrides) before building with the same `cmake` commands.

## The Playground (`web/`)

The browser app is a Vite + TypeScript project. The C tool is compiled to a self-contained WebAssembly ES module with Emscripten and committed, so the site builds with just Node:

```bash
cd web
npm install
npm run dev        # local dev server
npm run build      # production build → web/dist
npm run build:wasm # rebuild the WASM module after changing the C tool
```

Deployment is handled by Cloudflare Pages' Git integration (build `npm run build` from `web/`, output `dist`) — no secrets required.

## Project Structure

```
src/          C source — main.c, ast.c, csv_gen.c, scanner.l (Flex), parser.y (Bison)
include/      ast.h
tests/        sample JSON + golden schema/CSV outputs
web/           Vite + TypeScript playground (compiles the tool to WASM)
CMakeLists.txt native build
```

## License

Released under the [MIT License](LICENSE).
