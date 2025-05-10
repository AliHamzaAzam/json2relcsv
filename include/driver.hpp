#ifndef DRIVER_HPP
#define DRIVER_HPP

// Note: This file appears to be part of a previous C++ implementation.
// The project has since been ported to C. This driver might be deprecated.

#include <memory>
#include <istream>
#include "ast.h" // Assuming this ast.h is compatible or was part of the C++ version

namespace json {
    // The Driver class was likely responsible for orchestrating the parsing process
    // in the C++ version, interfacing between the input stream and the parser/lexer.
    class Driver {
    public:
        // Potentially held the root of the parsed Abstract Syntax Tree.
        std::shared_ptr<ASTNode> root;

        // Main parsing method.
        // Would read from the input stream and populate the AST.
        // Returns true on successful parse, false otherwise.
        bool parse(std::istream& input);
    };
}

#endif // DRIVER_HPP