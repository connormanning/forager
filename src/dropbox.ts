import { Readable } from 'stream'
import D, { Dropbox } from 'dropbox'
import fetch from 'node-fetch'

import * as Types from './types'
import * as Util from './util'

export type Options = { token: string }
export function isOptions(o: any): o is Options {
  return typeof o === 'object' && typeof o.token === 'string'
}

/**
 * Input paths can look like this:
 *      Root application directory: '/'
 *      Subdirectory: 'subdirectory'
 *
 * The corresponding paths to the Dropbox API need to look like this:
 *      Root application directory: ''
 *      Subdirectory: '/subdirectory'
 */
function coercePath(path: string) {
  if (path === '/' || path === '') return ''
  if (!path.startsWith('/')) return `/${path}`
  return path
}

function isDirectory(
  m: D.files.Metadata
): m is D.files.FolderMetadataReference {
  return (m as any)['.tag'] === 'folder'
}
function isFile(m: D.files.Metadata): m is D.files.FileMetadataReference {
  return (m as any)['.tag'] === 'file'
}

// For some reason this isn't included in the type definition.
type FileMetadataWithBuffer = D.files.FileMetadata & { fileBinary?: Buffer }

export function create({
  token: accessToken,
}: Options): Types.Listable &
  Types.Readable &
  Types.Writable &
  Types.StreamReadable &
  Types.StreamWritable {
  const dbx = new Dropbox({ accessToken, fetch })

  async function read(path: string): Promise<Buffer> {
    const response = await dbx.filesDownload({
      path: coercePath(path),
    })
    const result: FileMetadataWithBuffer = response.result
    if (!result.fileBinary) {
      throw new Error('Missing file contents in Dropbox response')
    }
    return result.fileBinary
  }

  async function write(path: string, contents: Buffer | string) {
    await dbx.filesUpload({ path: coercePath(path), contents })
  }

  // This API doesn't actually support streaming, so we'll just pass through to
  // the normal read/write for compatibility.
  async function createReadStream(path: string) {
    const buffer = await read(path)
    return Readable.from(buffer)
  }

  async function writeStream(path: string, stream: NodeJS.ReadableStream) {
    const data = await Util.drain(stream)
    return write(path, data)
  }

  async function list(path: string): Promise<Types.List> {
    try {
      const response = await dbx.filesListFolder({ path: coercePath(path) })

      const dirs: Types.List = response.result.entries
        .filter(isDirectory)
        .map(({ name }) => ({ path: name, type: 'directory' }))

      const files: Types.List = response.result.entries
        .filter(isFile)
        .map(({ name, size }) => ({ path: name, type: 'file', size }))

      return [...dirs, ...files].sort((a, b) => a.path.localeCompare(b.path))
    } catch (e) {
      throw new Error('Failed to list dropbox contents')
    }
  }

  return { list, read, write, createReadStream, writeStream }
}
