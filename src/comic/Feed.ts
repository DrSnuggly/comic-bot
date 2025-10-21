import type { Feed as RssFeed, FeedItem as RssFeedItem } from "domutils"
import { decodeXML } from "entities"
import { parseFeed } from "htmlparser2"
import type { ComicData } from "../schema"
import { ComicError } from "./ComicError"

export type FeedData = {
  feedName: string
  dateUpdated: Date
  pageName: string
  pageLink: string
}

export class FeedError extends ComicError {}

export class Feed implements FeedData {
  /**
   * @param comic - the target comic.
   * @param content - the RSS feed content as an object.
   * @protected
   */
  protected constructor(
    public comic: ComicData,
    public content: RssFeed,
  ) {}

  /**
   * Retrieve the feed content.
   * @param comic - the target comic.
   * @throws FeedError if feed cannot be retrieved.
   */
  static async fromComic(comic: ComicData): Promise<Feed> {
    const response = await fetch(comic.rssUrl)
    return Feed.fromResponse(response, comic)
  }

  /**
   * Retrieve the feed content.
   * @param response - the response to parse.
   * @param comic - the target comic.
   * @throws FeedError if feed cannot be parsed.
   */
  static async fromResponse(
    response: Response,
    comic: ComicData,
  ): Promise<Feed> {
    if (!response.ok) {
      throw new FeedError(
        comic,
        `received ${response.status} when retrieving ${response.url}: ${await response.text()}`,
      )
    }

    const content = parseFeed(await response.text())
    if (content === null) {
      throw new FeedError(comic, "could not parse feed")
    }
    return new Feed(comic, content)
  }

  static formatDateAsName(date: Date): string {
    return date.toISOString().substring(0, 10)
  }

  /**
   * Get the RSS feed title.
   */
  get feedName(): string {
    if (this.content.title === undefined) {
      return this.comic.name
    }
    return decodeXML(this.content.title)
  }

  #latest: RssFeedItem | undefined
  /**
   * Get the latest item in the RSS feed.
   * @throws FeedError if no items exist in the feed.
   */
  get latest(): RssFeedItem {
    if (this.#latest === undefined) {
      const latest = this.content.items[0]
      if (latest === undefined) {
        throw new FeedError(this.comic, "no items in feed")
      }
      this.#latest = latest
    }
    return this.#latest
  }

  #dateUpdated: Date | undefined
  /**
   * Get when the feed was last updated.
   * @throws FeedError if last update date cannot be determined.
   */
  get dateUpdated(): Date {
    if (this.#dateUpdated === undefined) {
      if (this.latest.pubDate === undefined) {
        if (this.content.updated === undefined) {
          throw new FeedError(
            this.comic,
            "could not determine when last updated",
          )
        }
        this.#dateUpdated = this.content.updated
      } else {
        this.#dateUpdated = this.latest.pubDate
      }
    }
    return this.#dateUpdated
  }

  /**
   * Get the title for the latest item, falling back to the publishing date.
   */
  get pageName(): string {
    if (this.latest.title) {
      return decodeXML(this.latest.title)
    }
    return Feed.formatDateAsName(this.dateUpdated)
  }

  /**
   * Get the link to the latest page.
   * @throws FeedError if no link is found.
   */
  get pageLink(): string {
    if (!this.latest.link) {
      throw new FeedError(this.comic, "latest page URL missing")
    }
    return this.latest.link
  }
}
