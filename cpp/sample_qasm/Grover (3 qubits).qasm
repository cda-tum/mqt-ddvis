OPENQASM 2.0;
include "qelib1.inc";

qreg q[2];
qreg flag[1];
creg c[2];

// initialization
h q;
x flag;
h flag;
barrier q;

// oracle: mark target state |11>
ccx q[0], q[1], flag;
barrier q;

// diffusion
h q;
x q;
h q[1];
cx q[0], q[1];
h q[1];
x q;
h q;

measure q -> c;
