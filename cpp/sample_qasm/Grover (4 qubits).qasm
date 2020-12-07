OPENQASM 2.0;
include "qelib1.inc";

gate oracle q0, q1, q2, flag {
    // mark target state |111>
    cccx q0, q1, q2, flag;
}

gate diffusion q0, q1, q2 {
    h q0; h q1; h q2;
    x q0; x q1; x q2;
    h q2;
    ccx q0, q1, q2;
    h q2;
    x q2; x q1; x q0;
    h q2; h q1; h q0;
}

qreg q[3];
qreg flag[1];
creg c[3];

// initialization
h q;
x flag;
h flag;
barrier q;

oracle q[0], q[1], q[2], flag;
diffusion q[0], q[1], q[2];
barrier q;
oracle q[0], q[1], q[2], flag;
diffusion q[0], q[1], q[2];

measure q -> c;
