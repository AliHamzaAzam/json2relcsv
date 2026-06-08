#!/usr/bin/env bash
# Golden test: verifies --emit-schema produces the expected schema.json and
# that CSV output is byte-for-byte identical to the committed goldens.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BINARY="$REPO_ROOT/build/json2relcsv"
EXPECTED_DIR="$REPO_ROOT/tests/expected"
SAMPLE="$REPO_ROOT/tests/sample.json"

# Build if binary not present
if [ ! -f "$BINARY" ]; then
    echo "[golden_test] Binary not found; building..."
    cmake -B "$REPO_ROOT/build" -S "$REPO_ROOT" >/dev/null || { echo "[golden_test] cmake configure failed"; exit 1; }
    cmake --build "$REPO_ROOT/build" >/dev/null || { echo "[golden_test] build failed"; exit 1; }
fi

TMPDIR_OUT="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_OUT"' EXIT

echo "[golden_test] Running: $BINARY --emit-schema --out-dir $TMPDIR_OUT < $SAMPLE"
"$BINARY" --emit-schema --out-dir "$TMPDIR_OUT" < "$SAMPLE"

FAIL=0

# Diff schema.json
echo "[golden_test] Checking schema.json..."
if ! diff -u "$EXPECTED_DIR/schema.json" "$TMPDIR_OUT/schema.json"; then
    echo "[golden_test] FAIL: schema.json differs from expected"
    FAIL=1
else
    echo "[golden_test] PASS: schema.json matches expected"
fi

# Diff each expected CSV
for expected_csv in "$EXPECTED_DIR"/*.csv; do
    table_file="$(basename "$expected_csv")"
    actual_csv="$TMPDIR_OUT/$table_file"
    echo "[golden_test] Checking $table_file..."
    if ! diff -u "$expected_csv" "$actual_csv"; then
        echo "[golden_test] FAIL: $table_file differs from expected"
        FAIL=1
    else
        echo "[golden_test] PASS: $table_file matches expected"
    fi
done

# Sanity: running WITHOUT --emit-schema must NOT produce schema.json
echo "[golden_test] Sanity check: no schema.json without --emit-schema..."
TMPDIR_NO_SCHEMA="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_OUT" "$TMPDIR_NO_SCHEMA"' EXIT
"$BINARY" --out-dir "$TMPDIR_NO_SCHEMA" < "$SAMPLE"
if [ -f "$TMPDIR_NO_SCHEMA/schema.json" ]; then
    echo "[golden_test] FAIL: schema.json was produced without --emit-schema flag"
    FAIL=1
else
    echo "[golden_test] PASS: no schema.json produced without --emit-schema"
fi

# Sanity: CSVs produced without --emit-schema must match goldens
for expected_csv in "$EXPECTED_DIR"/*.csv; do
    table_file="$(basename "$expected_csv")"
    actual_csv="$TMPDIR_NO_SCHEMA/$table_file"
    echo "[golden_test] Sanity CSV check (no-schema run): $table_file..."
    if ! diff -u "$expected_csv" "$actual_csv"; then
        echo "[golden_test] FAIL: $table_file (no-schema run) differs from expected"
        FAIL=1
    else
        echo "[golden_test] PASS: $table_file (no-schema run) matches expected"
    fi
done

if [ "$FAIL" -ne 0 ]; then
    echo "[golden_test] RESULT: FAILED"
    exit 1
fi

echo "[golden_test] RESULT: ALL PASSED"
exit 0
