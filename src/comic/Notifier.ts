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
  page: PageData
}

export class NotifierError extends ComicError {}

export class Notifier {
  /**
   * @param targets - the webhooks to update.
   * @param feed - the feed data to use.
   * @param page - the page data to use.
   * @param comic - the target comic.
   */
  constructor(
    public targets: string[],
    public feed: FeedData,
    public page: PageData,
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

    return new Notifier(targets, data.feed, data.page, comic)
  }

  protected updateCachedDate(url: string): Promise<void> {
    return updateCachedDate(url, this.comic)
  }

  /**
   * Notify the configured Discord webhook URLs of any updates, if needed.
   */
  async send() {
    if (!this.targets.length) {
      console.log(new NotifierError(this.comic, "no webhooks to send").message)
      return
    }
    await this.sendUpdates(this.embeds)
  }

  /**
   * Generate Discord webhook embeds.
   */
  get embeds(): APIEmbed[] {
    return [
      {
        title: this.feed.pageName,
        author: { name: this.feed.feedName },
        image: { url: this.page.imageUri },
        url: this.feed.pageLink,
      },
      // Only include alt-text embed if there's alt-text.
      ...(this.page.altText
        ? [{ description: `Alt text: ||${this.page.altText}||` }]
        : []),
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
