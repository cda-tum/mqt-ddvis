OPENQASM 2.0;
include "qelib1.inc";

qreg q[3];
creg c[3];

// set input state, e.g., via
// x q[0];
// x q[1];
// x q[2];

h q[2];
cs q[1], q[2];
ct q[0], q[2];
barrier q;

h q[1];
cs q[0], q[1];
barrier q;

h q[0];
barrier q;

swap q[0],q[2];

measure q -> c;
