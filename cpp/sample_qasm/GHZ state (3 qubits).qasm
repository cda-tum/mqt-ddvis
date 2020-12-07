OPENQASM 2.0;
include "qelib1.inc";

qreg q[3];
creg c[3];

h q[2];
cx q[2], q[1];
cx q[2], q[0];

measure q[2] -> c[2];
