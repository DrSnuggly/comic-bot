import {
  createExecutionContext,
  createScheduledController,
  env,
  fetchMock,
  type Interceptable,
  waitOnExecutionContext,
} from "cloudflare:test"
import { comicData, comicUrl, feedUrl, origin } from "@tests/utils/constants"
import { fetchAsset } from "@tests/utils/fetchAsset"
import { afterEach, beforeAll, expect, it, vi } from "vitest"
import { KV_INDEX_KEY } from "../constants"
import worker from "../index"

let mockPool: Interceptable
beforeAll(() => {
  fetchMock.activate()
  fetchMock.disableNetConnect()
  mockPool = fetchMock.get(origin)
})
afterEach(() => fetchMock.assertNoPendingInterceptors())

it("should complete schedule successfully", async () => {
  const toSucceed = [comicData.webhooks[0], comicData.webhooks[2]]
  const toFail = [comicData.webhooks[1]]
  const { name: _, ...badComicData } = comicData
  const indexData = [badComicData, comicData]
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementationOnce(() => {})
    .mockImplementationOnce(() => {})

  // KV setup.
  await env.KV.put(KV_INDEX_KEY, JSON.stringify(indexData))
  // Fetch interceptors.
  const feedAsset = await fetchAsset("comic-feeds/standard.xml")
  const pageAsset = await fetchAsset("comic-pages/inline-alt-text.html")
  mockPool
    .intercept({ path: feedUrl.pathname })
    .reply(200, await feedAsset.text())
  mockPool
    .intercept({ path: comicUrl.pathname })
    .reply(200, await pageAsset.text())
  for (const webhook of toSucceed) {
    mockPool.intercept({ path: webhook, method: "post" }).reply(200)
  }
  for (const webhook of toFail) {
    mockPool.intercept({ path: webhook, method: "post" }).reply(400)
  }
  // Worker execution.
  const ctrl = createScheduledController({
    scheduledTime: new Date(),
    cron: "22 0-21/3 * * *",
  })
  const ctx = createExecutionContext()
  await worker.scheduled(ctrl, env, ctx)
  await waitOnExecutionContext(ctx)

  expect(consoleSpy).toHaveBeenCalledTimes(2)
})
