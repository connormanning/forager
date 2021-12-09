import fs from 'fs'
import { join } from 'path'

import * as Types from './types'

export async function drain(
  stream: NodeJS.ReadableStream
): Promise<Uint8Array> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

export async function read(
  path: string,
  { range }: Types.ReadOptions = {}
): Promise<Uint8Array> {
  const [begin = 0, end = Infinity] = range || []
  if (begin < 0 || end < 0 || begin > end) throw new Error('Invalid range')

  await fs.promises.access(path)
  const stream = fs.createReadStream(path, {
    start: begin,
    end: end - 1,
    autoClose: true,
  })
  return drain(stream)
}

export async function write(path: string, data: Buffer | string) {
  return fs.promises.writeFile(path, data)
}

/*
export async function createReadStream(
  path: string,
  { range }: Types.ReadOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const [begin = 0, end = Infinity] = range || []
  if (begin < 0 || end < 0 || begin > end) throw new Error('Invalid range')

  await fs.promises.access(path)
  const fstream = fs.createReadStream(path, {
    start: begin,
    end: end - 1,
    autoClose: true,
  })

  class FsTransformer extends TransformStream<Buffer, Uint8Array> {
    constructor(stream: fs.ReadStream) {
      super({
        start() {},
        flush() {},
        async transform(chunk, controller) {
          controller.enqueue(new Uint8Array(chunk.buffer))
        },
      })
    }
  }

  const transformer = new FsTransformer(fstream)
  return transformer.readable
}

export async function writeStream(path: string, data: NodeJS.ReadableStream) {
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(path)
    w.on('close', resolve)
    w.on('error', reject)
    data.pipe(w)
  })
}
*/

export async function list(path: string): Promise<Types.List> {
  // We'll keep the behavior here simple for now and skip oddities like FIFOs,
  // sockets, block devices, symlinks, etc.  We could follow symlinks but for
  // now we'll skip those too.
  const list = (await fs.promises.readdir(path, { withFileTypes: true }))
    .filter((dirent) => dirent.isFile() || dirent.isDirectory())
    .map<Types.PathInfo>((dirent) => ({
      path: dirent.name,
      type: dirent.isDirectory() ? 'directory' : 'file',
    }))

  return Promise.all(
    list.map(async (entry) => {
      if (entry.type === 'directory') return entry
      const { size } = await fs.promises.stat(join(path, entry.path))
      return { ...entry, size }
    })
  )
}

export async function remove(path: string) {
  await fs.promises.unlink(path)
}

export function create(): Types.Readable &
  Types.Writable &
  /*
  Types.StreamReadable &
  Types.StreamWritable &
  */
  Types.Listable &
  Types.Removable {
  return {
    read,
    write,
    /*
    createReadStream,
    writeStream,
    */
    list,
    remove,
  }
}
