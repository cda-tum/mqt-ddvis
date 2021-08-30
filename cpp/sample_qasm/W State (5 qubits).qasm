OPENQASM 2.0;
include "qelib1.inc";

qreg q[5];
creg c[5];

// initialize topmost qubit to |1>
x q[4];
barrier q;

// split contributions with qubit 3 by rotating with angle arccos(sqrt(1/3))
ry(-1.10714871779409050) q[3];
cz q[4], q[3];
ry(1.10714871779409050) q[3];
barrier q;

// split contributions with qubit 2 by rotating with angle arccos(sqrt(1/4)) = pi/3
ry(-pi/3) q[2];
cz q[3], q[2];
ry(pi/3) q[2];
barrier q;

// split contributions with qubit 1 by rotating with angle arccos(sqrt(1/3))
ry(-0.95531661812450928) q[1];
cz q[2], q[1];
ry(0.95531661812450928) q[1];
barrier q;

// split contributions with qubit 0 by rotating with angle arccos(sqrt(1/2)) = pi/4
ry(-pi/4) q[0];
cz q[1], q[0];
ry(pi/4) q[0];
barrier q;

// apply CNOTs to obtain correct states
cx q[3], q[4];
cx q[2], q[3];
cx q[1], q[2];
cx q[0], q[1];

measure q[3] -> c[3];
measure q[2] -> c[2];
measure q[1] -> c[1];
measure q[0] -> c[0];
