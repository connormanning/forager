import fs from 'fs'
import { join } from 'path'

import * as Types from './types'

export async function read(path: string) {
  return fs.promises.readFile(path)
}

export async function write(path: string, data: Buffer | string) {
  return fs.promises.writeFile(path, data)
}

export async function createReadStream(path: string) {
  await fs.promises.access(path)
  return fs.createReadStream(path)
}

export async function writeStream(path: string, data: NodeJS.ReadableStream) {
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(path)
    w.on('close', resolve)
    w.on('error', reject)
    data.pipe(w)
  })
}

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
  Types.StreamReadable &
  Types.StreamWritable &
  Types.Listable &
  Types.Removable {
  return {
    read,
    write,
    createReadStream,
    writeStream,
    list,
    remove,
  }
}
