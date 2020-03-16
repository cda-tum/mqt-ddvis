#ifndef QDDVIS_H
#define QDDVIS_H

#include <napi.h>
#include <string>

#include "Operation.hpp"
#include "QuantumComputation.hpp"
#include "DDcomplex.h"
#include "DDpackage.h"

class QDDVis : public Napi::ObjectWrap<QDDVis> {
    public:
        static Napi::Object Init(Napi::Env evn, Napi::Object exports);
        QDDVis(const Napi::CallbackInfo& info);

    private:
        static Napi::FunctionReference constructor;
        static long NextID;

        //"private" methods
        void reset();
        void exportDD(std::string ip);

        //exported ("public") methods       - return type must be Napi::Value or void!
        Napi::Value Load(const Napi::CallbackInfo& info);
        Napi::Value Next(const Napi::CallbackInfo& info);
        Napi::Value Prev(const Napi::CallbackInfo& info);

        //fields
        const long id = NextID++;
        std::string ip;
        std::unique_ptr<dd::Package> dd;
        std::unique_ptr<qc::QuantumComputation> qc;
        dd::Edge sim;
        //std::vector<std::unique_ptr<Operation>> iterator;

        __gnu_cxx::__normal_iterator<
            std::unique_ptr<qc::Operation, std::default_delete<qc::Operation>> *,
            std::vector<
                std::unique_ptr<qc::Operation, std::default_delete<qc::Operation>>, 
                std::allocator<std::unique_ptr<qc::Operation, std::default_delete<qc::Operation>>>
            >
        > iterator;

        std::array<short, qc::MAX_QUBITS> line {};
        bool ready;     //true if a valid algorithm is imported, false otherwise
        bool atInitial; //whether we currently visualize the initial state or not
};

#endif