/*
 * This file is part of MQT DDVis library which is released under the MIT license.
 * See file README.md or go to http://iic.jku.at/eda/research/quantum/ for more information.
 */

#include "QDDVis.h"

#include "dd/Export.hpp"
#include "dd/Operations.hpp"

Napi::Object QDDVis::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func =
            DefineClass(env,
                        "QDDVis",
                        {InstanceMethod("load", &QDDVis::Load),
                         InstanceMethod("toStart", &QDDVis::ToStart),
                         InstanceMethod("prev", &QDDVis::Prev),
                         InstanceMethod("next", &QDDVis::Next),
                         InstanceMethod("toEnd", &QDDVis::ToEnd),
                         InstanceMethod("toLine", &QDDVis::ToLine),
                         InstanceMethod("getDD", &QDDVis::GetDD),
                         InstanceMethod("updateExportOptions", &QDDVis::UpdateExportOptions),
                         InstanceMethod("getExportOptions", &QDDVis::GetExportOptions),
                         InstanceMethod("isReady", &QDDVis::IsReady),
                         InstanceMethod("unready", &QDDVis::Unready),
                         InstanceMethod("conductIrreversibleOperation", &QDDVis::ConductIrreversibleOperation)});

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("QDDVis", func);
    return exports;
}

//constructor
/**Parameterless default constructor, just initializes variables
 *
 * @param info takes no parameters
 */
QDDVis::QDDVis(const Napi::CallbackInfo& info):
    Napi::ObjectWrap<QDDVis>(info) {
    Napi::Env         env = info.Env();
    Napi::HandleScope scope(env);

    this->dd = std::make_unique<dd::Package<>>(1);
    this->qc = std::make_unique<qc::QuantumComputation>();

    this->iterator = this->qc->begin();
    this->position = 0;
}

/**Applies the current operation/DD (determined by iterator) and increments both iterator and positoin.
 * If iterator reaches its end, atEnd will be set to true.
 *
 */
void QDDVis::stepForward() {
    if (atEnd) return; //no further steps possible
    qc::MatrixDD currDD{};
    if ((*iterator)->isClassicControlledOperation()) {
        auto startIndex    = static_cast<dd::Qubit>((*iterator)->getParameter().at(0));
        auto length        = static_cast<dd::QubitCount>((*iterator)->getParameter().at(1));
        auto expectedValue = static_cast<std::size_t>((*iterator)->getParameter().at(2));

        std::size_t value = 0;
        for (dd::QubitCount i = 0; i < length; ++i) {
            value |= (measurements[startIndex + i] << i);
        }

        if (value == expectedValue) {
            currDD = dd::getDD(iterator->get(), dd); //retrieve the "new" current operation
        } else {
            currDD = dd->makeIdent(qc->getNqubits());
        }
    } else {
        currDD = dd::getDD(iterator->get(), dd); //retrieve the "new" current operation
    }

    auto temp = dd->multiply(currDD, sim); //process the current operation by multiplying it with the previous simulation-state
    dd->incRef(temp);
    dd->decRef(sim);
    sim = temp;
    dd->garbageCollect();

    iterator++; // advance iterator
    position++;
    if (iterator == qc->end()) { //qc1->end() is after the last operation in the iterator
        atEnd = true;
    }
}

/**If either atInitial is true or the iterator is at the beginning, this method does nothing. In other cases it will
 * first decrement both position and iterator before applying the inverse of the operation/DD the iterator is then
 * pointing at.
 *
 */
void QDDVis::stepBack() {
    if (atInitial) return; //no step back possible

    if (iterator == qc->begin()) {
        atInitial = true;
        return;
    }

    iterator--; //set iterator back to the desired operation
    position--;

    qc::MatrixDD currDD{};
    if ((*iterator)->isClassicControlledOperation()) {
        auto startIndex    = static_cast<dd::Qubit>((*iterator)->getParameter().at(0));
        auto length        = static_cast<dd::QubitCount>((*iterator)->getParameter().at(1));
        auto expectedValue = static_cast<std::size_t>((*iterator)->getParameter().at(2));

        std::size_t value = 0;
        for (dd::QubitCount i = 0; i < length; ++i) {
            value |= (measurements[startIndex + i] << i);
        }

        if (value == expectedValue) {
            currDD = dd::getInverseDD(iterator->get(), dd); // get the inverse of the current operation
        } else {
            currDD = dd->makeIdent(qc->getNqubits());
        }
    } else {
        currDD = dd::getInverseDD(iterator->get(), dd); // get the inverse of the current operation
    }

    auto temp = dd->multiply(currDD, sim); //"remove" the current operation by multiplying with its inverse
    dd->incRef(temp);
    dd->decRef(sim);
    sim = temp;
    dd->garbageCollect();
}

void QDDVis::measureQubit(dd::Qubit qubitIdx, bool measureOne, dd::fp pzero, dd::fp pone) {
    dd::GateMatrix measure_m{{{0, 0}, {0, 0}, {0, 0}, {0, 0}}};

    dd::fp norm_factor{};

    if (!measureOne) {
        measure_m[0] = {1, 0};
        norm_factor  = pzero;
    } else {
        measure_m[3] = {1, 0};
        norm_factor  = pone;
    }
    dd::Edge m_gate = dd->makeGateDD(measure_m, qc->getNqubits(), qubitIdx);
    dd::Edge e      = dd->multiply(m_gate, sim);
    dd->decRef(sim);

    auto c = dd->cn.getCached(std::sqrt(1.0 / norm_factor), 0);
    dd::ComplexNumbers::mul(c, e.w, c);
    e.w = dd->cn.lookup(c);
    dd->incRef(e);
    sim = e;
}

void QDDVis::calculateAmplitudes(Napi::Float32Array& amplitudes) {
    for (std::size_t i = 0; i < 1ull << qc->getNqubits(); ++i) {
        auto result           = dd->getValueByPath(sim, i);
        amplitudes[2 * i]     = static_cast<float>(result.r);
        amplitudes[2 * i + 1] = static_cast<float>(result.i);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**Parameters: String algorithm, unsigned int formatCode, unsigned int num of operations to step forward, bool whether the
 * operations should be processed or just the iterator needs to be advanced
 * Returns: true or false 
 * 
 * Tries to import the passed algorithm and returns whether it was successful or not. Additionally some operations/DDs can
 * be applied or just the iterator advance forward without applying operations/DDs.
 */
Napi::Value QDDVis::Load(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    state.Set("numOfOperations", Napi::Number::New(env, -1));
    state.Set("nextIsIrreversible", Napi::Boolean::New(env, false));
    state.Set("noGoingBack", Napi::Boolean::New(env, false));

    //check if the correct parameters have been passed
    if (info.Length() < 4) {
        Napi::RangeError::New(env, "Need 4 (String, unsigned int, unsigned int, bool) arguments!").ThrowAsJavaScriptException();
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

    //the first parameter (algorithm)
    auto              arg  = info[0].As<Napi::String>();
    const std::string algo = arg.Utf8Value();
    std::stringstream ss{algo};

    try {
        //second parameter describes the format of the algorithm
        const unsigned int formatCode = (unsigned int)info[1].As<Napi::Number>();
        if (formatCode == 1)
            qc->import(ss, qc::Format::OpenQASM);
        else if (formatCode == 2)
            qc->import(ss, qc::Format::Real);
        else {
            Napi::Error::New(env, "Invalid format-code!").ThrowAsJavaScriptException();
            return state;
        }

    } catch (std::exception& e) {
        std::cout << "Exception while loading the algorithm: " << e.what() << std::endl;
        std::string err(e.what());
        Napi::Error::New(env, "Invalid algorithm!\n" + err).ThrowAsJavaScriptException();
        return state;
    }

    //re-initialize some variables (though depending on opNum they might change in the next lines)
    ready     = true;
    atInitial = true;
    atEnd     = false;
    iterator  = qc->begin();
    position  = 0;
    // resize the DD package so that it can hold as many variables
    dd->resize(qc->getNqubits());
    measurements.resize(qc->getNqubits());

    state.Set("numOfOperations", Napi::Number::New(env, static_cast<double>(qc->getNops())));

    //the third parameter (how many operations to apply immediately)
    unsigned int opNum = (unsigned int)info[2].As<Napi::Number>(); //at this point opNum may be bigger than the number of operations the algorithm has!
    if (opNum > qc->getNops()) opNum = qc->getNops();
    if (opNum > 0) {
        atInitial          = false;
        const bool process = (bool)info[3].As<Napi::Boolean>(); //the fourth parameter tells us to process iterated operations or not
        if (process) {
            if (sim.p != nullptr) {
                dd->decRef(sim);
            }
            sim = dd->makeZeroState(qc->getNqubits());
            dd->incRef(sim);

            for (unsigned int i = 0; i < opNum; i++) { //apply some operations
                stepForward();
            }
        } else {
            for (unsigned int i = 0; i < opNum; i++) {
                iterator++; //just advance the iterator so it points to the operations where we stopped before the edit
                position++;
            }
        }
        if (iterator != qc->end() && ((*iterator)->getType() == qc::Measure || (*iterator)->getType() == qc::Reset)) {
            state.Set("nextIsIrreversible", Napi::Boolean::New(env, true));
        }
        if (iterator != qc->begin()) {
            auto testForMeasureIt = iterator;
            --testForMeasureIt;
            if ((*testForMeasureIt)->getType() == qc::Measure || (*testForMeasureIt)->getType() == qc::Reset) {
                state.Set("noGoingBack", Napi::Boolean::New(env, true));
            }
        }

    } else { //sim needs to be initialized in some cases
        if (sim.p != nullptr) {
            dd->decRef(sim);
        }
        sim = dd->makeZeroState(qc->getNqubits());
        dd->incRef(sim);
    }
    return state;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**Sets the iterator and position back to the very beginning.
 * atInitial will be true and in most cases atEnd will be false (special case for empty algorithms: atEnd is also true)
 * after this call.
 *
 * @param info has no parameters
 * @return true if the DD changed, false otherwise (nothing was done or an error occured)
 */
Napi::Value QDDVis::ToStart(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    } else if (qc->empty()) {
        return Napi::Boolean::New(env, false);
    }

    if (atInitial)
        return Napi::Boolean::New(env, false); //nothing changed
    else {
        try {
            dd->decRef(sim);
            sim = dd->makeZeroState(qc->getNqubits());
            dd->incRef(sim);
            atInitial = true;
            atEnd     = false; //now we are definitely not at the end (if there were no operation, so atInitial and atEnd could be true at the same time, if(qc1-empty)
            // would already have returned
            iterator = qc->begin();
            position = 0;
            std::fill(measurements.begin(), measurements.end(), false);

            return Napi::Boolean::New(env, true); //something changed

        } catch (std::exception& e) {
            std::cout << "Exception while going back to the start!" << std::endl;
            std::cout << e.what() << std::endl;
            return Napi::Boolean::New(env, false); //nothing changed
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**Goes back to the previous step of the simulation process by applying the inverse of the last processed operation/DD.
 * If atInitial is true, nothing happens instead.
 * atEnd will be false (except when the last operation is irreversible).
 * atInitial could end up being true, depending on the position.
 *
 * @param info has no parameters
 * @return object with members
 * 			changed: true if the DD changed, false otherwise (nothing was done or an error occured)
 * 			noGoingBack: true if the previous operation now is an irreversible operation
 */
Napi::Value QDDVis::Prev(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    state.Set("changed", Napi::Boolean::New(env, false));
    state.Set("noGoingBack", Napi::Boolean::New(env, false));

    if (!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return state;
    } else if (qc->empty()) {
        return state;
    }

    if (atEnd) {
        atEnd = false;
    } else if (atInitial) {
        return state; //we can't go any further back
    }

    try {
        stepBack(); //go back to the start before the last processed operation
        state.Set("changed", Napi::Boolean::New(env, true));

        if (iterator != qc->begin()) {
            auto testForMeasureIt = iterator;
            --testForMeasureIt;
            if ((*testForMeasureIt)->getType() == qc::Measure || (*testForMeasureIt)->getType() == qc::Reset) {
                state.Set("noGoingBack", Napi::Boolean::New(env, true));
            }
        }

        return state; //something changed

    } catch (std::exception& e) {
        std::cout << "Exception while getting the current operation {src: prev}!" << std::endl;
        std::cout << e.what() << std::endl;
        return state;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**Goes forward to the next step of the simulation process by applying the current operation/DD.
 * If atEnd is true, nothing happens instead.
 * atInitial will be false and atEnd could end up being true, depending on the position.
 *
 * @param info has no parameters
 * @return object with members
 * 			changed: true if the DD changed, false otherwise (nothing was done or an error occured)
 * 			nextIsIrreversible: true if the following operation is irreversible
 * 			conductIrreversibleOperation: true if current operation is measurement or reset
 * 			parameter: object containing the measurement/reset parameters
 */
Napi::Value QDDVis::Next(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    state.Set("changed", Napi::Boolean::New(env, false));
    state.Set("conductIrreversibleOperation", Napi::Boolean::New(env, false));
    state.Set("nextIsIrreversible", Napi::Boolean::New(env, false));

    if (!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return state;
    } else if (qc->empty()) {
        return state;
    }

    if (atInitial) {
        atInitial = false;
    } else if (atEnd) {
        return state; //we can't go any further ahead
    }

    try {
        state.Set("changed", Napi::Boolean::New(env, true));

        if ((*iterator)->getType() == qc::Reset) {
            auto qubits        = (*iterator)->getTargets();
            auto totalResets   = qubits.size();
            auto qubitToReset  = qubits.front();
            auto qubitsReset   = 0;
            auto [pzero, pone] = dd->determineMeasurementProbabilities(sim, qubitToReset, true);

            Napi::Object reset = Napi::Object::New(env);
            reset.Set("qubit", Napi::Number::New(env, qubitToReset));
            reset.Set("pzero", Napi::Number::New(env, pzero));
            reset.Set("pone", Napi::Number::New(env, pone));
            reset.Set("count", Napi::Number::New(env, qubitsReset));
            reset.Set("total", Napi::Number::New(env, static_cast<double>(totalResets)));
            state.Set("parameter", reset);
            state.Set("conductIrreversibleOperation", Napi::Boolean::New(env, true));

            iterator++; // advance iterator
            position++;
            if (iterator == qc->end()) { //qc1->end() is after the last operation in the iterator
                atEnd = true;
            }
        } else if ((*iterator)->getType() == qc::Measure) {
            auto qubits            = (*iterator)->getTargets();
            auto cbits             = dynamic_cast<qc::NonUnitaryOperation*>(iterator->get())->getClassics();
            auto totalMeasurements = qubits.size();
            auto qubitToMeasure    = qubits.front();
            auto cbitToStore       = cbits.front();
            auto qubitsMeasured    = 0;
            auto [pzero, pone]     = dd->determineMeasurementProbabilities(sim, qubitToMeasure, true);

            Napi::Object measurement = Napi::Object::New(env);
            measurement.Set("qubit", Napi::Number::New(env, qubitToMeasure));
            measurement.Set("pzero", Napi::Number::New(env, pzero));
            measurement.Set("pone", Napi::Number::New(env, pone));
            measurement.Set("cbit", Napi::Number::New(env, static_cast<double>(cbitToStore)));
            measurement.Set("count", Napi::Number::New(env, qubitsMeasured));
            measurement.Set("total", Napi::Number::New(env, static_cast<double>(totalMeasurements)));
            state.Set("parameter", measurement);
            state.Set("conductIrreversibleOperation", Napi::Boolean::New(env, true));

            iterator++; // advance iterator
            position++;
            if (iterator == qc->end()) { //qc1->end() is after the last operation in the iterator
                atEnd = true;
            }
        } else {
            stepForward(); //process the next operation
        }

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
/**Processes all operations until the iterator points to the very end, a barrier or an irreversible operation is reached.
 *
 *
 * @param info has no parameters
 * @return object with members
 * 			changed: true if the DD changed, false otherwise (nothing was done or an error occured)
 * 			nextIsIrreversible: true if the following operation is irreversible
 * 			barrier: true if a barrier was encountered
 */
Napi::Value QDDVis::ToEnd(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    state.Set("changed", Napi::Boolean::New(env, false));
    state.Set("nextIsIrreversible", Napi::Boolean::New(env, false));
    state.Set("barrier", Napi::Boolean::New(env, false));

    if (!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return state;
    } else if (qc->empty()) {
        return state;
    }

    if (atEnd)
        return state; //nothing changed
    else {
        atInitial = false; //now we are definitely not at the beginning (if there were no operation, so atInitial and atEnd could be true at the same time, if(qc1-empty)
        // would already have returned
        try {
            state.Set("changed", Napi::Boolean::New(env, true));
            unsigned long long nops = 0;
            while (!atEnd) {
                if ((*iterator)->getType() == qc::Measure || (*iterator)->getType() == qc::Reset) {
                    state.Set("nextIsIrreversible", Napi::Boolean::New(env, true));
                    break;
                } else if ((*iterator)->getType() == qc::Barrier) {
                    ++nops;
                    stepForward(); //process the barrier
                    state.Set("barrier", Napi::Boolean::New(env, true));
                    break;
                } else {
                    ++nops;
                    stepForward(); //process the next operation
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
}

/**Depending on the current position of the iterator and the given parameter this function either applies inverse
 * operations/DDs like Prev or operations/DDs normally like Next.
 * atInitial and atEnd could be anything after this call.
 *
 * @param info takes one parameter that determines to which position the iterator should point at after this call
 * @return true if the DD changed, false otherwise (nothing was done or an error occured)
 */
Napi::Value QDDVis::ToLine(const Napi::CallbackInfo& info) {
    Napi::Env         env = info.Env();
    Napi::HandleScope scope(env);
    Napi::Object      state = Napi::Object::New(env);
    state.Set("changed", Napi::Boolean::New(env, false));
    state.Set("noGoingBack", Napi::Boolean::New(env, false));
    state.Set("nextIsIrreversible", Napi::Boolean::New(env, false));
    state.Set("reset", Napi::Boolean::New(env, false));

    //check if the correct parameters have been passed
    if (info.Length() < 1) {
        Napi::RangeError::New(env, "Need 1 (unsigned int) argument!").ThrowAsJavaScriptException();
        return state;
    }
    if (!info[0].IsNumber()) { //line number/position
        Napi::TypeError::New(env, "arg1: unsigned int expected!").ThrowAsJavaScriptException();
        return state;
    }

    unsigned int param = (unsigned int)info[0].As<Napi::Number>();
    if (param > qc->getNops()) param = qc->getNops(); //we can't go further than to the end
    const unsigned int targetPos = param;

    try {
        if (iterator != qc->begin()) {
            auto testForMeasureIt = iterator;
            --testForMeasureIt;
            if ((*testForMeasureIt)->getType() == qc::Measure || (*testForMeasureIt)->getType() == qc::Reset) {
                state.Set("noGoingBack", Napi::Boolean::New(env, true));
            }
        }
        if (iterator != qc->end() && ((*iterator)->getType() == qc::Measure || (*iterator)->getType() == qc::Reset)) {
            state.Set("nextIsIrreversible", Napi::Boolean::New(env, true));
        }
        if (position == targetPos) return state; //nothing changed

        unsigned long long nops = 0;
        if (targetPos < position) {
            unsigned int distanceFromPosition = position - targetPos;
            // if target position is closer to start as to current position computation can be restarted
            if (targetPos < distanceFromPosition) {
                state.Set("reset", Napi::Boolean::New(env, true));
                state.Set("changed", Napi::Boolean::New(env, true));
                state.Set("nextIsIrreversible", Napi::Boolean::New(env, false));
                state.Set("noGoingBack", Napi::Boolean::New(env, true));

                dd->decRef(sim);
                sim = dd->makeZeroState(qc->getNqubits());
                dd->incRef(sim);
                atInitial = true;
                atEnd     = false;
                iterator  = qc->begin();
                position  = 0;
                std::fill(measurements.begin(), measurements.end(), false);
                if ((*iterator)->getType() == qc::Measure || (*iterator)->getType() == qc::Reset) {
                    state.Set("nextIsIrreversible", Napi::Boolean::New(env, true));
                }
            } else {
                state.Set("noGoingBack", Napi::Boolean::New(env, false));
                while (position > targetPos) {
                    auto testForMeasureIt = iterator;
                    --testForMeasureIt;
                    if ((*testForMeasureIt)->getType() == qc::Measure || (*testForMeasureIt)->getType() == qc::Reset) {
                        state.Set("noGoingBack", Napi::Boolean::New(env, true));
                        break;
                    }
                    ++nops;
                    stepBack();
                    state.Set("changed", Napi::Boolean::New(env, true));
                    state.Set("nextIsIrreversible", Napi::Boolean::New(env, false));
                }
            }
        }

        while (position < targetPos) {
            if ((*iterator)->getType() == qc::Measure || (*iterator)->getType() == qc::Reset) {
                state.Set("nextIsIrreversible", Napi::Boolean::New(env, true));
                break;
            } else {
                ++nops;
                stepForward(); //process the next operation
            }
            state.Set("changed", Napi::Boolean::New(env, true));
            state.Set("noGoingBack", Napi::Boolean::New(env, false));
        }
        state.Set("nops", Napi::Number::New(env, static_cast<double>(nops)));

        atInitial = false;
        atEnd     = false;
        if (position == 0)
            atInitial = true;
        else if (position == qc->getNops())
            atEnd = true;

        return state; //something changed

    } catch (std::exception& e) {
        std::string msg = "Exception while going to line "; // + position + " to " + targetPos;
        //msg += position + " to " + targetPos;
        //msg.append(position);
        //msg.append(" to ");
        //msg.append(targetPos);
        std::cout << "Exception while going from " << position << " to " << targetPos << std::endl;
        std::cout << e.what() << std::endl;
        Napi::Error::New(env, msg).ThrowAsJavaScriptException();
        return state;
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**Creates a DD in the .dot-format for the current state of the simulation.
 *
 * @param info has no parameters
 * @return a string describing the current state of the simulation as DD in the .dot-format
 */
Napi::Value QDDVis::GetDD(const Napi::CallbackInfo& info) {
    Napi::Env    env   = info.Env();
    Napi::Object state = Napi::Object::New(env);
    if (!ready) {
        Napi::Error::New(env, "No algorithm loaded!").ThrowAsJavaScriptException();
        return Napi::String::New(env, "-1");
    }

    std::stringstream ss{};
    try {
        dd::toDot(sim, ss, this->showColors, this->showEdgeLabels, this->showClassic, false, this->usePolarCoordinates);
        std::string str = ss.str();
        state.Set("dot", Napi::String::New(env, str));
        state.Set("amplitudes", Napi::Float32Array::New(env, 0));
        if (qc->getNqubits() <= MAX_QUBITS_FOR_AMPLITUDES) {
            auto amplitudes = Napi::Float32Array::New(env, 1ull << (qc->getNqubits() + 1));
            calculateAmplitudes(amplitudes);
            state.Set("amplitudes", amplitudes);
        }
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
void QDDVis::UpdateExportOptions(const Napi::CallbackInfo& info) {
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

Napi::Value QDDVis::GetExportOptions(const Napi::CallbackInfo& info) {
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
 * @param info has no parameters
 * @return value of the field isReady (true meaning an algorithm has been successfully loaded)
 */
Napi::Value QDDVis::IsReady(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(env, this->ready);
}

void QDDVis::Unready([[maybe_unused]] const Napi::CallbackInfo& info) {
    this->ready = false;
}

Napi::Value QDDVis::ConductIrreversibleOperation(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        Napi::RangeError::New(env, "Need 1 Object(int, double, double, string, int, int, (int)) argument!").ThrowAsJavaScriptException();
    }
    if (!info[0].IsObject()) {
        Napi::TypeError::New(env, "Need 1 Object(int, double, double, string, int, int, (int)) argument!").ThrowAsJavaScriptException();
    }
    const auto obj = info[0].ToObject();
    if (!obj.Has("qubit")) {
        Napi::TypeError::New(env, "Expected qubit").ThrowAsJavaScriptException();
    } else if (!obj.Get("qubit").IsNumber()) {
        Napi::TypeError::New(env, "qubit: Number expected!").ThrowAsJavaScriptException();
    }

    if (!obj.Has("pzero")) {
        Napi::TypeError::New(env, "Expected probability for 0").ThrowAsJavaScriptException();
    } else if (!obj.Get("pzero").IsNumber()) {
        Napi::TypeError::New(env, "pzero: Number expected!").ThrowAsJavaScriptException();
    }

    if (!obj.Has("pone")) {
        Napi::TypeError::New(env, "Expected probability for 1").ThrowAsJavaScriptException();
    } else if (!obj.Get("pone").IsNumber()) {
        Napi::TypeError::New(env, "pone: Number expected!").ThrowAsJavaScriptException();
    }

    if (!obj.Has("classicalValueToMeasure")) {
        Napi::TypeError::New(env, "Expected desired outcome").ThrowAsJavaScriptException();
    } else if (!obj.Get("classicalValueToMeasure").IsString()) {
        Napi::TypeError::New(env, "classicalValueToMeasure: String expected!").ThrowAsJavaScriptException();
    }

    if (!obj.Has("count")) {
        Napi::TypeError::New(env, "Expected qubits already measured").ThrowAsJavaScriptException();
    } else if (!obj.Get("count").IsNumber()) {
        Napi::TypeError::New(env, "count: Number expected!").ThrowAsJavaScriptException();
    }

    if (!obj.Has("total")) {
        Napi::TypeError::New(env, "Expected total qubits to measure").ThrowAsJavaScriptException();
    } else if (!obj.Get("total").IsNumber()) {
        Napi::TypeError::New(env, "total: Number expected!").ThrowAsJavaScriptException();
    }

    auto qubit                   = static_cast<dd::Qubit>(obj.Get("qubit").As<Napi::Number>().Int64Value());
    auto pzero                   = obj.Get("pzero").As<Napi::Number>().DoubleValue();
    auto pone                    = obj.Get("pone").As<Napi::Number>().DoubleValue();
    auto classicalValueToMeasure = obj.Get("classicalValueToMeasure").As<Napi::String>().Utf8Value();
    auto count                   = obj.Get("count").As<Napi::Number>().Int64Value();
    auto total                   = obj.Get("total").As<Napi::Number>().Int64Value();

    bool isReset = false;
    if (!obj.Has("cbit")) {
        isReset = true;
    } else if (!obj.Get("cbit").IsNumber()) {
        Napi::TypeError::New(env, "cbit: Number expected!").ThrowAsJavaScriptException();
    }

    // return value
    Napi::Object state = Napi::Object::New(env);
    state.Set("finished", Napi::Boolean::New(env, false));
    Napi::Object parameter = Napi::Object::New(env);

    if (isReset) {
        // reset operation
        if (classicalValueToMeasure == "0") {
            measureQubit(qubit, false, pzero, pone);
        } else if (classicalValueToMeasure == "1") {
            measureQubit(qubit, true, pzero, pone);
            //apply x operation to reset to |0>
            const auto x   = qc::StandardOperation(qc->getNqubits(), qubit, qc::X);
            auto       tmp = dd->multiply(dd::getDD(&x, dd), sim);
            dd->incRef(tmp);
            dd->decRef(sim);
            sim = tmp;

            dd->garbageCollect();
        } else {
            // do something in case operation is cancelled
        }
    } else {
        // get target classical bit
        auto cbit = obj.Get("cbit").As<Napi::Number>().Int64Value();
        if (classicalValueToMeasure != "none") {
            bool measureOne = (classicalValueToMeasure == "1");
            measureQubit(qubit, measureOne, pzero, pone);
            measurements[cbit] = measureOne;
        }
        cbit++;
        parameter.Set("cbit", Napi::Number::New(env, static_cast<double>(cbit)));
    }

    count++;
    if (count == total) {
        state.Set("finished", Napi::Boolean::New(env, true));
        return state;
    }

    // next qubit
    qubit++;
    std::tie(pzero, pone) = dd->determineMeasurementProbabilities(sim, qubit, true);

    parameter.Set("qubit", Napi::Number::New(env, qubit));
    parameter.Set("pzero", Napi::Number::New(env, pzero));
    parameter.Set("pone", Napi::Number::New(env, pone));
    parameter.Set("count", Napi::Number::New(env, static_cast<double>(count)));
    parameter.Set("total", Napi::Number::New(env, static_cast<double>(total)));
    state.Set("parameter", parameter);

    return state;
}
