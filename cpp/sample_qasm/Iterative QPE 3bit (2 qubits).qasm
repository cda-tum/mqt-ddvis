OPENQASM 2.0;
include "qelib1.inc";

// iteratively estimating the phase of U=p(3pi/8) with 3-bit precision
// we seek theta=3/16=0.0011_2, which is not exactly representable using 3 bits
// the best we can expect is high probabilities for 0.c_2 c_1 c_0 = 001 and 010

// counting register
qreg q[1];

// eigenstate register
qreg psi[1];

// classical registers
creg c[3];

// initialize eigenstate psi = |1>
x psi;
barrier psi;

// start by computing LSB c_0
h q;
cp(4 * (3*pi/8)) psi, q;
h q;
measure q[0] -> c[0];

// reset counting qubit and compute middle bit c_1
reset q;
h q;
cp(2 * (3*pi/8)) psi, q;
if (c == 1) p(-pi/2) q;
h q;
measure q[0] -> c[1];

// reset counting qubit and compute MSB c_2
reset q;
h q;
cp(1 * (3*pi/8)) psi, q;
if (c == 1) p(1 * -pi/4) q;
if (c == 2) p(2 * -pi/4) q;
if (c == 3) p(3 * -pi/4) q;
h q;
measure q[0] -> c[2];
