cmake_minimum_required(VERSION 3.15)

# detailed description
project(QDD_Vis
        VERSION 0.1
        DESCRIPTION "A Web-App for visualizing Quantum Algorithms using Decision Diagrams"
        LANGUAGES CXX)

# useful in IDEs
set_property(GLOBAL PROPERTY USE_FOLDERS ON)

# options for setting the default build type
set(default_build_type "Release")
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
	message(STATUS "Setting build type to '${default_build_type}' as none was specified.")
	set(CMAKE_BUILD_TYPE "${default_build_type}" CACHE
	    STRING "Choose the type of build." FORCE)
	# Set the possible values of build type for cmake-gui
	set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS
	             "Debug" "Release" "MinSizeRel" "RelWithDebInfo")
endif()

# if "-DGIT_SUBMODULE=OFF" is passed to CMake during configuration, the update step is skipped
option(GIT_SUBMODULE "Check submodules during build" ON)

# correctly initialize qfr submodule
find_package(Git QUIET)
if(GIT_FOUND AND EXISTS "${PROJECT_SOURCE_DIR}/.git" AND GIT_SUBMODULE)
	message(STATUS "QFR update")
	execute_process(COMMAND ${GIT_EXECUTABLE} submodule update --init --recursive --remote -- cpp/qfr
	                WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
	                RESULT_VARIABLE GIT_SUBMOD_RESULT)
	if(NOT GIT_SUBMOD_RESULT EQUAL "0")
		message(FATAL_ERROR "git submodule update --init --recursive --remote -- cpp/qfr failed with ${GIT_SUBMOD_RESULT}.")
	endif()
endif()

if(NOT EXISTS "${PROJECT_SOURCE_DIR}/cpp/qfr/CMakeLists.txt")
	message(FATAL_ERROR "${MODULENAME} failed to download! GIT_SUBMODULE was turned off or failed. Please update submodules and try again.")
endif()

# create executable
add_executable(${PROJECT_NAME}
        cpp/module/module.cpp
        cpp/module/QDDVis.cpp
        cpp/module/QDDVis.h)

# always use modern CMake "target_..." commands
target_include_directories(${PROJECT_NAME} PUBLIC cpp/module) # include directories
target_compile_features(${PROJECT_NAME} PUBLIC cxx_std_14) # c++ standard
set_target_properties(${PROJECT_NAME} PROPERTIES CXX_EXTENSIONS OFF) # disable use of standard extensions

# add submodule directory. this automatically adds the appropriate targets and include files
add_subdirectory(cpp/qfr)

# set -fPIC flag for qfr
target_compile_options(qfr PUBLIC -fPIC)

# link the qfr library. this automatically links the DDPackage library and forwards the include paths
target_link_libraries(${PROJECT_NAME} PRIVATE JKQ::qfr)

# check if interprocedural optimization (LTO) is supported
include(CheckIPOSupported)
check_ipo_supported(RESULT ipo_supported)
if(ipo_supported)
	set_target_properties(${PROJECT_NAME} PROPERTIES INTERPROCEDURAL_OPTIMIZATION TRUE)
endif()

# set compiler flags (this assumes gcc or clang)
target_compile_options(${PROJECT_NAME} PRIVATE -Wall $<$<CONFIG:DEBUG>:-g3 -Og -Wextra -Wpedantic -pedantic> $<$<CONFIG:RELEASE>:-O3 -mtune=native -march=native -DNDEBUG -g0>)

# in order to find <napi.h> this may be necessary
# target_include_directories(${PROJECT_NAME} PUBLIC node_modules/node-addon-api node_modules/node-addon-api/src)
