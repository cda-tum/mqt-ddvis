/*
 * This file is part of MQT DDVis library which is released under the MIT license.
 * See file README.md or go to http://iic.jku.at/eda/research/quantum/ for more information.
 */

#ifndef QDDVIS_H
#define QDDVIS_H

#include "QuantumComputation.hpp"

#include <iostream>
#include <memory>
#include <napi.h>
#include <queue>
#include <string>

class QDDVis: public Napi::ObjectWrap<QDDVis> {
public:
    static Napi::Object Init(Napi::Env evn, Napi::Object exports);
    explicit QDDVis(const Napi::CallbackInfo& info);

private:
    static inline Napi::FunctionReference constructor;

    static constexpr unsigned short MAX_QUBITS_FOR_AMPLITUDES = 9;
    //"private" methods
    void                                    stepForward();
    void                                    stepBack();
    [[nodiscard]] std::pair<dd::fp, dd::fp> getProbabilities(dd::Qubit qubitIdx) const;
    void                                    measureQubit(dd::Qubit qubitIdx, bool measureOne, dd::fp pzero, dd::fp pone);
    void                                    calculateAmplitudes(Napi::Float32Array& amplitudes);

    //exported ("public") methods       - return type must be Napi::Value or void!
    Napi::Value Load(const Napi::CallbackInfo& info);
    Napi::Value ToStart(const Napi::CallbackInfo& info);
    Napi::Value Next(const Napi::CallbackInfo& info);
    Napi::Value Prev(const Napi::CallbackInfo& info);
    Napi::Value ToEnd(const Napi::CallbackInfo& info);
    Napi::Value ToLine(const Napi::CallbackInfo& info);
    Napi::Value GetDD(const Napi::CallbackInfo& info);
    void        UpdateExportOptions(const Napi::CallbackInfo& info);
    Napi::Value GetExportOptions(const Napi::CallbackInfo& info);
    Napi::Value IsReady(const Napi::CallbackInfo& info);
    void        Unready(const Napi::CallbackInfo& info);
    Napi::Value ConductIrreversibleOperation(const Napi::CallbackInfo& info);

    //fields
    std::unique_ptr<dd::Package<>>            dd;
    std::unique_ptr<qc::QuantumComputation> qc;
    qc::VectorDD                            sim{};

    std::vector<std::unique_ptr<qc::Operation>>::iterator iterator{};
    unsigned int                                          position = 0; //current position of the iterator

    std::vector<bool> measurements{};
    bool              ready     = false; //true if a valid algorithm is imported, false otherwise
    bool              atInitial = true;  //whether we currently visualize the initial state or not
    bool              atEnd     = false; // whether we currently visualize the end of the given circuit

    //options for the DD export
    bool showColors          = true;
    bool showEdgeLabels      = true;
    bool showClassic         = false;
    bool usePolarCoordinates = true;
};

#endif
