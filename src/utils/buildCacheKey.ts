import type { ComicData } from "../schema"

/**
 * Generate a cache key for storing and retrieving last update times.
 * @param url - a webhook URL.
 * @param comic - the target comic.
 */
export function buildCacheKey(url: string, comic: ComicData): string {
  return `${comic.rssUrl}|${url}`
}
