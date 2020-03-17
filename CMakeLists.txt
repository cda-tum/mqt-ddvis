cmake_minimum_required(VERSION 3.15)
project(QDD_Vis)

set(CMAKE_CXX_STANDARD 14)

include_directories(cpp/module)

add_executable(QDD_Vis
        cpp/module/module.cpp
        cpp/module/QDDVis.cpp
        cpp/module/QDDVis.h)

add_subdirectory(cpp/qfr)

target_compile_options(qfr PUBLIC -fPIC)