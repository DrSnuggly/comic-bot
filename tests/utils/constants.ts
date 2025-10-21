import type { ComicData } from "@src/schema"

export const origin = "https://localhost"
export const feedUrl = new URL(`${origin}/feed`)
export const comicUrl = new URL(`${origin}/comic`)
export const webhookUrl = new URL(`${origin}/webhook`)

export const comicData = {
  name: "Test Comic",
  imageSelector: "img#comic",
  rssUrl: feedUrl.href,
  webhookUrls: [
    `${webhookUrl.href}-0`,
    `${webhookUrl.href}-1`,
    `${webhookUrl.href}-2`,
  ],
} satisfies ComicData
