import { fetchAsset } from "./fetchAsset"

it("should fetch asset if exists", async () => {
  const assetPromise = fetchAsset("comic-feeds/standard.xml")

  await expect(assetPromise).resolves.toMatchObject({ status: 200 })
})

it("should fail to fetch asset if doesn't exist", async () => {
  const assetPromise = fetchAsset("comic-feeds/does-not-exist.xml")

  await expect(assetPromise).resolves.toMatchObject({ status: 404 })
})
