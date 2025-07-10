[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/cda-tum/ddvis/ci.yml?branch=main&style=flat-square&logo=github&label=c%2B%2B)](https://github.com/cda-tum/ddvis/actions/workflows/ci.yml)

<p align="center">
  <a href="https://mqt.readthedocs.io">
   <picture>
     <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/munich-quantum-toolkit/.github/refs/heads/main/docs/_static/mqt-banner-dark.svg" width="90%">
     <img src="https://raw.githubusercontent.com/munich-quantum-toolkit/.github/refs/heads/main/docs/_static/mqt-banner-light.svg" width="90%" alt="MQT Banner">
   </picture>
  </a>
</p>

# MQT DDVis

An installation-free web-tool that visualizes quantum decision diagrams and allows to explore their behavior when used in design tasks such as simulation, synthesis, or verification developed as part of the [_Munich Quantum Toolkit (MQT)_](https://mqt.readthedocs.io) by the [Chair for Design Automation](https://www.cda.cit.tum.de/) at the [Technical University of Munich](https://www.tum.de/).
It builds upon [MQT Core](https://github.com/munich-quantum-toolkit/core), which forms the backbone of the MQT.

The tool is hosted online at [https://www.cda.cit.tum.de/app/ddvis/](https://www.cda.cit.tum.de/app/ddvis/).

MQT DDVis allows users to interactively learn how decision diagrams can be used in quantum computing, e.g., to

- compactly represent quantum states and efficiently simulate quantum circuits,
- compactly represent the functionality of quantum circuits,
- verify the equivalence of two circuits in an efficient fashion.

If you are interested in our research on either topic, visit [https://www.cda.cit.tum.de/research/quantum/](https://www.cda.cit.tum.de/research/quantum/).

If you have any questions, feel free to contact us via [quantum.cda@xcit.tum.de](mailto:quantum.cda@xcit.tum.de) or by creating an issue on [GitHub](https://github.com/munich-quantum-toolkit/ddvis/issues).

## Quickstart

To run DDVis locally, you will require a C++ compiler, CMake, Node.js, and NPM (probably still missing something).
The following commands will build the app and start it. Open your browser at `localhost:3000` to access the user interface.

```
$ git clone --recurse-submodules git@github.com:munich-quantum-toolkit/ddvis.git
$ cd mqt-ddvis
ddvis $ npm install
ddvis $ npm run-script build
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

---

## Acknowledgements

The Munich Quantum Toolkit has been supported by the European
Research Council (ERC) under the European Union's Horizon 2020 research and innovation program (grant agreement
No. 101001318), the Bavarian State Ministry for Science and Arts through the Distinguished Professorship Program, as well as the
Munich Quantum Valley, which is supported by the Bavarian state government with funds from the Hightech Agenda Bayern Plus.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/munich-quantum-toolkit/.github/refs/heads/main/docs/_static/mqt-funding-footer-dark.svg" width="90%">
    <img src="https://raw.githubusercontent.com/munich-quantum-toolkit/.github/refs/heads/main/docs/_static/mqt-funding-footer-light.svg" width="90%" alt="MQT Funding Footer">
  </picture>
</p>
