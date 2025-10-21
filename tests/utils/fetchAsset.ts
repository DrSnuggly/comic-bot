import { env } from "cloudflare:test"
import { origin } from "./constants"

/**
 * Get an asset as text. Used for structured body responses.
 * @param asset - the path for the target asset, relative to `/tests/assets/`.
 */
export function fetchAsset(asset: string): Promise<Response> {
  return env.ASSETS.fetch(`${origin}/${asset}`)
}
