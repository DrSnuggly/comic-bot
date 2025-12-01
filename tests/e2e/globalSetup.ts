/** biome-ignore-all lint/correctness/noProcessGlobal: executes in Node.js environment */
/** biome-ignore-all lint/style/noProcessEnv: config file */

import dotenv from "dotenv"
import type { TestProject } from "vitest/node"
import { z } from "zod"
import indexData from "./comics.json" with { type: "json" }

const WEBHOOK = z
  .url("WEBHOOK env var is not a URL. Did you set it in your local .env file?")
  .parse(dotenv.config({}).parsed?.WEBHOOK)

// noinspection JSUnusedGlobalSymbols
export default function setup(project: TestProject) {
  project.provide("webhook", WEBHOOK)
  project.provide("indexData", indexData)
}
