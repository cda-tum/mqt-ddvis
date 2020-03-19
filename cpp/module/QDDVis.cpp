
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
                            InstanceMethod("next", &QDDVis::Next),
                            InstanceMethod("prev", &QDDVis::Prev)
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
    std::cout << "ID of " << this->ip << " is " << this->id << std::endl;

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

void QDDVis::exportDD(const std::string& ipaddr) {
    std::string file = "data/" + ipaddr + ".dot";
    std::cout << file << std::endl;
    dd->export2Dot(sim, file.c_str(), true);
}


/**Parameters: String
 * Returns: true or false 
 * 
 * Tries to import the passed algorithm and returns whether it was successful or not.
 */
Napi::Value QDDVis::Load(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    //check if a String has been passed
    if(info.Length() < 1) {
        Napi::RangeError::New(env, "Need 1 (String) argument!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    if (!info[0].IsString()) {
        Napi::TypeError::New(env, "String expected!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    Napi::String arg = info[0].As<Napi::String>();
    const std::string algo = arg.Utf8Value();
    std::stringstream ss{algo};


    try {
        qc->import(ss, qc::OpenQASM);
        std::cout << "LOADING" << std::endl;
    } catch(std::exception& e) {
        std::cout << "Exception while loading the algorithm: " << e.what() << std::endl;
        reset();
        //return Napi::Boolean::New(env, false);
        Napi::Error::New(env, "Invalid Algorithm!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    sim = dd->makeZeroState(qc->getNqubits());
	dd->incRef(sim);
	ready = true;
    atInitial = true;
    atEnd = false;
    iterator = qc->begin();

    exportDD(this->ip);

    return Napi::Boolean::New(env, true);
}



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
        dd::Edge currDD = (*iterator)->getDD(dd, line);    //retrieve the "new" current operation
     
        auto temp = dd->multiply(currDD, sim);         //"add" the current operation by multiplying it with the previous simulation-state
        dd->incRef(temp);
        dd->decRef(sim);
        sim = temp;
        dd->garbageCollect();

        exportDD(this->ip);
        iterator++; // advance iterator
        if (iterator == qc->end()) {
        	atEnd = true;
        }
        return Napi::Boolean::New(env, true);   //something changed

    } catch(std::exception& e) {
        std::cout << "Exception while getting the current operation {src: prev}!" << std::endl;
        std::cout << e.what() << std::endl;
        return Napi::Boolean::New(env, false);
    }
}

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
    	iterator--;
    } else if (atInitial) {
	    return Napi::Boolean::New(env, false); //we can't go any further behind
    }

    try {
        dd::Edge currDD = (*iterator)->getInverseDD(dd, line); // get the inverse of the current operation

        auto temp = dd->multiply(currDD, sim);   //"remove" the current operation by multiplying with its inverse
        dd->incRef(temp);
        dd->decRef(sim);
        sim = temp;
        dd->garbageCollect();

        exportDD(this->ip);
        if (iterator == qc->begin()) {
        	atInitial = true;
        } else {
        	iterator--;
        }

        return Napi::Boolean::New(env, true);   //something changed

    } catch(std::exception& e) {
        std::cout << "Exception while getting the current operation {src: prev}!" << std::endl;
        std::cout << e.what() << std::endl;
        return Napi::Boolean::New(env, false);
    }
}
