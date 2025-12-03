import { decodeHTML } from "entities"
import { z } from "zod"
import type { ComicData } from "../schema"
import { normalizeUrl } from "../utils/normalizeUrl"
import { ComicError } from "./ComicError"

const pageDataSchema = z.object({
  imageUri: z.string().min(1),
  altText: z.string().min(1).optional().catch(undefined),
  nextPageUrl: z.url().optional().catch(undefined),
})
export type PageData = z.infer<typeof pageDataSchema>

export class PageError extends ComicError {}

/**
 * Normalize input into the expected value.
 * @param input - the input to normalize.
 */
function normalizeAltText(input: unknown): string | undefined {
  if (!input || typeof input !== "string") return undefined
  const parsed = decodeHTML(input).trim()
  if (!parsed) return undefined
  return parsed
}

/**
 * Content handler for {@link HTMLRewriter}.
 */
export class Page implements PageData {
  get imageUri() {
    return this.data.imageUri
  }
  get altText() {
    return this.data.altText
  }
  get nextPageUrl() {
    return this.data.nextPageUrl
  }

  /**
   * @param data - the parsed page data.
   * @param comic - the target comic.
   * @param rewriter - the instantiated {@link HTMLRewriter} object.
   */
  constructor(
    public data: PageData,
    public comic: ComicData,
    protected rewriter: HTMLRewriter,
  ) {}

  /**
   * Fetch and parse the comic.
   * @param url - the target comic page.
   * @param comic - the target comic.
   * @param rewriter - the instantiated {@link HTMLRewriter} object.
   */
  static async fromUrl(
    url: string,
    comic: ComicData,
    rewriter: HTMLRewriter,
  ): Promise<Page> {
    const response = await fetch(url)
    return Page.fromResponse(response, comic, rewriter)
  }

  /**
   * Fetch and parse the comic.
   * @param response - the target comic page response.
   * @param comic - the target comic.
   * @param rewriter - the instantiated {@link HTMLRewriter} object.
   * @throws PageError if bad response or unable to parse.
   */
  static async fromResponse(
    response: Response,
    comic: ComicData,
    rewriter: HTMLRewriter,
  ): Promise<Page> {
    if (!response.ok) {
      throw new PageError(
        comic,
        `received ${response.status} when retrieving ${response.url}: ${await response.text()}`,
      )
    }

    const rawData: Partial<PageData> = {}
    const handler: HTMLRewriterElementContentHandlers = {
      element(element) {
        // Get comic image, if not already found.
        if (rawData.imageUri === undefined) {
          const src = element.getAttribute("src")
          if (src) rawData.imageUri = normalizeUrl(src, response.url)
        }

        // Get comic alt text, if not already found.
        if (rawData.altText === undefined) {
          const title = normalizeAltText(element.getAttribute("title"))
          if (title !== undefined) rawData.altText = title
        }
      },
      text(element) {
        // Get comic alt text, if not already found.
        if (rawData.altText === undefined) {
          const text = normalizeAltText(element.text)
          if (text !== undefined) rawData.altText = text
        }
      },
    }

    let parser = rewriter.on(comic.imageSelector, handler)
    if (comic.altTextSelector) {
      parser = parser.on(comic.altTextSelector, handler)
    }
    if (comic.nextPageSelector) {
      parser = parser.on(comic.nextPageSelector, {
        element(element) {
          if (rawData.nextPageUrl !== undefined) return

          const href = element.getAttribute("href")
          if (href) {
            rawData.nextPageUrl = normalizeUrl(href, response.url)
          }
        },
      })
    }

    await parser.transform(response).text()
    const result = pageDataSchema.safeParse(rawData)
    if (!result.success) {
      throw new PageError(
        comic,
        `error parsing page: ${z.prettifyError(result.error)}`,
      )
    }

    return new Page(result.data, comic, rewriter)
  }
}
