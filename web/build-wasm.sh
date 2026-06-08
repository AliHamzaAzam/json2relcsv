#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# build-wasm.sh  — Compile json2relcsv to WebAssembly via Emscripten
# Run from anywhere; the script resolves paths from its own location.
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Toolchain — bison must be 3.x (macOS ships 2.3, too old to build this grammar).
# Override via $BISON/$FLEX; otherwise prefer Homebrew, then fall back to PATH
# (works on local macOS AND on Linux CI where apt installs them on PATH).
resolve_tool() {
    local override="$1"; shift
    if [[ -n "${override}" ]]; then printf '%s\n' "${override}"; return 0; fi
    local c
    for c in "$@"; do
        if command -v "${c}" >/dev/null 2>&1; then command -v "${c}"; return 0; fi
    done
    return 1
}

BISON="$(resolve_tool "${BISON:-}" /opt/homebrew/opt/bison/bin/bison /usr/local/opt/bison/bin/bison bison)" \
    || { echo "ERROR: bison not found (set \$BISON)"; exit 1; }
FLEX="$(resolve_tool "${FLEX:-}" /opt/homebrew/opt/flex/bin/flex /usr/local/opt/flex/bin/flex flex)" \
    || { echo "ERROR: flex not found (set \$FLEX)"; exit 1; }

bison_ver="$("${BISON}" --version | head -1)"
case "${bison_ver}" in
    *" 3."*|*" 4."*) ;;
    *) echo "ERROR: bison 3.0+ required, found: ${bison_ver} (try: brew install bison)"; exit 1 ;;
esac
echo "==> bison : ${BISON} (${bison_ver})"
echo "==> flex  : ${FLEX}"
echo "==> emcc  : $(emcc --version | head -1)"

# Directories
GEN_DIR="${SCRIPT_DIR}/gen"
GEN_INCLUDE_DIR="${GEN_DIR}/include"
OUT_DIR="${SCRIPT_DIR}/src/wasm"

echo "==> Repo root : ${REPO_ROOT}"
echo "==> Gen dir   : ${GEN_DIR}"
echo "==> Output dir: ${OUT_DIR}"

# ---------------------------------------------------------------------------
# 1. Generate parser + scanner
# ---------------------------------------------------------------------------
rm -rf "${GEN_DIR}"
mkdir -p "${GEN_DIR}" "${GEN_INCLUDE_DIR}"

echo ""
echo "==> Generating parser (bison ${BISON})..."
# CMake places parser.tab.c at GEN_DIR and parser.tab.h at GEN_INCLUDE_DIR/parser.tab.h
# scanner.l does:  #include "parser.tab.h"
# so parser.tab.h must be reachable via -I GEN_INCLUDE_DIR
"${BISON}" \
    --defines="${GEN_INCLUDE_DIR}/parser.tab.h" \
    --output="${GEN_DIR}/parser.tab.c" \
    "${REPO_ROOT}/src/parser.y"

echo "==> Generating scanner (flex ${FLEX})..."
"${FLEX}" \
    --outfile="${GEN_DIR}/lex.yy.c" \
    "${REPO_ROOT}/src/scanner.l"

# ---------------------------------------------------------------------------
# 2. Compile with emcc
# ---------------------------------------------------------------------------
mkdir -p "${OUT_DIR}"

echo ""
echo "==> Compiling to WASM with emcc..."

emcc \
    -O2 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME=createJson2relcsv \
    -s EXPORT_ES6=1 \
    -s SINGLE_FILE=1 \
    -s INVOKE_RUN=0 \
    -s EXIT_RUNTIME=1 \
    -s EXPORTED_RUNTIME_METHODS=callMain,FS \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s FORCE_FILESYSTEM=1 \
    -I "${REPO_ROOT}/include" \
    -I "${GEN_INCLUDE_DIR}" \
    -I "${GEN_DIR}" \
    "${GEN_DIR}/parser.tab.c" \
    "${GEN_DIR}/lex.yy.c" \
    "${REPO_ROOT}/src/main.c" \
    "${REPO_ROOT}/src/ast.c" \
    "${REPO_ROOT}/src/csv_gen.c" \
    -o "${OUT_DIR}/json2relcsv.mjs"

# ---------------------------------------------------------------------------
# 3. Report artifact sizes
# ---------------------------------------------------------------------------
echo ""
echo "==> Build complete. Artifacts:"
ls -lh "${OUT_DIR}/json2relcsv.mjs"
