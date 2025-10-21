import { decodeHTML } from "entities"
import type { ComicData } from "../schema"
import { ComicError } from "./ComicError"

export type PageData = {
  imageUri: string
  altText?: string | undefined
}

export class PageError extends ComicError {}

/**
 * Content handler for {@link HTMLRewriter}.
 */
export class Page implements PageData {
  imageUri: string
  altText: string | undefined

  /**
   * @param comic - the target comic.
   * @param rewriter - the instantiated {@link HTMLRewriter} object.
   * @param data - the parsed page data.
   */
  protected constructor(
    public comic: ComicData,
    protected rewriter: HTMLRewriter,
    data: PageData,
  ) {
    this.imageUri = data.imageUri
    this.altText = data.altText
  }

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

    let imageUri: string | undefined
    let altText: string | undefined
    const handler: HTMLRewriterElementContentHandlers = {
      element(element) {
        // Get comic image, if not already found.
        if (imageUri === undefined) {
          const src = element.getAttribute("src")
          if (src) imageUri = src
        }

        // Get comic alt text, if not already found.
        if (altText === undefined) {
          const title = Page.normalizeAltText(element.getAttribute("title"))
          if (title !== undefined) altText = title
        }
      },
      text(element) {
        // Get comic alt text, if not already found.
        if (altText === undefined) {
          const text = Page.normalizeAltText(element.text)
          if (text !== undefined) altText = text
        }
      },
    }

    let parser = rewriter.on(comic.imageSelector, handler)
    if (comic.altSelector) {
      parser = parser.on(comic.altSelector, handler)
    }
    await parser.transform(response).text()
    if (imageUri === undefined) {
      throw new PageError(comic, "could not find image URI")
    }

    return new Page(comic, rewriter, { imageUri, altText })
  }

  /**
   * Normalize input into the expected value.
   * @param input - the input to normalize.
   */
  static normalizeAltText(input: unknown): string | undefined {
    if (!input || typeof input !== "string") return undefined
    const parsed = decodeHTML(input).trim()
    if (!parsed) return undefined
    return parsed
  }
}
