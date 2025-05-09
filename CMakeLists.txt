cmake_minimum_required(VERSION 3.31)
project(json2relcsv)

set(CMAKE_CXX_STANDARD 20)

find_package(FLEX REQUIRED)
find_package(BISON REQUIRED)

BISON_TARGET(Parser src/parser.y ${CMAKE_BINARY_DIR}/parser.cpp
        DEFINES_FILE ${CMAKE_BINARY_DIR}/parser.hpp)
FLEX_TARGET(Scanner src/scanner.l ${CMAKE_BINARY_DIR}/scanner.cpp)
ADD_FLEX_BISON_DEPENDENCY(Scanner Parser)

include_directories(${CMAKE_BINARY_DIR} include)

add_executable(json2relcsv
        ${BISON_Parser_OUTPUTS}
        ${FLEX_Scanner_OUTPUTS}
        src/ast.cpp
        src/schema.cpp
        src/csv_writer.cpp
        src/main.cpp
)

target_link_libraries(json2relcsv stdc++fs)
