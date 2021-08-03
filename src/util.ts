export async function drain(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

export function has<K extends string>(
  o: object,
  k: K
): o is { [k in K]: unknown } {
  return k in o
}
