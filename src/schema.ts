import { z } from "zod"

export const comicIndexSchema = z.unknown().array()
export type ComicIndex = z.infer<typeof comicIndexSchema>
export type ComicIndexItem = ComicIndex[number]

export const comicDataSchema = z.object({
  altSelector: z.string().min(1).optional(),
  imageSelector: z.string().min(1),
  name: z.string().min(1),
  rssUrl: z.url(),
  webhookUrls: z.url().array(),
})
export type ComicData = z.infer<typeof comicDataSchema>

export const lastUpdateMapSchema = z.map(z.string(), z.coerce.date().nullable())
