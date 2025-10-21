import { fetchMock, type Interceptable } from "cloudflare:test"
import { comicData, comicUrl, feedUrl, origin } from "@tests/utils/constants"
import { fetchAsset } from "@tests/utils/fetchAsset"
import type { ComicData } from "../../schema"
import { Comic } from "../Comic"

let rewriter: HTMLRewriter
let mockPool: Interceptable
beforeAll(() => {
  rewriter = new HTMLRewriter()
  fetchMock.activate()
  fetchMock.disableNetConnect()
  mockPool = fetchMock.get(origin)
})
afterEach(() => fetchMock.assertNoPendingInterceptors())

it("should match properties from data", () => {
  const testComicData = {
    ...comicData,
    altSelector: "#alt-text",
  } satisfies ComicData
  const comic = new Comic(testComicData)

  expect(comic).toMatchObject(testComicData)
})

it("should resolve when processing", async () => {
  const comic = new Comic(comicData)

  const feedAsset = await fetchAsset("comic-feeds/standard.xml")
  const pageAsset = await fetchAsset("comic-pages/inline-alt-text.html")
  mockPool
    .intercept({ path: feedUrl.pathname })
    .reply(200, await feedAsset.text())
  mockPool
    .intercept({ path: comicUrl.pathname })
    .reply(200, await pageAsset.text())
  for (const webhook of comicData.webhookUrls) {
    mockPool.intercept({ path: webhook, method: "post" }).reply(200)
  }

  await expect(comic.process(rewriter)).resolves.toBe(undefined)
})

describe("index item parsing", () => {
  it("should parse valid data as new comic", () => {
    const comic = Comic.fromIndexItem(comicData)

    expect(comic).toBeInstanceOf(Comic)
  })

  it("should throw on invalid data", () => {
    const { name: _, ...testComicData } = comicData

    expect(() => Comic.fromIndexItem(testComicData)).toThrow(Error)
  })
})
