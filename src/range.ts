// Note that internally to this project, the end of a range is non-inclusive,
// in opposition to the HTTP range header.
export type Range = [number, number]

export const Range = { toHeaderValue, fromHeaderValue }

function toHeaderValue([begin, end]: Range) {
  if (begin < 0 || end < 0 || begin >= end) throw new Error(`Invalid range`)
  if (end === Infinity) return `bytes=${begin}-`
  return `bytes=${begin}-${end - 1}`
}

// This isn't fully specification compliant for parsing range headers, it is
// only intended for parsing the subset of range headers that we generate
// internally for testing purposes.
function fromHeaderValue(header: string): Range {
  const [bytes, parts] = header
    .toLowerCase()
    .split('=')
    .map((s) => s.trim())
  if (bytes !== 'bytes') throw new Error('Missing "bytes" in range header')

  const [begin = 0, end = Infinity] = parts
    .split('-')
    .map((v) => parseInt(v))
    .map((v) => (isNaN(v) ? undefined : v))

  return [begin, end + 1]
}
