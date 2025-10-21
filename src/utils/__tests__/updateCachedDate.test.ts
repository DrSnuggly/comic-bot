import { comicData } from "@tests/utils/constants"
import { getCachedDates } from "@tests/utils/getCachedDates"
import { updateCachedDate } from "../updateCachedDate"

const nowDate = new Date("2025-09-15T00:00:00Z")

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(nowDate)
})
afterEach(() => vi.useRealTimers())

it("should set the current date as an ISO string", async () => {
  const webhook = comicData.webhookUrls[0]

  await updateCachedDate(webhook, comicData)
  const cache = await getCachedDates()

  expect(cache.size).toBe(1)
  for (const value of cache.values()) {
    expect(value).toMatchObject(nowDate)
  }
})
