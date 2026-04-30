#!/usr/bin/env node

import { runProxy } from "../src/proxy.js";

const exitCode = await runProxy();
if (exitCode !== 0) {
  process.exitCode = exitCode;
}
