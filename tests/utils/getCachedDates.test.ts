import { env } from "cloudflare:test"
import { KV_INDEX_KEY } from "@src/constants"
import { updateCachedDate } from "@src/utils/updateCachedDate"
import { comicData } from "./constants"
import { getCachedDates } from "./getCachedDates"

it("should return empty map if nothing cached", async () => {
  const cachePromise = getCachedDates()

  await expect(cachePromise).resolves.toMatchObject({ size: 0 })
})

it("should parse and return cache", async () => {
  await Promise.all(
    comicData.webhookUrls.map((webhook) =>
      updateCachedDate(webhook, comicData),
    ),
  )
  const cachePromise = getCachedDates()

  await expect(cachePromise).resolves.toMatchObject({
    size: comicData.webhookUrls.length,
  })
})

it("should ignore index", async () => {
  const indexData = [comicData]

  await env.KV.put(KV_INDEX_KEY, JSON.stringify(indexData))
  await Promise.all(
    comicData.webhookUrls.map((webhook) =>
      updateCachedDate(webhook, comicData),
    ),
  )
  const cachePromise = getCachedDates()

  await expect(cachePromise).resolves.toMatchObject({
    size: comicData.webhookUrls.length,
  })
})
