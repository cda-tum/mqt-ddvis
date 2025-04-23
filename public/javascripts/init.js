// Copyright (c) 2023 - 2025 Chair for Design Automation, TUM
// Copyright (c) 2025 Munich Quantum Software Company GmbH
// All rights reserved.
//
// SPDX-License-Identifier: MIT
//
// Licensed under the MIT License

//initializing in main doesn't work because these elements are not created at that point somehow
const settings_menu = document.getElementById("settings_menu");

const step_duration = $("#stepDuration");

const cb_colored = document.getElementById("cb_colored");
const cb_edge_labels = document.getElementById("cb_edge_labels");
const cb_classic = document.getElementById("cb_classic");
const cb_polar = document.getElementById("cb_polar");

const ex_algo_list = document.getElementById("ex_algo_list");
const ex_algo_ver_loading = document.getElementById("ex_algo_ver_loading");

const main_content = document.getElementById("main_content");
const reset_btn = document.getElementById("reset_btn");
