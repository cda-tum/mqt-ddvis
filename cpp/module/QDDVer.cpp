/*
 * This file is part of MQT DDVis library which is released under the MIT license.
 * See file README.md or go to http://iic.jku.at/eda/research/quantum/ for more information.
 */

#include "QDDVer.h"

#include "dd/Export.hpp"

Napi::Object QDDVer::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func =
            DefineClass(env,
                        "QDDVer",
                        {InstanceMethod("load", &QDDVer::Load),
                         InstanceMethod("toStart", &QDDVer::ToStart),
                         InstanceMethod("prev", &QDDVer::Prev),
                         InstanceMethod("next", &QDDVer::Next),
                         InstanceMethod("toEnd", &QDDVer::ToEnd),
                         InstanceMethod("toLine", &QDDVer::ToLine),
                         InstanceMethod("getDD", &QDDVer::GetDD),
                         InstanceMethod("updateExportOptions", &QDDVer::UpdateExportOptions),
                         InstanceMethod("getExportOptions", &QDDVer::GetExportOptions),
                         InstanceMethod("isReady", &QDDVer::IsReady),
                         InstanceMethod("unready", &QDDVer::Unready)});

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("QDDVer", func);
    return exports;
}

//constructor
/**Parameterless default constructor, just initializes variables
 *
 * @param info takes no parameters
 */
QDDVer::QDDVer(const Napi::CallbackInfo& info):
    Napi::ObjectWrap<QDDVer>(info) {
    Napi::Env         env = info.Env();
    Napi::HandleScope scope(env);

    this->dd = std::make_unique<dd::Package<>>(1);

    this->qc1       = std::make_unique<qc::QuantumComputation>();
    this->iterator1 = this->qc1->begin();
    this->position1 = 0;

    this->qc2       = std::make_unique<qc::QuantumComputation>();
    this->iterator2 = this->qc2->begin();
    this->position2 = 0;
}

/**Applies the current operation/DD (determined by iterator) and increments both iterator and position.
 * If iterator reaches its end, atEnd will be set to true.
 *
 * @param algo1 decides whether the function should be applied to algo1 or algo2.
 */
void QDDVer::stepForward(bool algo1) {
    if (algo1) {
        if (atEnd1) return;                          //no further steps possible
        const auto currDD = dd::getDD(iterator1->get(), dd); //retrieve the "new" current operation

        auto temp = dd->multiply(currDD, sim); //process the current operation by multiplying it with the previous simulation-state
        dd->incRef(temp);
        dd->decRef(sim);
        sim = temp;
        dd->garbageCollect();

        iterator1++; // advance iterator
        position1++;
        //qc1->end() is after the last operation in the iterator
        if (iterator1 == qc1->end()) atEnd1 = true;

    } else {
        if (atEnd2) return;                                 //no further steps possible
        const auto currDD = dd::getInverseDD(iterator2->get(), dd); //retrieve the inverse of the "new" current operation

        auto temp = dd->multiply(sim, currDD); //process the current operation by multiplying it with the previous simulation-state
        dd->incRef(temp);
        dd->decRef(sim);
        sim = temp;
        dd->garbageCollect();

        iterator2++; // advance iterator
        position2++;
        //qc2->end() is after the last operation in the iterator
        if (iterator2 == qc2->end()) atEnd2 = true;
    }
}

/**If either atInitial is true or the iterator is at the beginning, this method does nothing. In other cases it will
 * first decrement both position and iterator before applying the inverse of the operation/DD the iterator is then
 * pointing at.
 *
 * @param algo1 decides whether the function should be applied to algo1 or algo2.
 *
 */
void QDDVer::stepBack(bool algo1) {
    if (algo1) {
        if (atInitial1) return; //no step back possible

        if (iterator1 == qc1->begin()) {
            atInitial1 = true;
            return;
        }

        iterator1--; //set iterator back to the desired operation
        position1--;

        const auto currDD = dd::getInverseDD(iterator1->get(), dd); // get the inverse of the current operation

        auto temp = dd->multiply(currDD, sim); //"remove" the current operation by multiplying with its inverse
        dd->incRef(temp);
        dd->decRef(sim);
        sim = temp;
        dd->garbageCollect();

    } else {
        if (atInitial2) return; //no step back possible

        if (iterator2 == qc2->begin()) {
            atInitial2 = true;
            return;
        }

        iterator2--; //set iterator back to the desired operation
        position2--;

        const auto currDD = dd::getDD(iterator2->get(), dd); // get the current operation

        auto temp = dd->multiply(sim, currDD); //"remove" the current operation by multiplying with its inverse
        dd->incRef(temp);
        dd->decRef(sim);
        sim = temp;
        dd->garbageCollect();
    }
}

/**Removes all applied operations by taking steps back until atInitial is true.
 * atInitial will be true and in most cases atEnd will be false (special case for empty algorithms: atEnd is also true)
 * after this call.
 *
 * @param algo1 decides whether the function should be applied to algo1 or algo2.
 */
void QDDVer::stepToStart(bool algo1) {
    if (algo1) {
        //go one step back at a time until all operations have been reversed (atInitial is set to true in stepBack)
        while (!atInitial1) stepBack(true);
        //now atInitial is true, exactly as it should be
    } else {
        //go one step back at a time until all operations have been reversed (atInitial is set to true in stepBack)
        while (!atInitial2) stepBack(false);
        //now atInitial is true, exactly as it should be
    }
}

/**Parameters: String algorithm, unsigned int formatCode, unsigned int num of operations to step forward, bool whether the
 * operations should be processed or just the iterator needs to be advanced, whether we load algo1 or algo2
 * Returns: true or false
 *
 * Tries to import the passed algorithm and returns whether it was successful or not. Additionally some operations/DDs can
 * be applied or just the iterator advance forward without applying operations/DDs.
 */
Napi::Value QDDVer::Load(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    state.Set("numOfOperations", Napi::Number::New(env, -1));

    //check if the correct parameters have been passed
    if (info.Length() < 5) {
        Napi::RangeError::New(env, "Need 5 (String, unsigned int, unsigned int, bool, bool) arguments!").ThrowAsJavaScriptException();
        return state;
    }
    if (!info[0].IsString()) { //algorithm
        Napi::TypeError::New(env, "arg1: String expected!").ThrowAsJavaScriptException();
        return state;
    }
    if (!info[1].IsNumber()) { //format code (1 = QASM, 2 = Real)
        Napi::TypeError::New(env, "arg3: unsigned int expected!").ThrowAsJavaScriptException();
        return state;
    }
    if (!info[2].IsNumber()) { //number of operations to immediately process
        Napi::TypeError::New(env, "arg2: unsigned int expected!").ThrowAsJavaScriptException();
        return state;
    }
    if (!info[3].IsBoolean()) { //whether operations should be processed while advancing the iterator to opNum or not (true = new simulation; false = continue simulation)
        Napi::TypeError::New(env, "arg3: boolean expected!").ThrowAsJavaScriptException();
        return state;
    }
    if (!info[4].IsBoolean()) { //whether we load as algo1 (true) or algo2 (false)
        Napi::TypeError::New(env, "arg4: boolean expected!").ThrowAsJavaScriptException();
        return state;
    }

    //the first parameter (algorithm)
    auto              arg  = info[0].As<Napi::String>();
    const std::string algo = arg.Utf8Value();
    std::stringstream ss{algo};

    //the third parameter (how many operations to apply immediately)
    unsigned int opNum = static_cast<unsigned int>(info[2].As<Napi::Number>());
    //at this point opNum might be bigger than the number of operations the algorithm has!

    //the fourth parameter tells us to process iterated operations or not
    const bool process = static_cast<bool>(info[3].As<Napi::Boolean>());

    //the fifth parameter (algo1)
    bool algo1 = static_cast<bool>(info[4].As<Napi::Boolean>());

    try {
        //second parameter describes the format of the algorithm
        const unsigned int formatCode = static_cast<unsigned int>(info[1].As<Napi::Number>());
        qc::Format         format;
        if (formatCode == 1)
            format = qc::OpenQASM;
        else if (formatCode == 2)
            format = qc::Real;
        else {
            Napi::Error::New(env, "Invalid format-code!").ThrowAsJavaScriptException();
            return state;
        }

        if (algo1) {
            qc1->import(ss, format);
            //check if the number of qubits is the same for both algorithms
            if (ready2 && qc1->getNqubits() != qc2->getNqubits()) {
                //algo2 is already loaded (because ready2 is true), so we reset algo1
                qc1->reset();
                ready1 = false;
                std::stringstream msg;
                msg << "Number of qubits don't match! This algorithm needs " << qc2->getNqubits() << " qubits.";
                Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
                return state;
            }
        } else {
            qc2->import(ss, format);

            //check if the number of qubits is the same for both algorithms
            if (ready1 && qc1->getNqubits() != qc2->getNqubits()) {
                //algo1 is already loaded (because ready2 is true), so we reset algo2
                qc2->reset();
                ready2 = false;
                std::stringstream msg;
                msg << "Number of qubits don't match! This algorithm needs " << qc1->getNqubits() << " qubits.";
                Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
                return state;
            }
        }
        // resize the DD package so that it can manage the current circuit size
        dd->resize(qc1->getNqubits());
    } catch (std::exception& e) {
        std::cout << "Exception while loading the algorithm: " << e.what() << std::endl;
        std::string err(e.what());
        Napi::Error::New(env, "Invalid algorithm!\n" + err).ThrowAsJavaScriptException();
        return state;
    }

    //if sim hasn't been set yet or only one algorithm is loaded (meaning the other isn't ready), we create its initial state/matrix
    if (sim.p == nullptr || (algo1 && !ready2) || (!algo1 && !ready1)) {
        //sim = dd->makeZeroState(qc->getNqubits());
        if (algo1)
            sim = dd->createInitialMatrix(qc1->getNqubits(), qc1->ancillary);
        else
            sim = dd->createInitialMatrix(qc2->getNqubits(), qc2->ancillary);
        dd->incRef(sim);

    } else { //reset the previously loaded algorithm if process is true
        if (process) {
            try {
                if (algo1 && ready1)
                    stepToStart(true);
                else if (!algo1 && ready2)
                    stepToStart(false);
            } catch (std::exception& e) {
                std::cout << "Exception while resetting algo" << (algo1 ? "1" : "2") << e.what() << std::endl;
                std::string err(e.what());
                Napi::Error::New(env, "Something went wrong with resetting the old algorithm.\n"
                                      "Please try to load the algorithm again!" +
                                              err)
                        .ThrowAsJavaScriptException();
                return state;
            }
        }
    }

    //re-initialize some variables (though depending on opNum they might change in the next lines)
    if (algo1) {
        ready1     = true;
        atInitial1 = true;
        atEnd1     = false;
        iterator1  = qc1->begin();
        position1  = 0;
    } else {
        ready2     = true;
        atInitial2 = true;
        atEnd2     = false;
        iterator2  = qc2->begin();
        position2  = 0;
    }

    if (algo1 && opNum > qc1->getNops())
        opNum = qc1->getNops();
    else if (!algo1 && opNum > qc2->getNops())
        opNum = qc2->getNops();

    if (opNum > 0) {
        if (algo1)
            atInitial1 = false;
        else
            atInitial2 = false;
        if (process) {
            //apply some operations
            for (unsigned int i = 0; i < opNum; i++) stepForward(algo1);

        } else {
            if (algo1) {
                //just advance the iterator so it points to the operations where we stopped before the edit
                for (unsigned int i = 0; i < opNum; i++) iterator1++;
                position1 = opNum;
            } else {
                //just advance the iterator so it points to the operations where we stopped before the edit
                for (unsigned int i = 0; i < opNum; i++) iterator2++;
                position2 = opNum;
            }
        }
    }

    if (algo1)
        state.Set("numOfOperations", Napi::Number::New(env, static_cast<double>(qc1->getNops())));
    else
        state.Set("numOfOperations", Napi::Number::New(env, static_cast<double>(qc2->getNops())));
    return state;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**Removes all applied operations by taking steps back until atInitial is true.
 * atInitial will be true and in most cases atEnd will be false (special case for empty algorithms: atEnd is also true)
 * after this call.
 *
 * @param info whether the function should be applied to algo1 or algo2
 * @return true if the DD changed, false otherwise (nothing was done or an error occured)
 */
Napi::Value QDDVer::ToStart(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        Napi::RangeError::New(env, "Need 1 (bool) argument!").ThrowAsJavaScriptException();
    }
    if (!info[0].IsBoolean()) { //algo1
        Napi::TypeError::New(env, "arg1: Boolean expected!").ThrowAsJavaScriptException();
    }
    bool algo1 = (bool)info[0].As<Napi::Boolean>();

    if (algo1) {
        if (!ready1) {
            //Napi::Error::New(env, "No algorithm loaded as algo1!").ThrowAsJavaScriptException();
            std::cout << "not ready 1" << std::endl;
            return Napi::Boolean::New(env, false);
        } else if (qc1->empty()) {
            std::cout << "empty 2" << std::endl;
            return Napi::Boolean::New(env, false);
        } else if (atInitial1) {
            std::cout << "at initial 2" << std::endl;
            return Napi::Boolean::New(env, false); //nothing changed
        }

        atEnd1 = false; //now we are definitely not at the end (if there were no operation, so atInitial
        // and atEnd could be true at the same time, if(qc-empty) would already have returned

    } else {
        if (!ready2) {
            //Napi::Error::New(env, "No algorithm loaded as algo2!").ThrowAsJavaScriptException();
            std::cout << "not ready 2" << std::endl;
            return Napi::Boolean::New(env, false);
        } else if (qc2->empty()) {
            std::cout << "empty 2" << std::endl;
            return Napi::Boolean::New(env, false);
        } else if (atInitial2) {
            std::cout << "atInitial 2" << std::endl;
            return Napi::Boolean::New(env, false); //nothing changed
        }

        atEnd2 = false; //now we are definitely not at the end (if there were no operation, so atInitial
        // and atEnd could be true at the same time, if(qc-empty) would already have returned
    }

    try {
        stepToStart(algo1);
        return Napi::Boolean::New(env, true); //something changed

    } catch (std::exception& e) {
        std::cout << "Exception while going back to the start!" << std::endl;
        std::cout << e.what() << std::endl;
        return Napi::Boolean::New(env, false); //nothing changed
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**Goes back to the previous step of the simulation process by apllying the inverse of the last processed operation/DD.
 * If atInitial is true, nothing happens instead.
 * atEnd will be false and atInitial could end up being true, depending on the position.
 *
 * @param info whether the function should be applied to algo1 or algo2
 * @return true if the DD changed, false otherwise (nothing was done or an error occured)
 */
Napi::Value QDDVer::Prev(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    state.Set("changed", Napi::Boolean::New(env, false));

    if (info.Length() < 1) {
        Napi::RangeError::New(env, "Need 1 (bool) argument!").ThrowAsJavaScriptException();
        return state;
    }
    if (!info[0].IsBoolean()) { //algo1
        Napi::TypeError::New(env, "arg1: Boolean expected!").ThrowAsJavaScriptException();
        return state;
    }
    bool algo1 = (bool)info[0].As<Napi::Boolean>();

    if (algo1) {
        if (!ready1) {
            Napi::Error::New(env, "No algorithm loaded as algo1!").ThrowAsJavaScriptException();
            return state;
        } else if (qc1->empty()) {
            return state;
        }

        if (atEnd1) {
            atEnd1 = false;
        } else if (atInitial1) {
            return state; //we can't go any further back
        }
    } else {
        if (!ready2) {
            Napi::Error::New(env, "No algorithm loaded as algo2!").ThrowAsJavaScriptException();
            return state;
        } else if (qc2->empty()) {
            return state;
        }

        if (atEnd2) {
            atEnd2 = false;
        } else if (atInitial2) {
            return state; //we can't go any further back
        }
    }

    try {
        state.Set("changed", true); //something changed
        stepBack(algo1);            //go back to the start before the last processed operation

        return state;

    } catch (std::exception& e) {
        std::cout << "Exception while getting the current operation {src: prev}!" << e.what() << std::endl;
        std::cout << e.what() << std::endl;
        return state;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**Goes forward to the next step of the simulation process by applying the current operation/DD.
 * If atEnd is true, nothing happens instead.
 * atInitial will be false and atEnd could end up being true, depending on the position.
 *
 * @param info whether the function should be applied to algo1 or algo2
 * @return true if the DD changed, false otherwise (nothing was done or an error occured)
 */
Napi::Value QDDVer::Next(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    state.Set("changed", Napi::Boolean::New(env, false));
    state.Set("nextIsIrreversible", Napi::Boolean::New(env, false));

    if (info.Length() < 1) {
        Napi::RangeError::New(env, "Need 1 (bool) argument!").ThrowAsJavaScriptException();
        return state;
    }
    if (!info[0].IsBoolean()) { //algo1
        Napi::TypeError::New(env, "arg1: Boolean expected!").ThrowAsJavaScriptException();
        return state;
    }
    bool algo1 = (bool)info[0].As<Napi::Boolean>();

    if (algo1) {
        if (!ready1) {
            Napi::Error::New(env, "No algorithm loaded as algo1!").ThrowAsJavaScriptException();
            return state;
        } else if (qc1->empty()) {
            return state;
        }

        if (atInitial1) {
            atInitial1 = false;
        } else if (atEnd1) {
            return state;
        }
    } else {
        if (!ready2) {
            Napi::Error::New(env, "No algorithm loaded as algo2!").ThrowAsJavaScriptException();
            return state;
        } else if (qc2->empty()) {
            return state;
        }

        if (atInitial2) {
            atInitial2 = false;
        } else if (atEnd2) {
            return state;
        }
    }

    try {
        state.Set("changed", Napi::Boolean::New(env, true));
        stepForward(algo1); //process the next operation
        auto& iterator = algo1 ? iterator1 : iterator2;
        auto& qc       = algo1 ? qc1 : qc2;
        if (iterator != qc->end() && ((*iterator)->getType() == qc::Measure || (*iterator)->getType() == qc::Reset)) {
            state.Set("nextIsIrreversible", Napi::Boolean::New(env, true));
        }
        return state;

    } catch (std::exception& e) {
        std::cout << "Exception while getting the current operation {src: next}!" << std::endl;
        std::cout << e.what() << std::endl;
        return state;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**Processes all operations until the iterator points to the very end.
 * atEnd will be true and in most cases atInitial will be false (special case for empty algorithms: atInitial is also true)
 * after this call.
 *
 * @param info whether the function should be applied to algo1 or algo2
 * @return true if the DD changed, false otherwise (nothing was done or an error occured)
 */
Napi::Value QDDVer::ToEnd(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    state.Set("changed", Napi::Boolean::New(env, false));
    state.Set("nextIsIrreversible", Napi::Boolean::New(env, false));
    state.Set("barrier", Napi::Boolean::New(env, false));

    if (info.Length() < 1) {
        Napi::RangeError::New(env, "Need 1 (bool) argument!").ThrowAsJavaScriptException();
        return state;
    }
    if (!info[0].IsBoolean()) { //algo1
        Napi::TypeError::New(env, "arg1: Boolean expected!").ThrowAsJavaScriptException();
        return state;
    }
    bool algo1 = (bool)info[0].As<Napi::Boolean>();

    if (algo1) {
        if (!ready1) {
            Napi::Error::New(env, "No algorithm loaded as algo1!").ThrowAsJavaScriptException();
            return state;
        } else if (qc1->empty() || atEnd1) {
            return state;
        }
        atInitial1 = false; //now we are definitely not at the beginning (if there were no operation, so atInitial
        // and atEnd could be true at the same time, if(qc-empty) would already have returned

    } else {
        if (!ready2) {
            Napi::Error::New(env, "No algorithm loaded as algo2!").ThrowAsJavaScriptException();
            return state;
        } else if (qc2->empty() || atEnd2) {
            return state;
        }
        atInitial2 = false; //now we are definitely not at the beginning (if there were no operation, so atInitial
                            // and atEnd could be true at the same time, if(qc-empty) would already have returned
    }

    try {
        state.Set("changed", Napi::Boolean::New(env, true)); //something changed
        unsigned long long nops     = 0;
        auto&              iterator = algo1 ? iterator1 : iterator2;
        auto&              atEnd    = algo1 ? atEnd1 : atEnd2;
        while (!atEnd) {
            if ((*iterator)->getType() == qc::Measure || (*iterator)->getType() == qc::Reset) {
                state.Set("nextIsIrreversible", Napi::Boolean::New(env, true));
                break;
            } else if ((*iterator)->getType() == qc::Barrier) {
                ++nops;
                stepForward(algo1); //process the barrier
                state.Set("barrier", Napi::Boolean::New(env, true));
                break;
            } else {
                ++nops;
                stepForward(algo1); //process the next operation
            }
        }
        state.Set("nops", Napi::Number::New(env, static_cast<double>(nops)));
        return state;

    } catch (std::exception& e) {
        std::cout << "Exception while going to the end!" << std::endl;
        std::cout << e.what() << std::endl;
        return state;
    }
}

/**Depending on the current position of the iterator and the given parameter this function either applies inverse
 * operations/DDs like Prev or operations/DDs normally like Next.
 * atInitial and atEnd could be anything after this call.
 *
 * @param info takes two parameter
 *              int: determines to which position the iterator should point at after this call
 *              bool: whether the function should be applied to algo1 or algo2
 * @return true if the DD changed, false otherwise (nothing was done or an error occured)
 */
Napi::Value QDDVer::ToLine(const Napi::CallbackInfo& info) {
    Napi::Env         env = info.Env();
    Napi::HandleScope scope(env);

    //check if the correct parameters have been passed
    if (info.Length() < 2) {
        Napi::RangeError::New(env, "Need 2 (unsigned int, bool) arguments!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    if (!info[0].IsNumber()) { //line number/position
        Napi::TypeError::New(env, "arg1: unsigned int expected!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    if (!info[1].IsBoolean()) { //algo1
        Napi::TypeError::New(env, "arg1: Boolean expected!").ThrowAsJavaScriptException();
    }

    unsigned int param = (unsigned int)info[0].As<Napi::Number>();
    bool         algo1 = (bool)info[1].As<Napi::Boolean>();

    if (algo1) {
        if (param > qc1->getNops()) param = qc1->getNops(); //we can't go further than to the end
    } else {
        if (param > qc2->getNops()) param = qc2->getNops(); //we can't go further than to the end
    }
    const unsigned int targetPos = param;

    try {
        if (algo1) {
            if (position1 == targetPos) return Napi::Boolean::New(env, false); //nothing changed

            //only one of the two loops can be entered
            while (position1 > targetPos) stepBack(true);
            while (position1 < targetPos) stepForward(true);

            atInitial1 = false;
            atEnd1     = false;
            if (position1 == 0) atInitial1 = true;
            if (position1 == qc1->getNops()) atEnd1 = true;

        } else {
            if (position2 == targetPos) return Napi::Boolean::New(env, false); //nothing changed

            //only one of the two loops can be entered
            while (position2 > targetPos) stepBack(false);
            while (position2 < targetPos) stepForward(false);

            atInitial2 = false;
            atEnd2     = false;
            if (position2 == 0) atInitial2 = true;
            if (position2 == qc2->getNops()) atEnd2 = true;
        }

        return Napi::Boolean::New(env, true); //something changed

    } catch (std::exception& e) {
        std::string msg = "Exception while going to line "; // + position + " to " + targetPos;
        //msg += position + " to " + targetPos;
        //msg.append(position);
        //msg.append(" to ");
        //msg.append(targetPos);
        std::cout << "Exception while going from " << (algo1 ? position1 : position2) << " to " << targetPos << std::endl;
        std::cout << e.what() << std::endl;
        Napi::Error::New(env, msg).ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**Creates a DD in the .dot-format for the current state of the simulation.
 *
 * @param info has no parameters
 * @return a string describing the current state of the simulation as DD in the .dot-format
 */
Napi::Value QDDVer::GetDD(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    if (!ready1 && !ready2) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return Napi::String::New(env, "-1");
    }

    std::stringstream ss{};
    try {
        dd::toDot(sim, ss, this->showColors, this->showEdgeLabels, this->showClassic, false, this->usePolarCoordinates);
        std::string str = ss.str();
        state.Set("dot", Napi::String::New(env, str));
        state.Set("amplitudes", Napi::Float32Array::New(env, 0));
        return state;

    } catch (std::exception& e) {
        std::cout << "Exception while getting the DD: " << e.what() << std::endl;
        std::cout << "The values of the Flags are: " << this->showColors << ", " << this->showEdgeLabels << ", " << this->showClassic << ", " << this->usePolarCoordinates << std::endl;
        std::string err = "Invalid getDD()-call! "; // + e.what();
        Napi::Error::New(env, err).ThrowAsJavaScriptException();
        return Napi::String::New(env, "-1");
    }
}

/**Updates the three fields of this object that determine with which options the DD should be exported (on the next
 * GetDD-call).
 *
 * @param info has three boolean arguments (colored, edgeLabels, classic)
 */
void QDDVer::UpdateExportOptions(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    //check if the correct parameters have been passed
    if (info.Length() != 4) {
        Napi::RangeError::New(env, "Need 4 (bool, bool, bool, bool) arguments!").ThrowAsJavaScriptException();
        return;
    }
    if (!info[0].IsBoolean()) { //colored
        Napi::TypeError::New(env, "arg1: Boolean expected!").ThrowAsJavaScriptException();
        return;
    }
    if (!info[1].IsBoolean()) { //edgeLabels
        Napi::TypeError::New(env, "arg2: Boolean expected!").ThrowAsJavaScriptException();
        return;
    }
    if (!info[2].IsBoolean()) { //classic
        Napi::TypeError::New(env, "arg3: Boolean expected!").ThrowAsJavaScriptException();
        return;
    }
    if (!info[3].IsBoolean()) { //classic
        Napi::TypeError::New(env, "arg4: Boolean expected!").ThrowAsJavaScriptException();
        return;
    }

    this->showColors          = (bool)info[0].As<Napi::Boolean>();
    this->showEdgeLabels      = (bool)info[1].As<Napi::Boolean>();
    this->showClassic         = (bool)info[2].As<Napi::Boolean>();
    this->usePolarCoordinates = (bool)info[3].As<Napi::Boolean>();
}

Napi::Value QDDVer::GetExportOptions(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);

    state.Set("colored", this->showColors);
    state.Set("edgeLabels", this->showEdgeLabels);
    state.Set("classic", this->showClassic);
    state.Set("polar", this->usePolarCoordinates);
    return state;
}

/**
 *
 * @param info whether we want to know about algo1 or algo2
 * @return true if an algorithm has been loaded, false otherwise
 */
Napi::Value QDDVer::IsReady(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        //if no parameter is given, check if one of the two algos are ready, meaning a DD can be shown
        return Napi::Boolean::New(env, this->ready1 || this->ready2);
    }
    if (!info[0].IsBoolean()) { //algo1
        Napi::TypeError::New(env, "arg1: Boolean expected!").ThrowAsJavaScriptException();
    }
    bool algo1 = (bool)info[0].As<Napi::Boolean>();

    if (algo1)
        return Napi::Boolean::New(env, this->ready1);
    else
        return Napi::Boolean::New(env, this->ready2);
}

void QDDVer::Unready(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        //if no parameter is given, check if one of the two algos are ready, meaning a DD can be shown
        return;
    }
    if (!info[0].IsBoolean()) { //algo1
        Napi::TypeError::New(env, "arg1: Boolean expected!").ThrowAsJavaScriptException();
        return;
    }
    bool algo1 = (bool)info[0].As<Napi::Boolean>();

    if (algo1)
        this->ready1 = false;
    else
        this->ready2 = false;
}
