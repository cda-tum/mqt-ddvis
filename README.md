[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/workflow/status/cda-tum/ddvis/CI?style=flat-square&logo=github&label=c%2B%2B)](https://github.com/cda-tum/ddvis/actions/workflows/ci.yml)

# MQT DDVis
An installation-free web-tool developed by the Chair for Design Automation at the [Technical University of Munich](https://www.tum.de/) which visualizes quantum decision diagrams and allows to explore their behavior when used in design tasks such as simulation, synthesis, or verification. 

DDVis is part of the Munich Quantum Toolkit (MQT; formerly known as JKQ and developed by the [Institute for Integrated Circuits](https://iic.jku.at/eda/) at the [Johannes Kepler University Linz](https://jku.at)). 

It builds upon [our quantum functionality representation (QFR)](https://github.com/cda-tum/qfr)
and [our decision diagram (DD) package](https://github.com/cda-tum/dd_package.git).

The tool is hosted online at [https://www.cda.cit.tum.de/app/ddvis/](https://www.cda.cit.tum.de/app/ddvis/).

MQT DDVis allows users to interactively learn how decision diagrams can be used in quantum computing, e.g., to

- compactly represent quantum states and efficiently simulate quantum circuits,
- compactly represent the functionality of quantum circuits,
- verify the equivalence of two circuits in an efficient fashion.

If you are interested in our research on either topic, visit [https://www.cda.cit.tum.de/research/quantum/](https://www.cda.cit.tum.de/research/quantum/). 

If you have any questions, feel free to contact us via [quantum.cda@xcit.tum.de](mailto:quantum.cda@xcit.tum.de) or by creating an issue on [GitHub](https://github.com/cda-tum/ddvis/issues).

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

# Reference
If you use our tool for your research, we would appreciate if you refer to it by citing the following publication:
```
@inproceedings{willeVisualizingDecisionDiagrams2021,
    title = {Visualizing decision diagrams for quantum computing},
    booktitle = {Design, Automation and Test in Europe},
    author = {Wille, Robert and Burgholzer, Lukas and Artner, Michael},
    year = 2021
}
```