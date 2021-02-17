cmake_minimum_required(VERSION 3.15...3.19)

# detailed description
project(DDVis
        VERSION 1.2.2
        DESCRIPTION "DDVis - A JKQ Tool for Visualizing Decision Diagrams for Quantum Computing"
        LANGUAGES CXX)

# useful in IDEs
set_property(GLOBAL PROPERTY USE_FOLDERS ON)

# build type settings
set(default_build_type "Release")
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
	message(STATUS "Setting build type to '${default_build_type}' as none was specified.")
	set(CMAKE_BUILD_TYPE "${default_build_type}" CACHE STRING "Choose the type of build." FORCE)
	set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS "Debug" "Release" "MinSizeRel" "RelWithDebInfo")
endif()

macro(check_submodule_present MODULENAME)
	if(NOT EXISTS "${PROJECT_SOURCE_DIR}/cpp/${MODULENAME}/CMakeLists.txt")
		message(FATAL_ERROR "${MODULENAME} submodule not cloned properly. Please run `git submodule update --init --recursive` from the main project directory")
	endif()
endmacro()

check_submodule_present(qfr)

# create executable
add_library(${PROJECT_NAME} SHARED
        cpp/module/module.cpp
        cpp/module/QDDVis.cpp
        cpp/module/QDDVis.h
		cpp/module/QDDVer.h
		cpp/module/QDDVer.cpp)
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# include directories
target_include_directories(${PROJECT_NAME} PUBLIC cpp/module)

# set required C++ standard and disable compiler specific extensions
target_compile_features(${PROJECT_NAME} PUBLIC cxx_std_17)
set_target_properties(${PROJECT_NAME} PROPERTIES CMAKE_CXX_STANDARD_REQUIRED ON CXX_EXTENSIONS OFF)

# enable PIC generation
set(GENERATE_POSITION_INDEPENDENT_CODE ON)

# add submodule directory. this automatically adds the appropriate targets and include files
add_subdirectory(cpp/qfr)

# link the qfr library. this automatically links the DDPackage library and forwards the include paths
target_link_libraries(${PROJECT_NAME} PRIVATE JKQ::qfr)

# check if interprocedural optimization (LTO) is supported
include(CheckIPOSupported)
check_ipo_supported(RESULT ipo_supported)
if(ipo_supported)
	set_target_properties(${PROJECT_NAME} PROPERTIES INTERPROCEDURAL_OPTIMIZATION TRUE)
endif()

# set compiler flags (this assumes gcc or clang)
target_compile_options(${PROJECT_NAME} PRIVATE -Wall -Wextra $<$<CONFIG:DEBUG>:-Og> -mtune=native -march=native)

# Include N-API wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
                WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
                OUTPUT_VARIABLE NODE_ADDON_API_DIR
                )
string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR} ${NODE_ADDON_API_DIR}/src)
target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_JS_INC})
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})
