import { z } from "zod"

export const comicIndexSchema = z.unknown().array()
export type ComicIndex = z.infer<typeof comicIndexSchema>
export type ComicIndexItem = ComicIndex[number]

export const comicDataSchema = z.object({
  name: z.string().min(1),
  feedUrl: z.url(),
  webhooks: z.url().array(),
  imageSelector: z.string().min(1),
  altTextSelector: z.string().min(1).optional(),
  nextPageSelector: z.string().min(1).optional(),
})
export type ComicData = z.infer<typeof comicDataSchema>

export const lastUpdateMapSchema = z.map(z.string(), z.coerce.date().nullable())
