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
                "./cpp/qfr/test",
                "./cpp/qfr/extern/dd_package/include",
                "./cpp/module",
            ],
            "libraries": [
                #"~/Documents/nodejs_workspace/qdd_vis/cpp/qfr/extern/dd_package/build/src/libdd_package.a",
                #"~/Documents/nodejs_workspace/qdd_vis/cpp/qfr/build/src/libqfr.a",
                "../cpp/qfr/extern/dd_package/build/src/libdd_package.a",
                "../cpp/qfr/build/src/libqfr.a",
                #"../cpp/libs/libdd_package.a",
                #"../cpp/libs/libqfr.a",
            ],
            'dependencies': [
                "<!(node -p \"require('node-addon-api').gyp\")",
                "dd_package",
                "qfr",
            ],
            'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
        },
        {
            "target_name": "dd_package",
            "type": "static_library",
            "sources": [
                #"./cpp/dd_package/src/DDcomplex.cpp",
                #"./cpp/dd_package/src/DDpackage.cpp",
            ],
            "inlcude_dirs": [
                "./cpp/dd_package/include",
            ],
            "libraries": [
                #"~/Documents/nodejs_workspace/qdd_vis/cpp/qfr_lib/libdd_package.a",
                "~/Documents/nodejs_workspace/qdd_vis/cpp/qfr/extern/dd_package/build/src/libdd_package.a",
            ],
        },
        {
            "target_name": "qfr",
            "type": "static_library",
            "sources": [
                #"./cpp/qfr/src/algorithms/Entanglement.cpp",
                #"./cpp/qfr/src/algorithms/GoogleRandomCircuitSampling.cpp",
                #"./cpp/qfr/src/algorithms/Grover.cpp",
                #"./cpp/qfr/src/algorithms/QFT.cpp",
                #"./cpp/qfr/src/operations/NonUnitaryOperation.cpp",
                #"./cpp/qfr/src/operations/Operation.cpp",
                #"./cpp/qfr/src/operations/StandardOperation.cpp",
                #"./cpp/qfr/src/qasm_parser/Parser.cpp",
                #"./cpp/qfr/src/qasm_parser/Scanner.cpp",
                #"./cpp/qfr/src/QuantumComputation.cpp",
            ],
            "include_dirs": [
                "./cpp/qfr/include",
                "./cpp/qfr/include/algorithms",
                "./cpp/qfr/include/operations",
                "./cpp/qfr/include/qasm_parser",
                "./cpp/qfr/extern/dd_package/include",
                "./cpp/qfr/test",
            ],
            "libraries": [
                #"~/Documents/nodejs_workspace/qdd_vis/cpp/qfr_lib/libqfr.a",
                "~/Documents/nodejs_workspace/qdd_vis/cpp/qfr/build/src/libqfr.a",
            ],
            "dependencies": [
                "dd_package",
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
        }
    ]
}

#cmake .. -DCMAKE_BUILD_TYPE=Release -DTRY_USING_INSTALLED_DD_PACKAGE=OFF
#cmake .. -DCMAKE_BUILD_TYPE=Release -DTRY_USING_INSTALLED_DD_PACKAGE=OFF -DBUILD_SHARED_LIBS=ON
