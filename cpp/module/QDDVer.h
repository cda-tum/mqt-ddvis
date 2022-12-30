/*
 * This file is part of MQT DDVis library which is released under the MIT license.
 * See file README.md or go to http://iic.jku.at/eda/research/quantum/ for more information.
 */

#ifndef QDD_VIS_QDDVER_H
#define QDD_VIS_QDDVER_H

#include "QuantumComputation.hpp"
#include "dd/Package.hpp"
#include "dd/Operations.hpp"

#include <iostream>
#include <memory>
#include <napi.h>
#include <string>

class QDDVer: public Napi::ObjectWrap<QDDVer> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    explicit QDDVer(const Napi::CallbackInfo& info);

private:
    static inline Napi::FunctionReference constructor;

    //"private" methods
    void stepForward(bool algo1); //whether it is applied on algo1 or algo2
    void stepBack(bool algo1);    //whether it is applied on algo1 or algo2
    void stepToStart(bool algo1); //whether it is applied on algo1 or algo2

    //exported ("public") methods       - return type must be Napi::Value or void!
    Napi::Value GetDD(const Napi::CallbackInfo& info); //isVector: false
    Napi::Value Load(const Napi::CallbackInfo& info);
    Napi::Value ToStart(const Napi::CallbackInfo& info);
    Napi::Value Next(const Napi::CallbackInfo& info);
    Napi::Value Prev(const Napi::CallbackInfo& info);
    Napi::Value ToEnd(const Napi::CallbackInfo& info);
    Napi::Value ToLine(const Napi::CallbackInfo& info);
    void        UpdateExportOptions(const Napi::CallbackInfo& info);
    Napi::Value GetExportOptions(const Napi::CallbackInfo& info);
    Napi::Value IsReady(const Napi::CallbackInfo& info);
    void        Unready(const Napi::CallbackInfo& info);

    //fields
    std::unique_ptr<dd::Package<>> dd;
    qc::MatrixDD                   sim{};

    //options for the DD export
    bool showColors          = true;
    bool showEdgeLabels      = true;
    bool showClassic         = false;
    bool usePolarCoordinates = true;

    std::unique_ptr<qc::QuantumComputation>               qc1;
    std::vector<std::unique_ptr<qc::Operation>>::iterator iterator1{};   //operations of algo1
    unsigned int                                          position1 = 0; //current position of iterator1

    bool ready1     = false; //true if algo1 is valid
    bool atInitial1 = true;  //whether we're currently before the first operation of algo1
    bool atEnd1     = false; //whether we're currently after the last operation of algo1

    std::unique_ptr<qc::QuantumComputation>               qc2;
    std::vector<std::unique_ptr<qc::Operation>>::iterator iterator2{};   //operations of algo2
    unsigned int                                          position2 = 0; //current position of iterator2

    bool ready2     = false; //true if algo2 is valid
    bool atInitial2 = true;  //whether we're currently before the first operation of algo2
    bool atEnd2     = false; //whether we're currently after the last operation of algo2
};

#endif //QDD_VIS_QDDVER_H
