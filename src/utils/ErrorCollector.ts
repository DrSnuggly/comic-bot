/**
 * Guard for non-string iterables.
 * @param obj - the item to test.
 */
function isNonStringIterable(
  obj: unknown,
): obj is Exclude<Iterable<unknown>, string> {
  if (typeof obj === "string") return false
  return typeof (obj as Iterable<unknown>)[Symbol.iterator] === "function"
}

export class ErrorCollector extends Set<unknown> {
  override add(e: unknown): this {
    if (!isNonStringIterable(e)) return super.add(e)
    for (const item of e) super.add(item)
    return this
  }

  /**
   * Add any errors from `await Promise.allSettled()`.
   * @param settled - the settled promises array.
   */
  addSettled(settled: PromiseSettledResult<unknown>[]): this {
    for (const item of settled.filter((item) => item.status === "rejected")) {
      this.add(item.reason)
    }
    return this
  }

  /**
   * Assert that no items have been collected.
   * @throws unknown[] for the collected errors.
   */
  assertEmpty(): void {
    if (this.size) throw Array.from(this)
  }
}
