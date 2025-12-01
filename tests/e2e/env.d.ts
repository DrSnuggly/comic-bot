import type { ComicData } from "@src/schema"

declare module "vitest" {
  export interface ProvidedContext {
    webhook: string
    indexData: ComicData[]
  }
}
