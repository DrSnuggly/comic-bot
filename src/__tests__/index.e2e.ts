import {
  createExecutionContext,
  createScheduledController,
  env,
  waitOnExecutionContext,
} from "cloudflare:test"
import { KV_INDEX_KEY } from "@src/constants"
import { inject } from "vitest"
import worker from "../index"

const webhook = inject("webhook")
const indexData = inject("indexData").map((item) => ({
  ...item,
  webhooks: [webhook],
}))

it("should process all configured comics", async () => {
  await env.KV.put(KV_INDEX_KEY, JSON.stringify(indexData))
  const ctrl = createScheduledController({
    scheduledTime: new Date(),
    cron: "22 0-21/3 * * *",
  })
  const ctx = createExecutionContext()

  const consoleSpy = vi.spyOn(console, "error")
  await worker.scheduled(ctrl, env, ctx)
  await waitOnExecutionContext(ctx)

  expect(consoleSpy).toHaveBeenCalledTimes(0)
})
