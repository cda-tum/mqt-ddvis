OPENQASM 2.0;
include "qelib1.inc";

qreg q[4];
creg c[4];

// set input state, e.g., via
// x q[0];
// x q[1];
// x q[2];
// x q[3];

h q[3];
cs q[3],q[2];
ct q[3],q[1];
cp(pi/8) q[3],q[0];
barrier q;

h q[2];
cs q[2],q[1];
ct q[2],q[0];
barrier q;

h q[1];
cs q[1],q[0];
barrier q;

h q[0];
barrier q;

swap q[0], q[3];
swap q[1], q[2];

measure q -> c;
