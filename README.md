[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/workflow/status/cda-tum/ddvis/CI?style=flat-square&logo=github)](https://github.com/cda-tum/ddvis/actions/workflows/ci.yml)

# MQT DDVis
An installation-free web-tool by the [Institute for Integrated Circuits](http://iic.jku.at/eda/) at the [Johannes Kepler University Linz](https://jku.at) which visualizes quantum decision diagrams and allows to explore their behavior when used in design tasks such as simulation, synthesis, or verification. 
The tool is hosted online at [https://iic.jku.at/eda/research/quantum_dd/tool/](https://iic.jku.at/eda/research/quantum_dd/tool/).

MQT DDVis allows users to interactively learn how decision diagrams can be used in quantum computing, e.g., to

- compactly represent quantum states and efficiently simulate quantum circuits,
- compactly represent the functionality of quantum circuits,
- verify the equivalence of two circuits in an efficient fashion.

## Quickstart

To run DDVis locally, you will require a C++ compiler, CMake, Node.js, and NPM (probably still missing something).
The following commands will build the app and start it. Open your browser at `localhost:3000` to access the user interface.

```
$ git clone --recurse-submodules git@github.com:cda-tum/ddvis.git  
$ cd ddvis
ddvis $ npm install
ddvis $ npm run-script run
[...]
> node ./bin/www
```

(Tested under Ubuntu 20.04 with npm installed via `sudo snap install node`.)

## Contact


If you are interested in our research on either topic, visit [https://iic.jku.at/eda/research/quantum/](https://iic.jku.at/eda/research/quantum/). 

If you have any questions, feel free to contact us via [iic-quantum@jku.at](mailto:iic-quantum@jku.at) or by creating an issue on [GitHub](https://github.com/cda-tum/ddvis/issues).
