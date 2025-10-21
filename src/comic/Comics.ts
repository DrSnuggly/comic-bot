import { env } from "cloudflare:workers"
import { z } from "zod"
import { KV_INDEX_KEY } from "../constants"
import { comicIndexSchema } from "../schema"
import { ErrorCollector } from "../utils/ErrorCollector"
import { Comic } from "./Comic"

export class Comics extends Set<Comic> {
  protected constructor(
    public errors: ErrorCollector,
    items: Comic[],
  ) {
    super(items)
  }

  /**
   * Generate instances from the cache index.
   * @throws Error if cannot parse cache index.
   */
  static async fromIndex(): Promise<Comics> {
    const result = comicIndexSchema.safeParse(
      await env.KV.get(KV_INDEX_KEY, { type: "json" }),
    )
    if (!result.success) {
      throw new Error(`error parsing index: ${z.prettifyError(result.error)}`)
    }

    const comics: Comic[] = []
    const errors = new ErrorCollector()
    for (const item of result.data) {
      try {
        comics.push(Comic.fromIndexItem(item))
      } catch (e) {
        errors.add(e)
      }
    }

    return new Comics(errors, comics)
  }

  /**
   * Process all comics.
   * @param rewriter - an optional {@link HTMLRewriter} instance. If not
   * provided, a new one will be instantiated.
   */
  async process(rewriter?: HTMLRewriter): Promise<void> {
    const normalRewriter = rewriter ?? new HTMLRewriter()

    const errors = new ErrorCollector()
    const results = await Promise.allSettled(
      Array.from(this).map((comic) => comic.process(normalRewriter)),
    )
    errors.addSettled(results)
    this.errors.add(errors)
  }
}
