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
        static long NextID;

        //"private" methods
        void reset();
        void exportDD(const std::string& ipaddr);
        void stepForward();
        void stepBack();

        //exported ("public") methods       - return type must be Napi::Value or void!
        Napi::Value Load(const Napi::CallbackInfo& info);
        Napi::Value ToStart(const Napi::CallbackInfo& info);
        Napi::Value Next(const Napi::CallbackInfo& info);
        Napi::Value Prev(const Napi::CallbackInfo& info);
        Napi::Value ToEnd(const Napi::CallbackInfo& info);

        //fields
        const long id = NextID++;
        std::string ip{};
        std::unique_ptr<dd::Package> dd;
        std::unique_ptr<qc::QuantumComputation> qc;
        dd::Edge sim{};

        std::vector<std::unique_ptr<qc::Operation>>::iterator iterator{};

        std::array<short, qc::MAX_QUBITS> line {};
        bool ready = false;     //true if a valid algorithm is imported, false otherwise
        bool atInitial = true; //whether we currently visualize the initial state or not
        bool atEnd = false; // whether we currently visualize the end of the given circuit
};

#endif
