%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "parser.tab.h" // This will be generated from parser.y

// Track line and column for error reporting
int line_num = 1;
int column_num = 1;

// Debug flag for lexer output
// int lexer_debug = 1; // Set to 1 to enable debug prints, 0 to disable
#define LEXER_DEBUG 0 // Use a macro for easier compile-time control

// Function to update column count
void update_column(int length) {
    column_num += length;
}

// Function to handle newlines
void handle_newline() {
    line_num++;
    column_num = 1;
}

// Safer helper to process escape sequences in strings
// Works on a copy of the input string segment.
char* process_string_safer(const char* text_with_quotes) {
    int len_with_quotes = strlen(text_with_quotes);
    char* work_copy = strdup(text_with_quotes);
    if (!work_copy) {
        fprintf(stderr, "Memory allocation failed (strdup in process_string_safer)\n");
        exit(EXIT_FAILURE);
    }

    char* content_start = work_copy;
    int content_len = len_with_quotes;

    // Remove leading and trailing quotes if present
    if (len_with_quotes >= 2 && work_copy[0] == '"' && work_copy[len_with_quotes - 1] == '"') {
        work_copy[len_with_quotes - 1] = '\0'; // Null-terminate before the last quote
        content_start++;                       // Move pointer past the first quote
        content_len -= 2;
    }

    // Allocate space for processed string (may be shorter due to escapes)
    char* processed = (char*)malloc(content_len + 1);
    if (!processed) {
        fprintf(stderr, "Memory allocation failed (malloc in process_string_safer)\n");
        free(work_copy);
        exit(EXIT_FAILURE);
    }

    int i = 0, j = 0;
    while (i < content_len) {
        if (content_start[i] == '\\') {
            i++; // Skip backslash
            if (i < content_len) { // Ensure there's a character after backslash
                switch (content_start[i]) {
                    case 'n': processed[j++] = '\n'; break;
                    case 't': processed[j++] = '\t'; break;
                    case 'r': processed[j++] = '\r'; break;
                    case 'b': processed[j++] = '\b'; break;
                    case 'f': processed[j++] = '\f'; break;
                    case '\\': processed[j++] = '\\'; break;
                    case '"': processed[j++] = '"'; break;
                    case '/': processed[j++] = '/'; break;
                    // Basic \uXXXX handling (actual conversion not implemented)
                    case 'u':
                        if (i + 4 < content_len) {
                            processed[j++] = '?'; // Placeholder for unicode char
                            i += 4; // Skip the 4 hex digits
                        } else {
                            processed[j++] = content_start[i]; // Not a valid unicode escape, take 'u'
                        }
                        break;
                    default: processed[j++] = content_start[i]; break; // Unknown escape, take char as is
                }
            } else { 
                // Trailing backslash, should be an error or handled as literal
                processed[j++] = '\\'; 
            }
        } else {
            processed[j++] = content_start[i];
        }
        i++;
    }
    processed[j] = '\0';
    free(work_copy);
    return processed;
}
%}

%option noyywrap
%option yylineno
/* Though we use manual line_num, yylineno is available */

/* States for handling string literals */
%x STRING

%%

\{          {
                if(LEXER_DEBUG) printf("LEX: Token '{' L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                return '{';
            }
\}          {
                if(LEXER_DEBUG) printf("LEX: Token '}' L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                return '}';
            }
\[          {
                if(LEXER_DEBUG) printf("LEX: Token '[' L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                return '[';
            }
\]          {
                if(LEXER_DEBUG) printf("LEX: Token ']' L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                return ']';
            }
:           {
                if(LEXER_DEBUG) printf("LEX: Token ':' L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                return ':';
            }
,           {
                if(LEXER_DEBUG) printf("LEX: Token ',' L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                return ',';
            }

\"          {
                if(LEXER_DEBUG) printf("LEX: Start STRING L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                BEGIN(STRING);
                yymore();
            }

<STRING>\"  {
                if(LEXER_DEBUG) printf("LEX: End STRING L%d C%d\n", line_num, column_num);
                update_column(1); // Explicitly update by 1 for the closing quote
                BEGIN(INITIAL);
                yylval.string = process_string_safer(yytext); // Use safer version
                if(LEXER_DEBUG) printf("LEX: RETURN STRING val=\"%s\" L%d C%d\n", yylval.string, line_num, column_num);
                return 258; /* Explicitly return token kind 258 for STRING */
            }

<STRING>\\. {
                if(LEXER_DEBUG) printf("LEX: STRING content (escaped \\.) L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                yymore();
            }

<STRING>[^\\\"\n]+ {
                /* if(LEXER_DEBUG) printf("LEX: STRING content ([^\\\\\\\\\\\\\"\\\\n]+) L%d C%d\n", line_num, column_num); */
                update_column(yyleng);
                yymore();
            }

<STRING>\n  {
                if(LEXER_DEBUG) printf("LEX: Unterminated STRING (newline) L%d C%d\n", line_num, column_num);
                handle_newline();
                fprintf(stderr, "Error: Unterminated string at line %d, column %d\n", line_num -1, column_num); // line_num already incremented
                exit(EXIT_FAILURE);
            }

true        {
                if(LEXER_DEBUG) printf("LEX: Token TRUE L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                yylval.boolean = 1;
                return TRUE;
            }

false       {
                if(LEXER_DEBUG) printf("LEX: Token FALSE L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                yylval.boolean = 0;
                return FALSE;
            }

null        {
                if(LEXER_DEBUG) printf("LEX: Token NUL L%d C%d\n", line_num, column_num);
                update_column(yyleng);
                return NUL;
            }

-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)? {
                /* if(LEXER_DEBUG) printf("LEX: Token NUMBER L%d C%d\n", line_num, column_num); */
                update_column(yyleng);
                yylval.number = atof(yytext);
                return NUMBER;
            }

[ \t\r]+    {
                /* if(LEXER_DEBUG) printf("LEX: Whitespace L%d C%d\n", line_num, column_num); */
                update_column(yyleng); /* ignore whitespace */
            }
\n          {
                if(LEXER_DEBUG) printf("LEX: Newline L%d C%d\n", line_num, column_num);
                handle_newline(); /* track newlines */
            }

.           {
                /* if(LEXER_DEBUG) printf("LEX: Unexpected char '.' L%d C%d\n", line_num, column_num); */
                update_column(yyleng);
                fprintf(stderr, "Error: Unexpected character '%s' at line %d, column %d\n",
                        yytext, line_num, column_num);
                exit(EXIT_FAILURE);
            }
%%

// Removed original process_string, copy_string as process_string_safer covers it.
// int yywrap() {
// return 1;
// }
