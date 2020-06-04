
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
                            InstanceMethod("toLine", &QDDVis::ToLine),
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
    this->position = 0;
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
    position++;
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
    position--;
    const dd::Edge currDD = (*iterator)->getInverseDD(dd, line); // get the inverse of the current operation

    auto temp = dd->multiply(currDD, sim);   //"remove" the current operation by multiplying with its inverse
    dd->incRef(temp);
    dd->decRef(sim);
    sim = temp;
    dd->garbageCollect();
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**Parameters: String algorithm, unsigned int formatCode, unsigned int num of operations to step forward, bool whether the
 * operations should be processed or just the iterator needs to be advanced
 * Returns: true or false 
 * 
 * Tries to import the passed algorithm and returns whether it was successful or not.
 */
Napi::Value QDDVis::Load(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    //check if the correct parameters have been passed
    if(info.Length() != 4) {
        Napi::RangeError::New(env, "Need 4 (String, unsigned int, unsigned int, bool) arguments!").ThrowAsJavaScriptException();
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
        std::string err("");//e.what());    //todo e.what() gives unreadable characters?
        Napi::Error::New(env, "Invalid Algorithm! " + err).ThrowAsJavaScriptException();
        return Napi::Number::New(env, -1);
    }

    ready = true;
    atInitial = true;
    atEnd = false;
    iterator = qc->begin();
    position = 0;

    //the third parameter (how many operations to apply immediately)
    const unsigned int opNum = (unsigned int)info[2].As<Napi::Number>();    //at this point opNum may be bigger than the number of operations the algorithm has!
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
            for(unsigned int i = 0; i < opNum; i++) {
                iterator++; //just advance the iterator so it points to the operations where we stopped before the edit
                position++;
            }
        }

    } else {    //sim needs to be initialized in some cases
        //todo dereference old sim?
        sim = dd->makeZeroState(qc->getNqubits());
        dd->incRef(sim);
    }
    std::cout << "Position = " << position << std::endl;
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
            position = 0;

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
    } else if (qc->empty()) {
        return Napi::Boolean::New(env, false);
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

Napi::Value QDDVis::ToLine(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    //check if the correct parameters have been passed
    if(info.Length() != 1) {
        Napi::RangeError::New(env, "Need 1 (unsigned int) argument!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    if (!info[0].IsNumber()) {  //algorithm
        Napi::TypeError::New(env, "arg1: unsigned int expected!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    unsigned int param = (unsigned int)info[0].As<Napi::Number>();
    if(param > qc->getNops()) param = qc->getNops();    //we can't go further than to the end
    const unsigned int targetPos = param;
    std::cout << "TL = " << targetPos << std::endl;
    std::cout << "Pos [before] = " << position << std::endl;

    try {
        if(position == targetPos) return Napi::Boolean::New(env, false);   //nothing changed

        //only one of the two loops can be entered
        while(position > targetPos) stepBack();
        while(position < targetPos) stepForward();

        atInitial = false;
        atEnd = false;
        if(position == 0) atInitial = true;
        else if(position == qc->getNops()) atEnd = true;
        std::cout << "Pos [after] = " << position << std::endl;
        std::cout << "Nops = " << qc->getNops() << std::endl;

        return Napi::Boolean::New(env, true);   //something changed

    } catch(std::exception& e) {
        std::string msg = "Exception while going to line ";// + position + " to " + targetPos;
        //msg += position + " to " + targetPos;
        //msg.append(position);
        //msg.append(" to ");
        //msg.append(targetPos);
        std::cout << "Exception while going from " << position << " to " << targetPos << std::endl;
        std::cout << e.what() << std::endl;
        Napi::Error::New(env, msg).ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Napi::Value QDDVis::GetDD(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if(!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return Napi::String::New(env, "-1");
    } else if (qc->empty()) {
        return Napi::String::New(env, "");
    }

    std::stringstream ss{};
    try {
        dd->toDot2(sim, ss, true, false);
        std::string str = ss.str();
        return Napi::String::New(env, str);

    } catch(std::exception& e) {
        std::cout << "Exception while getting the DD: " << e.what() << std::endl;
        std::string err = "Invalid getDD()-call! ";// + e.what();
        Napi::Error::New(env, err).ThrowAsJavaScriptException();
        return Napi::String::New(env, "-1");
    }

}
