#ifndef AST_H
#define AST_H

// Represents the different types of nodes in a JSON Abstract Syntax Tree.
typedef enum {
    NODE_OBJECT,
    NODE_ARRAY,
    NODE_STRING,
    NODE_NUMBER,
    NODE_BOOLEAN,
    NODE_NULL
} NodeType;

// Forward declarations for AST-related structures.
struct KeyValuePair;
struct KeyValueList;
struct ASTNodeList;

// Represents a single node in the JSON AST.
// The 'type' field determines which member of the 'value' union is active.
typedef struct ASTNode {
    NodeType type;
    union {
        struct KeyValueList* object; // For NODE_OBJECT
        struct ASTNodeList* array;   // For NODE_ARRAY
        char* string;                // For NODE_STRING
        double number;               // For NODE_NUMBER
        int boolean;                 // For NODE_BOOLEAN
        // NULL doesn't need data
    } value;
} ASTNode;

// Represents a key-value pair within a JSON object.
// 'key' is the JSON object key (string).
// 'value' is the ASTNode representing the JSON value.
typedef struct KeyValuePair {
    char* key;
    ASTNode* value;
} KeyValuePair;

// Represents a linked list of KeyValuePairs, used for JSON objects.
typedef struct KeyValueList {
    KeyValuePair* pair;
    struct KeyValueList* next;
} KeyValueList;

// Represents a linked list of ASTNodes, used for JSON arrays.
typedef struct ASTNodeList {
    ASTNode* node;
    struct ASTNodeList* next;
} ASTNodeList;

// --- AST Node Creation Functions ---
ASTNode* create_object_node(KeyValueList* pairs);
ASTNode* create_array_node(ASTNodeList* elements);
ASTNode* create_string_node(char* value);
ASTNode* create_number_node(double value);
ASTNode* create_boolean_node(int value);
ASTNode* create_null_node();

// --- Key-Value Pair and List Functions ---
KeyValuePair* create_key_value_pair(char* key, ASTNode* value);
KeyValueList* create_key_value_list(KeyValuePair* pair);
KeyValueList* add_key_value_pair(KeyValueList* list, KeyValuePair* pair);

// --- AST Node List Functions ---
ASTNodeList* create_node_list(ASTNode* node);
ASTNodeList* add_node_to_list(ASTNodeList* list, ASTNode* node);

// Prints a human-readable representation of the AST to stdout.
// Useful for debugging (e.g., with a --print-ast command-line option).
void print_ast(ASTNode* root, int indent);

// Frees all dynamically allocated memory associated with the AST.
void free_ast(ASTNode* root);

// --- CSV Generation ---
// Analyzes the AST and generates relational CSV files in the specified output directory.
void generate_csv_tables(ASTNode* root, const char* output_dir);

#endif /* AST_H */