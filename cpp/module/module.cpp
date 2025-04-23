/*
 * Copyright (c) 2023 - 2025 Chair for Design Automation, TUM
 * Copyright (c) 2025 Munich Quantum Software Company GmbH
 * All rights reserved.
 *
 * SPDX-License-Identifier: MIT
 *
 * Licensed under the MIT License
 */

/*
 * This file is part of MQT DDVis library which is released under the MIT
 * license. See file README.md or go to http://iic.jku.at/eda/research/quantum/
 * for more information.
 */

#include "QDDVer.h"
#include "QDDVis.h"

#include <napi.h>

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports = QDDVis::Init(env, exports);
  exports = QDDVer::Init(env, exports);
  return exports;
}

NODE_API_MODULE(addon, InitAll)
