OPENQASM 2.0;
include "qelib1.inc";

gate oracle q0, q1, q2, q3, flag {
    // mark target state |1111>
    mcphase(pi) q0, q1, q2, q3, flag;
}

gate diffusion q0, q1, q2, q3 {
    h q0; h q1; h q2; h q3;
    x q0; x q1; x q2; x q3;
    h q3;
    mcx q0, q1, q2, q3;
    h q3;
    x q3; x q2; x q1; x q0;
    h q3; h q2; h q1; h q0;
}

qreg q[4];
qreg flag[1];
creg c[4];

// initialization
h q;
x flag;
barrier q;

oracle q[0], q[1], q[2], q[3], flag;
diffusion q[0], q[1], q[2], q[3];
barrier q;
oracle q[0], q[1], q[2], q[3], flag;
diffusion q[0], q[1], q[2], q[3];
barrier q;
oracle q[0], q[1], q[2], q[3], flag;
diffusion q[0], q[1], q[2], q[3];

measure q -> c;
