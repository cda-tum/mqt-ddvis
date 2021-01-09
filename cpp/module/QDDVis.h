#ifndef QDDVIS_H
#define QDDVIS_H

#include <napi.h>
#include <string>

#include "operations/Operation.hpp"
#include "QuantumComputation.hpp"
#include "DDcomplex.h"
#include "DDpackage.h"

class QDDVis : public Napi::ObjectWrap<QDDVis> {
    public:
        static Napi::Object Init(Napi::Env evn, Napi::Object exports);
        explicit QDDVis(const Napi::CallbackInfo& info);

    private:
        static Napi::FunctionReference constructor;

        //"private" methods
        void stepForward();
        void stepBack();
        std::pair<fp, fp> getProbabilities(unsigned short qubitIdx);
        void measureQubit(unsigned short qubitIdx, bool measureOne, fp pzero, fp pone);

        //exported ("public") methods       - return type must be Napi::Value or void!
        Napi::Value Load(const Napi::CallbackInfo& info);
        Napi::Value ToStart(const Napi::CallbackInfo& info);
        Napi::Value Next(const Napi::CallbackInfo& info);
        Napi::Value Prev(const Napi::CallbackInfo& info);
        Napi::Value ToEnd(const Napi::CallbackInfo& info);
        Napi::Value ToLine(const Napi::CallbackInfo& info);
        Napi::Value GetDD(const Napi::CallbackInfo& info);
        void UpdateExportOptions(const Napi::CallbackInfo& info);
        Napi::Value GetExportOptions(const Napi::CallbackInfo& info);
        Napi::Value IsReady(const Napi::CallbackInfo& info);
        void Unready(const Napi::CallbackInfo& info);
		Napi::Value ConductIrreversibleOperation(const Napi::CallbackInfo& info);

        //fields
        std::unique_ptr<dd::Package> dd;
        std::unique_ptr<qc::QuantumComputation> qc;
        dd::Edge sim{};

        std::vector<std::unique_ptr<qc::Operation>>::iterator iterator{};
        unsigned int position = 0;  //current position of the iterator

        std::array<short, qc::MAX_QUBITS> line {};
        std::bitset<qc::MAX_QUBITS> measurements{};
        bool ready = false;     //true if a valid algorithm is imported, false otherwise
        bool atInitial = true; //whether we currently visualize the initial state or not
        bool atEnd = false; // whether we currently visualize the end of the given circuit

        //options for the DD export
        bool showColors = true;
        bool showEdgeLabels = true;
        bool showClassic = false;
};

#endif
