/** Preserve Java Long identifiers without modifying numbers inside JSON strings. */
export function parseBackendJson(text: string): unknown {
  return JSON.parse(
    text.replace(/"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (token) => {
      if (token.startsWith('"') || /[.eE]/.test(token)) return token
      return Number.isSafeInteger(Number(token)) ? token : `"${token}"`
    })
  )
}
