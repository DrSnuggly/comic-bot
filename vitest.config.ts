// Separate file since test environment config differs from production.
/** biome-ignore-all lint/correctness/noProcessGlobal: runs in the Node.js environment */
/** biome-ignore-all lint/style/noProcessEnv: setup file */

import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config"
import tsconfigPaths from "vite-tsconfig-paths"
import { coverageConfigDefaults } from "vitest/config"

const e2ePattern = "**/*.e2e.?(c|m)[jt]s?(x)"

export default defineWorkersConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    // Make changes if testing end-to-end.
    ...(process.env.TEST_E2E
      ? {
          include: [e2ePattern],
          globalSetup: ["tests/e2e/globalSetup.ts"],
        }
      : {}),
    poolOptions: {
      singleWorker: true,
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          // Bind additional, test-only assets for use in tests.
          assets: { directory: "./tests/assets/", binding: "ASSETS" },
        },
      },
    },
    /*
     Leave disabled by default, will be enabled on-demand by the
     test:coverage script.
    */
    coverage: {
      /*
       Remove `tests` directory from exclusions, so utils tests can be included
       in coverage reports.
      */
      exclude: [
        ...coverageConfigDefaults.exclude.filter(
          (item) => item !== "test?(s)/**",
        ),
        e2ePattern,
        "tests/e2e/**",
      ],
      /*
       Though Workers run on v8, Cloudflare docs say to use istanbul coverage
       provider:
       https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#coverage
      */
      provider: "istanbul",
      all: true,
      reporter: ["json-summary", "json", "text"],
      reportOnFailure: true,
    },
  },
})
