import D, { Dropbox } from 'dropbox'
import fetch from 'node-fetch'

import * as Types from './types'

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

export function create({ token: accessToken }: Options): Types.Listable {
  const dbx = new Dropbox({ accessToken, fetch })

  async function list(path: string): Promise<Types.List> {
    try {
      const response = await dbx.filesListFolder({
        path: coercePath(path),
      })

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

  return { list }
}
