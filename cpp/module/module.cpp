
#include <napi.h>
#include "QDDVis.h"
#include "QDDVer.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    exports = QDDVis::Init(env, exports);
    exports = QDDVer::Init(env, exports);
    return exports;
  //return QDDVis::Init(env, exports);
}

NODE_API_MODULE(addon, InitAll)