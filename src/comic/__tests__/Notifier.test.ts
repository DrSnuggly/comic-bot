import { fetchMock, type Interceptable } from "cloudflare:test"
import { comicData, origin } from "@tests/utils/constants"
import { fetchAsset } from "@tests/utils/fetchAsset"
import { getCachedDates } from "@tests/utils/getCachedDates"
import { updateCachedDate } from "../../utils/updateCachedDate"
import { Feed, type FeedData } from "../Feed"
import { type Data, Notifier, NotifierError } from "../Notifier"
import { Page, type PageData } from "../Page"

const nowDate = new Date("2025-09-15T00:00:00Z")
const hourAgoDate = new Date("2025-09-14T23:00:00Z")
const weekAgoDate = new Date("2025-09-08T00:00:00Z")

let mockPool: Interceptable
let rewriter: HTMLRewriter
let feed: FeedData
let page: PageData
let data: Data
beforeAll(async () => {
  rewriter = new HTMLRewriter()
  fetchMock.activate()
  fetchMock.disableNetConnect()
  mockPool = fetchMock.get(origin)
  feed = await Feed.fromResponse(
    await fetchAsset("comic-feeds/standard.xml"),
    comicData,
  )
  page = await Page.fromResponse(
    await fetchAsset("comic-pages/inline-alt-text.html"),
    comicData,
    rewriter,
  )
  data = { feed, page }
})
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(nowDate)
})
afterEach(() => {
  // Config
  vi.useRealTimers()
  // Assertions
  fetchMock.assertNoPendingInterceptors()
})

describe("targeting", () => {
  it("should reject if no configured webhooks", async () => {
    const testComic = { ...comicData, webhookUrls: [] }

    const notifier = Notifier.fromData(data, testComic)

    await expect(notifier).rejects.instanceof(NotifierError)
  })

  it("should target all webhooks on first run", async () => {
    const targets = Notifier.fromData(data, comicData).then(
      (notifier) => notifier.targets,
    )

    await expect(targets).resolves.toEqual(comicData.webhookUrls)
  })

  it("should target all webhooks if all outdated", async () => {
    vi.setSystemTime(weekAgoDate)
    await Promise.all(
      comicData.webhookUrls.map((webhook) =>
        updateCachedDate(webhook, comicData),
      ),
    )
    vi.setSystemTime(nowDate)
    const targets = Notifier.fromData(data, comicData).then(
      (notifier) => notifier.targets,
    )

    await expect(targets).resolves.toEqual(comicData.webhookUrls)
  })

  it("should target only outdated webhooks", async () => {
    const toTarget = [comicData.webhookUrls[0], comicData.webhookUrls[2]]
    const toIgnore = [comicData.webhookUrls[1]]

    vi.setSystemTime(weekAgoDate)
    await Promise.all(
      toTarget.map((webhook) => updateCachedDate(webhook, comicData)),
    )
    vi.setSystemTime(hourAgoDate)
    await Promise.all(
      toIgnore.map((webhook) => updateCachedDate(webhook, comicData)),
    )
    vi.setSystemTime(nowDate)
    const targets = Notifier.fromData(data, comicData).then(
      (notifier) => notifier.targets,
    )

    await expect(targets).resolves.toEqual(toTarget)
  })

  it("should target nothing if all up-to-date", async () => {
    vi.setSystemTime(hourAgoDate)
    await Promise.all(
      comicData.webhookUrls.map((webhook) =>
        updateCachedDate(webhook, comicData),
      ),
    )
    vi.setSystemTime(nowDate)
    const targets = Notifier.fromData(data, comicData).then(
      (notifier) => notifier.targets,
    )

    await expect(targets).resolves.toEqual([])
  })
})

describe("embeds", () => {
  it("should include alt-text embed if present", () => {
    const notifier = new Notifier(comicData.webhookUrls, feed, page, comicData)

    expect(notifier.embeds).toMatchSnapshot()
  })

  it("should not include alt-text embed if missing", () => {
    const testPage: PageData = { imageUri: page.imageUri }
    const notifier = new Notifier(
      comicData.webhookUrls,
      feed,
      testPage,
      comicData,
    )

    expect(notifier.embeds).toMatchSnapshot()
  })
})

describe("sending", () => {
  it("should send embeds as body", async () => {
    const notifier = new Notifier(comicData.webhookUrls, feed, page, comicData)
    const embeds = notifier.embeds

    for (const webhook of comicData.webhookUrls) {
      mockPool
        .intercept({
          path: webhook,
          method: "post",
          body: (body) => {
            expect(JSON.parse(body)).toMatchObject({ embeds })
            return true
          },
        })
        .reply(200)
    }

    await expect(notifier.send()).resolves.toBe(undefined)
  })

  it("should only send to targets", async () => {
    const toTarget = [comicData.webhookUrls[0], comicData.webhookUrls[2]]
    const notifier = new Notifier(toTarget, feed, page, comicData)

    for (const webhook of toTarget) {
      mockPool.intercept({ path: webhook, method: "post" }).reply(200)
    }

    await expect(notifier.send()).resolves.toBe(undefined)
  })

  it("should update cached dates", async () => {
    const notifier = new Notifier(comicData.webhookUrls, feed, page, comicData)

    for (const webhook of comicData.webhookUrls) {
      mockPool.intercept({ path: webhook, method: "post" }).reply(200)
    }

    await expect(notifier.send()).resolves.toBe(undefined)
    const cache = await getCachedDates()
    expect(cache.size).toBe(comicData.webhookUrls.length)
    for (const value of cache.values()) {
      expect(value).toEqual(nowDate)
    }
  })

  it("should re-throw request failures", async () => {
    const notifier = new Notifier(comicData.webhookUrls, feed, page, comicData)

    for (const webhook of comicData.webhookUrls) {
      mockPool.intercept({ path: webhook, method: "post" }).reply(400)
    }

    await expect(notifier.send()).rejects.toMatchObject(
      comicData.webhookUrls.map(() => expect.any(NotifierError)),
    )
  })

  it("should only update cached dates if request is ok", async () => {
    const toSucceed = [comicData.webhookUrls[0], comicData.webhookUrls[2]]
    const toFail = [comicData.webhookUrls[1]]
    const notifier = new Notifier(comicData.webhookUrls, feed, page, comicData)

    for (const webhook of toSucceed) {
      mockPool.intercept({ path: webhook, method: "post" }).reply(200)
    }
    for (const webhook of toFail) {
      mockPool.intercept({ path: webhook, method: "post" }).reply(400)
    }

    await expect(notifier.send()).rejects.toMatchObject([
      expect.any(NotifierError),
    ])
    const cache = await getCachedDates()
    expect(cache.size).toBe(toSucceed.length)
    for (const value of cache.values()) {
      expect(value).toEqual(nowDate)
    }
  })

  it("should do nothing if no targets", async () => {
    const notifier = new Notifier([], feed, page, comicData)
    const consoleSpy = vi.spyOn(console, "log").mockImplementationOnce(() => {})

    await expect(notifier.send()).resolves.toBe(undefined)
    expect(consoleSpy).toHaveBeenCalled()
  })
})
