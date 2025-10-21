import { z } from "zod"
import { type ComicData, type ComicIndexItem, comicDataSchema } from "../schema"
import { Feed } from "./Feed"
import { Notifier } from "./Notifier"
import { Page } from "./Page"

export class Comic implements ComicData {
  get name() {
    return this.data.name
  }
  get imageSelector() {
    return this.data.imageSelector
  }
  get altSelector() {
    return this.data.altSelector
  }
  get rssUrl() {
    return this.data.rssUrl
  }
  get webhookUrls() {
    return this.data.webhookUrls
  }

  constructor(private readonly data: ComicData) {}

  static fromIndexItem(item: ComicIndexItem): Comic {
    const result = comicDataSchema.safeParse(item)
    if (!result.success) {
      throw new Error(
        `error parsing index item: ${z.prettifyError(result.error)}`,
      )
    }
    return new Comic(result.data)
  }

  /**
   * Process feed and comic page, and send any applicable updates.
   * @param rewriter - the instantiated {@link HTMLRewriter} object.
   */
  async process(rewriter: HTMLRewriter): Promise<void> {
    const feed = await Feed.fromComic(this)
    const page = await Page.fromUrl(feed.pageLink, this, rewriter)
    const notifier = await Notifier.fromData({ feed, page }, this)
    await notifier.send()
  }
}
