#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ast.h"

// External variables from the lexer (Flex) and parser (Bison).
extern FILE* yyin;      // Input file stream for the lexer.
extern int yyparse();   // Main parsing function generated by Bison.
extern ASTNode* ast_root; // Root of the Abstract Syntax Tree, populated by the parser.
// extern int line_num; // Line number tracking from lexer (currently unused in main).
// extern int column_num; // Column number tracking from lexer (currently unused in main).
// extern int yydebug; // Bison debug flag (set to 1 to enable parser tracing).

// Checks if a string 'str' starts with the given 'prefix'.
// Returns 1 if it does, 0 otherwise.
int starts_with(const char* str, const char* prefix) {
    return strncmp(str, prefix, strlen(prefix)) == 0;
}

// Parses command-line arguments to set flags and options.
// - argc, argv: Standard main function arguments.
// - print_ast_flag: (Output) Set to 1 if --print-ast is present.
// - out_dir: (Output) Set to the specified output directory string (defaults to ".").
void parse_args(int argc, char* argv[], int* print_ast_flag, char** out_dir) {
    *print_ast_flag = 0;
    *out_dir = ".";  // Default to current directory

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--print-ast") == 0) {
            *print_ast_flag = 1;
        } else if (strcmp(argv[i], "--out-dir") == 0 || strcmp(argv[i], "--output-dir") == 0) {
            // Handles "--out-dir DIR" or "--output-dir DIR" (space separated)
            if (i + 1 < argc && argv[i+1][0] != '-') {
                // Next argument exists and is not another option
                *out_dir = argv[i + 1];
                i++;  // Consume the directory argument
            } else {
                // --out-dir/--output-dir is the last argument or followed by another option.
                // Use default directory. A warning could be printed here if desired.
                // fprintf(stderr, "Warning: %s is missing a value or followed by another option. Using default directory '%s'.\n", argv[i], *out_dir);
            }
        } else if (starts_with(argv[i], "--out-dir=") || starts_with(argv[i], "--output-dir=")) {
            // Handles "--out-dir=DIR" or "--output-dir=DIR"
            char* value = strchr(argv[i], '=') + 1;
            if (*value != '\0') { // Check if value is not empty
                *out_dir = value;
            } else {
                // Value is empty (e.g., --out-dir= or --output-dir=)
                // Use default directory. A warning could be printed here if desired.
                // fprintf(stderr, "Warning: %s received an empty value. Using default directory '%s'.\n", argv[i], *out_dir);
            }
        }
    }
}

int main(int argc, char* argv[]) {
    int print_ast_flag = 0; // Flag to indicate if the AST should be printed.
    char* out_dir = NULL;   // Directory for outputting CSV files.

    parse_args(argc, argv, &print_ast_flag, &out_dir);

    // To enable Bison's internal parsing trace, uncomment the following line:
    // yydebug = 1;

    yyin = stdin; // Set lexer input to standard input.

    // Call the Bison-generated parser.
    // yyparse() will read from yyin, build the AST, and store its root in ast_root.
    if (yyparse() != 0) {
        // An error message is typically printed by yyerror() within the parser.
        fprintf(stderr, "Parsing failed.\n");
        return EXIT_FAILURE;
    }

    if (!ast_root) {
        fprintf(stderr, "Error: AST root is null after parsing, even though yyparse reported success.\n");
        return EXIT_FAILURE;
    }

    if (print_ast_flag) {
        print_ast(ast_root, 0);
        printf("\n"); // Add a newline for cleaner output after AST print.
    }

    generate_csv_tables(ast_root, out_dir);

    free_ast(ast_root); // Release all memory allocated for the AST.
    ast_root = NULL;    // Defensive: prevent dangling pointer use.

    return EXIT_SUCCESS;
}