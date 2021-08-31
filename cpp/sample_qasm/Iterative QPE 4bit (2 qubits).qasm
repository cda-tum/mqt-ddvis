OPENQASM 2.0;
include "qelib1.inc";

// iteratively estimating the phase of U=p(3pi/8) with 4-bit precision
// we seek theta=3/16=0.0011_2, which is exactly representable using 4 bits
// thus we expect to measure 0.c_3 c_2 c_1 c_0 = 0011 with certainty

// counting register
qreg q[1];

// eigenstate register
qreg psi[1];

// classical registers
creg c[4];

// initialize eigenstate psi = |1>
x psi;
barrier psi;

// start by computing LSB c_0
h q;
cp(8 * (3*pi/8)) psi, q;
h q;
measure q[0] -> c[0];

// reset counting qubit and compute next bit c_1
reset q;
h q;
cp(4 * (3*pi/8)) psi, q;
if (c == 1) p(-pi/2) q;
h q;
measure q[0] -> c[1];

// reset counting qubit and compute next bit c_2
reset q;
h q;
cp(2 * (3*pi/8)) psi, q;
if (c == 1) p(1 * -pi/4) q;
if (c == 2) p(2 * -pi/4) q;
if (c == 3) p(3 * -pi/4) q;
h q;
measure q[0] -> c[2];

// reset counting qubit and compute MSB c_3
reset q;
h q;
cp(1 * (3*pi/8)) psi, q;
if (c == 1) p(1 * -pi/8) q;
if (c == 2) p(2 * -pi/8) q;
if (c == 3) p(3 * -pi/8) q;
if (c == 4) p(4 * -pi/8) q;
if (c == 5) p(5 * -pi/8) q;
if (c == 6) p(6 * -pi/8) q;
if (c == 7) p(7 * -pi/8) q;
h q;
measure q[0] -> c[3];
