import { fetchMock, type Interceptable } from "cloudflare:test"
import { comicData, feedUrl, origin } from "@tests/utils/constants"
import { fetchAsset } from "@tests/utils/fetchAsset"
import { Feed, FeedError } from "../Feed"

let mockPool: Interceptable

beforeAll(() => {
  fetchMock.activate()
  fetchMock.disableNetConnect()
  mockPool = fetchMock.get(origin)
})
afterEach(() => fetchMock.assertNoPendingInterceptors())

describe("validation", () => {
  it("should reject if response not ok", async () => {
    mockPool.intercept({ path: feedUrl.pathname }).reply(400)

    await expect(Feed.fromComic(comicData)).rejects.instanceof(FeedError)
  })

  it("should reject if response body is empty", async () => {
    mockPool.intercept({ path: feedUrl.pathname }).reply(200)

    await expect(Feed.fromComic(comicData)).rejects.instanceof(FeedError)
  })

  it("should reject if feed is malformed", async () => {
    const assetPath = "comic-feeds/malformed.xml"

    const asset = await fetchAsset(assetPath)
    const feedPromise = Feed.fromResponse(asset, comicData)

    await expect(feedPromise).rejects.instanceof(FeedError)
  })

  it("should throw if no feed items", async () => {
    const assetPath = "comic-feeds/no-items.xml"

    const asset = await fetchAsset(assetPath)
    const feed = await Feed.fromResponse(asset, comicData)

    expect(() => feed.latest).toThrowError(FeedError)
  })

  it("should throw if no date", async () => {
    const assetPath = "comic-feeds/no-date.xml"

    const asset = await fetchAsset(assetPath)
    const feed = await Feed.fromResponse(asset, comicData)

    expect(() => feed.dateUpdated).toThrowError(FeedError)
  })

  it("should throw if no latest link", async () => {
    const assetPath = "comic-feeds/no-item-url.xml"

    const asset = await fetchAsset(assetPath)
    const feed = await Feed.fromResponse(asset, comicData)

    expect(() => feed.pageLink).toThrowError(FeedError)
  })
})

describe("fallbacks", () => {
  it("should prioritize latest date over build date", async () => {
    const assetPath = "comic-feeds/standard.xml"

    const asset = await fetchAsset(assetPath)
    const feed = await Feed.fromResponse(asset, comicData)

    expect(feed.dateUpdated).toEqual(feed.content.items[0].pubDate)
  })

  it("should use build date if missing latest date", async () => {
    const assetPath = "comic-feeds/no-item-date.xml"

    const asset = await fetchAsset(assetPath)
    const feed = await Feed.fromResponse(asset, comicData)

    expect(feed.dateUpdated).toEqual(feed.content.updated)
  })

  it("should use latest name if present", async () => {
    const assetPath = "comic-feeds/standard.xml"

    const asset = await fetchAsset(assetPath)
    const feed = await Feed.fromResponse(asset, comicData)

    expect(feed.pageName).toEqual(feed.content.items[0].title)
  })

  it("should use date if missing latest title", async () => {
    const assetPath = "comic-feeds/no-item-title.xml"

    const asset = await fetchAsset(assetPath)
    const feed = await Feed.fromResponse(asset, comicData)

    expect(feed.pageName).toEqual(Feed.formatDateAsName(feed.dateUpdated))
  })

  it("should use feed name if present", async () => {
    const assetPath = "comic-feeds/standard.xml"

    const asset = await fetchAsset(assetPath)
    const feed = await Feed.fromResponse(asset, comicData)

    expect(feed.feedName).toEqual(feed.content.title)
  })

  it("should use config name if missing feed name", async () => {
    const assetPath = "comic-feeds/no-title.xml"

    const asset = await fetchAsset(assetPath)
    const feed = await Feed.fromResponse(asset, comicData)

    expect(feed.feedName).toEqual(comicData.name)
  })
})
