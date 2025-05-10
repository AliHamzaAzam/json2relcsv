# 📊 json2relcsv

json2relcsv is a command-line utility written in C that converts JSON (JavaScript Object Notation) data into a set of relational CSV (Comma-Separated Values) files. It parses JSON input, analyzes its structure, and transforms it into a relational schema where JSON objects and arrays are mapped to tables, and their elements are mapped to rows and columns. This tool is particularly useful for flattening complex JSON structures into a format that can be easily imported into relational databases or analyzed with tools that primarily consume CSV data.

---

## Table of Contents

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

On macOS, these can be installed using [Homebrew](https://brew.sh/):
```bash
brew install cmake flex bison
```
The `CMakeLists.txt` is configured to prefer Homebrew's versions of Flex and Bison if they are installed in their default Homebrew locations (`/opt/homebrew/opt/bison/bin` and `/opt/homebrew/opt/flex/bin`).

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

3.  **Convert JSON and output CSVs to the current directory:**
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
