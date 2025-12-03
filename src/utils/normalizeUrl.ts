export function normalizeUrl(input: string, ref: string | URL): string {
  const normalRef = ref instanceof URL ? ref : new URL(ref)
  let result = input

  // e.g. `//example.com/`
  if (result.startsWith("//")) {
    result = normalRef.protocol + result
  }
  // e.g. `/path`
  if (result.startsWith("/")) {
    result = normalRef.origin + result
  }

  return result
}
