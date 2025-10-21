import { Comics } from "./comic/Comics"

export default {
  async scheduled(_ctrl, _env, _ctx) {
    const start = Date.now()
    console.info("Starting sync.")

    const comics = await Comics.fromIndex()
    await comics.process()
    for (const error of comics.errors) console.error(error)

    const end = Date.now()
    const duration = (end - start) / 1000 // to seconds
    console.info(`Sync finished in ${duration.toFixed(2)} seconds.`)
  },
} satisfies ExportedHandler<Env>
