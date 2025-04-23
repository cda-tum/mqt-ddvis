# set required cmake version
cmake_minimum_required(VERSION 3.24...4.0)

# detailed description
project(
  mqt-ddvis
  VERSION 1.8.0
  DESCRIPTION "MQT DDVis - A Tool for Visualizing Decision Diagrams for Quantum Computing"
  LANGUAGES CXX)

# enable PIC generation
set(CMAKE_POSITION_INDEPENDENT_CODE
    ON
    CACHE BOOL "Build Position Independent Code")

# add submodule directory. this automatically adds the appropriate targets and include files
include(cmake/ExternalDependencies.cmake)

# create executable
add_library(${PROJECT_NAME} SHARED cpp/module/module.cpp cpp/module/QDDVer.cpp cpp/module/QDDVer.h
                                   cpp/module/QDDVis.cpp cpp/module/QDDVis.h)
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# include directories
target_include_directories(${PROJECT_NAME} PUBLIC cpp/module)

# link the QFR library and the project options and warnings.
target_link_libraries(${PROJECT_NAME} PRIVATE MQT::CoreDD MQT::ProjectOptions MQT::ProjectWarnings)

target_include_directories(${PROJECT_NAME} SYSTEM PRIVATE ${CMAKE_JS_INC})
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})

if(MSVC
   AND CMAKE_JS_NODELIB_DEF
   AND CMAKE_JS_NODELIB_TARGET)
  # Generate node.lib
  execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET}
                          ${CMAKE_STATIC_LINKER_FLAGS})
endif()
