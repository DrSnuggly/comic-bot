// noinspection HttpUrlsUsage

import { normalizeUrl } from "../normalizeUrl"

describe("protocol", () => {
  const input = "//test.com/image.png"

  it("should normalize to HTTPS", () => {
    const ref = "https://test.com/feed.xml"
    const expected = "https://test.com/image.png"

    expect(normalizeUrl(input, ref)).toEqual(expected)
  })

  it("should normalize to HTTP", () => {
    const ref = "http://test.com/feed.xml"
    const expected = "http://test.com/image.png"

    const normalized = normalizeUrl(input, ref)

    expect(normalized).toEqual(expected)
  })
})

it("should add origin if only path", () => {
  const input = "/image.png"
  const ref = "https://test.com/feed.xml"
  const expected = "https://test.com/image.png"

  const normalized = normalizeUrl(input, ref)

  expect(normalized).toEqual(expected)
})
