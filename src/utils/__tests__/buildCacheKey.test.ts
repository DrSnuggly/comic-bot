import { comicData, feedUrl } from "@tests/utils/constants"
import { buildCacheKey } from "../buildCacheKey"

it("should build the expected key", () => {
  const key = buildCacheKey(feedUrl.href, comicData)
  const expected = `${comicData.feedUrl}|${feedUrl.href}`

  expect(key).toEqual(expected)
})
