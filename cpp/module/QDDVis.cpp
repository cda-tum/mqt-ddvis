
#include <iostream>
#include <cstdlib>
#include <string>
#include <functional>
#include <memory>
#include <stdexcept>

#include "operations/StandardOperation.hpp"
#include "QuantumComputation.hpp"
#include "algorithms/QFT.hpp"
#include "algorithms/Grover.hpp"
#include "algorithms/GoogleRandomCircuitSampling.hpp"
#include "DDcomplex.h"
#include "DDpackage.h"

#include "QDDVis.h"

long QDDVis::NextID = 1;

Napi::FunctionReference QDDVis::constructor;

Napi::Object QDDVis::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func =
        DefineClass(  env,
                        "QDDVis",
                        {
                            InstanceMethod("load", &QDDVis::Load),
                            InstanceMethod("toStart", &QDDVis::ToStart),
                            InstanceMethod("prev", &QDDVis::Prev),
                            InstanceMethod("next", &QDDVis::Next),
                            InstanceMethod("toEnd", &QDDVis::ToEnd),
                            InstanceMethod("getDD", &QDDVis::GetDD)
                        }
                    );

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("QDDVis", func);
    return exports;
}


//constructor
QDDVis::QDDVis(const Napi::CallbackInfo& info) : Napi::ObjectWrap<QDDVis>(info) {
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    //check if a String has been passed
    if(info.Length() < 1) {
        Napi::RangeError::New(env, "Need 1 (String) argument!").ThrowAsJavaScriptException();
        return;
    }
    if (!info[0].IsString()) {
        Napi::TypeError::New(env, "String expected!").ThrowAsJavaScriptException();
        return;
    }
    this->ip = info[0].As<Napi::String>();

    this->dd = std::make_unique<dd::Package>();
    this->qc = std::make_unique<qc::QuantumComputation>();

    line.fill(qc::LINE_DEFAULT);
    this->iterator = this->qc->begin();
}


void QDDVis::reset() {
    this->qc->reset();
    sim = { };
    ready = false;
    atInitial = true;
    atEnd = false;
}

void QDDVis::stepForward() {
    if(atEnd) return;   //no further steps possible

    const dd::Edge currDD = (*iterator)->getDD(dd, line);    //retrieve the "new" current operation

    auto temp = dd->multiply(currDD, sim);         //process the current operation by multiplying it with the previous simulation-state
    dd->incRef(temp);
    dd->decRef(sim);
    sim = temp;
    dd->garbageCollect();

    iterator++; // advance iterator
    if (iterator == qc->end()) {    //qc->end() is after the last operation in the iterator
        atEnd = true;
    }
}

void QDDVis::stepBack() {
    if(atInitial) return;   //no step back possible

    if (iterator == qc->begin()) {
        atInitial = true;
        return;
    }

    iterator--; //set iterator back to the desired operation
    const dd::Edge currDD = (*iterator)->getInverseDD(dd, line); // get the inverse of the current operation

    auto temp = dd->multiply(currDD, sim);   //"remove" the current operation by multiplying with its inverse
    dd->incRef(temp);
    dd->decRef(sim);
    sim = temp;
    dd->garbageCollect();
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**Parameters: String algorithm, Object basicStates
 * Returns: true or false 
 * 
 * Tries to import the passed algorithm and returns whether it was successful or not.
 */
Napi::Value QDDVis::Load(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    //check if the correct parameters have been passed
    if(info.Length() != 4) {
        Napi::RangeError::New(env, "Need 3 (String, unsigned int, unsigned int) arguments!").ThrowAsJavaScriptException();
        return Napi::Number::New(env, -1);
    }
    if (!info[0].IsString()) {  //algorithm
        Napi::TypeError::New(env, "arg1: String expected!").ThrowAsJavaScriptException();
        return Napi::Number::New(env, -1);
    }
    if (!info[1].IsNumber()) {  //format code (1 = QASM, 2 = Real)
        Napi::TypeError::New(env, "arg3: unsigned int expected!").ThrowAsJavaScriptException();
        return Napi::Number::New(env, -1);
    }
    if (!info[2].IsNumber()) {  //number of operations to immediately process
        Napi::TypeError::New(env, "arg2: unsigned int expected!").ThrowAsJavaScriptException();
        return Napi::Number::New(env, -1);
    }
    if (!info[3].IsBoolean()) { //whether operations should be processed while advancing the iterator to opNum or not (true = new simulation; false = continue simulation)
        Napi::TypeError::New(env, "arg3: boolean expected!").ThrowAsJavaScriptException();
        return Napi::Number::New(env, -1);
    }

    //the first parameter (algorithm)
    Napi::String arg = info[0].As<Napi::String>();
    const std::string algo = arg.Utf8Value();
    std::stringstream ss{algo};

    //basis state functionality not a priority and therefore further work on it is delayed
    /*
    if(info.Length() == 2) {      //also basic states have been passed
        if(info[1].IsArray()) {
            Napi::Array compVals = info[1].As<Napi::Array>();

            if(compVals.Length() % 2 == 0) {
                const unsigned int length = compVals.Length() / 2;
                Comp* basicStates = (Comp*)malloc(length * sizeof(Comp));

                for(unsigned int i = 0; i < compVals.Length(); i++) {
                    const Napi::Value val = compVals[i];
                    const double num = (double)val.As<Napi::Number>();
                    const Comp* bs = basicStates + (i/2);

                    //the first value of the pair is always the real part, the second value the imaginary part
                    if(i % 2 == 0) bs->re = num;
                    else bs->im = num;
                }

                for(unsigned int i = 0; i < length; i++) {
                    const Comp* bs = (basicStates + i);
                    std::cout << "#" << i << "\tRe=" << bs->re << "\tIm=" << bs->im << std::endl;
                }

            } else {
                //todo error
                std::cout << "error, param 2 must have an even length!" << std::endl;
            }
        } else {
            std::cout << "error, param 2 is not an array either!" << std::endl;
        }
    }
     */

    try {
        //second parameter describes the format of the algorithm
        const unsigned int formatCode = (unsigned int)info[1].As<Napi::Number>();
        if(formatCode == 1)         qc->import(ss, qc::OpenQASM);
        else if(formatCode == 2)    qc->import(ss, qc::Real);
        else {
            Napi::Error::New(env, "Invalid FormatCode!").ThrowAsJavaScriptException();
            return Napi::Number::New(env, -1);
        }

    } catch(std::exception& e) {
        std::cout << "Exception while loading the algorithm: " << e.what() << std::endl;
        //reset();  //todo reload old input
        std::string err = "Invalid Algorithm! ";// + e.what();
        Napi::Error::New(env, err).ThrowAsJavaScriptException();
        return Napi::Number::New(env, -1);
    }

    ready = true;
    atInitial = true;
    atEnd = false;
    iterator = qc->begin();

    //the third parameter (how many operations to apply immediately)
    const unsigned int opNum = (unsigned int)info[2].As<Napi::Number>();
    if(opNum > 0) {
        //todo check if iterator has elements? because if not we will get a segmentation fault because iterator++ points to memory of something else
        atInitial = false;
        const bool process = (bool)info[3].As<Napi::Boolean>(); //the fourth parameter tells us to process iterated operations or not
        if(process) {
            //todo dereference old sim?
            sim = dd->makeZeroState(qc->getNqubits());
            dd->incRef(sim);
            for(unsigned int i = 0; i < opNum; i++) {    //apply some operations
                stepForward();
            }
        } else {
            for(unsigned int i = 0; i < opNum; i++) iterator++; //just advance the iterator so it points to the operations where we stopped before the edit
        }

    } else {    //sim needs to be initialized in some cases
        //todo dereference old sim?
        sim = dd->makeZeroState(qc->getNqubits());
        dd->incRef(sim);
    }

    return Napi::Number::New(env, qc->getNops());
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Napi::Value QDDVis::ToStart(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if(!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    } else if (qc->empty()) {
        return Napi::Boolean::New(env, false);
    }

    if(atInitial) return Napi::Boolean::New(env, false);  //nothing changed
    else {
        try {
            dd->decRef(sim);
            sim = dd->makeZeroState(qc->getNqubits());
            dd->incRef(sim);
            atInitial = true;
            atEnd = false;
            iterator = qc->begin();

            return Napi::Boolean::New(env, true);   //something changed

        } catch(std::exception& e) {
            std::cout << "Exception while going back to the start!" << std::endl;
            std::cout << e.what() << std::endl;
            return Napi::Boolean::New(env, false);  //nothing changed
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Napi::Value QDDVis::Prev(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if(!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    } else if (qc->empty()) {
        return Napi::Boolean::New(env, false);
    }

    if (atEnd) {
        atEnd = false;
    } else if (atInitial) {
        return Napi::Boolean::New(env, false); //we can't go any further back
    }

    try {
        stepBack();     //go back to the start before the last processed operation

        return Napi::Boolean::New(env, true);   //something changed

    } catch(std::exception& e) {
        std::cout << "Exception while getting the current operation {src: prev}!" << std::endl;
        std::cout << e.what() << std::endl;
        return Napi::Boolean::New(env, false);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Napi::Value QDDVis::Next(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if(!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    } else if (qc->empty()) {
        return Napi::Boolean::New(env, false);
    }

    if(atInitial){
        atInitial = false;
    } else if(atEnd) {
        return Napi::Boolean::New(env, false); //we can't go any further ahead
    }

    try {
        stepForward();          //process the next operation

        return Napi::Boolean::New(env, true);   //something changed

    } catch(std::exception& e) {
        std::cout << "Exception while getting the current operation {src: prev}!" << std::endl;
        std::cout << e.what() << std::endl;
        return Napi::Boolean::New(env, false);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Napi::Value QDDVis::ToEnd(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if(!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    } else if (qc->empty()) {   //todo should never be reached since ready must be false if there is no algorithm (or is an empty algorithm valid and normally loaded?)
        return Napi::Boolean::New(env, false);  //todo ask if in this case any error should be thrown or if an empty algorithm is okay
    }

    if(atEnd) return Napi::Boolean::New(env, false); //nothing changed
    else {
        atInitial = false;  //now we are definitely not at the beginning (if there were no operation, so atInitial and atEnd could be true at the same time, if(qc-empty)
        // would already have returned
        try {
            while(!atEnd) stepForward();    //process one step at a time until all operations have been considered (atEnd is set to true in stepForward())
            //now atEnd is true, exactly as it should be

            return Napi::Boolean::New(env, true);   //something changed

        } catch(std::exception& e) {
            std::cout << "Exception while going to the end!" << std::endl;
            std::cout << e.what() << std::endl;
            return Napi::Boolean::New(env, false);
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Napi::Value QDDVis::GetDD(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if(!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    } else if (qc->empty()) {   //todo should never be reached since ready must be false if there is no algorithm (or is an empty algorithm valid and normally loaded?)
        return Napi::Boolean::New(env, false);  //todo ask if in this case any error should be thrown or if an empty algorithm is okay
    }

    std::stringstream ss{};
    try {
        std::cout << "inside getDD try" << std::endl;
        dd->toDot2(sim, ss, true, false);
        std::cout << "inside getDD after toDot" << std::endl;
        std::string str = ss.str();
        return Napi::String::New(env, str);

    } catch(std::exception& e) {
        std::cout << "Exception while getting the DD: " << e.what() << std::endl;
        //reset();
        std::string err = "Invalid getDD()-call! ";// + e.what();
        Napi::Error::New(env, err).ThrowAsJavaScriptException();
        return Napi::String::New(env, "-1");
    }

}
