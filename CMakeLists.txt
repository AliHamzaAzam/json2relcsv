cmake_minimum_required(VERSION 3.10)
project(json2relcsv C)

# Ensure Homebrew Bison and Flex are found before the system version
set(ENV{PATH} "/opt/homebrew/opt/bison/bin:/opt/homebrew/opt/flex/bin:$ENV{PATH}")

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED True)

# Include directories
include_directories(${CMAKE_BINARY_DIR}/include) # Pick up generated headers (parser.hpp, scanner.hpp) first
include_directories(${CMAKE_BINARY_DIR}/src)     # For generated location.hh by Bison
include_directories(include)
include_directories(src)  # so scanner.hpp in src/ can be found

# --- Flex and Bison --- 
# Ensure Homebrew Flex is found before the system version
set(FLEX_EXECUTABLE "/opt/homebrew/opt/flex/bin/flex" CACHE FILEPATH "Path to Flex executable" FORCE)
find_package(FLEX REQUIRED)
# If Homebrew Flex is installed, include its headers for FlexLexer.h
get_filename_component(FLEX_BIN_DIR ${FLEX_EXECUTABLE} DIRECTORY)
get_filename_component(FLEX_ROOT_DIR ${FLEX_BIN_DIR} DIRECTORY)
set(FLEX_HEADER_DIR "${FLEX_ROOT_DIR}/include")
if(EXISTS "${FLEX_HEADER_DIR}/FlexLexer.h")
  include_directories(${FLEX_HEADER_DIR})
endif()
include_directories(${FLEX_HEADER_DIR})
include_directories("/opt/homebrew/include")
set(FLEX_FLAGS "")  # Ensure no include flags are passed to flex

# Force CMake to use the Homebrew Bison executable
set(BISON_EXECUTABLE "/opt/homebrew/opt/bison/bin/bison"
    CACHE FILEPATH "Path to Bison 3.0+ executable" FORCE)
find_package(BISON 3.0 REQUIRED)

# --- add Bison's own include directory so <location.hh> is found ---
get_filename_component(BISON_BIN_DIR ${BISON_EXECUTABLE} DIRECTORY)
get_filename_component(BISON_ROOT_DIR ${BISON_BIN_DIR} DIRECTORY)
set(BISON_HEADER_DIR "${BISON_ROOT_DIR}/include")
if(EXISTS "${BISON_HEADER_DIR}/location.hh")
  include_directories(${BISON_HEADER_DIR})
endif()
# --- end Bison include fix ---

# Define where generated files will go
set(GENERATED_DIR ${CMAKE_BINARY_DIR})
set(GENERATED_INCLUDE_DIR ${CMAKE_BINARY_DIR}/include) # For headers
file(MAKE_DIRECTORY ${GENERATED_INCLUDE_DIR})

# Flex and Bison (C)
set(PARSER_OUTPUT_SRC ${GENERATED_DIR}/parser.tab.c)
set(PARSER_OUTPUT_HEADER ${GENERATED_INCLUDE_DIR}/parser.tab.h)
set(LEXER_OUTPUT_SRC ${GENERATED_DIR}/lex.yy.c)

BISON_TARGET(JsonParser src/parser.y
             ${PARSER_OUTPUT_SRC}
             DEFINES_FILE ${PARSER_OUTPUT_HEADER}
            #  COMPILE_FLAGS "--debug"
             )
FLEX_TARGET(JsonScanner src/scanner.l ${LEXER_OUTPUT_SRC})
ADD_FLEX_BISON_DEPENDENCY(JsonScanner JsonParser)
list(APPEND GENERATED_SOURCES
    ${PARSER_OUTPUT_SRC}
    ${LEXER_OUTPUT_SRC}
)
# --- End Flex and Bison ---

# Source files
set(SOURCES
    src/main.c
    src/ast.c
    src/csv_gen.c
    ${GENERATED_SOURCES}
)

# Executable
add_executable(json2relcsv ${SOURCES})

# scanner.hpp copy no longer needed
# add_custom_command to copy scanner.hpp removed

# Link libraries (Flex and Bison typically don't require linking for the generated code itself,
# but Flex might need -lfl if not using C++ classes or if specified by FindFLEX.cmake)
# target_link_libraries(json2relcsv ${FLEX_LIBRARIES} ${BISON_LIBRARIES}) # Usually not needed for C++

# --- Tests (Optional, using CTest) ---
# enable_testing()
# add_test(NAME MyTest COMMAND json2relcsv test_input.json)
# --- End Tests ---

# Install (Optional)
# install(TARGETS json2relcsv DESTINATION bin)
# --- End Install ---


# Print paths for debugging
message(STATUS "Project source dir: ${CMAKE_SOURCE_DIR}")
message(STATUS "Project binary dir: ${CMAKE_BINARY_DIR}")
message(STATUS "Generated include dir: ${GENERATED_INCLUDE_DIR}")
message(STATUS "Generated parser header: ${PARSER_OUTPUT_HEADER}")
message(STATUS "Generated parser source: ${PARSER_OUTPUT_SRC}")
message(STATUS "Generated lexer source: ${LEXER_OUTPUT_SRC}")


