import type { ComicData } from "../schema"

export class ComicError extends Error {
  constructor(comic: ComicData, message?: string) {
    super(`${comic.name}: ${message}`)
  }
}
