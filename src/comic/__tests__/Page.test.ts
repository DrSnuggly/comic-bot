import { env, fetchMock, type Interceptable } from "cloudflare:test"
import { comicData, comicUrl, origin } from "@tests/utils/constants"
import { fetchAsset } from "@tests/utils/fetchAsset"
import type { ComicData } from "../../schema"
import { Page, type PageData, PageError } from "../Page"

let rewriter: HTMLRewriter
let mockPool: Interceptable
beforeAll(() => {
  rewriter = new HTMLRewriter()
  fetchMock.activate()
  fetchMock.disableNetConnect()
  mockPool = fetchMock.get(origin)
})
afterEach(() => fetchMock.assertNoPendingInterceptors())

describe("validation", () => {
  it("should reject if response not ok", async () => {
    mockPool.intercept({ path: comicUrl.pathname }).reply(400)
    const pagePromise = Page.fromUrl(comicUrl.href, comicData, rewriter)

    await expect(pagePromise).rejects.instanceof(PageError)
  })

  it("should reject if comic not found", async () => {
    const assetPath = "comic-pages/no-comic.html"

    const asset = await fetchAsset(assetPath)
    const pagePromise = Page.fromResponse(asset, comicData, rewriter)

    await expect(pagePromise).rejects.instanceof(PageError)
  })
})

describe("parsing", () => {
  it.for([
    { pageAsset: "inline-alt-text.html" },
    { pageAsset: "inline-nullish-alt-text.html" },
    { pageAsset: "no-alt-text.html" },
    { pageAsset: "no-alt-text.html", altSelector: "#does-not-exist" },
    { pageAsset: "separate-alt-text.html", altSelector: "#alt-text" },
  ] satisfies (Pick<ComicData, "altSelector"> & { pageAsset: string })[])(
    "should parse: $pageAsset",
    async ({ pageAsset, ...rest }) => {
      const assetPath = `comic-pages/${pageAsset}`
      const testComic = { ...comicData, ...rest }

      const asset = await env.ASSETS.fetch(`${origin}/${assetPath}`)
      const pagePromise = Page.fromResponse(asset, testComic, rewriter).then(
        ({ imageUri, altText }) => ({ imageUri, altText }) satisfies PageData,
      )

      await expect(pagePromise).resolves.toMatchSnapshot()
    },
  )
})
