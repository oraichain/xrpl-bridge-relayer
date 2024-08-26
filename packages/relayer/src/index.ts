#!/usr/bin/env -S node --no-warnings

import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import relay from "./relayer";

yargs(hideBin(process.argv))
  .scriptName("xrplRelayer")
  .config("env", (path) => {
    return dotenv.config({ path }).parsed ?? {};
  })
  .default("env", ".env")
  .command("start", "start relay between Oraichain and XRPL", relay)
  .option("help", {
    alias: "h",
    demandOption: false,
  })
  .parse();
