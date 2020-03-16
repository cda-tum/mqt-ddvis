{
    "targets": [
        {
            "target_name": "qdd_vis",
            "sources": [
                "./cpp/module/module.cpp",
                "./cpp/module/QDDVis.cpp",
            ],
            "cflags": [
                "-std=c++14",
                "-mtune=native",
                "-march=native",
                "-O3",
                "-fexceptions",
                "-fPIC",
            ],
            "cxxflags": [
                "-std=c++14",
                "-mtune=native",
                "-march=native",
                "-O3",
                "-fexceptions",
                "-fPIC",
            ],
            "cflags_cc": [
                "-std=c++14",
                "-mtune=native",
                "-march=native",
                "-O3",
                "-fexceptions",
                "-fPIC",
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")",
                "./cpp/qfr/include",
                "./cpp/qfr/include/algorithms",
                "./cpp/qfr/include/operations",
                "./cpp/qfr/include/qasm_parser",
                #"./cpp/qfr/test",
                "./cpp/qfr/extern/dd_package/include",
                "./cpp/module",
            ],
            "libraries": [
                #"~/Documents/nodejs_workspace/qdd_vis/cpp/qfr/extern/dd_package/build/src/libdd_package.a",
                #"~/Documents/nodejs_workspace/qdd_vis/cpp/qfr/build/src/libqfr.a",
                #"../cpp/qfr/extern/dd_package/build/src/libdd_package.a",
                #"../cpp/qfr/build/src/libqfr.a",
                "../cpp/libs/libdd_package.a",
                "../cpp/libs/libqfr.a",
            ],
            'dependencies': [
                "<!(node -p \"require('node-addon-api').gyp\")"
            ],
            'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
        },
    ]
}

#cmake .. -DCMAKE_BUILD_TYPE=Release -DTRY_USING_INSTALLED_DD_PACKAGE=OFF
#cmake .. -DCMAKE_BUILD_TYPE=Release -DTRY_USING_INSTALLED_DD_PACKAGE=OFF -DBUILD_SHARED_LIBS=ON
