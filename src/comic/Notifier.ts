import { env } from "cloudflare:workers"
import type {
  APIEmbed,
  RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10"
import { type ComicData, lastUpdateMapSchema } from "../schema"
import { buildCacheKey } from "../utils/buildCacheKey"
import { ErrorCollector } from "../utils/ErrorCollector"
import { updateCachedDate } from "../utils/updateCachedDate"
import { ComicError } from "./ComicError"
import type { FeedData } from "./Feed"
import type { PageData } from "./Page"

export type Data = {
  feed: FeedData
  pages: PageData[]
}

export class NotifierError extends ComicError {}

export class Notifier {
  /**
   * @param targets - the webhooks to update.
   * @param feed - the feed data to use.
   * @param pages - the page data to use.
   * @param comic - the target comic.
   */
  constructor(
    public targets: string[],
    public feed: FeedData,
    public pages: PageData[],
    public comic: ComicData,
  ) {}

  /**
   * Determine targets from cache.
   * @param data - the data to use for generating embeds.
   * @param comic - the target comic.
   */
  static async fromData(data: Data, comic: ComicData) {
    if (!comic.webhooks.length) {
      throw new NotifierError(comic, "no webhook targets configured")
    }

    // Get webhooks that still need updating.
    const kvKeys = comic.webhooks.map((url) => buildCacheKey(url, comic))
    const updateMap = lastUpdateMapSchema.parse(await env.KV.get(kvKeys))
    const targets = comic.webhooks.filter((url) => {
      const webhookUpdated = updateMap.get(buildCacheKey(url, comic))
      if (!webhookUpdated) return true
      return webhookUpdated < data.feed.dateUpdated
    })

    return new Notifier(targets, data.feed, data.pages, comic)
  }

  protected updateCachedDate(url: string): Promise<void> {
    return updateCachedDate(url, this.comic)
  }

  /**
   * Notify the configured Discord webhook URLs of any updates, if needed.
   * @param embeds - Discord API embeds to send. Generated if omitted.
   */
  async send(embeds?: APIEmbed[]) {
    if (!this.targets.length) {
      console.log(new NotifierError(this.comic, "no webhooks to send").message)
      return
    }
    await this.sendUpdates(embeds ?? this.embeds)
  }

  /**
   * Generate Discord webhook embeds.
   */
  get embeds(): APIEmbed[] {
    let pageNumber = 1

    const embeds: APIEmbed[] = []
    for (const page of this.pages) {
      embeds.push(
        ...Notifier.embedsFromPage(page, {
          // If this is the first page, add comic info.
          ...(pageNumber === 1
            ? {
                title: this.feed.pageName,
                author: { name: this.feed.feedName },
                url: this.feed.pageLink,
              }
            : {}),
          // If there are multiple pages, add page numbers.
          ...(this.pages.length > 1
            ? { description: `Page ${pageNumber}` }
            : {}),
        }),
      )
      pageNumber++
    }
    return embeds
  }

  /**
   * Generate a Discord webhook embed from a {@link Page}.
   * @param page - the page data to use.
   * @param extraEmbedData - extra API embed properties to include in the first
   * embed.
   */
  static embedsFromPage(
    page: PageData,
    extraEmbedData?: Omit<APIEmbed, "image">,
  ): APIEmbed[] {
    return [
      {
        ...extraEmbedData,
        image: { url: page.imageUri },
        // Only include alt-text footer if there's alt-text.
        ...(page.altText
          ? { footer: { text: page.altText, icon_url: env.DISCORD_FOOTER_URL } }
          : {}),
      },
    ]
  }

  /**
   * Send updates to the given targets with the given embeds.
   * @param embeds - the embeds to send.
   * @protected
   */
  protected async sendUpdates(embeds: APIEmbed[]) {
    const errors = new ErrorCollector()
    const results = await Promise.allSettled(
      this.targets.map(async (url) => this.sendUpdate(url, embeds)),
    )
    // Re-throw any errors.
    errors.addSettled(results)
    errors.assertEmpty()
  }

  /**
   * Send updates to the given target with the given embeds.
   * @param url - Discord webhook URL to send to.
   * @param embeds - the embeds to send.
   * @throws NotifierError if posting to webhook failed.
   * @protected
   */
  protected async sendUpdate(url: string, embeds: APIEmbed[]) {
    const response = await fetch(url, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds,
        username: env.DISCORD_USERNAME,
        ...(env.DISCORD_AVATAR_URL
          ? { avatarURL: env.DISCORD_AVATAR_URL }
          : {}),
      } as RESTPostAPIWebhookWithTokenJSONBody),
    })
    if (!response.ok) {
      throw new NotifierError(
        this.comic,
        `failed posting to ${url} with ${response.status}: ${await response.text()}`,
      )
    }

    await this.updateCachedDate(url)
  }
}
