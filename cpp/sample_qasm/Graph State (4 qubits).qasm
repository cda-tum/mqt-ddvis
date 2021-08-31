OPENQASM 2.0;
include "qelib1.inc";

// Consider the only 3-regular graph on 4 vertices:
// 0 -- 1
// | >< |
// 2 -- 3

qreg q[4];
creg c[4];

// initialize all qubits in |+> state
h q;
barrier q;

// apply controlled-Z operations for every edge
cz q[3], q[2];
cz q[3], q[1];
cz q[3], q[0];
cz q[2], q[1];
cz q[2], q[0];
cz q[1], q[0];

measure q -> c;
