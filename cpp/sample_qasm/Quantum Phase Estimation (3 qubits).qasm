OPENQASM 2.0;
include "qelib1.inc";

// estimating the phase of U=p(3pi/8) with 3-bit precision
// we seek theta=3/16=0.0011_2, which is not exactly representable using 3 bits
// the best we can expect is high probabilities for |1>*|001> and |1>*|010>

// counting registers
qreg q[3];

// eigenstate register
qreg psi[1];

// classical registers
creg c[3];

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
barrier q;

// apply inverse QFT to counting qubits
swap q[2], q[0];
h q[0];
cp(-pi/2) q[1], q[0];
h q[1];
cp(-pi/4) q[2], q[0];
cp(-pi/2) q[2], q[1];
h q[2];

// measure result
measure q -> c;
