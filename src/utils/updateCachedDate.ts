import { env } from "cloudflare:workers"
import type { ComicData } from "../schema"
import { buildCacheKey } from "./buildCacheKey"

/**
 * Update the cached date for a given comic and webhook.
 * @param url - a webhook URL.
 * @param comic - the target comic.
 */
export function updateCachedDate(url: string, comic: ComicData): Promise<void> {
  return env.KV.put(buildCacheKey(url, comic), new Date().toISOString())
}
