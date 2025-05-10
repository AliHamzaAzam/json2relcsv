#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ast.h"

// Allocates and initializes an ASTNode for a JSON object.
ASTNode* create_object_node(KeyValueList* pairs) {
    ASTNode* node = (ASTNode*)malloc(sizeof(ASTNode));
    if (!node) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    node->type = NODE_OBJECT;
    node->value.object = pairs;
    return node;
}

// Allocates and initializes an ASTNode for a JSON array.
ASTNode* create_array_node(ASTNodeList* elements) {
    ASTNode* node = (ASTNode*)malloc(sizeof(ASTNode));
    if (!node) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    node->type = NODE_ARRAY;
    node->value.array = elements;
    return node;
}

// Allocates and initializes an ASTNode for a JSON string.
// Note: The 'value' string is expected to be allocated by the lexer (e.g., strdup)
// and will be freed by free_ast.
ASTNode* create_string_node(char* value) {
    ASTNode* node = (ASTNode*)malloc(sizeof(ASTNode));
    if (!node) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    node->type = NODE_STRING;
    node->value.string = value; // value already allocated by lexer
    return node;
}

// Allocates and initializes an ASTNode for a JSON number.
ASTNode* create_number_node(double value) {
    ASTNode* node = (ASTNode*)malloc(sizeof(ASTNode));
    if (!node) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    node->type = NODE_NUMBER;
    node->value.number = value;
    return node;
}

// Allocates and initializes an ASTNode for a JSON boolean.
ASTNode* create_boolean_node(int value) {
    ASTNode* node = (ASTNode*)malloc(sizeof(ASTNode));
    if (!node) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    node->type = NODE_BOOLEAN;
    node->value.boolean = value;
    return node;
}

// Allocates and initializes an ASTNode for a JSON null.
ASTNode* create_null_node() {
    ASTNode* node = (ASTNode*)malloc(sizeof(ASTNode));
    if (!node) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    node->type = NODE_NULL;
    return node;
}

// Allocates and initializes a KeyValuePair.
// Note: The 'key' string is expected to be allocated by the lexer (e.g., strdup)
// and will be freed by free_ast.
KeyValuePair* create_key_value_pair(char* key, ASTNode* value) {
    KeyValuePair* pair = (KeyValuePair*)malloc(sizeof(KeyValuePair));
    if (!pair) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    pair->key = key; // key already allocated by lexer
    pair->value = value;
    return pair;
}

// Creates a new KeyValueList, initializing it with a single KeyValuePair.
// This is typically used for the first pair in an object.
KeyValueList* create_key_value_list(KeyValuePair* pair) {
    KeyValueList* list = (KeyValueList*)malloc(sizeof(KeyValueList));
    if (!list) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    list->pair = pair;
    list->next = NULL;
    return list;
}

// Appends a KeyValuePair to an existing KeyValueList.
// The new pair is added to the end of the list.
KeyValueList* add_key_value_pair(KeyValueList* list, KeyValuePair* pair) {
    // Add the pair to the end of the list
    KeyValueList* new_item = (KeyValueList*)malloc(sizeof(KeyValueList));
    if (!new_item) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    new_item->pair = pair;
    new_item->next = NULL;

    // Find the end of the list
    KeyValueList* current = list;
    while (current->next != NULL) {
        current = current->next;
    }

    // Add the new item
    current->next = new_item;

    return list; // Return the head of the list
}

// Creates a new ASTNodeList, initializing it with a single ASTNode.
// This is typically used for the first element in an array.
ASTNodeList* create_node_list(ASTNode* node) {
    ASTNodeList* list = (ASTNodeList*)malloc(sizeof(ASTNodeList));
    if (!list) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    list->node = node;
    list->next = NULL;
    return list;
}

// Appends an ASTNode to an existing ASTNodeList.
// The new node is added to the end of the list.
ASTNodeList* add_node_to_list(ASTNodeList* list, ASTNode* node) {
    // Add the node to the end of the list
    ASTNodeList* new_item = (ASTNodeList*)malloc(sizeof(ASTNodeList));
    if (!new_item) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    new_item->node = node;
    new_item->next = NULL;

    // Find the end of the list
    ASTNodeList* current = list;
    while (current->next != NULL) {
        current = current->next;
    }

    // Add the new item
    current->next = new_item;

    return list; // Return the head of the list
}

// Helper function to print leading spaces for visual indentation of the AST.
static void print_indent(int indent) {
    for (int i = 0; i < indent; i++) {
        printf("  ");
    }
}

// Helper function to print a string, escaping special characters for JSON compatibility.
static void print_string_value(const char* str) {
    printf("\"");
    while (*str) {
        switch (*str) {
            case '\"': printf("\\\""); break;
            case '\\': printf("\\\\"); break;
            case '\n': printf("\\n"); break;
            case '\r': printf("\\r"); break;
            case '\t': printf("\\t"); break;
            case '\b': printf("\\b"); break;
            case '\f': printf("\\f"); break;
            default: putchar(*str);
        }
        str++;
    }
    printf("\"");
}

// Recursively prints the structure of the AST to standard output for debugging.
void print_ast(ASTNode* root, int indent) {
    if (!root) return;

    switch (root->type) {
        case NODE_OBJECT: {
            printf("{\n");
            KeyValueList* list = root->value.object;
            while (list) {
                print_indent(indent + 1);
                print_string_value(list->pair->key);
                printf(": ");
                print_ast(list->pair->value, indent + 1);
                if (list->next) printf(",");
                printf("\n");
                list = list->next;
            }
            print_indent(indent);
            printf("}");
            break;
        }
        case NODE_ARRAY: {
            printf("[\n");
            ASTNodeList* list = root->value.array;
            while (list) {
                print_indent(indent + 1);
                print_ast(list->node, indent + 1);
                if (list->next) printf(",");
                printf("\n");
                list = list->next;
            }
            print_indent(indent);
            printf("]");
            break;
        }
        case NODE_STRING:
            print_string_value(root->value.string);
            break;
        case NODE_NUMBER:
            printf("%g", root->value.number);
            break;
        case NODE_BOOLEAN:
            printf("%s", root->value.boolean ? "true" : "false");
            break;
        case NODE_NULL:
            printf("null");
            break;
    }
}

// Recursively frees all memory allocated for the AST.
// This includes ASTNodes, KeyValuePairs, KeyValueLists, ASTNodeLists,
// and the strings for keys and string values.
void free_ast(ASTNode* root) {
    if (!root) return;

    switch (root->type) {
        case NODE_OBJECT: {
            KeyValueList* list = root->value.object;
            while (list) {
                KeyValueList* temp = list;
                free(list->pair->key);
                free_ast(list->pair->value);
                free(list->pair);
                list = list->next;
                free(temp);
            }
            break;
        }
        case NODE_ARRAY: {
            ASTNodeList* list = root->value.array;
            while (list) {
                ASTNodeList* temp = list;
                free_ast(list->node);
                list = list->next;
                free(temp);
            }
            break;
        }
        case NODE_STRING:
            free(root->value.string); // Strings are dynamically allocated
            break;
        default:
            // NODE_NUMBER, NODE_BOOLEAN, NODE_NULL do not have dynamically allocated data
            // within the union that needs separate freeing here. Their ASTNode struct itself is freed.
            break;
    }

    free(root);
}