import { ErrorCollector } from "../ErrorCollector"

describe("add", () => {
  it("should add single item", () => {
    const collector = new ErrorCollector()

    collector.add(new Error())

    expect(collector.size).toBe(1)
  })

  it("should add string as single item", () => {
    const collector = new ErrorCollector()

    collector.add("test")

    expect(collector.size).toBe(1)
  })

  it("should add single-item array as contents", () => {
    const collector = new ErrorCollector()

    collector.add([new Error()])

    expect(collector.size).toBe(1)
    expect(Array.from(collector)[0]).toBeInstanceOf(Error)
  })

  it("should add non-string iterable as multiple items", () => {
    const collector = new ErrorCollector()

    collector.add([new Error(), new Error()])

    expect(collector.size).toBe(2)
  })
})

describe("addSettled", () => {
  function newResolvablePromise() {
    return new Promise<void>((resolve) => resolve())
  }
  function newRejectablePromise() {
    return new Promise((_, reject) => reject(new Error()))
  }

  it("should no-op if no rejections", async () => {
    const collector = new ErrorCollector()
    const settled = await Promise.allSettled([
      newResolvablePromise(),
      newResolvablePromise(),
      newResolvablePromise(),
    ])

    collector.addSettled(settled)

    expect(collector.size).toBe(0)
  })

  it("should add if all reject", async () => {
    const collector = new ErrorCollector()
    const settled = await Promise.allSettled([
      newRejectablePromise(),
      newRejectablePromise(),
      newRejectablePromise(),
    ])

    collector.addSettled(settled)

    expect(collector.size).toBe(3)
  })

  it("should add only rejected if mixed", async () => {
    const collector = new ErrorCollector()
    const settled = await Promise.allSettled([
      newRejectablePromise(),
      newResolvablePromise(),
      newRejectablePromise(),
    ])

    collector.addSettled(settled)

    expect(collector.size).toBe(2)
  })
})

describe("assertEmpty", () => {
  it("should throw if any collected errors", () => {
    const collector = new ErrorCollector()

    collector.add([new Error(), new Error()])

    expect(() => collector.assertEmpty()).toThrow()
  })

  it("should not throw if no collected errors", () => {
    const collector = new ErrorCollector()

    expect(() => collector.assertEmpty()).not.toThrow()
  })
})
