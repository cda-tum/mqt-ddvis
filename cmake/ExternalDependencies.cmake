# Copyright (c) 2023 - 2025 Chair for Design Automation, TUM
# Copyright (c) 2025 Munich Quantum Software Company GmbH
# All rights reserved.
#
# SPDX-License-Identifier: MIT
#
# Licensed under the MIT License

# Declare all external dependencies and make sure that they are available.

include(FetchContent)
set(FETCH_PACKAGES "")

# cmake-format: off
set(MQT_CORE_VERSION 3.0.2
    CACHE STRING "MQT Core version")
set(MQT_CORE_REV "9b6e01482cc77f48c828d988407ee4f8e4e93b56"
    CACHE STRING "MQT Core identifier (tag, branch or commit hash)")
set(MQT_CORE_REPO_OWNER "cda-tum"
    CACHE STRING "MQT Core repository owner (change when using a fork)")
# cmake-format: on
FetchContent_Declare(
  mqt-core
  GIT_REPOSITORY https://github.com/${MQT_CORE_REPO_OWNER}/mqt-core.git
  GIT_TAG ${MQT_CORE_REV}
  FIND_PACKAGE_ARGS ${MQT_CORE_VERSION})
list(APPEND FETCH_PACKAGES mqt-core)

# Make all declared dependencies available.
FetchContent_MakeAvailable(${FETCH_PACKAGES})
