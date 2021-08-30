OPENQASM 2.0;
include "qelib1.inc";

// estimating the phase of U=p(3pi/8) with 4-bit precision
// we seek theta=3/16=0.0011_2, which is exactly representable using 4 bits
// thus we expect to obtain |1> * |0011> with certainty

// counting registers
qreg q[4];

// eigenstate register
qreg psi[1];

// classical registers
creg c[4];

// initialize eigenstate psi = |1>
x psi;
barrier psi;

// initialise counting register to |+...+>
h q;
barrier q;

// apply successive controlled rotations
cp(1 * (3*pi/8)) psi, q[0];
cp(2 * (3*pi/8)) psi, q[1];
cp(4 * (3*pi/8)) psi, q[2];
cp(8 * (3*pi/8)) psi, q[3];
barrier q;

// apply inverse QFT to counting qubits
swap q[3], q[0];
swap q[2], q[1];
h q[0];
cp(-pi/2) q[1], q[0];
h q[1];
cp(-pi/4) q[2], q[0];
cp(-pi/2) q[2], q[1];
h q[2];
cp(-pi/8) q[3], q[0];
cp(-pi/4) q[3], q[1];
cp(-pi/2) q[3], q[2];
h q[3];

// measure result
measure q[3] -> c[3];
measure q[2] -> c[2];
measure q[1] -> c[1];
measure q[0] -> c[0];
