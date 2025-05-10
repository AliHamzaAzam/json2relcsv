%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ast.h" // Will contain AST node definitions

// Extern declarations for flex
extern int yylex();
extern int line_num;
extern int column_num;
extern FILE* yyin;
extern int yydebug; // Declare yydebug for Bison trace

// Root of the AST
ASTNode* ast_root = NULL;

// Error handling function
void yyerror(const char* s) {
    fprintf(stderr, "Error: %s at line %d, column %d\n", s, line_num, column_num);
    exit(EXIT_FAILURE);
}

%}

%union {
    double number;
    char* string;
    int boolean;
    struct ASTNode* node;
    struct KeyValuePair* pair;
    struct KeyValueList* pairlist;
    struct ASTNodeList* nodelist;
}

// Token definitions
%token <string> STRING
%token <number> NUMBER
%token <boolean> TRUE FALSE
%token NUL

// Non-terminal types
%type <node> json_value object array
%type <pair> pair
%type <pairlist> pairs
%type <nodelist> elements

// Start symbol
%start json

%%

json: json_value
    {
        ast_root = $1;
    }
    ;

json_value:
    object          { $$ = $1; }
    | array         { $$ = $1; }
    | STRING        { $$ = create_string_node($1); }
    | NUMBER        { $$ = create_number_node($1); }
    | TRUE          { $$ = create_boolean_node(1); }
    | FALSE         { $$ = create_boolean_node(0); }
    | NUL           { $$ = create_null_node(); }
    ;

object:
    '{' '}'         { $$ = create_object_node(NULL); }
    | '{' pairs '}' { $$ = create_object_node($2); }
    ;

pairs:
    pair                { $$ = create_key_value_list($1); }
    | pairs ',' pair    { $$ = add_key_value_pair($1, $3); }
    ;

pair:
    STRING ':' json_value { $$ = create_key_value_pair($1, $3); }
    ;

array:
    '[' ']'             { $$ = create_array_node(NULL); }
    | '[' elements ']'  { $$ = create_array_node($2); }
    ;

elements:
    json_value              { $$ = create_node_list($1); }
    | elements ',' json_value { $$ = add_node_to_list($1, $3); }
    ;

%%