OPENQASM 2.0;
include "qelib1.inc";

// Consider the following 3-regular graph on 6 vertices:
//    0 -- 1
//   / \  / \
//  5 ----- 2
//   \ /  \ /
//    4 -- 3

qreg q[6];
creg c[6];

// initialize all qubits in |+> state
h q;
barrier q;

// apply controlled-Z operations for every edge
cz q[5], q[4];
cz q[5], q[2];
cz q[5], q[0];

cz q[4], q[3];
cz q[4], q[1];

cz q[3], q[2];
cz q[3], q[0];

cz q[2], q[1];

cz q[1], q[0];

measure q -> c;
