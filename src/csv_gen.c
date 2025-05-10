//
// Created by Ali Hamza Azam on 10/05/2025.
//
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <ctype.h>
#include "ast.h"

// Structure to represent a table schema
typedef struct TableSchema {
    char* name;
    char** columns;
    int column_count;
    struct TableSchema* next;
} TableSchema;

// Structure to keep track of table data
typedef struct {
    TableSchema* tables;
    int next_id;
} SchemaContext;

// Forward declarations for helper functions
static void analyze_node(ASTNode* node, const char* parent_table, int parent_id,
                        const char* key, SchemaContext* context);
static void write_csv_files(SchemaContext* context, const char* output_dir, ASTNode* ast_root); // Added ast_root
static void recursively_write_table_data(FILE* csv_f, TableSchema* target_schema,
                                       ASTNode* current_ast_node, const char* current_node_key,
                                       const char* logical_parent_key_for_fk_col, int actual_parent_row_id_for_fk_val,
                                       int* master_id_counter); // New function
static TableSchema* find_or_create_table(SchemaContext* context, const char* name);
static void add_column(TableSchema* table, const char* column);
static void ensure_directory_exists(const char* dir);
static char* get_csv_file_path(const char* dir, const char* table_name);
static void write_csv_value(FILE* file, ASTNode* node);
static int has_same_keys(KeyValueList* list1, KeyValueList* list2);
static char* safe_filename(const char* name);

// Main function to analyze AST and generate CSV files
void generate_csv_tables(ASTNode* root, const char* output_dir) {
    SchemaContext context = {NULL, 1}; // Start IDs from 1

    // Step 1: Analyze the AST to identify tables and their schemas
    analyze_node(root, NULL, 0, "root", &context);

    // Step 2: Write CSV files based on the identified schemas
    write_csv_files(&context, output_dir, root); // Pass root to write_csv_files

    // Free allocated memory for schemas
    TableSchema* table = context.tables;
    while (table) {
        TableSchema* next = table->next;
        for (int i = 0; i < table->column_count; i++) {
            free(table->columns[i]);
        }
        free(table->columns);
        free(table->name);
        free(table);
        table = next;
    }
}

// Recursively analyzes the AST to discover table schemas (names and columns).
// - node: The current ASTNode being analyzed.
// - parent_table: The name of the parent table (if any, for foreign key generation).
// - parent_id: The ID of the parent row in the parent_table.
// - key: The JSON key that led to this node (used for naming tables/columns).
// - context: The SchemaContext for storing discovered schemas and managing IDs.
static void analyze_node(ASTNode* node, const char* parent_table, int parent_id,
                       const char* key, SchemaContext* context) {
    if (!node) return;

    switch (node->type) {
        case NODE_OBJECT: {
            // Create or find a table schema for this JSON object.
            char* table_name = safe_filename(key);
            TableSchema* table = find_or_create_table(context, table_name);
            free(table_name);

            // Add an 'id' column to serve as the primary key for this table.
            add_column(table, "id");

            // If this object is nested within another object/array, add a foreign key column
            // linking back to the parent table (e.g., 'parent_table_name_id').
            if (parent_table) {
                char fk_name[256];
                snprintf(fk_name, sizeof(fk_name), "%s_id", parent_table);
                add_column(table, fk_name);
            }

            // Assign a unique ID to this specific object instance.
            // This ID is used if this object becomes a parent for nested structures.
            int object_id = context->next_id++;

            // Iterate through the key-value pairs of the JSON object.
            KeyValueList* list = node->value.object;
            while (list) {
                KeyValuePair* pair = list->pair;

                // Handle different value types within the object.
                switch (pair->value->type) {
                    case NODE_OBJECT:
                        // Nested object: recursively call analyze_node to define its schema.
                        // The current table becomes the parent for the nested object's table.
                        analyze_node(pair->value, table->name, object_id, pair->key, context);
                        break;

                    case NODE_ARRAY:
                        // Nested array: recursively call analyze_node.
                        // The current table becomes the parent for the array's table (or junction table).
                        analyze_node(pair->value, table->name, object_id, pair->key, context);
                        break;

                    default:
                        // Scalar value (string, number, boolean, null): add as a column to the current table.
                        add_column(table, pair->key);
                        break;
                }

                list = list->next;
            }
            break;
        }

        case NODE_ARRAY: {
            ASTNodeList* list = node->value.array;
            if (list && list->node->type == NODE_OBJECT) {
                // Array of objects: A new table is created for these objects.
                // The table is named after the JSON key of the array.
                char* array_table = safe_filename(key);
                TableSchema* table = find_or_create_table(context, array_table);
                free(array_table);

                // Add 'id' (primary key) and parent foreign key to the array's table.
                add_column(table, "id");

                // Add foreign key to parent
                if (parent_table) {
                    char fk_name[256];
                    snprintf(fk_name, sizeof(fk_name), "%s_id", parent_table);
                    add_column(table, fk_name);
                }

                // Add a 'seq' (sequence) column to preserve the order of objects within the array.
                add_column(table, "seq");

                // Process each object within the array to define its columns and handle further nesting.
                int index = 0;
                while (list) {
                    // Only process if it's an object
                    if (list->node->type == NODE_OBJECT) {
                        // Assign a unique ID for each object within the array.
                        int object_id = context->next_id++;

                        // Analyze the structure of the object in the array.
                        KeyValueList* kv_list = list->node->value.object;
                        while (kv_list) {
                            KeyValuePair* pair = kv_list->pair;

                            switch (pair->value->type) {
                                case NODE_OBJECT:
                                    // Recursively process nested object
                                    analyze_node(pair->value, table->name, object_id, pair->key, context);
                                    break;

                                case NODE_ARRAY:
                                    // Recursively process nested array
                                    analyze_node(pair->value, table->name, object_id, pair->key, context);
                                    break;

                                default:
                                    // Add scalar value as a column
                                    add_column(table, pair->key);
                                    break;
                            }

                            kv_list = kv_list->next;
                        }
                    }

                    index++;
                    list = list->next;
                }
            } else if (list) {
                // Array of scalars (strings, numbers, etc.): A junction table is created.
                // The table is named after the JSON key of the array.
                char* junction_table = safe_filename(key);
                TableSchema* table = find_or_create_table(context, junction_table);
                free(junction_table);

                // Junction table columns: 'id' (primary key), parent foreign key,
                // 'index' (for order), and 'value' (for the scalar value itself).
                add_column(table, "id");

                // Add foreign key to parent
                if (parent_table) {
                    char fk_name[256];
                    snprintf(fk_name, sizeof(fk_name), "%s_id", parent_table);
                    add_column(table, fk_name);
                }

                add_column(table, "index");
                add_column(table, "value");
            }
            break;
        }

        default:
            // Scalar values (string, number, boolean, null) are processed by their parent object/array.
            // They become columns in their parent's table or values in a junction table.
            break;
    }
}

// Iterates through the discovered table schemas and writes data to corresponding CSV files.
// - context: The SchemaContext containing all discovered table schemas.
// - output_dir: The directory where CSV files will be created.
// - ast_root: The root of the AST, needed for the second pass (data population).
static void write_csv_files(SchemaContext* context, const char* output_dir, ASTNode* ast_root) {
    // Ensure output directory exists
    ensure_directory_exists(output_dir);

    // Write a CSV file for each table
    TableSchema* current_table_schema = context->tables;
    while (current_table_schema) {
        // Get file path
        char* file_path = get_csv_file_path(output_dir, current_table_schema->name);

        // Open file for writing
        FILE* file = fopen(file_path, "w");
        if (!file) {
            fprintf(stderr, "Error: Could not open file %s for writing\n", file_path);
            free(file_path);
            current_table_schema = current_table_schema->next; // Continue to next table
            continue;
        }

        // Write the header row for the current CSV file.
        for (int i = 0; i < current_table_schema->column_count; i++) {
            fprintf(file, "%s", current_table_schema->columns[i]);
            if (i < current_table_schema->column_count - 1) {
                fprintf(file, ",");
            }
        }
        fprintf(file, "\n");

        // Populate data rows by performing a second traversal of the AST, targeting the current table.
        // A new master_id_counter is used for this pass to ensure ID consistency with the schema analysis pass.
        int master_id_counter_for_pass = 1; // Reset for each table, to mirror analyze_node's ID generation
        recursively_write_table_data(file, current_table_schema, ast_root, "root", NULL, 0, &master_id_counter_for_pass);

        fclose(file);
        free(file_path);

        current_table_schema = current_table_schema->next;
    }
}

// Recursively traverses the AST to populate rows in a specific target CSV table.
// This function is called for each table schema discovered by analyze_node.
// - csv_f: File pointer to the open CSV file for the target_schema.
// - target_schema: The schema of the table currently being populated.
// - current_ast_node: The AST node currently being visited in this traversal.
// - current_node_key: The JSON key that led to current_ast_node.
// - logical_parent_key_for_fk_col: The key of the logical parent object/array (used for naming FK columns).
// - actual_parent_row_id_for_fk_val: The actual ID of the parent row (used for FK column values).
// - master_id_counter: Pointer to a counter that mimics ID generation from analyze_node, ensuring consistency.
static void recursively_write_table_data(FILE* csv_f, TableSchema* target_schema,
                                       ASTNode* current_ast_node, const char* current_node_key,
                                       const char* logical_parent_key_for_fk_col, int actual_parent_row_id_for_fk_val,
                                       int* master_id_counter) {
    if (!current_ast_node) {
        return;
    }

    char* safe_current_key = safe_filename(current_node_key);

    if (current_ast_node->type == NODE_OBJECT) {
        // Increment ID counter for every object encountered, same as in analyze_node.
        int current_object_generated_id = (*master_id_counter)++;

        // Check if this object instance corresponds to a row in the target_schema.
        if (strcmp(safe_current_key, target_schema->name) == 0) {
            // This object is a row for the target_schema. Write its values.
            for (int i = 0; i < target_schema->column_count; i++) {
                const char* col_name = target_schema->columns[i];
                int value_written = 0;

                // Populate the 'id' column.
                if (strcmp(col_name, "id") == 0) {
                    fprintf(csv_f, "%d", current_object_generated_id);
                    value_written = 1;
                // Populate foreign key columns (e.g., 'parent_key_id').
                } else if (logical_parent_key_for_fk_col) {
                    char expected_fk_col_name[256];
                    snprintf(expected_fk_col_name, sizeof(expected_fk_col_name), "%s_id", logical_parent_key_for_fk_col);
                    if (strcmp(col_name, expected_fk_col_name) == 0) {
                        fprintf(csv_f, "%d", actual_parent_row_id_for_fk_val);
                        value_written = 1;
                    }
                }

                // Populate data columns from the object's properties.
                if (!value_written) {
                    // Find data in object's properties
                    KeyValueList* kv_list = current_ast_node->value.object;
                    while (kv_list) {
                        if (strcmp(kv_list->pair->key, col_name) == 0) {
                            // Only write direct scalar values. Nested objects/arrays form other tables.
                            if (kv_list->pair->value->type != NODE_OBJECT && kv_list->pair->value->type != NODE_ARRAY) {
                                write_csv_value(csv_f, kv_list->pair->value);
                                value_written = 1;
                            }
                            break;
                        }
                        kv_list = kv_list->next;
                    }
                }

                if (!value_written) {
                    // If a column in the schema doesn't have a corresponding value in this object
                    // (e.g., an optional field, or an FK to a different parent), write an empty field.
                }

                if (i < target_schema->column_count - 1) {
                    fprintf(csv_f, ",");
                }
            }
            fprintf(csv_f, "\n");
        }

        // Recursively call for child elements of this object.
        // The current object's key and generated ID become parent info for its children.
        KeyValueList* kv_list_children = current_ast_node->value.object;
        while (kv_list_children) {
            recursively_write_table_data(csv_f, target_schema, kv_list_children->pair->value,
                                       kv_list_children->pair->key, safe_current_key, current_object_generated_id,
                                       master_id_counter);
            kv_list_children = kv_list_children->next;
        }

    } else if (current_ast_node->type == NODE_ARRAY) {
        ASTNodeList* el_list = current_ast_node->value.array;
        int seq = 0; // Sequence counter for array elements.

        // Check if this array's items are rows for the target_schema.
        if (strcmp(safe_current_key, target_schema->name) == 0) {
            // This array's items are rows for the target_schema
            while (el_list) {
                ASTNode* array_item = el_list->node;
                // Increment ID for each item in an array that forms rows for a table.
                int item_generated_id = (*master_id_counter)++; // ID for the item (either object in array or junction row)

                for (int i = 0; i < target_schema->column_count; i++) {
                    const char* col_name = target_schema->columns[i];
                    int value_written = 0;

                    // Populate 'id', parent foreign key, 'seq' (for arrays of objects),
                    // or 'index' (for arrays of scalars forming junction tables).
                    if (strcmp(col_name, "id") == 0) {
                        fprintf(csv_f, "%d", item_generated_id);
                        value_written = 1;
                    } else if (logical_parent_key_for_fk_col) { // FK to the object *containing* this array.
                        char expected_fk_col_name[256];
                        snprintf(expected_fk_col_name, sizeof(expected_fk_col_name), "%s_id", logical_parent_key_for_fk_col);
                        if (strcmp(col_name, expected_fk_col_name) == 0) {
                            fprintf(csv_f, "%d", actual_parent_row_id_for_fk_val);
                            value_written = 1;
                        }
                    }
                    
                    if (!value_written && strcmp(col_name, "seq") == 0) { // For arrays of objects
                         fprintf(csv_f, "%d", seq);
                         value_written = 1;
                    } else if (!value_written && strcmp(col_name, "index") == 0) { // For arrays of scalars (junction table)
                         fprintf(csv_f, "%d", seq);
                         value_written = 1;
                    }


                    if (!value_written) {
                        if (array_item->type == NODE_OBJECT) {
                            KeyValueList* kv_item_list = array_item->value.object;
                            while (kv_item_list) {
                                if (strcmp(kv_item_list->pair->key, col_name) == 0) {
                                    if (kv_item_list->pair->value->type != NODE_OBJECT && kv_item_list->pair->value->type != NODE_ARRAY) {
                                        write_csv_value(csv_f, kv_item_list->pair->value);
                                        value_written = 1;
                                    }
                                    break;
                                }
                                kv_item_list = kv_item_list->next;
                            }
                        } else { // Array of scalars, for "value" column in junction table
                            if (strcmp(col_name, "value") == 0) {
                                write_csv_value(csv_f, array_item);
                                value_written = 1;
                            }
                        }
                    }
                     if (!value_written) {
                        // No value found or applicable
                    }
                    if (i < target_schema->column_count - 1) {
                        fprintf(csv_f, ",");
                    }
                }
                fprintf(csv_f, "\n");

                // If array items are objects, recurse for their children.
                // The array's key (safe_current_key) and the item's ID become parent info.
                if (array_item->type == NODE_OBJECT) {
                    KeyValueList* kv_list_children = array_item->value.object;
                    while (kv_list_children) {
                        recursively_write_table_data(csv_f, target_schema, kv_list_children->pair->value,
                                                   kv_list_children->pair->key, safe_current_key, item_generated_id,
                                                   master_id_counter);
                        kv_list_children = kv_list_children->next;
                    }
                }
                seq++;
                el_list = el_list->next;
            }
        } else {
            // This array is not the target_schema itself, but its elements might contain relevant data
            // or be parents to data relevant to the target_schema. Traverse its elements.
            el_list = current_ast_node->value.array; // Reset pointer
            while (el_list) {
                ASTNode* array_item = el_list->node;
                // Consume an ID if the item is an object, as analyze_node would have.
                // Scalar items in non-target arrays don't consume IDs here unless they form a table
                // (which would be caught if safe_current_key matched target_schema->name).
                if (array_item->type == NODE_OBJECT) {
                    (*master_id_counter)++;
                } else { 
                    // For arrays of scalars, an ID is consumed if it forms a junction table.
                    // This check is complex here. analyze_node decides this.
                    // To be safe and keep master_id_counter in sync, we might need to check
                    // if a table exists for this safe_current_key.
                    // For now, let's assume analyze_node's ID consumption for scalar arrays
                    // is tied to when it *creates* the junction table.
                    // The current logic for ID consumption in array handling is when safe_current_key == target_schema->name.
                    // If not, we just recurse.
                }

                // Recurse into the array item.
                // The parent context (logical_parent_key_for_fk_col, actual_parent_row_id_for_fk_val)
                // remains that of the object/array that *contains* this current (non-target) array.
                recursively_write_table_data(csv_f, target_schema, array_item, safe_current_key,
                                           logical_parent_key_for_fk_col, actual_parent_row_id_for_fk_val,
                                           master_id_counter);
                el_list = el_list->next;
            }
        }
    }
    // Scalar nodes (strings, numbers, etc.) do not directly form rows; their values are extracted
    // when processing their parent object or array. No direct action for them here.

    free(safe_current_key);
}

// Finds a TableSchema by name in the SchemaContext, or creates and adds a new one if not found.
static TableSchema* find_or_create_table(SchemaContext* context, const char* name) {
    // Check if table already exists
    TableSchema* table = context->tables;
    while (table) {
        if (strcmp(table->name, name) == 0) {
            return table;
        }
        table = table->next;
    }

    // Create new table if not found
    table = (TableSchema*)malloc(sizeof(TableSchema));
    if (!table) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    table->name = strdup(name);
    table->columns = NULL;
    table->column_count = 0;
    table->next = context->tables;
    context->tables = table;

    return table;
}

// Adds a column to a TableSchema if it doesn't already exist.
// Column names are duplicated to ensure they have their own memory.
static void add_column(TableSchema* table, const char* column) {
    // Check if column already exists
    for (int i = 0; i < table->column_count; i++) {
        if (strcmp(table->columns[i], column) == 0) {
            return;  // Column already exists
        }
    }

    // Add new column
    table->column_count++;
    table->columns = (char**)realloc(table->columns, table->column_count * sizeof(char*));
    if (!table->columns) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    table->columns[table->column_count - 1] = strdup(column);
}

// Ensures that the specified directory exists. If not, it attempts to create it.
// Handles basic cases like empty or "." for current directory.
static void ensure_directory_exists(const char* dir) {
    if (!dir || strcmp(dir, "") == 0 || strcmp(dir, ".") == 0) {
        return;  // Current directory
    }

    // Use system-dependent directory creation
    #ifdef _WIN32
    _mkdir(dir);
    #else
    mkdir(dir, 0755);
    #endif
}

// Constructs the full file path for a CSV file (e.g., "output_dir/table_name.csv").
// Handles cases where output_dir is empty or ".".
static char* get_csv_file_path(const char* dir, const char* table_name) {
    size_t len = strlen(dir) + strlen(table_name) + 6;  // +6 for "/" + ".csv" + null terminator
    char* path = (char*)malloc(len);
    if (!path) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }

    if (strcmp(dir, "") == 0 || strcmp(dir, ".") == 0) {
        snprintf(path, len, "%s.csv", table_name);
    } else {
        snprintf(path, len, "%s/%s.csv", dir, table_name);
    }

    return path;
}

// Writes an ASTNode's scalar value to the CSV file, applying appropriate formatting.
// Strings are quoted and internal quotes are escaped.
// Null values result in an empty field.
static void write_csv_value(FILE* file, ASTNode* node) {
    if (!node) {
        // Empty field for NULL
        return;
    }

    switch (node->type) {
        case NODE_STRING: {
            // Quote and escape strings
            fprintf(file, "\"");
            char* str = node->value.string;
            while (*str) {
                if (*str == '"') {
                    fprintf(file, "\"\"");  // Double quotes for escaping
                } else {
                    fputc(*str, file);
                }
                str++;
            }
            fprintf(file, "\"");
            break;
        }
        case NODE_NUMBER:
            fprintf(file, "%g", node->value.number);
            break;
        case NODE_BOOLEAN:
            fprintf(file, "%s", node->value.boolean ? "true" : "false");
            break;
        case NODE_NULL:
            // Empty field for NULL
            break;
        default:
            // Complex types (objects/arrays) should not be written directly as CSV cell values.
            // They are expanded into separate tables or their scalar contents are extracted.
            fprintf(stderr, "Warning: Complex type encountered in CSV cell\n");
            break;
    }
}

// (Potentially unused) Helper function to check if two JSON objects (represented by KeyValueLists)
// have the same set of keys. Order of keys does not matter.
static int has_same_keys(KeyValueList* list1, KeyValueList* list2) {
    // Count keys in first list
    int count1 = 0;
    KeyValueList* temp1 = list1;
    while (temp1) {
        count1++;
        temp1 = temp1->next;
    }

    // Count keys in second list
    int count2 = 0;
    KeyValueList* temp2 = list2;
    while (temp2) {
        count2++;
        temp2 = temp2->next;
    }

    // If counts differ, keys are different
    if (count1 != count2) return 0;

    // Check each key in list1 exists in list2
    temp1 = list1;
    while (temp1) {
        int found = 0;
        temp2 = list2;
        while (temp2) {
            if (strcmp(temp1->pair->key, temp2->pair->key) == 0) {
                found = 1;
                break;
            }
            temp2 = temp2->next;
        }

        if (!found) return 0;
        temp1 = temp1->next;
    }

    return 1;
}

// Converts a string into a "safe" filename by replacing non-alphanumeric characters (except '_') with '_'.
// If the input name is NULL or empty, defaults to "unnamed".
static char* safe_filename(const char* name) {
    if (!name || strcmp(name, "") == 0) {
        return strdup("unnamed");
    }

    // Make a copy we can modify
    char* result = strdup(name);

    // Replace special characters
    for (char* p = result; *p; p++) {
        if (!isalnum(*p) && *p != '_') {
            *p = '_';
        }
    }

    return result;
}