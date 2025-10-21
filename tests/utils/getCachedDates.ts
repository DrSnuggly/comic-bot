import { env } from "cloudflare:test"
import { KV_INDEX_KEY } from "@src/constants"
import { lastUpdateMapSchema } from "@src/schema"
import type { z } from "zod"

/**
 * Get non-index cache as dates.
 */
export async function getCachedDates(): Promise<
  z.infer<typeof lastUpdateMapSchema>
> {
  // No prefix needed, since each test is isolated.
  const list = await env.KV.list()
  if (!list.keys.length) return new Map()

  const keys = list.keys
    .filter((key) => key.name !== KV_INDEX_KEY)
    .map((key) => key.name)
  return lastUpdateMapSchema.parse(await env.KV.get(keys))
}
