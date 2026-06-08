# 📊 json2relcsv

json2relcsv is a command-line utility written in C that converts JSON (JavaScript Object Notation) data into a set of relational CSV (Comma-Separated Values) files. It parses JSON input, analyzes its structure, and transforms it into a relational schema where JSON objects and arrays are mapped to tables, and their elements are mapped to rows and columns. This tool is particularly useful for flattening complex JSON structures into a format that can be easily imported into relational databases or analyzed with tools that primarily consume CSV data.

---

## Table of Contents

- [🌐 Live Playground](#-live-playground)
- [✨ Features](#-features)
- [🛠️ Prerequisites](#️-prerequisites)
- [🏗️ Building the Project](#️-building-the-project)
- [🚀 Running the Application](#️-running-the-application)
  - [Command-Line Options](#command-line-options)
  - [Examples](#examples)
- [⚙️ How it Works](#️-how-it-works)
- [📁 Project Structure (Key Files)](#️-project-structure-key-files)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🌐 Live Playground

Try it instantly in the browser — no install required:

**[https://json2relcsv.alihamzaazam.com](https://json2relcsv.alihamzaazam.com)**

The playground runs the actual `json2relcsv` tool compiled to **WebAssembly**, entirely client-side. Paste any JSON and see the generated CSV tables, the inferred relational schema, and the AST — all in real time.

---

## ✨ Features

*   Parses JSON data from standard input.
*   Automatically infers a relational schema from the JSON structure:
    *   Each unique JSON object key at a certain nesting level can become a table.
    *   Primitive values (strings, numbers, booleans, nulls) within objects become columns in their respective tables.
    *   Nested JSON objects are typically represented as separate tables linked via foreign keys.
    *   JSON arrays of objects are converted into tables, with each object in the array becoming a row. A sequence number (`seq`) is added to maintain order, and a foreign key links back to the parent object/array.
    *   JSON arrays of scalar values are converted into junction tables, linking the parent object/array to each scalar value and preserving order with an `index` column.
*   Generates multiple CSV files, one for each inferred table.
*   Handles nested structures and arrays.
*   Provides an option to print the internal Abstract Syntax Tree (AST) for debugging.
*   Allows specification of an output directory for the generated CSV files.

---

## 🛠️ Prerequisites

To build and run `json2relcsv`, you will need the following:

*   A C compiler (e.g., GCC, Clang)
*   CMake (version 3.10 or higher)
*   Flex (Lexical Analyzer Generator)
*   Bison (Parser Generator)

This project has been tested on **macOS 15.5** using Clang, CMake, and Flex/Bison installed via Homebrew.

### macOS Setup

On macOS, these can be installed using [Homebrew](https://brew.sh/):
```bash
brew install cmake flex bison
```
The `CMakeLists.txt` is configured to prefer Homebrew's versions of Flex and Bison if they are installed in their default Homebrew locations (`/opt/homebrew/opt/bison/bin` and `/opt/homebrew/opt/flex/bin`).

### Linux Setup

To run this project on Linux:

1.  **Install Prerequisites:**
    Use your distribution's package manager to install `gcc` (or `clang`), `cmake`, `flex`, and `bison`. For example, on Debian/Ubuntu:
    ```bash
    sudo apt update
    sudo apt install build-essential cmake flex bison
    ```
    On Fedora:
    ```bash
    sudo dnf install gcc cmake flex bison
    ```

2.  **CMake Configuration for Flex/Bison:**
    The current `CMakeLists.txt` includes specific paths for Homebrew's Flex and Bison installations on macOS:
    ```cmake
    set(ENV{PATH} "/opt/homebrew/opt/bison/bin:/opt/homebrew/opt/flex/bin:$ENV{PATH}")
    set(FLEX_EXECUTABLE "/opt/homebrew/opt/flex/bin/flex" CACHE FILEPATH "Path to Flex executable" FORCE)
    set(BISON_EXECUTABLE "/opt/homebrew/opt/bison/bin/bison" CACHE FILEPATH "Path to Bison 3.0+ executable" FORCE)
    # ... and include directories related to /opt/homebrew
    ```
    For Linux, you will likely need to **remove or comment out these macOS-specific Homebrew paths** to allow CMake to find the system-installed versions of Flex and Bison. `find_package(FLEX REQUIRED)` and `find_package(BISON REQUIRED)` should then locate the tools correctly if they are in the system's standard PATH.

    Specifically, you might need to comment out or remove lines like:
    *   `set(ENV{PATH} "/opt/homebrew/opt/bison/bin:/opt/homebrew/opt/flex/bin:$ENV{PATH}")`
    *   The `set(FLEX_EXECUTABLE ... FORCE)` line.
    *   The `set(BISON_EXECUTABLE ... FORCE)` line.
    *   Any `include_directories()` that explicitly point to `/opt/homebrew/include` or subdirectories of `/opt/homebrew/opt/flex` or `/opt/homebrew/opt/bison`.

    CMake should then fall back to its default mechanism for finding these tools.

3.  **Build as usual:**
    After adjusting `CMakeLists.txt` (if necessary), follow the standard build steps:
    ```bash
    mkdir build
    cd build
    cmake ..
    make
    ```

The core C code (`.c`, `.y`, `.l` files) is standard and should compile on Linux without changes once the build system correctly locates Flex and Bison.

---

## 🏗️ Building the Project

1.  **Clone the repository (if applicable):**
    If you haven't cloned the project yet:
    ```bash
    git clone <repository_url>
    cd json2relcsv
    ```
    If you are already in the project directory, you can skip this step.

2.  **Create a build directory:**
    It's good practice to build the project outside the source directory.
    ```bash
    mkdir build
    cd build
    ```

3.  **Run CMake to configure the project:**
    This command will generate the necessary Makefiles or project files for your build system. From within the `build` directory:
    ```bash
    cmake ..
    ```
    For a debug build, you can use:
    ```bash
    cmake -DCMAKE_BUILD_TYPE=Debug ..
    ```

4.  **Compile the project:**
    Still within the `build` directory:
    ```bash
    make
    ```
    Or, if you are using a newer version of CMake that defaults to Ninja, or if you specified Ninja:
    ```bash
    ninja
    ```
    The executable `json2relcsv` will be created in the build directory (e.g., `build/json2relcsv` or `build/cmake-build-debug/json2relcsv` if using an IDE like CLion which might create its own build subdirectories).

---

## 🚀 Running the Application

The `json2relcsv` utility reads JSON data from standard input and outputs CSV files to a specified directory. Ensure you are running the executable from its location (e.g., `./build/json2relcsv` or `./cmake-build-debug/json2relcsv` if you are in the project root) or have it in your PATH.

### Command-Line Options

*   `--out-dir <directory>`: Specifies the directory where the generated CSV files will be saved. If not provided, CSV files will be created in the current working directory (`.`).
*   `--print-ast`: An optional flag that, when present, will print a human-readable representation of the parsed Abstract Syntax Tree (AST) to standard output. This is primarily for debugging purposes.
*   `--emit-schema`: Writes a `schema.json` file into the output directory describing the inferred relational schema. For each table the schema records: its name, kind (`object`, `array`, or `junction`), primary key, parent table, foreign-key column, and the full list of columns. Can be combined with the other flags (e.g. `--print-ast --emit-schema --out-dir out`).

### Examples

Let's assume your executable is at `./build/json2relcsv`.

1.  **Convert a JSON file to CSVs in a specific directory:**
    ```bash
    ./build/json2relcsv --out-dir ./output_csvs < /path/to/your/input.json
    ```
    Or using `cat`:
    ```bash
    cat /path/to/your/input.json | ./build/json2relcsv --out-dir ./output_csvs
    ```
    This will create CSV files in the `./output_csvs` directory (relative to where you run the command).

2.  **Convert JSON and print the AST:**
    ```bash
    cat /path/to/your/input.json | ./build/json2relcsv --out-dir ./output_csvs --print-ast
    ```

3.  **Convert JSON and emit the relational schema:**
    ```bash
    cat /path/to/your/input.json | ./build/json2relcsv --out-dir ./output_csvs --emit-schema
    ```
    This creates the usual CSV files **plus** `./output_csvs/schema.json` describing every inferred table.

4.  **Combine all flags:**
    ```bash
    cat /path/to/your/input.json | ./build/json2relcsv --print-ast --emit-schema --out-dir ./output_csvs
    ```

5.  **Convert JSON and output CSVs to the current directory:**
    ```bash
    cat /path/to/your/input.json | ./build/json2relcsv
    ```

---

## ⚙️ How it Works

1.  **Parsing:** The input JSON data is first tokenized by a lexer (generated by Flex) and then parsed by a parser (generated by Bison).
2.  **AST Construction:** The parser builds an Abstract Syntax Tree (AST) that represents the hierarchical structure of the JSON data.
3.  **Schema Analysis (First Pass):** The `csv_gen.c` module traverses the AST in a first pass (`analyze_node` function). During this pass, it identifies potential tables and their columns.
    *   JSON objects are treated as potential tables. The object's key often determines the table name.
    *   Scalar values within objects become columns.
    *   Nested objects and arrays of objects lead to the definition of new tables, with foreign key relationships to their parent tables.
    *   Arrays of scalars are typically handled by creating junction tables.
    *   A unique ID (`id` column) is planned for each table to serve as a primary key. Foreign key columns (e.g., `parent_table_name_id`) are added to link related tables. Arrays of objects also get a `seq` column for ordering.
4.  **Data Population (Second Pass):** After all table schemas are defined, the AST is traversed again (`recursively_write_table_data` function for each table). This time, the actual data from the JSON is extracted and written into the corresponding CSV files according to the schemas identified in the first pass. IDs are generated and assigned consistently across both passes.
5.  **CSV Generation:** For each table schema identified, a CSV file is created. The first row of each CSV file contains the column headers. Subsequent rows contain the data extracted from the JSON.

---

## 📁 Project Structure (Key Files)

*   `src/main.c`: The main entry point of the application, handles command-line arguments and orchestrates the parsing and CSV generation process.
*   `src/parser.y`: The Bison grammar file defining the JSON language structure and rules for building the AST.
*   `src/scanner.l`: The Flex lexer file defining how to break down the input JSON stream into tokens.
*   `src/ast.c`, `include/ast.h`: Define the structure of the AST nodes and provide functions for creating, printing, and freeing the AST.
*   `src/csv_gen.c`: Contains the core logic for analyzing the AST, inferring relational schemas, and generating the CSV files.
*   `CMakeLists.txt`: The CMake build script for the project.
*   `tests/`: Contains sample JSON files for testing.
*   `web/`: The browser-based playground — compiles the tool to WebAssembly and serves an interactive UI at [https://json2relcsv.alihamzaazam.com](https://json2relcsv.alihamzaazam.com).

---

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improvements or find any issues, please feel free to:
*   Open an issue on the project's issue tracker.
*   Submit a pull request with your proposed changes.

---

## 📜 License

(To be determined - Please add your project's license information here. For example, MIT, GPL, Apache 2.0, etc.)

---

This README provides a comprehensive guide to understanding, building, and using the `json2relcsv` utility.
