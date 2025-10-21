import { env, fetchMock, type Interceptable } from "cloudflare:test"
import { comicData, comicUrl, feedUrl, origin } from "@tests/utils/constants"
import { fetchAsset } from "@tests/utils/fetchAsset"
import { KV_INDEX_KEY } from "../../constants"
import { Comics } from "../Comics"

let rewriter: HTMLRewriter
let mockPool: Interceptable
beforeAll(() => {
  rewriter = new HTMLRewriter()
  fetchMock.activate()
  fetchMock.disableNetConnect()
  mockPool = fetchMock.get(origin)
})
afterEach(() => fetchMock.assertNoPendingInterceptors())

describe("index parsing", () => {
  it("should parse good data with no errors", async () => {
    const indexData = [comicData]

    await env.KV.put(KV_INDEX_KEY, JSON.stringify(indexData))
    const comics = await Comics.fromIndex()

    expect(comics.errors.size).toBe(0)
  })

  it("should throw if cache index not an array", async () => {
    await expect(Comics.fromIndex()).rejects.toThrow(Error)
  })

  it("should collect item parsing errors", async () => {
    const { name: _, ...testComicData } = comicData
    const indexData = [testComicData]

    await env.KV.put(KV_INDEX_KEY, JSON.stringify(indexData))
    const comics = await Comics.fromIndex()

    expect(comics.errors.size).toBe(1)
  })

  it("should not interrupt parsing good data if bad data found", async () => {
    const { name: _, ...testComicData } = comicData
    const indexData = [testComicData, comicData]

    await env.KV.put(KV_INDEX_KEY, JSON.stringify(indexData))
    const comics = await Comics.fromIndex()

    expect(comics.size).toBe(1)
    expect(comics.errors.size).toBe(1)
  })
})

describe("processing", () => {
  it("should collect sub-errors", async () => {
    const toSucceed = [comicData.webhookUrls[0], comicData.webhookUrls[2]]
    const toFail = [comicData.webhookUrls[1]]
    const indexData = [comicData]

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
    // Execution.
    const comics = await Comics.fromIndex()
    await comics.process(rewriter)

    expect(comics.errors.size).toBe(1)
  })

  it("should combine sub-errors with top-level errors", async () => {
    const toSucceed = [comicData.webhookUrls[0], comicData.webhookUrls[2]]
    const toFail = [comicData.webhookUrls[1]]
    const { name: _, ...badComicData } = comicData
    const indexData = [badComicData, comicData]

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
    // Execution.
    const comics = await Comics.fromIndex()
    await comics.process(rewriter)

    expect(comics.errors.size).toBe(2)
  })
})
