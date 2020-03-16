
#include <napi.h>
#include "QDDVis.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return QDDVis::Init(env, exports);
}

NODE_API_MODULE(addon, InitAll)