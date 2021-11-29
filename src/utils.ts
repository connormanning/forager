/*
export async function drain(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  return await new Promise(async (resolve, reject) => {
    const chunks: Uint8Array[] = []
    const reader = stream.getReader()

    while (true) {
      let pump = await reader.read()
      if (pump.done) break
      else chunks.push(pump.value)
    }

    const length = chunks.reduce(
      (length, chunk) => length + chunk.byteLength,
      0
    )

    let offset = 0
    const result = new Uint8Array(length)
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.byteLength
    }

    resolve(result)
  })
}
*/

export function has<K extends string>(
  o: object,
  k: K
): o is { [k in K]: unknown } {
  return k in o
}

export function arrayBufferToString(b: ArrayBuffer) {
  return new TextDecoder('utf8').decode(b)
}
