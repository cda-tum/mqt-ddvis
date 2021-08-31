/*
 * This file is part of JKQ DDVis library which is released under the MIT license.
 * See file README.md or go to http://iic.jku.at/eda/research/quantum/ for more information.
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
